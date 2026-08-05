/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║         NIFTY50GPT — ALERTS API ROUTES (Fastify Plugin)             ║
 * ║                                                                      ║
 * ║  POST /api/alerts/generate   → Single context-rich alert            ║
 * ║  POST /api/alerts/batch      → Multiple alerts in one call          ║
 * ║  GET  /api/alerts/history    → Stored alert history                 ║
 * ║  GET  /api/alerts/unread     → Unread alert count                   ║
 * ║  POST /api/alerts/read       → Mark alert(s) as read                ║
 * ║  DELETE /api/alerts/clear    → Clear all alert history              ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */
import { generateAlert, generateAlertBatch, getAlertHistory, getUnreadCount, markAllRead, markRead, clearHistory, } from "../services/alertService.js";
import { deriveAlertMeta } from "../prompts/alertPrompt.js";
function extractAlertPayload(body) {
    return {
        eventType: (body?.eventType || body?.type || "PRICE_MOVE"),
        stock: body?.stock || {},
        trigger: body?.trigger || "",
        news: body?.news || null,
        userContext: body?.userContext || body?.portfolio || {},
    };
}
export default async function alertRoutes(fastify) {
    fastify.post("/generate", async (request, reply) => {
        try {
            const { eventType, stock, trigger, news, userContext } = extractAlertPayload(request.body);
            if (!stock.ticker && !stock.name) {
                return reply.status(400).send({ error: "stock.ticker or stock.name is required" });
            }
            const result = await generateAlert(eventType, stock, trigger, news, userContext);
            return reply.send({
                success: true,
                alert: result.alert,
                derived: result.derived,
                id: result.stored.id,
            });
        }
        catch (err) {
            request.log.error(err, "[Alerts/generate]");
            if (err.status === 401)
                return reply.status(401).send({ error: "Invalid API key" });
            if (err.status === 429)
                return reply.status(429).send({ error: "Rate limit — retry shortly" });
            return reply.status(500).send({ error: "Alert generation failed", message: err.message });
        }
    });
    fastify.post("/batch", async (request, reply) => {
        try {
            const events = request.body?.events;
            if (!Array.isArray(events) || events.length === 0) {
                return reply.status(400).send({ error: "'events' array is required and must not be empty" });
            }
            if (events.length > 20) {
                return reply.status(400).send({ error: "Maximum 20 events per batch request" });
            }
            const results = await generateAlertBatch(events);
            return reply.send({
                success: true,
                total: results.length,
                passed: results.filter((r) => r.success).length,
                failed: results.filter((r) => !r.success).length,
                results,
            });
        }
        catch (err) {
            request.log.error(err, "[Alerts/batch]");
            return reply.status(500).send({ error: err.message });
        }
    });
    fastify.get("/history", async (request, reply) => {
        const query = request.query;
        const limit = parseInt(query?.limit || "50") || 50;
        const alerts = getAlertHistory(Math.min(limit, 100));
        return reply.send({
            success: true,
            count: alerts.length,
            unread: getUnreadCount(),
            alerts,
        });
    });
    fastify.get("/unread", async (_request, reply) => {
        return reply.send({
            success: true,
            unread: getUnreadCount(),
        });
    });
    fastify.post("/read", async (request, reply) => {
        const body = request.body;
        if (body?.all) {
            const result = markAllRead();
            return reply.send({ success: true, ...result });
        }
        if (body?.id != null) {
            const found = markRead(parseInt(body.id));
            return reply.send({ success: true, found });
        }
        return reply.status(400).send({ error: "Provide 'id' or 'all: true'" });
    });
    fastify.delete("/clear", async (_request, reply) => {
        const result = clearHistory();
        return reply.send({ success: true, ...result });
    });
    fastify.get("/preview", async (request, reply) => {
        const query = request.query;
        const eventType = query?.type || "PRICE_MOVE";
        const change = parseFloat(query?.change || "0");
        const stock = { "change%": change };
        const derived = deriveAlertMeta(eventType, stock, "");
        return reply.send({
            success: true,
            eventType,
            ...derived,
        });
    });
}
