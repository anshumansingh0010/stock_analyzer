/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║          NIFTY50GPT — NEWS API ROUTES (Fastify Plugin)              ║
 * ║                                                                      ║
 * ║  POST /api/news/analyze       → Analyze a single article on demand  ║
 * ║  POST /api/news/analyze-batch → Analyze multiple articles           ║
 * ║  GET  /api/news/results       → Get cached pre-analyzed results     ║
 * ║  GET  /api/news/alerts        → Get portfolio-relevant alerts only  ║
 * ║  GET  /api/news/status        → Scheduler status                    ║
 * ║  POST /api/news/trigger       → Manually trigger a scheduler cycle  ║
 * ║  POST /api/news/portfolio     → Update portfolio in scheduler cache ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */
import { analyzeArticle, analyzeBatch } from "../services/newsAnalyzer.js";
import { getResults, getStatus, getPortfolioAlerts, triggerNow, updatePortfolio, } from "../services/newsScheduler.js";
export default async function newsRoutes(fastify) {
    fastify.post("/analyze", async (request, reply) => {
        try {
            const { article, portfolio = [] } = request.body;
            if (!article || !article.headline) {
                return reply.status(400).send({
                    error: "Bad Request",
                    message: "'article.headline' is required.",
                });
            }
            const result = await analyzeArticle(article, portfolio);
            return reply.send({
                success: true,
                result,
                analyzedAt: new Date().toISOString(),
            });
        }
        catch (err) {
            request.log.error(err, "[News/analyze]");
            if (err.status === 401)
                return reply.status(401).send({ error: "Invalid API key" });
            if (err.status === 429)
                return reply.status(429).send({ error: "LLM rate limit hit — retry shortly" });
            return reply.status(500).send({ error: "Analysis failed", message: err.message });
        }
    });
    fastify.post("/analyze-batch", async (request, reply) => {
        try {
            const { articles, portfolio = [], concurrency = 2 } = request.body;
            if (!Array.isArray(articles) || articles.length === 0) {
                return reply.status(400).send({
                    error: "Bad Request",
                    message: "'articles' must be a non-empty array.",
                });
            }
            if (articles.length > 20) {
                return reply.status(400).send({
                    error: "Too many articles",
                    message: "Maximum 20 articles per batch request.",
                });
            }
            const results = await analyzeBatch(articles, portfolio, {
                concurrency: Math.min(concurrency, 3),
            });
            const successful = results.filter((r) => !r._error).length;
            const failed = results.filter((r) => r._error).length;
            return reply.send({
                success: true,
                total: results.length,
                successful,
                failed,
                results,
            });
        }
        catch (err) {
            request.log.error(err, "[News/analyze-batch]");
            return reply.status(500).send({ error: "Batch analysis failed", message: err.message });
        }
    });
    fastify.get("/results", async (request, reply) => {
        const results = getResults();
        const { sentiment, urgency, sector, portfolio } = request.query;
        let filtered = results;
        if (sentiment) {
            filtered = filtered.filter((r) => r.overallMarketSentiment === sentiment.toUpperCase());
        }
        if (urgency) {
            filtered = filtered.filter((r) => r.urgency === urgency.toUpperCase());
        }
        if (sector) {
            filtered = filtered.filter((r) => r.sectorAffected?.some((s) => s.toLowerCase().includes(sector.toLowerCase())));
        }
        if (portfolio === "true") {
            filtered = filtered.filter((r) => r.companies?.some((c) => c.inUserPortfolio));
        }
        return reply.send({
            success: true,
            count: filtered.length,
            results: filtered,
            cachedAt: getStatus().lastRunAt,
        });
    });
    fastify.get("/alerts", async (_request, reply) => {
        const alerts = getPortfolioAlerts();
        const urgencyOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        alerts.sort((a, b) => (urgencyOrder[a.urgency] ?? 3) - (urgencyOrder[b.urgency] ?? 3));
        return reply.send({
            success: true,
            count: alerts.length,
            alerts,
            generatedAt: new Date().toISOString(),
        });
    });
    fastify.get("/status", async (_request, reply) => {
        return reply.send({
            success: true,
            scheduler: getStatus(),
        });
    });
    fastify.post("/trigger", async (_request, reply) => {
        try {
            reply.send({
                success: true,
                message: "Analysis cycle triggered. Results will be available shortly.",
                triggeredAt: new Date().toISOString(),
            });
            triggerNow().catch((e) => console.error("[News/trigger] Error:", e.message));
        }
        catch (err) {
            return reply.status(500).send({ error: err.message });
        }
    });
    fastify.post("/portfolio", async (request, reply) => {
        try {
            const { portfolio } = request.body;
            if (!Array.isArray(portfolio)) {
                return reply.status(400).send({
                    error: "Bad Request",
                    message: "'portfolio' must be an array.",
                });
            }
            updatePortfolio(portfolio);
            return reply.send({
                success: true,
                message: `Portfolio updated — ${portfolio.length} holdings registered for news tracking.`,
            });
        }
        catch (err) {
            return reply.status(500).send({ error: err.message });
        }
    });
}
