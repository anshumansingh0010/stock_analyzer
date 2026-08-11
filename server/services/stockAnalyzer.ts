// Stock Analyzer — calls the LLM with the stock prompt and returns a structured analyst report.

import {
  buildStockMessages,
  deriveTechnicalSummary,
  BasicStockData,
  TechnicalData,
  StockNewsItem,
  UserHoldingData,
  TechnicalSummary,
} from "../prompts/stockPrompt.js";
import { getLLMClient, getModel, withRetry } from "./llmService.js";

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
  const model = getModel(options);

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
  const model = getModel(options);

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
      onChunk?.(token);
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
