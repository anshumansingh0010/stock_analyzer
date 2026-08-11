/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║         NIFTY50GPT — LAYER 2: NEWS SENTIMENT PROMPT                 ║
 * ║                                                                      ║
 * ║  Runs in background every 15 minutes to pre-tag news articles with  ║
 * ║  companies, sentiment, and portfolio relevance.                     ║
 * ║                                                                      ║
 * ║  Output: strict JSON — no prose, no extra text                      ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { z } from "zod";

export interface NewsArticleInput {
  headline?: string;
  description?: string;
  source?: string;
  timestamp?: string;
}

export interface NewsMessageRole {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ParsedCompanyInsight {
  name: string;
  ticker: string;
  sentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
  sentimentScore: number;
  reason: string;
  impact: "SHORT_TERM" | "LONG_TERM" | "BOTH";
  inUserPortfolio: boolean;
  portfolioRelevance: string | null;
}

export interface ParsedNewsOutput {
  companies: ParsedCompanyInsight[];
  overallMarketSentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
  sectorAffected: string[];
  urgency: "HIGH" | "MEDIUM" | "LOW";
  summary: string;
  expectedImpact?: {
    shortTerm: string;
    longTerm: string;
  };
}

export const NEWS_SYSTEM_PROMPT = `
You are a financial news analyst specializing in the Indian stock market
and Nifty 50 listed companies.

Your job is to analyze news articles and return machine-readable JSON insights.
You run in the background — your output is consumed by other systems, NOT humans directly.

═══ INPUT YOU RECEIVE ═══
headline:    (string) News headline
description: (string) Article content or summary  
source:      (string) Publisher name
portfolio:   (array)  List of stock tickers the user owns

═══ YOUR TASKS ═══
1. Extract ALL company/stock names mentioned in the news
2. Classify sentiment per company:
   - BULLISH  → news is positive for stock price / business prospects
   - BEARISH  → news is negative for stock price / business prospects
   - NEUTRAL  → informational, no clear price impact
3. Provide a concise reason (2–3 lines max) for the sentiment
4. Determine impact horizon: SHORT_TERM (days/weeks) | LONG_TERM (months+) | BOTH
5. Cross-check each company against the user's portfolio
   → If found in portfolio → write a personalised relevance note for the user

═══ STRICT OUTPUT FORMAT ═══
Return ONLY a single valid JSON object matching this exact schema.
Do NOT add any text before or after the JSON.
Do NOT add markdown code fences.

{
  "companies": [
    {
      "name": "Company Name",
      "ticker": "NSE ticker if known, else UNKNOWN",
      "sentiment": "BULLISH | BEARISH | NEUTRAL",
      "sentimentScore": <number 0.0–1.0>,
      "reason": "Concise impact explanation (2-3 lines)",
      "impact": "SHORT_TERM | LONG_TERM | BOTH",
      "inUserPortfolio": true | false,
      "portfolioRelevance": "Why user should care — or null if not in portfolio"
    }
  ],
  "overallMarketSentiment": "BULLISH | BEARISH | NEUTRAL",
  "sectorAffected": ["Banking", "IT"],
  "urgency": "HIGH | MEDIUM | LOW",
  "summary": "One-line plain-English summary of the news impact",
  "expectedImpact": {
    "shortTerm": "Specific 1-line forecast on expected short-term price movement, percentage range, or intraday trading volatility",
    "longTerm": "Specific 1-line forecast on multi-quarter structural outlook, fundamental growth, or business trajectory"
  }
}

═══ SCORING GUIDE ═══
sentimentScore:
  0.0–0.2  → Strongly BEARISH
  0.2–0.4  → Mildly BEARISH
  0.4–0.6  → NEUTRAL
  0.6–0.8  → Mildly BULLISH
  0.8–1.0  → Strongly BULLISH

urgency:
  HIGH   → Breaking news, earnings beat/miss, RBI policy, regulatory action
  MEDIUM → Sector development, management change, contract win
  LOW    → General market news, analyst ratings, routine disclosures

═══ STRICT RULES ═══
✅ Return ONLY valid JSON — parseable by JSON.parse() with zero modifications
✅ If a company is not a known Nifty 50 stock → include it with ticker: "UNKNOWN"
✅ sentimentScore must always be a float between 0.0 and 1.0
✅ portfolioRelevance must be null (JSON null) if inUserPortfolio is false
❌ Do NOT add commentary, explanation, or any text outside the JSON
❌ Do NOT hallucinate NSE tickers you are unsure of — use "UNKNOWN"
❌ Do NOT wrap the JSON in markdown code blocks
`.trim();

export function buildNewsUserMessage(
  article: NewsArticleInput,
  portfolio: any[] = []
): NewsMessageRole {
  const tickers = portfolio.map((p) =>
    typeof p === "string" ? p.toUpperCase() : (p.stock || p.ticker || "").toUpperCase()
  );

  return {
    role: "user",
    content: JSON.stringify(
      {
        headline: article.headline || "No headline provided",
        description: article.description || "No description provided",
        source: article.source || "Unknown",
        timestamp: article.timestamp || new Date().toISOString(),
        portfolio: tickers,
      },
      null,
      2
    ),
  };
}

export function buildNewsMessages(
  article: NewsArticleInput,
  portfolio: any[] = []
): NewsMessageRole[] {
  return [
    { role: "system", content: NEWS_SYSTEM_PROMPT },
    buildNewsUserMessage(article, portfolio),
  ];
}

export function parseAndValidateNewsOutput(rawOutput: string): ParsedNewsOutput {
  let cleaned = rawOutput.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e: any) {
    try {
      let repaired = cleaned;
      if (!repaired.endsWith("}")) {
        if (repaired.lastIndexOf("[") > repaired.lastIndexOf("]")) repaired += ']}';
        else repaired += '}';
      }
      parsed = JSON.parse(repaired);
    } catch {
      throw new Error(`LLM returned invalid JSON: ${e.message}\nRaw: ${cleaned.slice(0, 200)}`);
    }
  }

