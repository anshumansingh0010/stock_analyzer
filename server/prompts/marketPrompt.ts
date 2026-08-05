/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║        NIFTY50GPT — LAYER 4: MARKET MOVEMENT PROMPT                 ║
 * ║                                                                      ║
 * ║  Powers "Why is Nifty up/down?" + Daily Morning Briefing.           ║
 * ║  Takes full market snapshot → returns cause-effect commentary.      ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

export type BriefingType = "INTRADAY" | "MORNING" | "CLOSING";

export interface MarketIndexData {
  nifty50?: number | string;
  bankNifty?: number | string;
  sensex?: number | string;
  "change%"?: number | string;
  dayHigh?: number | string;
  dayLow?: number | string;
}

export interface StockMover {
  stock?: string;
  name?: string;
  ticker?: string;
  "change%"?: number;
  change?: number;
}

export interface SectorPerf {
  name: string;
  "performance%"?: number;
}

export interface GlobalCuesData {
  dow?: string | number;
  nasdaq?: string | number;
  sgxNifty?: string | number;
  crude?: string | number;
  gold?: string | number;
  dollar?: string | number;
}

export interface MarketNewsItem {
  headline?: string;
  sentiment?: "BULLISH" | "BEARISH" | "NEUTRAL";
}

export interface UserPortfolioItem {
  stock?: string;
  ticker?: string;
  sector?: string;
}

