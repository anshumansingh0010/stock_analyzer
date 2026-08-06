/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║       NIFTY50GPT — NEWS ANALYZER SERVICE (Layer 2)                  ║
 * ║                                                                      ║
 * ║  Calls the LLM with the Layer 2 News Prompt to analyze a single     ║
 * ║  news article and return structured JSON sentiment data.             ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import OpenAI from "openai";
import {
  buildNewsMessages,
  parseAndValidateNewsOutput,
  NewsArticleInput,
  ParsedNewsOutput,
} from "../prompts/newsPrompt.js";
import { withRetry } from "./llmService.js";

function getLLMClient(): OpenAI {
  const provider = process.env.LLM_PROVIDER || "openai";

  if (provider === "gemini") {
    return new OpenAI({
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export interface AnalyzeArticleOptions {
  model?: string;
  extra?: Record<string, any>;
}

export interface AnalyzedArticleResult extends ParsedNewsOutput {
  _error?: string;
  _meta: {
    article: {
      headline?: string;
      source?: string;
      timestamp?: string;
    };
    analyzedAt: string;
    model?: string;
    tokens?: number;
  };
}

export async function analyzeArticle(
  article: NewsArticleInput,
  portfolio: any[] = [],
  options: AnalyzeArticleOptions = {}
): Promise<AnalyzedArticleResult> {
  const client = getLLMClient();
  const provider = process.env.LLM_PROVIDER || "openai";

  const model =
    options.model || (provider === "gemini" ? "gemini-3.6-flash" : "gpt-4o-mini");

  const messages: any[] = buildNewsMessages(article, portfolio);

  const completion = await withRetry(() =>
    client.chat.completions.create({
      model,
      messages,
      temperature: 0.1,
      max_tokens: 1200,
      response_format:
        provider === "openai" ? { type: "json_object" } : undefined,
    })
  );

  const rawOutput = completion.choices[0]?.message?.content ?? "";
  const result = parseAndValidateNewsOutput(rawOutput);

  return {
    ...result,
    _meta: {
      article: {
        headline: article.headline,
        source: article.source,
        timestamp: article.timestamp || new Date().toISOString(),
      },
      analyzedAt: new Date().toISOString(),
      model: completion.model,
      tokens: completion.usage?.total_tokens,
    },
  };
}

export interface AnalyzeBatchOptions extends AnalyzeArticleOptions {
  concurrency?: number;
  onProgress?: (completed: number, total: number, result: AnalyzedArticleResult) => void;
}

export async function analyzeBatch(
  articles: NewsArticleInput[],
  portfolio: any[] = [],
  options: AnalyzeBatchOptions = {}
): Promise<AnalyzedArticleResult[]> {
  const concurrency = options.concurrency ?? 3;
  const onProgress = options.onProgress ?? (() => {});

  const results: AnalyzedArticleResult[] = new Array(articles.length).fill(null as any);
  let cursor = 0;
  let completed = 0;

  async function worker() {
    while (cursor < articles.length) {
      const idx = cursor++;
      const article = articles[idx];

      try {
        if (idx > 0) await new Promise((r) => setTimeout(r, 4500));
        results[idx] = await analyzeArticle(article, portfolio, options);
      } catch (err: any) {
        console.error(`[NewsAnalyzer] Failed article [${idx}]: ${err.message}`);
        results[idx] = {
          _error: err.message,
          _meta: {
            article: { headline: article.headline },
            analyzedAt: new Date().toISOString(),
          },
          companies: [],
          overallMarketSentiment: "NEUTRAL",
          sectorAffected: [],
          urgency: "LOW",
          summary: "Analysis failed — see _error field.",
        };
      }

      completed++;
      onProgress(completed, articles.length, results[idx]);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, articles.length) },
    worker
  );
  await Promise.all(workers);

  return results;
}
