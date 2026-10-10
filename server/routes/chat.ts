/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║              NIFTY50GPT — CHAT API ROUTES (Fastify Plugin)          ║
 * ║  POST /api/chat        → Standard response                          ║
 * ║  POST /api/chat/stream → Server-Sent Events streaming response      ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { chat, chatStream } from "../services/llmService.js";
import { fetchFullMarketSnapshot } from "../services/marketDataService.js";
import { getResults as getCachedNews, fetchLatestNews } from "../services/newsScheduler.js";

function buildDynamicContext(query: string, context: any) {
  const q = query.toLowerCase();
  
  // 1. Intent Detection
  const needsNews = q.includes("news") || q.includes("happen") || q.includes("update") || q.includes("article");
  const needsPortfolio = q.includes("portfolio") || q.includes("my stock") || q.includes("holding") || q.includes("position");
  const needsMarket = q.includes("market") || q.includes("nifty") || q.includes("sensex") || q.includes("index") || q.includes("overall");
  
  // 2. Base payload only includes what is explicitly requested
  const dynamicContext = {
    settings: context.settings || {},
    marketData: needsMarket ? context.marketData : null,
    stockData: [] as any[],
    news: needsNews ? (context.news || []) : [],
    portfolio: needsPortfolio ? (context.portfolio || []) : []
  };

  // 3. Stock-specific intent routing
  if (Array.isArray(context.stockData)) {
    const qUpper = query.toUpperCase();
    const relevantStocks = context.stockData.filter((s: any) => {
      const ticker = (s.ticker || s.stock || s.name || "").toUpperCase();
      const name = (s.name || "").toUpperCase();
      return (ticker && qUpper.includes(ticker)) || (name.length > 3 && qUpper.includes(name));
    });
    
    if (relevantStocks.length > 0) {
      dynamicContext.stockData = relevantStocks;
    } else if (needsMarket && !needsNews && !needsPortfolio) {
      // General market question → include top 5 stocks for context
      dynamicContext.stockData = context.stockData.slice(0, 5);
    }
  }

  // 4. Strict length capping to guarantee no bloat
  if (Array.isArray(dynamicContext.news) && dynamicContext.news.length > 0) {
    dynamicContext.news = dynamicContext.news.slice(0, 3).map((n: any) => ({
      headline: n.headline || n.title || "",
      summary: (n.summary || n.description || "").slice(0, 150),
      source: n.source || "News",
    }));
  }

  return dynamicContext;
}

export default async function chatRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { query, context = {}, history = [], options = {} } = request.body as any;

      if (!query || typeof query !== "string" || query.trim() === "") {
        return reply.status(400).send({
          error: "Bad Request",
          message: "'query' field is required and must be a non-empty string.",
        });
      }

      // --- DYNAMIC CONTEXT ROUTER ---
      const enrichedContext = buildDynamicContext(query.trim(), context);

      const result = await chat(query.trim(), enrichedContext, history, options);

      return reply.send({
        success: true,
        query: query.trim(),
        answer: result.answer,
        warnings: result.warnings,
        model: result.model,
        usage: result.usage,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      request.log.error(err, "[Chat API Error]");

      if (err.status === 401) {
        return reply.status(401).send({ error: "Invalid API key. Check your .env configuration." });
      }
      if (err.status === 429) {
        return reply.status(429).send({ error: "Rate limit exceeded. Please wait before retrying." });
      }

      return reply.status(500).send({
        error: "Internal Server Error",
        message: err.message,
      });
    }
  });

  fastify.post("/stream", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { query, context = {}, history = [], options = {} } = request.body as any;

      if (!query || typeof query !== "string" || query.trim() === "") {
        return reply.status(400).send({ error: "'query' is required." });
      }

      reply.raw.setHeader("Content-Type", "text/event-stream");
      reply.raw.setHeader("Cache-Control", "no-cache");
      reply.raw.setHeader("Connection", "keep-alive");

      const minimalContext = buildDynamicContext(query.trim(), context);

      const { warnings } = await chatStream(
        query.trim(),
        minimalContext,
        history,
        (token: string) => {
          reply.raw.write(`data: ${JSON.stringify({ token })}\n\n`);
        },
        options
      );

      reply.raw.write(`data: ${JSON.stringify({ warnings, done: true })}\n\n`);
      reply.raw.end();
    } catch (err: any) {
      request.log.error(err, "[Stream API Error]");
      reply.raw.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      reply.raw.end();
    }
  });
}