export interface MarketMessageRole {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface DerivedMarketMetrics {
  direction: "UP" | "DOWN" | "FLAT";
  change: number;
  breadthRatio: number;
  breadthSignal: "BROAD_BULLISH" | "BROAD_BEARISH" | "MIXED";
  bestSector: { name: string; perf?: number } | null;
  worstSector: { name: string; perf?: number } | null;
  topGainer: { stock?: string; change?: number } | null;
  topLoser: { stock?: string; change?: number } | null;
  niftyLevel: number | string | null;
  dayRange: string | null;
}

export const MARKET_SYSTEM_PROMPT = `
You are a senior market commentator for Indian financial markets.

Your job is to explain today's market movement in a clear, logical
cause-and-effect format — the way a seasoned analyst would explain it
to an informed investor during a morning TV segment.

═══ INPUT FORMAT YOU WILL RECEIVE ═══
index:         { nifty50, bankNifty, sensex, "change%", dayHigh, dayLow }
gainers:       [{ stock, "change%" }]           (top 5 gainers)
losers:        [{ stock, "change%" }]            (top 5 losers)
sectors:       [{ name, "performance%" }]        (all sectors, sorted by perf)
globalCues:    { dow, nasdaq, sgxNifty, crude, gold, dollar }
news:          [{ headline, sentiment }]         (top 10 of day, most recent first)
userPortfolio: [{ stock, sector }]               (user holdings)
briefingType:  "INTRADAY" | "MORNING" | "CLOSING"

═══ 4-STEP ANALYSIS LOGIC ═══

STEP 1 — IDENTIFY THE PRIMARY DRIVER
Determine what is actually driving the index move:
  → Single heavyweight stock drag/lift (Reliance, HDFC Bank, TCS, Infosys)
     These stocks have 5–12% each in Nifty weightage
  → Sector-wide movement (all banks up/down = index swing of 1–2%)
  → Global cues (Dow -2% overnight → expect Nifty gap-down)
  → Macro event (RBI rate decision, inflation print, FII/DII data)
  → Earnings season (quarterly results surprise)
Always cite the specific cause with data: "HDFC Bank (+2.1%) alone contributed ~0.3% to Nifty"

STEP 2 — CONFIRM WITH NEWS
Scan the top headlines for an event that explains the move.
  → Direct match: "Strong earnings → stock surge"
  → Indirect match: "Global risk-off → FIIs sell → broad market fall"
  → Contradiction: "Index up despite negative news → resilience, watch carefully"

STEP 3 — ASSESS MARKET BREADTH
  Gainers:Losers ratio → broad vs narrow move
  > 3:1 gainers  → bullish breadth, broad participation
  < 1:3 gainers  → bearish breadth, widespread selling
  1:1 mixed      → indecisive, churning market
  Single sector driving → narrow, treat with caution

STEP 4 — PORTFOLIO CONNECTION
For each stock in userPortfolio:
  → Check if it's in today's gainers/losers
  → Check if its sector is performing above/below average
  → Provide 1-line personalised impact note

═══ BRIEFING TYPE RULES ═══

MORNING briefing (pre-9:15 AM):
  → Lead with global cues (SGX Nifty, Dow, Nasdaq, Crude)
  → Identify what to watch at open
  → Flag any pre-market news that could set tone
  → End with: "Watch for: [key level/event today]"

INTRADAY briefing:
  → Lead with what is actually happening right now
  → Cite current index level vs open
  → Identify active sector rotation
  → Portfolio stocks that are moving

CLOSING briefing (post-3:30 PM):
  → Full day summary
  → What sustained vs what faded
  → FII/DII activity if in data
  → Setup for tomorrow

═══ STRICT OUTPUT FORMAT ═══
Follow this structure exactly. Do NOT skip sections.

**Summary:**
(1–2 sentences: what happened + primary reason — use plain English, cite % move)

**Key Drivers:**
• [Driver 1] — [specific data: stock name, %, sector]
• [Driver 2] — [specific data]
• [Driver 3] — [specific data]

**Sector Snapshot:**
• [Sector Name]: [+/- X.X%] — [one-line reason if identifiable]
(List all sectors provided, sorted best to worst)

**Global Cues Impact:**
(1–2 lines: how Dow/Nasdaq/SGX/Crude/Gold influenced today's session)

**Market Breadth:**
(1 line: gainers vs losers count, what this signals)

**Your Portfolio Today:**
(Only include if userPortfolio is provided and non-empty)
• "[Stock] [moved +/- X%] — [1-line reason tied to today's move]"
(One line per portfolio stock that was in today's movers or affected sector)
If none affected: "Your holdings were not significantly impacted today."

**Outlook:**
(1 line: what to watch tomorrow — key level, event, or catalyst)

═══ STRICT RULES ═══
✅ Lead every driver bullet with a specific stock/sector name and percentage
✅ Use cause-effect language: "X → Y → Z implication"
✅ Morning briefing must mention SGX Nifty as the first forward indicator
✅ Cite exact Nifty levels (not just direction)
❌ NEVER say "buy" or "sell"
❌ NEVER make up index levels, stock prices, or FII data not in input
❌ NEVER skip the Sector Snapshot — it must list every sector provided
❌ Do NOT add legal disclaimers
`.trim();

export const MORNING_BRIEFING_ADDENDUM = `
ADDITIONAL INSTRUCTIONS FOR MORNING BRIEFING:
You are presenting the pre-market briefing BEFORE the market opens.
Structure your response as a "What to expect today" report.
Lead with: "Good morning. Here is your pre-market setup for [date]."
Replace "Key Drivers" with "Pre-Market Signals".
Replace "Market Breadth" with "Opening Outlook".
End Outlook section with: "First 30 minutes will be key — watch [specific level]."
`.trim();

export function buildMarketSystemPrompt(briefingType: BriefingType = "INTRADAY"): string {
  if (briefingType === "MORNING") {
    return `${MARKET_SYSTEM_PROMPT}\n\n${MORNING_BRIEFING_ADDENDUM}`;
  }
  return MARKET_SYSTEM_PROMPT;
}

export function buildMarketUserMessage(
  index: MarketIndexData = {},
  gainers: StockMover[] = [],
  losers: StockMover[] = [],
  sectors: SectorPerf[] = [],
  globalCues: GlobalCuesData = {},
  news: MarketNewsItem[] = [],
  userPortfolio: UserPortfolioItem[] = [],
  briefingType: BriefingType = "INTRADAY"
): MarketMessageRole {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });

  const payload = {
    briefingType,
    date: dateStr,
    time: `${timeStr} IST`,
    index: {
      nifty50: index.nifty50 ?? "Data not available",
      bankNifty: index.bankNifty ?? "Data not available",
      sensex: index.sensex ?? "Data not available",
      "change%": index["change%"] ?? "Data not available",
      dayHigh: index.dayHigh ?? "Data not available",
      dayLow: index.dayLow ?? "Data not available",
    },
    topGainers: gainers.slice(0, 5).map((g) => ({
      stock: g.stock || g.name || g.ticker || "Unknown",
      "change%": g["change%"] ?? g.change ?? 0,
    })),
    topLosers: losers.slice(0, 5).map((l) => ({
      stock: l.stock || l.name || l.ticker || "Unknown",
      "change%": l["change%"] ?? l.change ?? 0,
    })),
    sectors:
      sectors.length > 0
        ? sectors.sort((a, b) => (b["performance%"] ?? 0) - (a["performance%"] ?? 0))
        : "Sector data not available",
    globalCues: {
      dow: globalCues.dow ?? "Data not available",
      nasdaq: globalCues.nasdaq ?? "Data not available",
      sgxNifty: globalCues.sgxNifty ?? "Data not available",
      crude: globalCues.crude ?? "Data not available",
      gold: globalCues.gold ?? "Data not available",
      dollar: globalCues.dollar ?? "Data not available",
    },
    topNews: news.slice(0, 10).map((n) => ({
      headline: n.headline || "",
      sentiment: n.sentiment || "NEUTRAL",
    })),
    userPortfolio:
      userPortfolio.length > 0
        ? userPortfolio.map((p) => ({ stock: p.stock || p.ticker || "", sector: p.sector || "" }))
        : "No portfolio provided",
  };

  return {
    role: "user",
    content: JSON.stringify(payload, null, 2),
  };
}

