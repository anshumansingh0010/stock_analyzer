/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║            NIFTY50GPT — GROWW API SERVICE INTEGRATION                ║
 * ║                                                                      ║
 * ║  Wraps Groww Trade API endpoints for live quotes & candles.         ║
 * ║  Falls back gracefully if requests fail or endpoints rate-limit.    ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import axios from "axios";

const GROWW_BASE_URL = "https://api.groww.in";

export interface GrowwCandle {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface GrowwQuote {
  ticker: string;
  price: number;
  changePct: number;
  high: number;
  low: number;
  volume: number;
}

function getAuthHeaders() {
  const apiKey = process.env.GROWW_API_KEY;
  const secretKey = process.env.GROWW_SECRET_KEY;
  return {
    "Authorization": `Bearer ${apiKey}`,
    "X-API-KEY": apiKey,
    "X-SECRET-KEY": secretKey,
    "Accept": "application/json",
    "Content-Type": "application/json",
  };
}

export function isGrowwConfigured(): boolean {
  return Boolean(process.env.GROWW_API_KEY && process.env.GROWW_SECRET_KEY);
}

/**
 * Fetch historical candle data for a given ticker from Groww API
 */
export async function fetchGrowwCandles(
  ticker: string,
  interval: string = "15m",
  days: number = 25
): Promise<GrowwCandle[]> {
  if (!isGrowwConfigured()) {
    throw new Error("Groww API keys not configured in environment");
  }

  const symbol = ticker.toUpperCase();
  const endTime = new Date();
  const startTime = new Date();
  startTime.setDate(endTime.getDate() - days);

  const intervalMinutes = interval === "1d" ? 1440 : interval === "1h" ? 60 : 15;

  try {
    const response = await axios.get(`${GROWW_BASE_URL}/v1/historical/candle/range`, {
      headers: getAuthHeaders(),
      params: {
        exchange: "NSE",
        segment: "CASH",
        trading_symbol: symbol,
        start_time: startTime.toISOString().slice(0, 19).replace("T", " "),
        end_time: endTime.toISOString().slice(0, 19).replace("T", " "),
        interval_in_minutes: intervalMinutes,
      },
      timeout: 8000,
    });

    const candles = response.data?.candles || response.data?.data || response.data?.results || [];
    if (!Array.isArray(candles) || candles.length === 0) {
      throw new Error(`No candle data returned for ${symbol}`);
    }

    return candles.map((c: any) => {
      if (Array.isArray(c)) {
        const [t, o, h, l, cl, v] = c;
        const dt = typeof t === "number" ? new Date(t * 1000) : new Date(t);
        const month = dt.toLocaleString("en-US", { month: "short" });
        const day = dt.getDate();
        return {
          time: `${month} ${day}`,
          timestamp: dt.getTime(),
          open: parseFloat(o),
          high: parseFloat(h),
          low: parseFloat(l),
          close: parseFloat(cl),
          volume: parseInt(v || 0),
        };
      }

      const dt = new Date(c.time || c.timestamp || c.date || Date.now());
      const month = dt.toLocaleString("en-US", { month: "short" });
      const day = dt.getDate();
      return {
        time: `${month} ${day}`,
        timestamp: dt.getTime(),
        open: parseFloat(c.open || c.o || 0),
        high: parseFloat(c.high || c.h || 0),
        low: parseFloat(c.low || c.l || 0),
        close: parseFloat(c.close || c.c || 0),
        volume: parseInt(c.volume || c.v || 0),
      };
    });
  } catch (err: any) {
    console.warn(`[GrowwService] Candle fetch failed for ${symbol}: ${err.message}`);
    throw err;
  }
}

/**
 * Fetch live stock quote from Groww API
 */
export async function fetchGrowwQuote(ticker: string): Promise<GrowwQuote | null> {
  if (!isGrowwConfigured()) return null;

  try {
    const response = await axios.get(`${GROWW_BASE_URL}/v1/live/quote`, {
      headers: getAuthHeaders(),
      params: { exchange: "NSE", trading_symbol: ticker.toUpperCase() },
      timeout: 5000,
    });

    const d = response.data?.data || response.data;
    if (!d || !d.lastPrice) return null;

    return {
      ticker: ticker.toUpperCase(),
      price: parseFloat(d.lastPrice),
      changePct: parseFloat(d.dayChangePerc || d.pChange || 0),
      high: parseFloat(d.dayHigh || d.high || 0),
      low: parseFloat(d.dayLow || d.low || 0),
      volume: parseInt(d.totalTradedVolume || d.volume || 0),
    };
  } catch (err: any) {
    console.warn(`[GrowwService] Live quote fetch failed for ${ticker}: ${err.message}`);
    return null;
  }
}
