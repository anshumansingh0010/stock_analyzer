/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║         NIFTY50GPT — LLM SERVICE (Layer 1 Integration)              ║
 * ║                                                                      ║
 * ║  Single service that wraps any LLM provider.                        ║
 * ║  ✅ Auto-retry with exponential backoff on 429 rate limits          ║
 * ║  Always injects Layer 1 Master Prompt as the first system message.  ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import OpenAI from "openai";
import { buildSystemMessages, validateContext, MasterContext, SystemMessage } from "../prompts/masterPrompt.js";

let llmClient: OpenAI | null = null;

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

export function getLLMClient(): OpenAI {
  if (llmClient) return llmClient;

  const provider = process.env.LLM_PROVIDER || "openai";

  if (provider === "gemini") {
    llmClient = new OpenAI({
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
  } else {
    llmClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  return llmClient;
}

export function getModel(options: LLMOptions = {}): string {
  const provider = process.env.LLM_PROVIDER || "openai";
  return options.model || (provider === "gemini" ? "gemini-3.6-flash" : "gpt-4o-mini");
}

export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 5): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const isRateLimit = err.status === 429 || (err.message && err.message.includes("429"));
      if (!isRateLimit || attempt === maxRetries) throw err;

      const baseDelay = Math.min(1500 * (attempt + 1), 10_000);
      const jitter = baseDelay * (0.9 + Math.random() * 0.2);
      const delay = Math.round(jitter);
      console.warn(
        `[LLM] Rate limit hit — retrying in ${(delay / 1000).toFixed(1)}s (attempt ${
          attempt + 1
        }/${maxRetries})`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

export async function chat(
  userQuery: string,
  context: MasterContext = {},
  chatHistory: SystemMessage[] = [],
  options: LLMOptions = {}
): Promise<ChatResponse> {
  const client = getLLMClient();
  const { warnings } = validateContext(context);
  const systemMessages = buildSystemMessages(context);

  const messages: any[] = [
    ...systemMessages,
    ...chatHistory,
    { role: "user", content: userQuery },
  ];

  const completion = await withRetry(() =>
    client.chat.completions.create({
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
}

export async function chatStream(
  userQuery: string,
  context: MasterContext = {},
  chatHistory: SystemMessage[] = [],
  onChunk?: (token: string) => void,
  options: LLMOptions = {}
): Promise<ChatStreamResponse> {
  const client = getLLMClient();
  const { warnings } = validateContext(context);
  const systemMessages = buildSystemMessages(context);

  const messages: any[] = [
    ...systemMessages,
    ...chatHistory,
    { role: "user", content: userQuery },
  ];

  const stream = await withRetry(() =>
    client.chat.completions.create({
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
      if (typeof onChunk === "function") onChunk(token);
    }
  }

  return { answer: fullResponse, warnings };
}
