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
import mongoose from "mongoose";
import Portfolio from "../models/Portfolio.js";
import { fetchStockQuote } from "../services/marketDataService.js";
import { generateAlert } from "../services/alertService.js";
function dbAvailable() {
    return mongoose.connection.readyState === 1;
}
export default async function portfolioRoutes(fastify) {
    fastify.get("/", async (request, reply) => {
        const { userId } = request.params;
        if (!dbAvailable()) {
            return reply.status(503).send({
                error: "Database not connected. Set MONGODB_URI in .env to enable portfolio persistence.",
            });
        }
        try {
            const portfolio = await Portfolio.findOne({ userId });
            if (!portfolio) {
                return reply.status(404).send({ error: "Portfolio not found. Create one first." });
            }
            return reply.send({ success: true, portfolio });
        }
        catch (err) {
            return reply.status(500).send({ error: err.message });
        }
    });
    fastify.post("/", async (request, reply) => {
        const { userId } = request.params;
        if (!dbAvailable())
            return reply.status(503).send({ error: "Database not connected." });
        try {
            const { displayName, holdings = [], riskProfile } = request.body;
            const portfolio = await Portfolio.findOneAndUpdate({ userId }, {
                $set: {
                    displayName: displayName || userId,
                    holdings,
                    riskProfile: riskProfile || "MODERATE",
                },
            }, { new: true, upsert: true, runValidators: true });
            return reply.status(201).send({ success: true, portfolio });
        }
        catch (err) {
            if (err.name === "ValidationError") {
                return reply.status(400).send({ error: "Validation failed", details: err.message });
            }
            return reply.status(500).send({ error: err.message });
        }
    });
    fastify.patch("/add", async (request, reply) => {
        const { userId } = request.params;
        if (!dbAvailable())
            return reply.status(503).send({ error: "Database not connected." });
        try {
            const { stock, ticker, qty, avgPrice, sector } = request.body;
            if (!ticker || !qty || !avgPrice) {
                return reply.status(400).send({ error: "ticker, qty, avgPrice are required" });
            }
            const portfolio = await Portfolio.findOneAndUpdate({ userId }, {
                $pull: { holdings: { ticker: ticker.toUpperCase() } },
            }, { new: true, upsert: true });
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
        }
        catch (err) {
            return reply.status(500).send({ error: err.message });
        }
    });
    fastify.patch("/remove", async (request, reply) => {
        const { userId } = request.params;
        if (!dbAvailable())
            return reply.status(503).send({ error: "Database not connected." });
        try {
            const { ticker } = request.body;
            if (!ticker)
                return reply.status(400).send({ error: "ticker is required" });
            const portfolio = await Portfolio.findOneAndUpdate({ userId }, { $pull: { holdings: { ticker: ticker.toUpperCase() } } }, { new: true });
            if (!portfolio)
                return reply.status(404).send({ error: "Portfolio not found" });
            return reply.send({ success: true, portfolio });
        }
        catch (err) {
            return reply.status(500).send({ error: err.message });
        }
    });
    fastify.post("/sync", async (request, reply) => {
        const { userId } = request.params;
        if (!dbAvailable())
            return reply.status(503).send({ error: "Database not connected." });
        try {
            const portfolio = await Portfolio.findOne({ userId });
            if (!portfolio)
                return reply.status(404).send({ error: "Portfolio not found" });
            if (!portfolio.holdings.length) {
                return reply.send({ success: true, message: "No holdings to sync", portfolio });
            }
            const quotes = await Promise.all(portfolio.holdings.map((h) => fetchStockQuote(h.ticker).catch(() => null)));
            portfolio.holdings.forEach((holding, i) => {
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
        }
        catch (err) {
            return reply.status(500).send({ error: err.message });
        }
    });
    fastify.get("/alerts", async (request, reply) => {
        const { userId } = request.params;
        if (!dbAvailable())
            return reply.status(503).send({ error: "Database not connected." });
        try {
            const portfolio = await Portfolio.findOne({ userId });
            if (!portfolio)
                return reply.status(404).send({ error: "Portfolio not found" });
            const movers = portfolio.holdings.filter((h) => h.pnlPercent != null && Math.abs(h.pnlPercent) >= 1);
            const alerts = [];
            for (const h of movers) {
                try {
                    const result = await generateAlert("PRICE_MOVE", {
                        name: h.stock,
                        ticker: h.ticker,
                        "change%": h.pnlPercent ?? 0,
                        currentPrice: h.currentPrice ?? 0,
                    }, `${h.ticker} moved ${(h.pnlPercent ?? 0) >= 0 ? "+" : ""}${h.pnlPercent}% today`, null, { holdsStock: true, avgPrice: h.avgPrice, pnlPercent: h.pnlPercent });
                    alerts.push(result.alert);
                }
                catch {
                    /* skip on LLM error */
                }
            }
            return reply.send({ success: true, userId, alerts, moversFound: movers.length });
        }
        catch (err) {
            return reply.status(500).send({ error: err.message });
        }
    });
}
