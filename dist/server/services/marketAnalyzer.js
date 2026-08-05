/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║       NIFTY50GPT — MARKET ANALYZER SERVICE (Layer 4)                ║
 * ║                                                                      ║
 * ║  Powers "Why is Nifty up/down?" + Morning/Closing Briefing.         ║
 * ║  Supports standard + SSE streaming responses.                       ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */
import OpenAI from "openai";
import { buildMarketMessages, deriveMarketMetrics, } from "../prompts/marketPrompt.js";
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
export async function analyzeMarket(index = {}, gainers = [], losers = [], sectors = [], globalCues = {}, news = [], userPortfolio = [], briefingType = "INTRADAY", options = {}) {
    const client = getLLMClient();
    const provider = process.env.LLM_PROVIDER || "openai";
    const model = options.model || (provider === "gemini" ? "gemini-2.0-flash" : "gpt-4o-mini");
    const derived = deriveMarketMetrics(gainers, losers, sectors, index);
    const messages = buildMarketMessages(index, gainers, losers, sectors, globalCues, news, userPortfolio, briefingType);
    const completion = await client.chat.completions.create({
        model,
        messages,
        temperature: 0.35,
        max_tokens: 1600,
        ...options.extra,
    });
    const commentary = completion.choices[0]?.message?.content ?? "No analysis generated.";
    return {
        commentary,
        derived,
        meta: {
            briefingType,
            generatedAt: new Date().toISOString(),
            model: completion.model,
            tokens: completion.usage?.total_tokens,
        },
    };
}
export async function analyzeMarketStream(index, gainers, losers, sectors, globalCues, news, userPortfolio, briefingType = "INTRADAY", onChunk, options = {}) {
    const client = getLLMClient();
    const provider = process.env.LLM_PROVIDER || "openai";
    const model = options.model || (provider === "gemini" ? "gemini-2.0-flash" : "gpt-4o-mini");
    const derived = deriveMarketMetrics(gainers, losers, sectors, index);
    const messages = buildMarketMessages(index, gainers, losers, sectors, globalCues, news, userPortfolio, briefingType);
    const stream = await client.chat.completions.create({
        model,
        messages,
        temperature: 0.35,
        max_tokens: 1600,
        stream: true,
    });
    let fullText = "";
    for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content || "";
        if (token) {
            fullText += token;
            if (typeof onChunk === "function")
                onChunk(token);
        }
    }
    return {
        derived,
        meta: {
            briefingType,
            generatedAt: new Date().toISOString(),
            model,
        },
    };
}
export function getBriefingType() {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const ist = new Date(now.getTime() + istOffset - now.getTimezoneOffset() * 60 * 1000);
    const hour = ist.getHours();
    const min = ist.getMinutes();
    const hhmm = hour * 100 + min;
    if (hhmm >= 700 && hhmm < 915)
        return "MORNING";
    if (hhmm >= 915 && hhmm < 1530)
        return "INTRADAY";
    if (hhmm >= 1530 && hhmm < 1700)
        return "CLOSING";
    return "AFTER_HOURS";
}
export function generateQuickTakeaway(derived, gainers = [], losers = []) {
    const { direction, change, topGainer, topLoser, bestSector, worstSector, breadthSignal } = derived;
    if (direction === "FLAT") {
        return `Nifty 50 is trading flat near ${derived.niftyLevel} — markets in consolidation mode.`;
    }
    const isUp = direction === "UP";
    const leader = isUp ? topGainer : topLoser;
    const sector = isUp ? bestSector : worstSector;
    let text = `Nifty 50 is ${isUp ? "up" : "down"} ${Math.abs(change).toFixed(2)}% `;
    if (leader) {
        text += `led by ${leader.stock} (${(leader.change ?? 0) > 0 ? "+" : ""}${leader.change}%). `;
    }
    if (sector) {
        text += `${sector.name} sector is the ${isUp ? "top gainer" : "biggest drag"} at ${(sector.perf ?? 0) > 0 ? "+" : ""}${sector.perf}%. `;
    }
    const breadthNote = breadthSignal === "BROAD_BULLISH"
        ? "Broad-based buying across the market."
        : breadthSignal === "BROAD_BEARISH"
            ? "Widespread selling pressure across stocks."
            : "Mixed participation — selective movement.";
    return text + breadthNote;
}
