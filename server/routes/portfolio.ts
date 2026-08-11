/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║       NIFTY50GPT — LAYER 6: PORTFOLIO ROUTES (Fastify Plugin)       ║
 * ║                                                                      ║
 * ║  GET    /api/portfolio/:userId        → Get portfolio               ║
 * ║  POST   /api/portfolio/:userId        → Create / replace portfolio  ║
 * ║  PATCH  /api/portfolio/:userId/add    → Add holding                 ║
 * ║  PATCH  /api/portfolio/:userId/remove → Remove holding              ║
 * ║  POST   /api/portfolio/:userId/sync   → Sync P&L with live prices   ║
 * ║  GET    /api/portfolio/:userId/alerts → Portfolio-aware alerts      ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import mongoose from "mongoose";
import { Portfolio } from "../models/Portfolio.js";
import { fetchStockQuote } from "../services/marketDataService.js";
import { generateAlert } from "../services/alertService.js";

const inMemoryStore: Record<string, any> = {
  demoUser: {
    userId: "demoUser",
    displayName: "Demo Investor",
    riskProfile: "MODERATE",
    holdings: [
      { stock: "RELIANCE", ticker: "RELIANCE", qty: 25, avgPrice: 2850.0, sector: "Energy", exchange: "NSE" },
      { stock: "TCS", ticker: "TCS", qty: 15, avgPrice: 3950.0, sector: "Technology", exchange: "NSE" },
      { stock: "HDFCBANK", ticker: "HDFCBANK", qty: 40, avgPrice: 1520.0, sector: "Banking", exchange: "NSE" },
      { stock: "INFY", ticker: "INFY", qty: 30, avgPrice: 1610.0, sector: "Technology", exchange: "NSE" },
      { stock: "ICICIBANK", ticker: "ICICIBANK", qty: 50, avgPrice: 1050.0, sector: "Banking", exchange: "NSE" },
    ],
  },
};

function dbAvailable(): boolean {
  return mongoose.connection.readyState === 1;
}

