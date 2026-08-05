/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║       NIFTY50GPT — ALERT SERVICE (Layer 5)                          ║
 * ║                                                                      ║
 * ║  Generates context-rich push alerts from raw market events.         ║
 * ║  In-memory alert history with max-cap for demo/MVP.                 ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */
import OpenAI from "openai";
import { buildAlertMessages, deriveAlertMeta, } from "../prompts/alertPrompt.js";
function getLLMClient() {
    const provider = process.env.LLM_PROVIDER || "openai";
    if (provider === "gemini") {
        return new OpenAI({
            apiKey: process.env.GEMINI_API_KEY,
            baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
        });
    }
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}
const MAX_ALERTS = 100;
const alertStore = [];
let alertSeq = 1;
function storeAlert(alert) {
    const entry = {
        id: alertSeq++,
        ...alert,
        createdAt: new Date().toISOString(),
        read: false,
    };
    alertStore.unshift(entry);
    if (alertStore.length > MAX_ALERTS)
        alertStore.pop();
    return entry;
}
export async function generateAlert(eventType = "PRICE_MOVE", stock = {}, trigger = "", news = null, userContext = {}, options = {}) {
    const client = getLLMClient();
    const provider = process.env.LLM_PROVIDER || "openai";
    const model = options.model || (provider === "gemini" ? "gemini-2.0-flash" : "gpt-4o-mini");
    const derived = deriveAlertMeta(eventType, stock, trigger);
    const messages = buildAlertMessages(eventType, stock, trigger, news, userContext);
    const completion = await client.chat.completions.create({
        model,
        messages,
        temperature: 0.4,
        max_tokens: 300,
        response_format: { type: "json_object" },
        ...options.extra,
    });
    let alert;
    try {
        const raw = completion.choices[0]?.message?.content ?? "{}";
        alert = JSON.parse(raw);
    }
    catch {
        alert = {
            title: `${stock.ticker} — ${eventType}`,
            body: trigger,
            sentiment: derived.sentiment,
            urgency: derived.urgency,
            cta: derived.cta,
        };
    }
    const enrichedPayload = {
        title: alert.title || `${stock.ticker || "UNKNOWN"} Alert`,
        body: alert.body || trigger,
        sentiment: alert.sentiment || derived.sentiment,
        urgency: alert.urgency || derived.urgency,
        cta: alert.cta || derived.cta,
        eventType,
        ticker: stock.ticker || "UNKNOWN",
        stockName: stock.name || "Unknown",
        change: stock["change%"] ?? 0,
        holdsStock: userContext.holdsStock ?? false,
        meta: {
            model: completion.model,
            tokens: completion.usage?.total_tokens,
            generatedAt: new Date().toISOString(),
        },
    };
    const stored = storeAlert(enrichedPayload);
    return { alert: stored, derived, stored };
}
export async function generateAlertBatch(events = [], options = {}) {
    const results = [];
    for (const ev of events) {
        try {
            const result = await generateAlert(ev.eventType || "PRICE_MOVE", ev.stock || {}, ev.trigger || "", ev.news || null, ev.userContext || {}, options);
            results.push({ success: true, ...result });
        }
        catch (err) {
            results.push({
                success: false,
                error: err.message,
                ticker: ev.stock?.ticker,
            });
        }
        await new Promise((r) => setTimeout(r, 200));
    }
    return results;
}
export function getAlertHistory(limit = 50) {
    return alertStore.slice(0, limit);
}
export function getUnreadCount() {
    return alertStore.filter((a) => !a.read).length;
}
export function markAllRead() {
    alertStore.forEach((a) => {
        a.read = true;
    });
    return { marked: alertStore.length };
}
export function markRead(id) {
    const alert = alertStore.find((a) => a.id === id);
    if (alert)
        alert.read = true;
    return !!alert;
}
export function clearHistory() {
    alertStore.length = 0;
    return { cleared: true };
}
