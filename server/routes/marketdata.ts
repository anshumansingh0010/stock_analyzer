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
import { marketCache } from "../utils/cache.js";

export default async function marketdataRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get("/snapshot", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const snapshot = await fetchFullMarketSnapshot();
      return reply.send({ success: true, ...snapshot });
    } catch (err: any) {
      return reply.status(500).send({ error: "Market data fetch failed", message: err.message });
    }
  });

  fastify.get("/indices", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await fetchNifty50Indices();
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  fastify.get("/movers", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await fetchNifty50Movers();
      return reply.send({ success: true, ...data });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  fastify.get("/sectors", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const sectors = await fetchSectorPerformance();
      return reply.send({ success: true, sectors });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  fastify.get("/quote/:ticker", async (request: FastifyRequest, reply: FastifyReply) => {
    const { ticker } = request.params as any;
    try {
      const quote = await fetchStockQuote(ticker.toUpperCase());
      if (!quote) return reply.status(404).send({ error: `No data found for ticker: ${ticker}` });
      return reply.send({ success: true, quote });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  fastify.get("/candles/:ticker", async (request: FastifyRequest, reply: FastifyReply) => {
    const { ticker } = request.params as any;
    const query = request.query as any;
    const interval = query.interval || "15m";
    const days = parseInt(query.days || "25") || 25;

    try {
      const result = await fetchStockCandles(ticker.toUpperCase(), interval, days);
      return reply.send({ success: true, ...result });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  fastify.get("/cache/clear", async (_request: FastifyRequest, reply: FastifyReply) => {
    marketCache.clear();
    return reply.send({ success: true, message: "Market data cache cleared" });
  });
}
