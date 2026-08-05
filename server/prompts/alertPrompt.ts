/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║         NIFTY50GPT — LAYER 5: ALERT GENERATION PROMPT              ║
 * ║                                                                      ║
 * ║  Converts raw price events into context-rich push notifications.    ║
 * ║  The retention engine — alerts users actually want to read.         ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

export type AlertEventType = "PRICE_MOVE" | "NEWS" | "BREAKOUT" | "EARNINGS";
export type AlertSentiment = "BULLISH" | "BEARISH" | "NEUTRAL";
export type AlertUrgency = "HIGH" | "MEDIUM" | "LOW";

export interface AlertStockData {
  name?: string;
  ticker?: string;
  "change%"?: number | string;
  currentPrice?: number | string;
}

export interface AlertUserContext {
  holdsStock?: boolean;
  avgPrice?: number | null;
  pnlPercent?: number | null;
}

export interface AlertMessageRole {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AlertMeta {
  urgency: AlertUrgency;
  sentiment: AlertSentiment;
  cta: string;
}

export const ALERT_SYSTEM_PROMPT = `
You are an alert generator for a stock market intelligence app.

Convert raw market data into a meaningful, context-rich alert.

═══ INPUT YOU RECEIVE ═══
event:       { type: "PRICE_MOVE | NEWS | BREAKOUT | EARNINGS" }
stock:       { name, ticker, "change%", currentPrice }
trigger:     (string) What caused the event
news:        (string or null) Related headline if any
userContext: { holdsStock: bool, avgPrice, pnlPercent }

═══ ALERT GENERATION RULES ═══

Rule 1: Always add context
  ❌ "Reliance is up 3%"
  ✅ "Reliance gained 3% after reporting record Q3 profits,
      extending its 5-day winning streak."

Rule 2: Personalize when user holds stock
  ❌ "HDFC Bank fell 2%"
  ✅ "HDFC Bank fell 2% on RBI rate hike concerns.
      Your holding is currently at -1.4% today."

Rule 3: Match urgency to event type
  EARNINGS  → Always HIGH urgency
  BREAKOUT  → HIGH urgency
  NEWS (negative) → MEDIUM-HIGH
  PRICE_MOVE (<2%) → LOW

Rule 4: Use active, specific language
  ❌ "Market volatility observed"
  ✅ "Nifty IT index drops 1.8% as TCS, Infosys drag"

═══ OUTPUT FORMAT ═══
Respond with ONLY valid JSON. No markdown, no explanation.
{
  "title":     "Short alert headline (max 8 words)",
  "body":      "1-2 sentence explanation with context",
  "sentiment": "BULLISH | BEARISH | NEUTRAL",
  "urgency":   "HIGH | MEDIUM | LOW",
  "cta":       "View Analysis | Check Portfolio | Read News"
}

═══ EXAMPLES ═══
EARNINGS event:
{
  "title":     "TCS beats estimates — strong guidance",
  "body":      "TCS Q3 revenue grew 8.2% YoY, beating analyst estimates. Management guided for continued deal momentum in FY25.",
  "sentiment": "BULLISH",
  "urgency":   "HIGH",
  "cta":       "View Analysis"
}

PRICE_MOVE + user holds stock:
{
  "title":     "Your Infosys holding is up 2.1%",
  "body":      "Infosys gaining on positive IT sector sentiment post-US Fed rate pause. Your position is now at +6.3% total.",
  "sentiment": "BULLISH",
  "urgency":   "MEDIUM",
  "cta":       "Check Portfolio"
}
`.trim();

export function buildAlertUserMessage(
  eventType: AlertEventType,
  stock: AlertStockData,
  trigger: string,
  news: string | null = null,
  userContext: AlertUserContext = {}
): AlertMessageRole {
  const payload = {
    event: {
      type: eventType,
    },
    stock: {
      name: stock.name || "Unknown",
      ticker: stock.ticker || "UNKNOWN",
      "change%": stock["change%"] ?? "Data not available",
      currentPrice: stock.currentPrice ?? "Data not available",
    },
    trigger: trigger || "Market movement detected",
    news: news || null,
    userContext: {
      holdsStock: userContext.holdsStock ?? false,
      avgPrice: userContext.avgPrice ?? null,
      pnlPercent: userContext.pnlPercent ?? null,
    },
  };

  return {
    role: "user",
    content: JSON.stringify(payload, null, 2),
  };
}

export function buildAlertMessages(
  eventType: AlertEventType,
  stock: AlertStockData,
  trigger: string,
  news: string | null = null,
  userContext: AlertUserContext = {}
): AlertMessageRole[] {
  return [
    { role: "system", content: ALERT_SYSTEM_PROMPT },
    buildAlertUserMessage(eventType, stock, trigger, news, userContext),
  ];
}

export function deriveAlertMeta(
  eventType: AlertEventType,
  stock: AlertStockData,
  trigger: string
): AlertMeta {
  const change = parseFloat(String(stock["change%"] ?? 0));
  const absChange = Math.abs(change);
  const isPositive = change >= 0;

  let urgency: AlertUrgency = "LOW";
  if (eventType === "EARNINGS" || eventType === "BREAKOUT") {
    urgency = "HIGH";
  } else if (eventType === "NEWS") {
    urgency = !isPositive ? "HIGH" : "MEDIUM";
  } else if (eventType === "PRICE_MOVE") {
    if (absChange >= 4) urgency = "HIGH";
    else if (absChange >= 2) urgency = "MEDIUM";
    else urgency = "LOW";
  }

  const sentiment: AlertSentiment =
    change > 0.5 ? "BULLISH" : change < -0.5 ? "BEARISH" : "NEUTRAL";

  const cta =
    eventType === "EARNINGS" || eventType === "BREAKOUT"
      ? "View Analysis"
      : eventType === "NEWS"
      ? "Read News"
      : "Check Portfolio";

  return { urgency, sentiment, cta };
}

export function urgencyToClass(urgency: AlertUrgency): string {
  return urgency === "HIGH"
    ? "urgency-high"
    : urgency === "MEDIUM"
    ? "urgency-medium"
    : "urgency-low";
}

export function sentimentToClass(sentiment: AlertSentiment): string {
  return sentiment === "BULLISH"
    ? "sentiment-bull"
    : sentiment === "BEARISH"
    ? "sentiment-bear"
    : "sentiment-neutral";
}
