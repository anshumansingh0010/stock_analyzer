/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║     NIFTY50GPT — LIVE REAL-TIME FINANCIAL NEWS ENGINE (LAYER 2)      ║
 * ║                                                                      ║
 * ║  Aggregates, deduplicates, tags, and analyzes 100% REAL LIVE         ║
 * ║  financial news articles from Zerodha Pulse, Google News, ET & MC.   ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { fetchCombinedRssNews } from "./rssService.js";
import { NIFTY50_STOCKS } from "../routes/stock.js";

export interface AnalyzedLiveArticle {
  id: string | number;
  headline: string;
  summary: string;
  source: string;
  timestamp: string;
  overallMarketSentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
  confidence: number;
  urgency: "HIGH" | "MEDIUM" | "LOW";
  sectorAffected: string[];
  companies: Array<{
    ticker: string;
    name: string;
    sentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
    sentimentScore: number;
    inUserPortfolio: boolean;
    reason: string;
  }>;
  expectedImpact: {
    shortTerm: string;
    longTerm: string;
  };
}

let cachedLiveArticles: AnalyzedLiveArticle[] = [];
let lastFetchTime: number = 0;
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes cache TTL

const BULLISH_KEYWORDS = [
  "profit", "surge", "gain", "rise", "beat", "record", "growth", "jump",
  "rally", "upgrade", "soar", "high", "positive", "expand", "dividend",
  "buyback", "order win", "approval", "outperform", "bullish", "ipo",
  "fundraise", "investment", "acquisition", "expansion"
];

const BEARISH_KEYWORDS = [
  "drop", "fall", "decline", "loss", "miss", "slash", "cut", "downward",
  "bearish", "downgrade", "plunge", "sink", "penalty", "warning", "probe",
  "fraud", "investigation", "slump", "weak"
];

/**
 * Heuristically extracts mentioned Nifty 50 stocks & computes sentiment from headline & description.
 */
function tagAndAnalyzeArticle(article: { headline: string; description: string; source: string; timestamp: string }, index: number, portfolioTickers: string[] = []): AnalyzedLiveArticle {
  const fullText = `${article.headline} ${article.description}`.toLowerCase();

  // Determine sentiment
  let bullHits = 0;
  let bearHits = 0;
  BULLISH_KEYWORDS.forEach((kw) => { if (fullText.includes(kw)) bullHits++; });
  BEARISH_KEYWORDS.forEach((kw) => { if (fullText.includes(kw)) bearHits++; });

  let sentiment: "BULLISH" | "BEARISH" | "NEUTRAL" = "NEUTRAL";
  let confidence = 75 + (Math.abs(bullHits - bearHits) * 5);
  if (confidence > 98) confidence = 98;

  if (bullHits > bearHits) sentiment = "BULLISH";
  else if (bearHits > bullHits) sentiment = "BEARISH";

  // Match companies
  const matchedCompanies: any[] = [];
  const textUpper = `${article.headline} ${article.description}`.toUpperCase();

  NIFTY50_STOCKS.forEach((stk) => {
    const sym = stk.ticker.toUpperCase();
    const nameUpper = stk.name.toUpperCase();
    const nameFirstWord = stk.name.split(" ")[0].toUpperCase();

    if (textUpper.includes(` ${sym} `) || textUpper.includes(`${sym}:`) || (nameFirstWord.length > 3 && textUpper.includes(nameFirstWord))) {
      const inPortfolio = portfolioTickers.includes(sym);
      matchedCompanies.push({
        ticker: sym,
        name: stk.name,
        sentiment,
        sentimentScore: sentiment === "BULLISH" ? 0.88 : sentiment === "BEARISH" ? 0.32 : 0.50,
        inUserPortfolio: inPortfolio,
        reason: `${stk.name} mentioned in breaking financial news update (${article.source}).`,
      });
    }
  });

  // Extract sectors
  const sectorSet = new Set<string>();
  if (fullText.includes("bank") || fullText.includes("rbi") || fullText.includes("lending")) sectorSet.add("Banking");
  if (fullText.includes("it ") || fullText.includes("tech") || fullText.includes("software") || fullText.includes("ai ")) sectorSet.add("IT");
  if (fullText.includes("auto") || fullText.includes("ev") || fullText.includes("car") || fullText.includes("vehicle")) sectorSet.add("Auto");
  if (fullText.includes("pharma") || fullText.includes("fda") || fullText.includes("health")) sectorSet.add("Pharma");
  if (fullText.includes("oil") || fullText.includes("gas") || fullText.includes("energy")) sectorSet.add("Energy");
  if (fullText.includes("metal") || fullText.includes("steel") || fullText.includes("copper")) sectorSet.add("Metal");
  if (sectorSet.size === 0) sectorSet.add("Markets");

  const isHighImpact = fullText.includes("rbi") || fullText.includes("nifty") || fullText.includes("sensex") || fullText.includes("fed") || matchedCompanies.length > 0;

  return {
    id: `live-${Date.now()}-${index}`,
    headline: article.headline,
    summary: article.description || article.headline,
    source: article.source || "Financial News Feed",
    timestamp: article.timestamp || new Date().toISOString(),
    overallMarketSentiment: sentiment,
    confidence,
    urgency: isHighImpact ? "HIGH" : "MEDIUM",
    sectorAffected: Array.from(sectorSet),
    companies: matchedCompanies.length > 0 ? matchedCompanies : [
      {
        ticker: "NIFTY50",
        name: "Nifty 50 Benchmark",
        sentiment,
        sentimentScore: sentiment === "BULLISH" ? 0.85 : sentiment === "BEARISH" ? 0.35 : 0.50,
        inUserPortfolio: false,
        reason: "Broad Indian equity market commentary & macroeconomic trend.",
      }
    ],
    expectedImpact: {
      shortTerm: sentiment === "BULLISH" ? "+0.5% to +1.5% positive momentum intraday" : sentiment === "BEARISH" ? "-0.5% to -1.5% cautious consolidation intraday" : "Range-bound intraday movement",
      longTerm: sentiment === "BULLISH" ? "Positive structural trajectory supported by fundamentals" : sentiment === "BEARISH" ? "Near-term consolidation phase awaiting earnings catalysts" : "Neutral long-term outlook",
    },
  };
}

/**
 * Fetches 100% REAL LIVE aggregated financial news from Zerodha Pulse, Google News, ET, and Moneycontrol.
 */
export async function getLiveNewsFeed(portfolioTickers: string[] = []): Promise<AnalyzedLiveArticle[]> {
  const now = Date.now();
  if (cachedLiveArticles.length > 0 && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedLiveArticles;
  }

  try {
    const rawArticles = await fetchCombinedRssNews({
      portfolioTickers,
      maxArticles: 50,
    });

    if (rawArticles.length > 0) {
      const processed = rawArticles.map((art, idx) =>
        tagAndAnalyzeArticle(
          {
            headline: art.headline || "",
            description: art.description || "",
            source: art.source || "News",
            timestamp: art.timestamp || new Date().toISOString(),
          },
          idx,
          portfolioTickers
        )
      );
      cachedLiveArticles = processed;
      lastFetchTime = now;
      console.log(`[NewsService] 📰 Processed & cached ${processed.length} live financial news articles.`);
      return processed;
    }
  } catch (err: any) {
    console.warn(`[NewsService] ⚠️ Live RSS fetch failed (${err.message}). Using fallback cached news.`);
  }

  return cachedLiveArticles;
}
