// Market Analyzer — powers "Why is Nifty up/down?" briefings with standard and streaming LLM responses.

import {
  buildMarketMessages,
  deriveMarketMetrics,
  BriefingType,
  MarketIndexData,
  StockMover,
  SectorPerf,
  GlobalCuesData,
  MarketNewsItem,
  UserPortfolioItem,
  DerivedMarketMetrics,
} from "../prompts/marketPrompt.js";
import { getLLMClient, getModel, withRetry } from "./llmService.js";

export interface AnalyzeMarketOptions {
  model?: string;
  extra?: Record<string, any>;
}

export interface AnalyzeMarketResult {
  commentary: string;
  derived: DerivedMarketMetrics;
  meta: {
    briefingType: BriefingType;
    generatedAt: string;
    model: string;
    tokens?: number;
  };
}

export async function analyzeMarket(
  index: MarketIndexData = {},
  gainers: StockMover[] = [],
  losers: StockMover[] = [],
  sectors: SectorPerf[] = [],
  globalCues: GlobalCuesData = {},
  news: MarketNewsItem[] = [],
  userPortfolio: UserPortfolioItem[] = [],
  briefingType: BriefingType = "INTRADAY",
  options: AnalyzeMarketOptions = {}
): Promise<AnalyzeMarketResult> {
  const client = getLLMClient();
  const model = getModel(options);

  const derived = deriveMarketMetrics(gainers, losers, sectors, index);
  const messages: any[] = buildMarketMessages(
    index,
    gainers,
    losers,
    sectors,
    globalCues,
    news,
    userPortfolio,
    briefingType
  );

  const completion = await withRetry(() =>
    client.chat.completions.create({
      model,
      messages,
      temperature: 0.35,
      max_tokens: 1600,
      ...options.extra,
    })
  );

  const commentary = completion.choices[0]?.message?.content ?? "No analysis generated.";

  return {
    commentary,
    derived,
    meta: {
      briefingType,
      generatedAt: new Date().toISOString(),
      model: completion.model,
      tokens: completion.usage?.total_tokens,
    },
  };
}

export async function analyzeMarketStream(
  index: MarketIndexData,
  gainers: StockMover[],
  losers: StockMover[],
  sectors: SectorPerf[],
  globalCues: GlobalCuesData,
  news: MarketNewsItem[],
  userPortfolio: UserPortfolioItem[],
  briefingType: BriefingType = "INTRADAY",
  onChunk?: (token: string) => void,
  options: AnalyzeMarketOptions = {}
): Promise<{ derived: DerivedMarketMetrics; meta: { briefingType: BriefingType; generatedAt: string; model: string } }> {
  const client = getLLMClient();
  const model = getModel(options);

  const derived = deriveMarketMetrics(gainers, losers, sectors, index);
  const messages: any[] = buildMarketMessages(
    index,
    gainers,
    losers,
    sectors,
    globalCues,
    news,
    userPortfolio,
    briefingType
  );

  const stream = await withRetry(() =>
    client.chat.completions.create({
      model,
      messages,
      temperature: 0.35,
      max_tokens: 1600,
      stream: true,
    })
  );

  let fullText = "";
  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content || "";
    if (token) {
      fullText += token;
      onChunk?.(token);
    }
  }

  return {
    derived,
    meta: {
      briefingType,
      generatedAt: new Date().toISOString(),
      model,
    },
  };
}

export function getBriefingType(): "MORNING" | "INTRADAY" | "CLOSING" | "AFTER_HOURS" {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset - now.getTimezoneOffset() * 60 * 1000);
  const hour = ist.getHours();
  const min = ist.getMinutes();
  const hhmm = hour * 100 + min;

  if (hhmm >= 700 && hhmm < 915) return "MORNING";
  if (hhmm >= 915 && hhmm < 1530) return "INTRADAY";
  if (hhmm >= 1530 && hhmm < 1700) return "CLOSING";
  return "AFTER_HOURS";
}

export function generateQuickTakeaway(
  derived: DerivedMarketMetrics,
  gainers: StockMover[] = [],
  losers: StockMover[] = []
): string {
  const { direction, change, topGainer, topLoser, bestSector, worstSector, breadthSignal } = derived;

  if (direction === "FLAT") {
    return `Nifty 50 is trading flat near ${derived.niftyLevel} — markets in consolidation mode.`;
  }

  const isUp = direction === "UP";
  const leader = isUp ? topGainer : topLoser;
  const sector = isUp ? bestSector : worstSector;

  let text = `Nifty 50 is ${isUp ? "up" : "down"} ${Math.abs(change).toFixed(2)}% `;

  if (leader) {
    text += `led by ${leader.stock} (${(leader.change ?? 0) > 0 ? "+" : ""}${leader.change}%). `;
  }
  if (sector) {
    text += `${sector.name} sector is the ${isUp ? "top gainer" : "biggest drag"} at ${
      (sector.perf ?? 0) > 0 ? "+" : ""
    }${sector.perf}%. `;
  }

  const breadthNote =
    breadthSignal === "BROAD_BULLISH"
      ? "Broad-based buying across the market."
      : breadthSignal === "BROAD_BEARISH"
      ? "Widespread selling pressure across stocks."
      : "Mixed participation — selective movement.";

  return text + breadthNote;
}
