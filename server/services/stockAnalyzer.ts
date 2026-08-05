/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║       NIFTY50GPT — STOCK ANALYZER SERVICE (Layer 3)                 ║
 * ║                                                                      ║
 * ║  Calls the LLM with the Layer 3 Stock Prompt.                       ║
 * ║  Returns a structured analyst report.                               ║
 * ║  Supports single stock + streaming for real-time UI.                ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import OpenAI from "openai";
import {
  buildStockMessages,
  deriveTechnicalSummary,
  BasicStockData,
  TechnicalData,
  StockNewsItem,
  UserHoldingData,
  TechnicalSummary,
} from "../prompts/stockPrompt.js";
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

export interface AnalyzeStockOptions {
  model?: string;
  extra?: Record<string, any>;
}

export interface AnalyzeStockResult {
  report: string;
  derived: TechnicalSummary;
  meta: {
    ticker?: string;
    analyzedAt: string;
    model: string;
    tokens?: number;
    hasHolding: boolean;
  };
}

export async function analyzeStock(
  stock: BasicStockData,
  technical: TechnicalData = {},
  news: StockNewsItem[] = [],
  userHolding: UserHoldingData | null = null,
  options: AnalyzeStockOptions = {}
): Promise<AnalyzeStockResult> {
  const client = getLLMClient();
  const provider = process.env.LLM_PROVIDER || "openai";
  const model = options.model || (provider === "gemini" ? "gemini-2.0-flash" : "gpt-4o-mini");

  const derived = deriveTechnicalSummary(stock, technical);
  const messages: any[] = buildStockMessages(stock, technical, news, userHolding);

  const completion = await withRetry(() =>
    client.chat.completions.create({
      model,
      messages,
      temperature: 0.25,
      max_tokens: 1400,
      ...options.extra,
    })
  );

  const report = completion.choices[0]?.message?.content ?? "No analysis generated.";

  return {
    report,
    derived,
    meta: {
      ticker: stock.ticker,
      analyzedAt: new Date().toISOString(),
      model: completion.model,
      tokens: completion.usage?.total_tokens,
      hasHolding: !!userHolding,
    },
  };
}

export async function analyzeStockStream(
  stock: BasicStockData,
  technical: TechnicalData = {},
  news: StockNewsItem[] = [],
  userHolding: UserHoldingData | null = null,
  onChunk?: (token: string) => void,
  options: AnalyzeStockOptions = {}
): Promise<{ derived: TechnicalSummary; meta: { ticker?: string; analyzedAt: string; model: string; hasHolding: boolean } }> {
  const client = getLLMClient();
  const provider = process.env.LLM_PROVIDER || "openai";
  const model = options.model || (provider === "gemini" ? "gemini-2.0-flash" : "gpt-4o-mini");

  const derived = deriveTechnicalSummary(stock, technical);
  const messages: any[] = buildStockMessages(stock, technical, news, userHolding);

  const stream = await withRetry(() =>
    client.chat.completions.create({
      model,
      messages,
      temperature: 0.25,
      max_tokens: 1400,
      stream: true,
    })
  );

  let fullReport = "";
  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content || "";
    if (token) {
      fullReport += token;
      if (typeof onChunk === "function") onChunk(token);
    }
  }

  return {
    derived,
    meta: {
      ticker: stock.ticker,
      analyzedAt: new Date().toISOString(),
      model,
      hasHolding: !!userHolding,
    },
  };
}

export interface ScreenStockItem {
  stock: BasicStockData;
  technical: TechnicalData;
}

export function screenStocks(stocks: ScreenStockItem[]): any[] {
  return stocks
    .map(({ stock, technical }) => {
      const d = deriveTechnicalSummary(stock, technical);

      let score = 0;
      if (d.trend === "UPTREND") score += 2;
      if (d.trend === "DOWNTREND") score -= 2;
      if (d.rsiZone === "OVERSOLD") score += 1;
      if (d.rsiZone === "OVERBOUGHT") score -= 1;
      if (d.macdDirection === "BULLISH") score += 1;
      if (d.macdDirection === "BEARISH") score -= 1;
      if (d.volumeConviction === "HIGH") score += 1;
      if (d.volumeConviction === "LOW") score -= 1;

      return {
        ticker: stock.ticker,
        name: stock.name,
        price: stock.price,
        "change%": stock["change%"],
        ...d,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);
}
