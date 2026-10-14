/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║        NIFTY50GPT — 3-HOUR INSTITUTIONAL ANALYST SCHEDULER           ║
 * ║                                                                      ║
 * ║  Periodically pre-warms and updates consensus analyst targets and    ║
 * ║  ratings for all 50 Nifty companies in the background every 3 hours. ║
 * ║  User requests are served instantly (<1ms) from the pre-warmed cache.║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { NIFTY50_STOCKS } from "../constants/nifty50.js";
import { fetchRealYahooAnalyst } from "./yahooFinanceService.js";
import { marketCache } from "../utils/cache.js";

const DEFAULT_INTERVAL_MS = 3 * 60 * 60 * 1000; // 3 hours
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours TTL so it remains hot between cycles

let intervalId: NodeJS.Timeout | null = null;
let isRunning = false;
let lastRunTime: string | null = null;
let successfulCount = 0;

export interface AnalystSchedulerOptions {
  intervalMs?: number;
  runImmediately?: boolean;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Executes a full background batch update of analyst consensus for all Nifty 50 stocks.
 */
export async function refreshAllAnalystData(): Promise<{ total: number; successful: number }> {
  if (isRunning) {
    console.log("[AnalystScheduler] Batch refresh is already in progress, skipping duplicate trigger.");
    return { total: NIFTY50_STOCKS.length, successful: successfulCount };
  }

  isRunning = true;
  lastRunTime = new Date().toISOString();
  console.log(`[AnalystScheduler] ⏳ Starting scheduled 3-hour refresh for all ${NIFTY50_STOCKS.length} Nifty 50 companies...`);

  let success = 0;

  try {
    for (const stock of NIFTY50_STOCKS) {
      try {
        const data = await fetchRealYahooAnalyst(stock.ticker);
        if (data && data.totalAnalysts > 0) {
          const cacheKey = `analyst_${stock.ticker.toUpperCase()}`;
          marketCache.set(cacheKey, data, CACHE_TTL_MS);
          success++;
        }
      } catch (err: any) {
        console.warn(`[AnalystScheduler] Failed to fetch analyst data for ${stock.ticker}:`, err.message);
      }
      // Pacing delay between stock requests to respect network connections
      await sleep(150);
    }

    successfulCount = success;
    console.log(`[AnalystScheduler] ✅ Successfully updated real analyst consensus for ${success}/${NIFTY50_STOCKS.length} companies. Next scheduled run in 3 hours.`);
  } catch (err: any) {
    console.error("[AnalystScheduler] Error in scheduled batch execution:", err.message);
  } finally {
    isRunning = false;
  }

  return { total: NIFTY50_STOCKS.length, successful: success };
}

/**
 * Starts the 3-hour recurring analyst scheduler.
 */
export function startAnalystScheduler(options: AnalystSchedulerOptions = {}) {
  const { intervalMs = DEFAULT_INTERVAL_MS, runImmediately = true } = options;

  if (intervalId) {
    clearInterval(intervalId);
  }

  console.log(`[AnalystScheduler] Initialized background scheduler (Interval: ${intervalMs / (60 * 60 * 1000)}h).`);

  if (runImmediately) {
    // Non-blocking initial pre-warm in background
    setTimeout(() => {
      refreshAllAnalystData().catch((err) => {
        console.warn("[AnalystScheduler] Initial pre-warm failed:", err.message);
      });
    }, 1500);
  }

  intervalId = setInterval(() => {
    refreshAllAnalystData().catch((err) => {
      console.warn("[AnalystScheduler] Scheduled interval run failed:", err.message);
    });
  }, intervalMs);
}

/**
 * Stops the analyst scheduler.
 */
export function stopAnalystScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[AnalystScheduler] Stopped background scheduler.");
  }
}

/**
 * Returns current health status of the analyst scheduler.
 */
export function getAnalystSchedulerStatus() {
  return {
    active: intervalId !== null,
    isRunning,
    lastRun: lastRunTime,
    successfulCount,
    totalTracked: NIFTY50_STOCKS.length,
    intervalHours: DEFAULT_INTERVAL_MS / (60 * 60 * 1000),
  };
}
