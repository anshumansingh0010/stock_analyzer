/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║       NIFTY50GPT — NEWS SCHEDULER (Layer 2 Background Engine)       ║
 * ║                                                                      ║
 * ║  Runs every 15 minutes to pre-analyze news articles.                ║
 * ║  Results are cached in-memory (or can be persisted to disk/DB).     ║
 * ║  By the time a user asks → the work is already done.                ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { analyzeBatch, AnalyzedArticleResult } from "./newsAnalyzer.js";
import { NewsArticleInput } from "../prompts/newsPrompt.js";
import { fetchCombinedRssNews } from "./rssService.js";

export interface SchedulerCache {
  results: AnalyzedArticleResult[];
  portfolio: any[];
  lastRunAt: string | null;
  nextRunAt: string | null;
  isRunning: boolean;
  runCount: number;
  errors: Array<{ time: string; error: string }>;
}

const cache: SchedulerCache = {
  results: [],
  portfolio: [],
  lastRunAt: null,
  nextRunAt: null,
  isRunning: false,
  runCount: 0,
  errors: [],
};

let schedulerHandle: NodeJS.Timeout | null = null;
const DEFAULT_INTERVAL_MS = 15 * 60 * 1000;

export async function fetchLatestNews(portfolio: any[] = []): Promise<NewsArticleInput[]> {
  try {
    const portfolioTickers = portfolio.map((p) => p.ticker || p.symbol).filter(Boolean);
    const articles = await fetchCombinedRssNews({
      portfolioTickers,
      maxArticles: 25,
    });

    if (articles.length > 0) {
      return articles;
    }
  } catch (err: any) {
    console.warn(`[NewsScheduler] ⚠️ Live RSS fetch failed (${err.message}). Using fallback sample articles.`);
  }

  // Fallback to sample articles if RSS fails or returns empty
  return [
    {
      headline: "Reliance Industries reports record Q4 profit, beats estimates",
      description:
        "Reliance Industries Limited posted a net profit of ₹21,243 crore for Q4 FY26, surpassing analyst estimates of ₹19,500 crore. Strong performance driven by Jio and retail segments.",
      source: "Economic Times",
      timestamp: new Date().toISOString(),
    },
    {
      headline: "RBI keeps repo rate unchanged at 6.5%, maintains accommodative stance",
      description:
        "The Reserve Bank of India held its benchmark repo rate at 6.5% for the sixth consecutive meeting. Governor cited easing inflation and steady GDP growth as key factors.",
      source: "Mint",
      timestamp: new Date().toISOString(),
    },
    {
      headline: "Infosys revises FY27 revenue guidance downward amid macro uncertainty",
      description:
        "Infosys lowered its annual revenue growth guidance to 4-6% from 8-10% citing client spending caution in North America and Europe. Management expects recovery in H2 FY27.",
      source: "Business Standard",
      timestamp: new Date().toISOString(),
    },
  ];
}

