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

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  generateAlert,
  generateAlertBatch,
  getAlertHistory,
  getUnreadCount,
  markAllRead,
  markRead,
  clearHistory,
} from "../services/alertService.js";
import { deriveAlertMeta, AlertEventType } from "../prompts/alertPrompt.js";

function extractAlertPayload(body: any) {
  return {
    eventType: (body?.eventType || body?.type || "PRICE_MOVE") as AlertEventType,
    stock: body?.stock || {},
    trigger: body?.trigger || "",
    news: body?.news || null,
    userContext: body?.userContext || body?.portfolio || {},
  };
}

export default async function alertRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post("/generate", async (request: FastifyRequest, reply: FastifyReply) => {
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
    } catch (err: any) {
      request.log.error(err, "[Alerts/generate]");
      if (err.status === 401) return reply.status(401).send({ error: "Invalid API key" });
      if (err.status === 429) return reply.status(429).send({ error: "Rate limit — retry shortly" });
      return reply.status(500).send({ error: "Alert generation failed", message: err.message });
    }
  });

  fastify.post("/batch", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const events = (request.body as any)?.events;
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
    } catch (err: any) {
      request.log.error(err, "[Alerts/batch]");
      return reply.status(500).send({ error: err.message });
    }
  });

  fastify.get("/history", async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as any;
    const limit = parseInt(query?.limit || "50") || 50;
    const alerts = getAlertHistory(Math.min(limit, 100));

    return reply.send({
      success: true,
      count: alerts.length,
      unread: getUnreadCount(),
      alerts,
    });
  });

  fastify.get("/unread", async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      success: true,
      unread: getUnreadCount(),
    });
  });

  fastify.post("/read", async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any;
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

  fastify.delete("/clear", async (_request: FastifyRequest, reply: FastifyReply) => {
    const result = clearHistory();
    return reply.send({ success: true, ...result });
  });

  fastify.get("/preview", async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as any;
    const eventType = (query?.type as AlertEventType) || "PRICE_MOVE";
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