export default async function portfolioRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get("/:userId", async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.params as any;
    if (!dbAvailable()) {
      const portfolio = inMemoryStore[userId] || {
        userId,
        displayName: userId,
        riskProfile: "MODERATE",
        holdings: [],
      };
      return reply.send({ success: true, portfolio, inMemory: true });
    }
    try {
      let portfolio = await Portfolio.findOne({ userId });
      if (!portfolio) {
        if (userId === "demoUser") {
          portfolio = await Portfolio.create(inMemoryStore["demoUser"]);
        } else {
          return reply.send({
            success: true,
            portfolio: { userId, displayName: userId, holdings: [], riskProfile: "MODERATE" },
          });
        }
      }
      return reply.send({ success: true, portfolio });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  fastify.post("/:userId", async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.params as any;
    const { displayName, holdings = [], riskProfile } = request.body as any;

    if (!dbAvailable()) {
      inMemoryStore[userId] = {
        userId,
        displayName: displayName || userId,
        holdings,
        riskProfile: riskProfile || "MODERATE",
      };
      return reply.status(201).send({ success: true, portfolio: inMemoryStore[userId], inMemory: true });
    }

    try {
      const portfolio = await Portfolio.findOneAndUpdate(
        { userId },
        {
          $set: {
            displayName: displayName || userId,
            holdings,
            riskProfile: riskProfile || "MODERATE",
          },
        },
        { new: true, upsert: true, runValidators: true }
      );

      return reply.status(201).send({ success: true, portfolio });
    } catch (err: any) {
      if (err.name === "ValidationError") {
        return reply.status(400).send({ error: "Validation failed", details: err.message });
      }
      return reply.status(500).send({ error: err.message });
    }
  });

  fastify.patch("/:userId/add", async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.params as any;
    const { stock, ticker, qty, avgPrice, sector } = request.body as any;
    if (!ticker || !qty || !avgPrice) {
      return reply.status(400).send({ error: "ticker, qty, avgPrice are required" });
    }

    if (!dbAvailable()) {
      const ptf = inMemoryStore[userId] || { userId, displayName: userId, riskProfile: "MODERATE", holdings: [] };
      ptf.holdings = ptf.holdings.filter((h: any) => h.ticker !== ticker.toUpperCase());
      ptf.holdings.push({
        stock: stock || ticker,
        ticker: ticker.toUpperCase(),
        qty,
        avgPrice,
        sector: sector || "Unknown",
      });
      inMemoryStore[userId] = ptf;
      return reply.send({ success: true, portfolio: ptf, inMemory: true });
    }

    try {
      const portfolio = await Portfolio.findOneAndUpdate(
        { userId },
        {
          $pull: { holdings: { ticker: ticker.toUpperCase() } },
        },
        { new: true, upsert: true }
      );

      if (portfolio) {
        portfolio.holdings.push({
          stock: stock || ticker,
          ticker: ticker.toUpperCase(),
          qty,
          avgPrice,
          sector: sector || "Unknown",
        });
        await portfolio.save();
      }

      return reply.send({ success: true, portfolio });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  fastify.patch("/:userId/remove", async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.params as any;
    const { ticker } = request.body as any;
    if (!ticker) return reply.status(400).send({ error: "ticker is required" });

    if (!dbAvailable()) {
      const ptf = inMemoryStore[userId];
      if (ptf) {
        ptf.holdings = ptf.holdings.filter((h: any) => h.ticker !== ticker.toUpperCase());
      }
      return reply.send({ success: true, portfolio: ptf || { userId, holdings: [] }, inMemory: true });
    }

    try {
      const { ticker } = request.body as any;
      if (!ticker) return reply.status(400).send({ error: "ticker is required" });

      const portfolio = await Portfolio.findOneAndUpdate(
        { userId },
        { $pull: { holdings: { ticker: ticker.toUpperCase() } } },
        { new: true }
      );

      if (!portfolio) return reply.status(404).send({ error: "Portfolio not found" });
      return reply.send({ success: true, portfolio });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  fastify.post("/:userId/sync", async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.params as any;

    if (!dbAvailable()) {
      const portfolio = inMemoryStore[userId];
      if (!portfolio) return reply.status(404).send({ error: "Portfolio not found" });
      return reply.send({ success: true, portfolio, syncedHoldings: portfolio.holdings?.length || 0, inMemory: true });
    }

    try {
      const portfolio = await Portfolio.findOne({ userId });
      if (!portfolio) return reply.status(404).send({ error: "Portfolio not found" });
      if (!portfolio.holdings.length) {
        return reply.send({ success: true, message: "No holdings to sync", portfolio });
      }

      const quotes = await Promise.all(
        portfolio.holdings.map((h: any) => fetchStockQuote(h.ticker).catch(() => null))
      );

      portfolio.holdings.forEach((holding: any, i: number) => {
        const quote = quotes[i];
        if (quote?.price) {
          holding.currentPrice = quote.price;
          holding.lastUpdated = new Date();
        }
      });

      portfolio.recomputePnL();
      portfolio.lastSyncedAt = new Date();
      await portfolio.save();

      return reply.send({
        success: true,
        portfolio,
        syncedHoldings: quotes.filter(Boolean).length,
      });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  fastify.get("/:userId/alerts", async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.params as any;

    if (!dbAvailable()) {
      return reply.send({ success: true, userId, alerts: [], moversFound: 0, inMemory: true });
    }

    try {
      const portfolio = await Portfolio.findOne({ userId });
      if (!portfolio) return reply.status(404).send({ error: "Portfolio not found" });

      const movers = portfolio.holdings.filter(
        (h: any) => h.pnlPercent != null && Math.abs(h.pnlPercent) >= 1
      );

      const alerts: any[] = [];
      for (const h of movers) {
        try {
          const result = await generateAlert(
            "PRICE_MOVE",
            {
              name: h.stock,
              ticker: h.ticker,
              "change%": h.pnlPercent ?? 0,
              currentPrice: h.currentPrice ?? 0,
            },
            `${h.ticker} moved ${(h.pnlPercent ?? 0) >= 0 ? "+" : ""}${h.pnlPercent}% today`,
            null,
            { holdsStock: true, avgPrice: h.avgPrice, pnlPercent: h.pnlPercent }
          );
          alerts.push(result.alert);
        } catch {
          /* skip on LLM error */
        }
      }

      return reply.send({ success: true, userId, alerts, moversFound: movers.length });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });
}
