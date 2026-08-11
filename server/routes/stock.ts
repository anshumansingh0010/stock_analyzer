/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║          NIFTY50GPT — STOCK API ROUTES (Fastify Plugin)             ║
 * ║                                                                      ║
 * ║  POST /api/stock/analyze         → Full analyst report (standard)   ║
 * ║  POST /api/stock/analyze/stream  → Streaming analyst report (SSE)   ║
 * ║  POST /api/stock/screen          → Multi-stock technical screener   ║
 * ║  GET  /api/stock/nifty50         → Nifty 50 tickers reference list  ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  analyzeStock,
  analyzeStockStream,
  screenStocks,
} from "../services/stockAnalyzer.js";
import { deriveTechnicalSummary } from "../prompts/stockPrompt.js";
import { NIFTY50_STOCKS } from "../constants/nifty50.js";

// Re-export for any external consumers
export { NIFTY50_STOCKS };

export default async function stockRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post("/analyze", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { stock, technical = {}, news = [], userHolding = null, options = {} } = request.body as any;

      if (!stock || !stock.ticker) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "'stock.ticker' is required.",
        });
      }
      if (!stock.name) {
        const ref = NIFTY50_STOCKS.find(
          (s) => s.ticker.toUpperCase() === stock.ticker.toUpperCase()
        );
        if (ref) stock.name = ref.name;
      }

      const result = await analyzeStock(stock, technical, news, userHolding, options);

      return reply.send({
        success: true,
        ticker: stock.ticker,
        report: result.report,
        derived: result.derived,
        meta: result.meta,
      });
    } catch (err: any) {
      request.log.error(err, "[Stock/analyze]");
      if (err.status === 401) return reply.status(401).send({ error: "Invalid API key" });
      if (err.status === 429) return reply.status(429).send({ error: "LLM rate limit — retry shortly" });
      return reply.status(500).send({ error: "Analysis failed", message: err.message });
    }
  });

  fastify.post("/analyze/stream", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { stock, technical = {}, news = [], userHolding = null, options = {} } = request.body as any;

      if (!stock?.ticker) {
        return reply.status(400).send({ error: "'stock.ticker' is required." });
      }

      if (!stock.name) {
        const ref = NIFTY50_STOCKS.find(
          (s) => s.ticker.toUpperCase() === stock.ticker.toUpperCase()
        );
        if (ref) stock.name = ref.name;
      }

      reply.raw.setHeader("Content-Type", "text/event-stream");
      reply.raw.setHeader("Cache-Control", "no-cache");
      reply.raw.setHeader("Connection", "keep-alive");

      const derived = deriveTechnicalSummary(stock, technical);
      reply.raw.write(`data: ${JSON.stringify({ type: "derived", derived })}\n\n`);

      const meta = await analyzeStockStream(
        stock,
        technical,
        news,
        userHolding,
        (token: string) => {
          reply.raw.write(`data: ${JSON.stringify({ type: "token", token })}\n\n`);
        },
        options
      );

      reply.raw.write(`data: ${JSON.stringify({ type: "done", meta })}\n\n`);
      reply.raw.end();
    } catch (err: any) {
      request.log.error(err, "[Stock/stream]");
      reply.raw.write(`data: ${JSON.stringify({ type: "error", error: err.message })}\n\n`);
      reply.raw.end();
    }
  });

  fastify.post("/screen", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { stocks } = request.body as any;

      if (!Array.isArray(stocks) || stocks.length === 0) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "'stocks' must be a non-empty array of { stock, technical } objects.",
        });
      }
      if (stocks.length > 50) {
        return reply.status(400).send({ error: "Maximum 50 stocks per screen." });
      }

      const ranked = screenStocks(stocks);

      return reply.send({
        success: true,
        count: ranked.length,
        ranked,
        screenedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      request.log.error(err, "[Stock/screen]");
      return reply.status(500).send({ error: err.message });
    }
  });

  fastify.get("/nifty50", async (request: FastifyRequest, reply: FastifyReply) => {
    const { sector } = request.query as any;

    let list = NIFTY50_STOCKS;
    if (sector) {
      list = list.filter(
        (s) => s.sector.toLowerCase() === (sector as string).toLowerCase()
      );
    }

    return reply.send({
      success: true,
      count: list.length,
      stocks: list,
    });
  });
}
