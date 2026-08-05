/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║              NIFTY50GPT — FASTIFY SERVER ENTRY POINT                ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */
import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
// ─── Layer 6: DB ──────────────────────────────────────────────
import { connectDB, getDBStatus } from "./db/connection.js";
// ─── Routes ───────────────────────────────────────────────────
import chatRoutes from "./routes/chat.js";
import newsRoutes from "./routes/news.js";
import stockRoutes from "./routes/stock.js";
import marketRoutes from "./routes/market.js";
import alertRoutes from "./routes/alert.js";
import portfolioRoutes from "./routes/portfolio.js";
import marketdataRoutes from "./routes/marketdata.js";
import { startScheduler, getStatus as getNewsStatus } from "./services/newsScheduler.js";
const server = Fastify({ logger: true });
const PORT = parseInt(process.env.PORT || "3001") || 3001;
async function setupServer() {
    // ─── Security & Middleware Plugins ──────────────────────────────
    await server.register(helmet);
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
        .split(",")
        .map((o) => o.trim());
    await server.register(cors, {
        origin: (origin, cb) => {
            if (!origin || allowedOrigins.includes(origin)) {
                cb(null, true);
            }
            else {
                cb(new Error(`CORS blocked for origin: ${origin}`), false);
            }
        },
        methods: ["GET", "POST", "PATCH", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
    });
    await server.register(rateLimit, {
        max: parseInt(process.env.RATE_LIMIT_MAX || "30") || 30,
        timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000") || 60_000,
    });
    // ─── Route Registration (Layers 1–6) ─────────────────────────────
    await server.register(chatRoutes, { prefix: "/api/chat" });
    await server.register(newsRoutes, { prefix: "/api/news" });
    await server.register(stockRoutes, { prefix: "/api/stock" });
    await server.register(marketRoutes, { prefix: "/api/market" });
    await server.register(alertRoutes, { prefix: "/api/alerts" });
    await server.register(portfolioRoutes, { prefix: "/api/portfolio/:userId" });
    await server.register(marketdataRoutes, { prefix: "/api/marketdata" });
    // Health check
    server.get("/api/health", async (_request, reply) => {
        return reply.send({
            status: "ok",
            service: "Nifty50GPT (Fastify Server)",
            layers: [
                "Layer 1 — Master Prompt Engine",
                "Layer 2 — News Sentiment Analyzer",
                "Layer 3 — Stock Technical Analyst",
                "Layer 4 — Market Movement Commentator",
                "Layer 5 — Alert Generation Engine",
                "Layer 6 — Data Persistence & Market Data",
            ],
            provider: process.env.LLM_PROVIDER || "openai",
            timestamp: new Date().toISOString(),
            newsScheduler: getNewsStatus(),
            database: getDBStatus(),
        });
    });
    // 404 handler
    server.setNotFoundHandler((request, reply) => {
        reply.status(404).send({ error: `Route not found: ${request.method} ${request.url}` });
    });
    // Global error handler
    server.setErrorHandler((error, request, reply) => {
        request.log.error(error);
        reply.status(error.statusCode || 500).send({
            error: error.name || "Internal Server Error",
            message: error.message,
        });
    });
}
// ─── Start ────────────────────────────────────────────────────
async function startServer() {
    await setupServer();
    await connectDB();
    try {
        await server.listen({ port: PORT, host: "0.0.0.0" });
        const db = getDBStatus();
        console.log(`
╔══════════════════════════════════════════════╗
║     Nifty50GPT Fastify Server — ONLINE       ║
║                                              ║
║  🚀  http://localhost:${PORT}                   ║
║  📊  Layer 1: Master Prompt Engine ACTIVE    ║
║  📰  Layer 2: News Sentiment Analyzer ACTIVE ║
║  📈  Layer 3: Stock Technical Analyst ACTIVE ║
║  🌐  Layer 4: Market Commentator ACTIVE      ║
║  🔔  Layer 5: Alert Engine ACTIVE            ║
║  🗄️   Layer 6: DB ${db.connected ? "CONNECTED ✅" : "OFFLINE (in-memory)"} ${"".padEnd(db.connected ? 6 : 2)}║
║  🤖  Provider: ${(process.env.LLM_PROVIDER || "openai").padEnd(28)}║
╚══════════════════════════════════════════════╝
    `);
        startScheduler({
            intervalMs: 15 * 60 * 1000,
            runImmediately: process.env.NODE_ENV !== "test",
            portfolio: [],
        });
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
}
startServer();
export default server;
