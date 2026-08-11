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

      // Auto-fill context if fields are missing so LLM has live stock, market & news data
      const enrichedContext = { ...context };
      if (!enrichedContext.marketData || !enrichedContext.stockData) {
        try {
          const snapshot = await fetchFullMarketSnapshot();
          if (!enrichedContext.marketData) enrichedContext.marketData = snapshot;
          if (!enrichedContext.stockData) enrichedContext.stockData = snapshot.allStocks;
        } catch (err: any) {
          request.log.warn({ err: err.message }, "[Chat API] Failed to auto-fill context.marketData — falling back to empty/stale");
        }
      }
      if (!enrichedContext.news || enrichedContext.news.length === 0) {
        try {
          const cached = getCachedNews();
          if (cached && cached.length > 0) {
            enrichedContext.news = cached;
          } else {
            enrichedContext.news = await fetchLatestNews();
          }
        } catch (err: any) {
          request.log.warn({ err: err.message }, "[Chat API] Failed to auto-fill context.news — falling back to empty/stale");
        }
      }

      // Optimize prompt token size (~80% reduction) to stay within Gemini TPM limits
      if (Array.isArray(enrichedContext.stockData)) {
        const qUpper = query.toUpperCase();
        const relevant = enrichedContext.stockData.filter((s: any) => {
          const ticker = (s.ticker || s.stock || s.name || "").toUpperCase();
          const name = (s.name || "").toUpperCase();
          return ticker && (qUpper.includes(ticker) || (name.length > 3 && qUpper.includes(name)));
        });

        if (relevant.length > 0) {
          enrichedContext.stockData = relevant;
        } else {
          enrichedContext.stockData = enrichedContext.stockData.slice(0, 8);
        }
      }

      if (Array.isArray(enrichedContext.news)) {
        enrichedContext.news = enrichedContext.news.slice(0, 2).map((n: any) => ({
          headline: n.headline || n.title || "",
          summary: (n.summary || n.description || "").slice(0, 150),
          source: n.source || "News",
        }));
      }

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

      const { warnings } = await chatStream(
        query.trim(),
        context,
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