export async function runAnalysisCycle(): Promise<void> {
  if (cache.isRunning) {
    console.log("[NewsScheduler] Skipping — previous run still in progress");
    return;
  }

  cache.isRunning = true;
  const cycleStart = Date.now();

  console.log(
    `\n[NewsScheduler] ▶ Cycle #${cache.runCount + 1} started at ${new Date().toISOString()}`
  );

  try {
    const articles = await fetchLatestNews(cache.portfolio);
    console.log(`[NewsScheduler] 📰 Fetched ${articles.length} articles`);

    if (articles.length === 0) {
      console.log("[NewsScheduler] No articles to analyze — skipping");
      return;
    }

    // Limit background LLM pre-tagging to top 3 articles to conserve API quota for user chat queries
    const bgBatch = articles.slice(0, 3);
    const results = await analyzeBatch(bgBatch, cache.portfolio, {
      concurrency: 1,
      onProgress: (done, total, result) => {
        const headline = result?._meta?.article?.headline?.slice(0, 50) || "?";
        console.log(`[NewsScheduler] ✓ ${done}/${total} — "${headline}..."`);
      },
    });

    const successful = results.filter((r) => !r._error);
    const failed = results.filter((r) => r._error);

    cache.results = successful;
    cache.lastRunAt = new Date().toISOString();
    cache.runCount += 1;

    if (failed.length > 0) {
      cache.errors = [
        ...failed.map((f) => ({ time: new Date().toISOString(), error: f._error || "Error" })),
        ...cache.errors,
      ].slice(0, 10);
    }

    const elapsed = ((Date.now() - cycleStart) / 1000).toFixed(1);
    console.log(
      `[NewsScheduler] ✅ Cycle #${cache.runCount} complete — ${successful.length} analyzed, ${failed.length} failed (${elapsed}s)`
    );

    const portfolioHits = successful.flatMap((r) =>
      r.companies.filter((c) => c.inUserPortfolio)
    );
    if (portfolioHits.length > 0) {
      console.log(
        `[NewsScheduler] 💼 Portfolio alerts: ${portfolioHits
          .map((h) => h.ticker)
          .join(", ")}`
      );
    }
  } catch (err: any) {
    console.error(`[NewsScheduler] ❌ Cycle failed: ${err.message}`);
    cache.errors = [
      { time: new Date().toISOString(), error: err.message },
      ...cache.errors,
    ].slice(0, 10);
  } finally {
    cache.isRunning = false;
    cache.nextRunAt = new Date(Date.now() + DEFAULT_INTERVAL_MS).toISOString();
  }
}

export interface StartSchedulerOptions {
  intervalMs?: number;
  portfolio?: any[];
  runImmediately?: boolean;
}

export function startScheduler(options: StartSchedulerOptions = {}): void {
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  const runImmediately = options.runImmediately ?? true;

  if (options.portfolio) {
    cache.portfolio = options.portfolio;
  }

  if (schedulerHandle) {
    console.log("[NewsScheduler] Already running — ignoring start()");
    return;
  }

  console.log(`[NewsScheduler] 🚀 Starting — interval: ${intervalMs / 60000}min`);

  if (runImmediately) {
    setTimeout(() => {
      runAnalysisCycle().catch((e) =>
        console.error("[NewsScheduler] Initial run error:", e.message)
      );
    }, 60_000);
  }

  cache.nextRunAt = new Date(Date.now() + intervalMs).toISOString();

  schedulerHandle = setInterval(() => {
    runAnalysisCycle().catch((e) =>
      console.error("[NewsScheduler] Interval run error:", e.message)
    );
  }, intervalMs);
}

export function stopScheduler(): void {
  if (schedulerHandle) {
    clearInterval(schedulerHandle);
    schedulerHandle = null;
    console.log("[NewsScheduler] Stopped.");
  }
}

export function triggerNow(): Promise<void> {
  console.log("[NewsScheduler] Manual trigger fired");
  return runAnalysisCycle();
}

export function updatePortfolio(portfolio: any[]): void {
  cache.portfolio = portfolio;
  console.log(`[NewsScheduler] Portfolio updated — ${portfolio.length} holdings`);
}

export function getResults(): AnalyzedArticleResult[] {
  return cache.results;
}

export function getStatus() {
  return {
    isRunning: cache.isRunning,
    lastRunAt: cache.lastRunAt,
    nextRunAt: cache.nextRunAt,
    runCount: cache.runCount,
    articlesCached: cache.results.length,
    portfolioSize: cache.portfolio.length,
    recentErrors: cache.errors.slice(0, 3),
  };
}

export function getPortfolioAlerts() {
  return cache.results.flatMap((result) =>
    result.companies
      .filter((c) => c.inUserPortfolio)
      .map((c) => ({
        article: result._meta?.article,
        company: c,
        overallSentiment: result.overallMarketSentiment,
        urgency: result.urgency,
        analyzedAt: result._meta?.analyzedAt,
      }))
  );
}
