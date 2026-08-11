// Alert Service — generates context-rich push alerts from raw market events, with in-memory storage.

import {
  buildAlertMessages,
  deriveAlertMeta,
  AlertEventType,
  AlertStockData,
  AlertUserContext,
  AlertMeta,
} from "../prompts/alertPrompt.js";
import { getLLMClient, getModel } from "./llmService.js";
import { Alert, IAlert } from "../models/Alert.js";

export interface StoredAlert {
  id: string;
  title: string;
  body: string;
  sentiment: string;
  urgency: string;
  cta: string;
  eventType: AlertEventType;
  ticker: string;
  stockName: string;
  change: number | string;
  holdsStock: boolean;
  meta: {
    model?: string;
    tokens?: number;
    generatedAt: string;
  };
  createdAt: string;
  read: boolean;
}

const MAX_ALERTS = 100;

async function storeAlert(alertData: Omit<StoredAlert, "id" | "createdAt" | "read">): Promise<StoredAlert> {
  const doc = await Alert.create({ ...alertData, read: false });
  
  // Maintain max limit by deleting oldest
  const count = await Alert.countDocuments();
  if (count > MAX_ALERTS) {
    const oldest = await Alert.find().sort({ createdAt: 1 }).limit(count - MAX_ALERTS);
    const idsToDelete = oldest.map(a => a._id);
    await Alert.deleteMany({ _id: { $in: idsToDelete } });
  }

  const obj = doc.toObject();
  return { ...obj, id: obj._id.toString() } as unknown as StoredAlert;
}

export interface GenerateAlertOptions {
  model?: string;
  extra?: Record<string, any>;
}

export interface GenerateAlertResult {
  alert: StoredAlert;
  derived: AlertMeta;
  stored: StoredAlert;
}

export async function generateAlert(
  eventType: AlertEventType = "PRICE_MOVE",
  stock: AlertStockData = {},
  trigger = "",
  news: string | null = null,
  userContext: AlertUserContext = {},
  options: GenerateAlertOptions = {}
): Promise<GenerateAlertResult> {
  const client = getLLMClient();
  const model = getModel(options);

  const derived = deriveAlertMeta(eventType, stock, trigger);
  const messages: any[] = buildAlertMessages(eventType, stock, trigger, news, userContext);

  const completion = await client.chat.completions.create({
    model,
    messages,
    temperature: 0.4,
    max_tokens: 300,
    response_format: { type: "json_object" },
    ...options.extra,
  });

  let alert: any;
  try {
    const raw = completion.choices[0]?.message?.content ?? "{}";
    alert = JSON.parse(raw);
  } catch {
    alert = {
      title: `${stock.ticker} — ${eventType}`,
      body: trigger,
      sentiment: derived.sentiment,
      urgency: derived.urgency,
      cta: derived.cta,
    };
  }

  const enrichedPayload: Omit<StoredAlert, "id" | "createdAt" | "read"> = {
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

  const stored = await storeAlert(enrichedPayload);

  return { alert: stored, derived, stored };
}

export interface BatchEventItem {
  eventType?: AlertEventType;
  stock?: AlertStockData;
  trigger?: string;
  news?: string | null;
  userContext?: AlertUserContext;
}

export async function generateAlertBatch(
  events: BatchEventItem[] = [],
  options: GenerateAlertOptions = {}
): Promise<any[]> {
  const results: any[] = [];
  for (const ev of events) {
    try {
      const result = await generateAlert(
        ev.eventType || "PRICE_MOVE",
        ev.stock || {},
        ev.trigger || "",
        ev.news || null,
        ev.userContext || {},
        options
      );
      results.push({ success: true, ...result });
    } catch (err: any) {
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

export async function getAlertHistory(limit = 50): Promise<StoredAlert[]> {
  const alerts = await Alert.find().sort({ createdAt: -1 }).limit(limit).lean();
  return alerts.map(a => {
    const obj = { ...a, id: (a._id as any).toString() };
    delete (obj as any)._id;
    delete (obj as any).__v;
    return obj;
  }) as unknown as StoredAlert[];
}

export async function getUnreadCount(): Promise<number> {
  return await Alert.countDocuments({ read: false });
}

export async function markAllRead(): Promise<{ marked: number }> {
  const result = await Alert.updateMany({ read: false }, { $set: { read: true } });
  return { marked: result.modifiedCount };
}

export async function markRead(id: string): Promise<boolean> {
  const result = await Alert.updateOne({ _id: id }, { $set: { read: true } });
  return result.modifiedCount > 0;
}

export async function clearHistory(): Promise<{ cleared: boolean }> {
  await Alert.deleteMany({});
  return { cleared: true };
}
