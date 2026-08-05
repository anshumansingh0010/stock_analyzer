/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║              NIFTY50GPT — CHAT API ROUTES (Fastify Plugin)          ║
 * ║  POST /api/chat        → Standard response                          ║
 * ║  POST /api/chat/stream → Server-Sent Events streaming response      ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */
import { chat, chatStream } from "../services/llmService.js";
export default async function chatRoutes(fastify) {
    fastify.post("/", async (request, reply) => {
        try {
            const { query, context = {}, history = [], options = {} } = request.body;
            if (!query || typeof query !== "string" || query.trim() === "") {
                return reply.status(400).send({
                    error: "Bad Request",
                    message: "'query' field is required and must be a non-empty string.",
                });
            }
            const result = await chat(query.trim(), context, history, options);
            return reply.send({
                success: true,
                query: query.trim(),
                answer: result.answer,
                warnings: result.warnings,
                model: result.model,
                usage: result.usage,
                timestamp: new Date().toISOString(),
            });
        }
        catch (err) {
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
    fastify.post("/stream", async (request, reply) => {
        try {
            const { query, context = {}, history = [], options = {} } = request.body;
            if (!query || typeof query !== "string" || query.trim() === "") {
                return reply.status(400).send({ error: "'query' is required." });
            }
            reply.raw.setHeader("Content-Type", "text/event-stream");
            reply.raw.setHeader("Cache-Control", "no-cache");
            reply.raw.setHeader("Connection", "keep-alive");
            const { warnings } = await chatStream(query.trim(), context, history, (token) => {
                reply.raw.write(`data: ${JSON.stringify({ token })}\n\n`);
            }, options);
            reply.raw.write(`data: ${JSON.stringify({ warnings, done: true })}\n\n`);
            reply.raw.end();
        }
        catch (err) {
            request.log.error(err, "[Stream API Error]");
            reply.raw.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
            reply.raw.end();
        }
    });
}
