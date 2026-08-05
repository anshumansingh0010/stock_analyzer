/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║          NIFTY50GPT — MARKET API ROUTES (Fastify Plugin)            ║
 * ║                                                                      ║
 * ║  POST /api/market/explain         → "Why is Nifty up/down?" (SSE)   ║
 * ║  POST /api/market/explain/sync    → Same, non-streaming             ║
 * ║  GET  /api/market/briefing        → Auto morning/intraday/closing   ║
 * ║  POST /api/market/briefing        → Custom briefing type            ║
 * ║  GET  /api/market/quicktake       → Instant no-LLM summary          ║
 * ║  GET  /api/market/briefing-type   → Current IST briefing type       ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */
import { analyzeMarket, analyzeMarketStream, getBriefingType, generateQuickTakeaway, } from "../services/marketAnalyzer.js";
import { deriveMarketMetrics } from "../prompts/marketPrompt.js";
function extractPayload(body) {
    return {
        index: body?.index ?? {},
        gainers: body?.gainers ?? [],
        losers: body?.losers ?? [],
        sectors: body?.sectors ?? [],
        globalCues: body?.globalCues ?? {},
        news: body?.news ?? [],
        userPortfolio: body?.userPortfolio ?? body?.portfolio ?? [],
        briefingType: body?.briefingType ?? getBriefingType(),
    };
}
export default async function marketRoutes(fastify) {
    fastify.post("/explain", async (request, reply) => {
        try {
            const { index, gainers, losers, sectors, globalCues, news, userPortfolio, briefingType, } = extractPayload(request.body);
            reply.raw.setHeader("Content-Type", "text/event-stream");
            reply.raw.setHeader("Cache-Control", "no-cache");
            reply.raw.setHeader("Connection", "keep-alive");
            const derived = deriveMarketMetrics(gainers, losers, sectors, index);
            reply.raw.write(`data: ${JSON.stringify({ type: "derived", derived })}\n\n`);
            const quickTake = generateQuickTakeaway(derived, gainers, losers);
            reply.raw.write(`data: ${JSON.stringify({ type: "quicktake", text: quickTake })}\n\n`);
            const meta = await analyzeMarketStream(index, gainers, losers, sectors, globalCues, news, userPortfolio, briefingType, (token) => {
                reply.raw.write(`data: ${JSON.stringify({ type: "token", token })}\n\n`);
            });
            reply.raw.write(`data: ${JSON.stringify({ type: "done", meta })}\n\n`);
            reply.raw.end();
        }
        catch (err) {
            request.log.error(err, "[Market/explain]");
            reply.raw.write(`data: ${JSON.stringify({ type: "error", error: err.message })}\n\n`);
            reply.raw.end();
        }
    });
    fastify.post("/explain/sync", async (request, reply) => {
        try {
            const { index, gainers, losers, sectors, globalCues, news, userPortfolio, briefingType, } = extractPayload(request.body);
            const result = await analyzeMarket(index, gainers, losers, sectors, globalCues, news, userPortfolio, briefingType);
            return reply.send({
                success: true,
                commentary: result.commentary,
                derived: result.derived,
                quickTake: generateQuickTakeaway(result.derived, gainers, losers),
                briefingType: result.meta.briefingType,
                meta: result.meta,
            });
        }
        catch (err) {
            request.log.error(err, "[Market/explain/sync]");
            if (err.status === 401)
                return reply.status(401).send({ error: "Invalid API key" });
            if (err.status === 429)
                return reply.status(429).send({ error: "LLM rate limit — retry shortly" });
            return reply.status(500).send({ error: "Analysis failed", message: err.message });
        }
    });
    fastify.get("/briefing", async (_request, reply) => {
        const type = getBriefingType();
        const hintMap = {
            MORNING: "Pre-market brief. Use globalCues for best results.",
            INTRADAY: "Live market brief. Include live index + sector data.",
            CLOSING: "End-of-day recap. Include FII/DII data in news.",
            AFTER_HOURS: "Markets are closed. Use for next-day setup analysis.",
        };
        return reply.send({
            success: true,
            briefingType: type,
            message: `Current session: ${type}`,
            hint: hintMap[type],
        });
    });
    fastify.post("/briefing", async (request, reply) => {
        try {
            const { index, gainers, losers, sectors, globalCues, news, userPortfolio, briefingType: requestedType, } = extractPayload(request.body);
            const VALID_TYPES = ["MORNING", "INTRADAY", "CLOSING"];
            const finalType = VALID_TYPES.includes(requestedType)
                ? requestedType
                : getBriefingType();
            const result = await analyzeMarket(index, gainers, losers, sectors, globalCues, news, userPortfolio, finalType);
            return reply.send({
                success: true,
                briefingType: finalType,
                commentary: result.commentary,
                derived: result.derived,
                quickTake: generateQuickTakeaway(result.derived, gainers, losers),
                meta: result.meta,
            });
        }
        catch (err) {
            request.log.error(err, "[Market/briefing]");
            return reply.status(500).send({ error: err.message });
        }
    });
    fastify.get("/quicktake", async (request, reply) => {
        const query = request.query;
        const index = {
            nifty50: parseFloat(query.nifty || "0") || undefined,
            "change%": parseFloat(query.change || "0") || undefined,
            dayHigh: parseFloat(query.high || "0") || undefined,
            dayLow: parseFloat(query.low || "0") || undefined,
        };
        const derived = deriveMarketMetrics([], [], [], index);
        const quickTake = generateQuickTakeaway(derived, [], []);
        return reply.send({
            success: true,
            quickTake,
            derived,
            briefingType: getBriefingType(),
        });
    });
    fastify.get("/briefing-type", async (_request, reply) => {
        return reply.send({
            success: true,
            briefingType: getBriefingType(),
            serverTime: new Date().toISOString(),
        });
    });
}
