import OpenAI from "openai";
import { buildSystemMessages, validateContext, MasterContext, SystemMessage } from "../prompts/masterPrompt.js";
import { analysisQueue, chatQueue } from "./llmQueue.js";

export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  extra?: Record<string, any>;
}

export interface ChatResponse {
  answer: string;
  warnings: string[];
  usage?: OpenAI.CompletionUsage;
  model: string;
}

export interface ChatStreamResponse {
  answer: string;
  warnings: string[];
}

// Singleton LLM client — shared across all services
let _client: OpenAI | null = null;

export function getLLMClient(): OpenAI {
  if (_client) return _client;
  const provider = process.env.LLM_PROVIDER || "openai";
  const apiKey = process.env.GEMINI_API_KEY || "";
  _client =
    provider === "gemini"
      ? new OpenAI({
          apiKey,
          baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
        })
      : new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

export function getModel(options: LLMOptions = {}): string {
  const provider = process.env.LLM_PROVIDER || "openai";
  return options.model || (provider === "gemini" ? "gemini-2.5-flash" : "gpt-4o-mini");
}

export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await analysisQueue.enqueue(fn);
    } catch (err: any) {
      lastError = err;
      const isRateLimit = err.status === 429 || err.message?.includes("429");
      if (!isRateLimit || attempt === maxRetries) throw err;
      const delay = Math.round(Math.min(1000 * Math.pow(1.8, attempt), 6_000));
      console.warn(`[LLM] Rate limit — retrying in ${(delay / 1000).toFixed(1)}s (${attempt + 1}/${maxRetries})`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

// Resolves the ordered, deduplicated list of API keys available for chat fallback
function getChatKeys(): string[] {
  const provider = process.env.LLM_PROVIDER || "openai";
  const candidates =
    provider === "gemini"
      ? [process.env.GEMINI_CHAT_KEY, process.env.GEMINI_API_KEY]
      : [process.env.OPENAI_API_KEY];
  // Deduplicate so we don't retry the same key twice
  return [...new Set(candidates.filter(Boolean))] as string[];
}

function makeChatClient(key: string): OpenAI {
  const provider = process.env.LLM_PROVIDER || "openai";
  return provider === "gemini"
    ? new OpenAI({ apiKey: key, baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/" })
    : new OpenAI({ apiKey: key });
}

export async function chat(
  userQuery: string,
  context: MasterContext = {},
  chatHistory: SystemMessage[] = [],
  options: LLMOptions = {}
): Promise<ChatResponse> {
  const { warnings } = validateContext(context);
  const messages: any[] = [...buildSystemMessages(context), ...chatHistory, { role: "user", content: userQuery }];
  const keys = getChatKeys();

  let lastError: any;
  const maxRetries = 3;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let allKeysRateLimited = true;
    for (let i = 0; i < keys.length; i++) {
      try {
        const completion = await chatQueue.enqueue(() =>
          makeChatClient(keys[i]).chat.completions.create({
            model: getModel(options),
            messages,
            temperature: options.temperature ?? 0.3,
            max_tokens: options.maxTokens ?? 1024,
            ...options.extra,
          })
        );
        return {
          answer: completion.choices[0]?.message?.content ?? "No response generated.",
          warnings,
          usage: completion.usage,
          model: completion.model,
        };
      } catch (err: any) {
        lastError = err;
        const isRateLimit = err.status === 429 || err.message?.includes("429");
        if (!isRateLimit) allKeysRateLimited = false;
        
        if (i < keys.length - 1) {
          console.warn(`[LLM] Key ${i + 1}/${keys.length} failed (${err.status || 'error'}) — trying next key…`);
        }
      }
    }
    
    if (!allKeysRateLimited || attempt === maxRetries) break;
    const delay = Math.round(Math.min(1000 * Math.pow(1.8, attempt), 6_000));
    console.warn(`[LLM] All chat keys hit rate limit — retrying in ${(delay / 1000).toFixed(1)}s (${attempt + 1}/${maxRetries})`);
    await new Promise((r) => setTimeout(r, delay));
  }
  
  throw lastError ?? new Error("Failed to get response from LLM provider.");
}

export async function chatStream(
  userQuery: string,
  context: MasterContext = {},
  chatHistory: SystemMessage[] = [],
  onChunk?: (token: string) => void,
  options: LLMOptions = {}
): Promise<ChatStreamResponse> {
  const { warnings } = validateContext(context);
  const messages: any[] = [...buildSystemMessages(context), ...chatHistory, { role: "user", content: userQuery }];
  const keys = getChatKeys();

  let lastError: any;
  const maxRetries = 3;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let allKeysRateLimited = true;
    for (let i = 0; i < keys.length; i++) {
      try {
        const stream = await chatQueue.enqueue(() =>
          makeChatClient(keys[i]).chat.completions.create({
            model: getModel(options),
            messages,
            temperature: options.temperature ?? 0.3,
            max_tokens: options.maxTokens ?? 1024,
            stream: true,
          })
        );
        let fullResponse = "";
        for await (const chunk of stream) {
          const token = chunk.choices[0]?.delta?.content || "";
          if (token) {
            fullResponse += token;
            onChunk?.(token);
          }
        }
        return { answer: fullResponse, warnings };
      } catch (err: any) {
        lastError = err;
        const isRateLimit = err.status === 429 || err.message?.includes("429");
        if (!isRateLimit) allKeysRateLimited = false;
        
        if (i < keys.length - 1) {
          console.warn(`[LLM] Stream key ${i + 1}/${keys.length} failed (${err.status || 'error'}) — trying next key…`);
        }
      }
    }
    
    if (!allKeysRateLimited || attempt === maxRetries) break;
    const delay = Math.round(Math.min(1000 * Math.pow(1.8, attempt), 6_000));
    console.warn(`[LLM] All chat stream keys hit rate limit — retrying in ${(delay / 1000).toFixed(1)}s (${attempt + 1}/${maxRetries})`);
    await new Promise((r) => setTimeout(r, delay));
  }
  
  throw lastError ?? new Error("Failed to stream response from LLM provider.");
}
