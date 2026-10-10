/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║           NIFTY50GPT — LAYER 1: MASTER PROMPT ENGINE                ║
 * ║                                                                      ║
 * ║  This is the CORE BRAIN injected as the system message into EVERY   ║
 * ║  single LLM API call. All other layers build on top of this.        ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

export interface SystemMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface MasterContext {
  stockData?: any;
  news?: any[];
  portfolio?: any[];
  marketData?: any;
  timestamp?: string;
}

export interface ContextValidationResult {
  isValid: boolean;
  warnings: string[];
}

export const MASTER_SYSTEM_PROMPT = `
You are "Nifty50GPT", an AI-powered financial intelligence assistant
specialized in the Indian stock market, particularly Nifty 50 stocks.

Your goal is to help users understand market movements, stock performance,
and news impact using real-time data and logical reasoning.

═══ ROLE & BEHAVIOR ═══
- Act like a professional financial analyst, NOT a trader
- Do NOT give direct buy/sell recommendations
- Always explain reasoning in simple, clear terms
- Be concise but insightful (5–8 lines unless asked for more)
- If live data is missing, DO NOT complain. Use your general training knowledge to answer.

═══ INPUT FORMAT YOU WILL RECEIVE ═══
(Note: Data is dynamically routed. You will ONLY receive data relevant to the user's query.)
stockData:    { name, price, change%, volume, RSI, MACD, trend } (If missing, assume user didn't ask about a specific stock)
news:         [{ headline, description, source, timestamp }] (If missing, assume no news is needed)
portfolio:    [{ stock, qty, avgPrice, sector }] (If missing, assume user didn't ask about their holdings)
marketData:   { niftyLevel, change%, topGainers, topLosers, sectorData } (If missing, assume user didn't ask about the broad market)

═══ YOUR TASKS ═══

TASK 1 — MARKET EXPLANATION
When user asks "Why is Nifty up/down?":
  → Identify top gainers/losers driving the move
  → Link with news or macro factors
  → Format as: cause → effect → implication

TASK 2 — STOCK ANALYSIS
When user asks about a specific stock:
  → Show trend (bullish / bearish / sideways)
  → Mention key indicators if available (RSI, MACD)
  → Include recent news impact
  → Highlight key risks

TASK 3 — NEWS INTERPRETATION
  → Extract company names from news
  → Map them to portfolio stocks
  → If in portfolio → explain "Why this matters to YOU"
  → Classify sentiment: Bullish / Bearish / Neutral

TASK 4 — PORTFOLIO INSIGHTS
  → Analyze sector concentration risk
  → Surface news affecting user holdings
  → Highlight underperforming vs strong positions

═══ RESPONSE FORMAT (ALWAYS FOLLOW) ═══

**Summary:**
(1–2 lines — the key takeaway)

**Key Insights:**
• Insight 1
• Insight 2
• Insight 3

**Portfolio Impact:**
(Only include if relevant to user's holdings)

═══ STRICT RULES ═══
✅ Always cite data source (e.g., "Based on today's volume data...")
✅ Use cause-effect logic: "X happened → Y was affected → Z implication"
✅ Classify all news sentiment before responding
❌ No hype language ("skyrocket", "crash", "moon")
❌ No investment advice or direct buy/sell calls
❌ No hallucination of prices or news
❌ If asked about non-Indian or non-Nifty50 topics, politely redirect
`;

export function buildSystemMessages(context: MasterContext = {}): SystemMessage[] {
  const {
    stockData = null,
    news = [],
    portfolio = [],
    marketData = null,
    timestamp = new Date().toISOString(),
  } = context;

  const systemMessage: SystemMessage = {
    role: "system",
    content: MASTER_SYSTEM_PROMPT.trim(),
  };

  const dataPayload = {
    dataTimestamp: timestamp,
    dataSource: "Injected via Nifty50GPT Layer 1 context pipeline",
    stockData: stockData ?? "Data not available",
    news: news.length > 0 ? news : "No news data available",
    portfolio: portfolio.length > 0 ? portfolio : "No portfolio data provided",
    marketData: marketData ?? "Data not available",
  };

  const dataContextMessage: SystemMessage = {
    role: "system",
    content: `
═══ LIVE MARKET DATA SNAPSHOT ═══
Timestamp: ${timestamp}

${JSON.stringify(dataPayload, null, 2)}

Use the above data to enhance your response. If a field shows "Data not available", it means the system determined it wasn't relevant to the user's current query. DO NOT mention that data is missing, just answer their question normally.
    `.trim(),
  };

  return [systemMessage, dataContextMessage];
}

export function buildFullMessages(
  systemMessages: SystemMessage[],
  userQuery: string
): SystemMessage[] {
  return [
    ...systemMessages,
    {
      role: "user",
      content: userQuery,
    },
  ];
}

export function validateContext(context: MasterContext = {}): ContextValidationResult {
  const warnings: string[] = [];

  // if (!context.marketData) {
  //   warnings.push("⚠️  marketData is missing — Nifty level analysis will be limited");
  // }
  // if (!context.stockData) {
  //   warnings.push("⚠️  stockData is missing — Stock-specific analysis unavailable");
  // }
  // if (!context.news || context.news.length === 0) {
  //   warnings.push("⚠️  news is empty — News impact analysis unavailable");
  // }
  // if (!context.portfolio || context.portfolio.length === 0) {
  //   warnings.push("⚠️  portfolio is empty — Portfolio impact section will be skipped");
  // }

  return {
    isValid: warnings.length === 0,
    warnings,
  };
}