  if (!Array.isArray(parsed.companies)) {
    throw new Error("Missing 'companies' array in LLM response");
  }
  if (!["BULLISH", "BEARISH", "NEUTRAL"].includes(parsed.overallMarketSentiment)) {
    throw new Error(`Invalid overallMarketSentiment: ${parsed.overallMarketSentiment}`);
  }
  if (!["HIGH", "MEDIUM", "LOW"].includes(parsed.urgency)) {
    throw new Error(`Invalid urgency: ${parsed.urgency}`);
  }

  const companies: ParsedCompanyInsight[] = parsed.companies.map((c: any, i: number) => {
    const score = parseFloat(c.sentimentScore);
    return {
      name: c.name || `Unknown Company ${i + 1}`,
      ticker: c.ticker || "UNKNOWN",
      sentiment: ["BULLISH", "BEARISH", "NEUTRAL"].includes(c.sentiment)
        ? c.sentiment
        : "NEUTRAL",
      sentimentScore: isNaN(score) ? 0.5 : Math.min(1, Math.max(0, score)),
      reason: c.reason || "",
      impact: ["SHORT_TERM", "LONG_TERM", "BOTH"].includes(c.impact)
        ? c.impact
        : "SHORT_TERM",
      inUserPortfolio: Boolean(c.inUserPortfolio),
      portfolioRelevance: c.inUserPortfolio ? c.portfolioRelevance || null : null,
    };
  });

  const expectedImpact = parsed.expectedImpact && typeof parsed.expectedImpact.shortTerm === "string" && typeof parsed.expectedImpact.longTerm === "string"
    ? {
        shortTerm: parsed.expectedImpact.shortTerm,
        longTerm: parsed.expectedImpact.longTerm,
      }
    : undefined;

  return {
    companies,
    overallMarketSentiment: parsed.overallMarketSentiment,
    sectorAffected: Array.isArray(parsed.sectorAffected) ? parsed.sectorAffected : [],
    urgency: parsed.urgency,
    summary: parsed.summary || "",
    expectedImpact,
  };
}
