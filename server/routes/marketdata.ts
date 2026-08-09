/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  NIFTY50GPT — LAYER 6: MARKET DATA ROUTES (Fastify Plugin)        ║
 * ║                                                                      ║
 * ║  GET  /api/marketdata/snapshot   → Full Nifty 50 snapshot          ║
 * ║  GET  /api/marketdata/indices    → Index levels only               ║
 * ║  GET  /api/marketdata/movers     → Top gainers & losers            ║
 * ║  GET  /api/marketdata/sectors    → Sector performance              ║
 * ║  GET  /api/marketdata/quote/:ticker → Single stock quote           ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  fetchNifty50Indices,
  fetchNifty50Movers,
  fetchStockQuote,
  fetchSectorPerformance,
  fetchFullMarketSnapshot,
  fetchStockCandles,
} from "../services/marketDataService.js";

const cache = new Map<string, { data: any; ts: number }>();
const TTL_MS = 60_000;

function fromCache(key: string): any {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function toCache(key: string, data: any): void {
  cache.set(key, { data, ts: Date.now() });
}

export default async function marketdataRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get("/snapshot", async (_request: FastifyRequest, reply: FastifyReply) => {
    const cached = fromCache("snapshot");
    if (cached) return reply.send({ success: true, cached: true, ...cached });

    try {
      const snapshot = await fetchFullMarketSnapshot();
      toCache("snapshot", snapshot);
      return reply.send({ success: true, cached: false, ...snapshot });
    } catch (err: any) {
      return reply.status(500).send({ error: "Market data fetch failed", message: err.message });
    }
  });

  fastify.get("/indices", async (_request: FastifyRequest, reply: FastifyReply) => {
    const cached = fromCache("indices");
    if (cached) return reply.send({ success: true, cached: true, data: cached });

    try {
      const data = await fetchNifty50Indices();
      toCache("indices", data);
      return reply.send({ success: true, cached: false, data });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  fastify.get("/movers", async (_request: FastifyRequest, reply: FastifyReply) => {
    const cached = fromCache("movers");
    if (cached) return reply.send({ success: true, cached: true, ...cached });

    try {
      const data = await fetchNifty50Movers();
      toCache("movers", data);
      return reply.send({ success: true, cached: false, ...data });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  fastify.get("/sectors", async (_request: FastifyRequest, reply: FastifyReply) => {
    const cached = fromCache("sectors");
    if (cached) return reply.send({ success: true, cached: true, sectors: cached });

    try {
      const sectors = await fetchSectorPerformance();
      toCache("sectors", sectors);
      return reply.send({ success: true, cached: false, sectors });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  fastify.get("/quote/:ticker", async (request: FastifyRequest, reply: FastifyReply) => {
    const { ticker } = request.params as any;
    const key = `quote_${ticker.toUpperCase()}`;
    const cached = fromCache(key);
    if (cached) return reply.send({ success: true, cached: true, quote: cached });

    try {
      const quote = await fetchStockQuote(ticker.toUpperCase());
      if (!quote) return reply.status(404).send({ error: `No data found for ticker: ${ticker}` });
      toCache(key, quote);
      return reply.send({ success: true, cached: false, quote });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  fastify.get("/candles/:ticker", async (request: FastifyRequest, reply: FastifyReply) => {
    const { ticker } = request.params as any;
    const query = request.query as any;
    const interval = query.interval || "15m";
    const days = parseInt(query.days || "25") || 25;

    const key = `candles_${ticker.toUpperCase()}_${interval}_${days}`;
    const cached = fromCache(key);
    if (cached) return reply.send({ success: true, cached: true, ...cached });

    try {
      const result = await fetchStockCandles(ticker.toUpperCase(), interval, days);
      toCache(key, result);
      return reply.send({ success: true, cached: false, ...result });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  fastify.get("/cache/clear", async (_request: FastifyRequest, reply: FastifyReply) => {
    cache.clear();
    return reply.send({ success: true, message: "Market data cache cleared" });
  });
}