export function buildMarketMessages(
  index: MarketIndexData = {},
  gainers: StockMover[] = [],
  losers: StockMover[] = [],
  sectors: SectorPerf[] = [],
  globalCues: GlobalCuesData = {},
  news: MarketNewsItem[] = [],
  userPortfolio: UserPortfolioItem[] = [],
  briefingType: BriefingType = "INTRADAY"
): MarketMessageRole[] {
  return [
    { role: "system", content: buildMarketSystemPrompt(briefingType) },
    buildMarketUserMessage(
      index,
      gainers,
      losers,
      sectors,
      globalCues,
      news,
      userPortfolio,
      briefingType
    ),
  ];
}

export function deriveMarketMetrics(
  gainers: StockMover[] = [],
  losers: StockMover[] = [],
  sectors: SectorPerf[] = [],
  index: MarketIndexData = {}
): DerivedMarketMetrics {
  const change = parseFloat(String(index["change%"] ?? 0));
  const direction: "UP" | "DOWN" | "FLAT" =
    change > 0.3 ? "UP" : change < -0.3 ? "DOWN" : "FLAT";

  const totalMovers = gainers.length + losers.length;
  const breadthRatio =
    totalMovers > 0 ? parseFloat((gainers.length / totalMovers).toFixed(2)) : 0.5;

  let breadthSignal: "BROAD_BULLISH" | "BROAD_BEARISH" | "MIXED" = "MIXED";
  if (breadthRatio > 0.65) breadthSignal = "BROAD_BULLISH";
  else if (breadthRatio < 0.35) breadthSignal = "BROAD_BEARISH";

  const sorted = [...sectors].sort(
    (a, b) => (b["performance%"] ?? 0) - (a["performance%"] ?? 0)
  );
  const bestSec = sorted[0] ?? null;
  const worstSec = sorted[sorted.length - 1] ?? null;

  const topGainer =
    gainers.sort((a, b) => (b["change%"] ?? 0) - (a["change%"] ?? 0))[0] ?? null;
  const topLoser =
    losers.sort((a, b) => (a["change%"] ?? 0) - (b["change%"] ?? 0))[0] ?? null;

  return {
    direction,
    change,
    breadthRatio,
    breadthSignal,
    bestSector: bestSec ? { name: bestSec.name, perf: bestSec["performance%"] } : null,
    worstSector: worstSec ? { name: worstSec.name, perf: worstSec["performance%"] } : null,
    topGainer: topGainer
      ? { stock: topGainer.stock || topGainer.name, change: topGainer["change%"] }
      : null,
    topLoser: topLoser
      ? { stock: topLoser.stock || topLoser.name, change: topLoser["change%"] }
      : null,
    niftyLevel: index.nifty50 ?? null,
    dayRange:
      index.dayHigh && index.dayLow ? `${index.dayLow} – ${index.dayHigh}` : null,
  };
}
