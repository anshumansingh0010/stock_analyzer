import { Portfolio } from "../models/Portfolio.js";
import { fetchRealYahooQuote } from "./yahooFinanceService.js";
import { generateAlert } from "./alertService.js";

let intervalId: NodeJS.Timeout | null = null;
let isRunning = false;

// Track triggered alerts to avoid spamming. Key: `${userId}_${ticker}`, Value: timestamp
const triggeredAlerts = new Map<string, number>();
const ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface PriceSchedulerOptions {
  intervalMs?: number;
  runImmediately?: boolean;
}

export function startPriceScheduler(options: PriceSchedulerOptions = {}) {
  const { intervalMs = 60 * 1000, runImmediately = true } = options;

  if (intervalId) {
    clearInterval(intervalId);
  }

  const job = async () => {
    if (isRunning) return;
    isRunning = true;

    try {
      // 1. Fetch all user portfolios
      const portfolios = await Portfolio.find({});
      if (!portfolios || portfolios.length === 0) {
        isRunning = false;
        return;
      }

      const now = Date.now();

      // Clear old cooldowns
      for (const [key, timestamp] of triggeredAlerts.entries()) {
        if (now - timestamp > ALERT_COOLDOWN_MS) {
          triggeredAlerts.delete(key);
        }
      }

      for (const portfolio of portfolios) {
        if (!portfolio.holdings || portfolio.holdings.length === 0) continue;

        for (const holding of portfolio.holdings) {
          const ticker = holding.ticker;
          if (!ticker) continue;

          const alertKey = `${portfolio.userId}_${ticker}`;
          if (triggeredAlerts.has(alertKey)) continue;

          try {
            const quote = await fetchRealYahooQuote(ticker);
            if (!quote || !quote.price) continue;
            
            const currentPrice = quote.price;
            const changePct = quote["change%"] || 0;
            const avgPrice = holding.avgPrice || currentPrice;

            let triggered = false;
            let triggerMessage = "";

            // Condition 1: Daily drop of 5% or more
            if (changePct <= -5) {
              triggered = true;
              triggerMessage = `Major Drop Alert! ${ticker} is down ${Math.abs(changePct).toFixed(2)}% today (Current: ₹${currentPrice.toFixed(2)}).`;
            } 
            // Condition 2: Current price is 10% below average buy price
            else if (avgPrice > 0 && currentPrice <= avgPrice * 0.90) {
              triggered = true;
              const lossPct = ((avgPrice - currentPrice) / avgPrice) * 100;
              triggerMessage = `Stop Loss Warning! ${ticker} has fallen ${lossPct.toFixed(2)}% below your average buy price of ₹${avgPrice} (Current: ₹${currentPrice.toFixed(2)}).`;
            }

            if (triggered) {
              triggeredAlerts.set(alertKey, now);

              // Generate a system push alert
              await generateAlert(
                "PRICE_MOVE", 
                { ticker: ticker, price: currentPrice } as any, 
                triggerMessage, 
                undefined, 
                { userId: portfolio.userId } as any
              );
              console.log(`[PriceScheduler] 📉 Triggered portfolio drop alert for ${ticker} for user ${portfolio.userId}: ${triggerMessage}`);
            }
          } catch (tickerErr: any) {
            console.warn(`[PriceScheduler] Failed to fetch quote for ${ticker}: ${tickerErr.message}`);
          }
        }
      }
    } catch (err: any) {
      console.error(`[PriceScheduler] Error: ${err.message}`);
    } finally {
      isRunning = false;
    }
  };

  if (runImmediately) {
    job();
  }

  intervalId = setInterval(job, intervalMs);
  console.log(`[PriceScheduler] 🕒 Started portfolio monitoring every ${intervalMs}ms`);
}

export function stopPriceScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[PriceScheduler] 🛑 Stopped");
  }
}

export function getPriceSchedulerStatus() {
  return {
    running: intervalId !== null,
    currentlyProcessing: isRunning,
    monitoredPortfolios: triggeredAlerts.size,
  };
}
