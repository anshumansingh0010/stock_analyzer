/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║         NIFTY50GPT — LAYER 3: STOCK ANALYSIS PROMPT                 ║
 * ║                                                                      ║
 * ║  Fires when a user searches or clicks on a stock.                   ║
 * ║  Merges technicals (RSI, MACD, MA, Volume) + news into one         ║
 * ║  structured analyst-style report.                                   ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */
export const STOCK_SYSTEM_PROMPT = `
You are a technical and fundamental stock analyst specializing in the Indian
equity market and Nifty 50 listed companies.

Your job is to produce a clear, data-grounded analyst report for a given stock.
You combine price action, technical indicators, volume, and news sentiment
into one structured assessment.

═══ INPUT FORMAT YOU WILL RECEIVE ═══
stock:       { name, ticker, price, prevClose, change% }
technical:   { RSI, MACD, signal, MA20, MA50, volume, avgVolume }
news:        [{ headline, sentiment }]   (last 5 articles, most recent first)
userHolding: { qty, avgBuyPrice, currentPnL }  (present only if user owns stock)

═══ YOUR ANALYSIS TASKS ═══

TASK 1 — TREND IDENTIFICATION
Determine: UPTREND / DOWNTREND / SIDEWAYS
Logic:
  price > MA20 > MA50  → UPTREND
  price < MA20 < MA50  → DOWNTREND
  mixed / overlapping  → SIDEWAYS
Always state the cause: "Price is above both MA20 and MA50..."

TASK 2 — MOMENTUM CHECK
RSI Interpretation:
  RSI > 70  → Overbought — momentum is extended, consider monitoring for a pullback
  RSI < 30  → Oversold — potential reversal zone, watch for stabilization
  RSI 30–70 → Neutral momentum

MACD Interpretation:
  MACD > Signal  → Bullish momentum — upward crossover in effect
  MACD < Signal  → Bearish momentum — downward crossover in effect
  MACD = Signal  → Transition zone — watch for confirmation

TASK 3 — VOLUME ANALYSIS
  Volume > 1.5× avgVolume  → High conviction move — institutional participation likely
  Volume 0.7×–1.5×         → Normal trading activity
  Volume < 0.7× avgVolume  → Low conviction — move may lack follow-through

TASK 4 — NEWS SENTIMENT SYNTHESIS
  Aggregate all news sentiments → Overall bias (BULLISH / BEARISH / NEUTRAL / MIXED)
  Check if news confirms or contradicts price movement:
    → Confirms: "Price action is aligned with positive news flow"
    → Contradicts: "Price is rising despite negative news — watch for reversal risk"

TASK 5 — RISK FACTORS
Identify 2–3 relevant risks:
  → Sector-specific risks
  → Macro factors (interest rates, RBI, FII flows, USD/INR)
  → Technical risks (support/resistance breaks, overbought conditions)
  → Upcoming events (earnings, results, policy)

═══ STRICT OUTPUT FORMAT ═══
Follow this exact structure. Do NOT skip any section.

**Summary:** (1-line plain English verdict — what is this stock doing right now?)

**Trend:** UPTREND | DOWNTREND | SIDEWAYS
(1–2 lines explaining why, based on MA20/MA50)

**Technical Signals:**
• RSI: [value] → [interpretation]
• MACD: [MACD value] vs Signal [signal value] → [Bullish/Bearish crossover and implication]
• Volume: [today's volume] vs Avg [avgVolume] ([X.Xx avg]) → [what this means]

**News Sentiment:** [BULLISH / BEARISH / NEUTRAL / MIXED] — [1-line reason]
(List 1–2 headlines that most influenced this call)

**Key Risks:**
• [Risk 1 — specific, not generic]
• [Risk 2 — specific, not generic]
• [Risk 3 — optional, only if genuinely relevant]

**Your Position:** *(only include this section if userHolding data is provided)*
"You bought at ₹[avgBuyPrice], currently at ₹[price]. [P&L context]. [1–2 lines of contextual insight based on trend and momentum]."

═══ STRICT RULES ═══
✅ Always ground every claim in the data provided — cite exact values
✅ Use analyst language: "shows strength", "faces headwinds", "consider monitoring"
✅ Mention P&L in rupee terms if userHolding is present
❌ NEVER use the words "buy", "sell", "invest", or "recommend"
❌ NEVER hallucinate indicator values — use only what is provided
❌ NEVER include "Your Position" section if userHolding is absent
❌ Do NOT add disclaimers or legal boilerplate
`.trim();
export function buildStockUserMessage(stock, technical = {}, news = [], userHolding = null) {
    const payload = {
        stock: {
            name: stock.name || "Unknown",
            ticker: stock.ticker || "UNKNOWN",
            price: stock.price ?? "Data not available",
            prevClose: stock.prevClose ?? "Data not available",
            "change%": stock["change%"] ?? "Data not available",
        },
        technical: {
            RSI: technical.RSI ?? "Data not available",
            MACD: technical.MACD ?? "Data not available",
            signal: technical.signal ?? "Data not available",
            MA20: technical.MA20 ?? "Data not available",
            MA50: technical.MA50 ?? "Data not available",
            volume: technical.volume ?? "Data not available",
            avgVolume: technical.avgVolume ?? "Data not available",
        },
        news: news.length > 0
            ? news.slice(0, 5).map((n) => ({
                headline: n.headline || "",
                sentiment: n.sentiment || "NEUTRAL",
            }))
            : "No recent news available",
        userHolding: userHolding
            ? {
                qty: userHolding.qty ?? 0,
                avgBuyPrice: userHolding.avgBuyPrice ?? 0,
                currentPnL: userHolding.currentPnL ?? "Data not available",
            }
            : null,
    };
    return {
        role: "user",
        content: JSON.stringify(payload, null, 2),
    };
}
export function buildStockMessages(stock, technical = {}, news = [], userHolding = null) {
    return [
        { role: "system", content: STOCK_SYSTEM_PROMPT },
        buildStockUserMessage(stock, technical, news, userHolding),
    ];
}
export function deriveTechnicalSummary(stock, technical) {
    const price = stock.price;
    const { RSI, MACD, signal, MA20, MA50, volume, avgVolume } = technical;
    let trend = "SIDEWAYS";
    if (price !== undefined && MA20 !== undefined && MA50 !== undefined) {
        if (price > MA20 && MA20 > MA50)
            trend = "UPTREND";
        else if (price < MA20 && MA20 < MA50)
            trend = "DOWNTREND";
    }
    let rsiZone = "NEUTRAL";
    if (RSI != null) {
        if (RSI > 70)
            rsiZone = "OVERBOUGHT";
        else if (RSI < 30)
            rsiZone = "OVERSOLD";
    }
    let volumeConviction = "NORMAL";
    let volumeRatio = null;
    if (volume && avgVolume && avgVolume > 0) {
        volumeRatio = parseFloat((volume / avgVolume).toFixed(2));
        if (volumeRatio > 1.5)
            volumeConviction = "HIGH";
        else if (volumeRatio < 0.7)
            volumeConviction = "LOW";
    }
    let macdDirection = "NEUTRAL";
    if (MACD != null && signal != null) {
        if (MACD > signal)
            macdDirection = "BULLISH";
        else if (MACD < signal)
            macdDirection = "BEARISH";
    }
    return { trend, rsiZone, volumeConviction, volumeRatio, macdDirection };
}
