/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║     NIFTY50GPT — LIVE REAL-TIME FINANCIAL NEWS ENGINE (LAYER 2)      ║
 * ║                                                                      ║
 * ║  Aggregates, deduplicates, tags, and analyzes 100% REAL LIVE         ║
 * ║  financial news articles from Zerodha Pulse, Google News, ET & MC.   ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { fetchCombinedRssNews } from "./rssService.js";
import { NIFTY50_STOCKS } from "../constants/nifty50.js";

export interface AnalyzedLiveArticle {
  id: string | number;
  headline: string;
  summary: string;
  source: string;
  timestamp: string;
  overallMarketSentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
  confidence: number;
  urgency: "HIGH" | "MEDIUM" | "LOW";
  sectorAffected: string[];
  companies: Array<{
    ticker: string;
    name: string;
    sentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
    sentimentScore: number;
    inUserPortfolio: boolean;
    reason: string;
  }>;
  expectedImpact: {
    shortTerm: string;
    longTerm: string;
  };
}

let cachedLiveArticles: AnalyzedLiveArticle[] = [];
let lastFetchTime: number = 0;
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes cache TTL

const BULLISH_KEYWORDS = [
  "profit", "surge", "gain", "rise", "beat", "record", "growth", "jump",
  "rally", "upgrade", "soar", "high", "positive", "expand", "dividend",
  "buyback", "order win", "approval", "outperform", "bullish", "ipo",
  "fundraise", "investment", "acquisition", "expansion"
];

const BEARISH_KEYWORDS = [
  "drop", "fall", "decline", "loss", "miss", "slash", "cut", "downward",
  "bearish", "downgrade", "plunge", "sink", "penalty", "warning", "probe",
  "fraud", "investigation", "slump", "weak"
];

/**
 * Heuristically extracts mentioned Nifty 50 stocks & computes sentiment from headline & description.
 */
function tagAndAnalyzeArticle(article: { headline: string; description: string; source: string; timestamp: string }, index: number, portfolioTickers: string[] = []): AnalyzedLiveArticle {
  const fullText = `${article.headline} ${article.description}`.toLowerCase();

  // Determine sentiment
  let bullHits = 0;
  let bearHits = 0;
  BULLISH_KEYWORDS.forEach((kw) => { if (fullText.includes(kw)) bullHits++; });
  BEARISH_KEYWORDS.forEach((kw) => { if (fullText.includes(kw)) bearHits++; });

  let sentiment: "BULLISH" | "BEARISH" | "NEUTRAL" = "NEUTRAL";
  let confidence = 75 + (Math.abs(bullHits - bearHits) * 5);
  if (confidence > 98) confidence = 98;

  if (bullHits > bearHits) sentiment = "BULLISH";
  else if (bearHits > bullHits) sentiment = "BEARISH";

  // Match companies
  const matchedCompanies: any[] = [];
  const textUpper = `${article.headline} ${article.description}`.toUpperCase();

  NIFTY50_STOCKS.forEach((stk) => {
    const sym = stk.ticker.toUpperCase();
    const nameUpper = stk.name.toUpperCase();
    const nameFirstWord = stk.name.split(" ")[0].toUpperCase();

    if (textUpper.includes(` ${sym} `) || textUpper.includes(`${sym}:`) || (nameFirstWord.length > 3 && textUpper.includes(nameFirstWord))) {
      const inPortfolio = portfolioTickers.includes(sym);
      matchedCompanies.push({
        ticker: sym,
        name: stk.name,
        sentiment,
        sentimentScore: sentiment === "BULLISH" ? 0.88 : sentiment === "BEARISH" ? 0.32 : 0.50,
        inUserPortfolio: inPortfolio,
        reason: `${stk.name} mentioned in breaking financial news update (${article.source}).`,
      });
    }
  });

  // Extract sectors with exact word boundaries
  const sectorSet = new Set<string>();
  if (/\b(bank|banking|rbi|lending|loan|nbfcs)\b/i.test(fullText)) sectorSet.add("Banking");
  if (/\b(telecom|trai|1601|airtel|jio|spectrum|5g|communication|cpaas)\b/i.test(fullText)) sectorSet.add("Telecom");
  if (/\b(courier|logistics|shipping|freight|express)\b/i.test(fullText)) sectorSet.add("Logistics");
  if (/\b(utility|utilities|power|grid|electricity)\b/i.test(fullText)) sectorSet.add("Utilities");
  if (/\b(it|technology|software|cloud|saas|ai)\b/i.test(fullText) && !/\butilities\b/i.test(fullText)) sectorSet.add("IT");
  if (/\b(auto|ev|car|vehicle|automobile)\b/i.test(fullText)) sectorSet.add("Auto");
  if (/\b(pharma|fda|health|healthcare|drug)\b/i.test(fullText)) sectorSet.add("Pharma");
  if (/\b(oil|gas|energy|petro)\b/i.test(fullText)) sectorSet.add("Energy");
  if (/\b(metal|steel|copper|aluminum|mining)\b/i.test(fullText)) sectorSet.add("Metal");
  if (sectorSet.size === 0) sectorSet.add("Markets");

  const isHighImpact = fullText.includes("rbi") || fullText.includes("nifty") || fullText.includes("sensex") || fullText.includes("fed") || matchedCompanies.length > 0;

  const primaryCompany = matchedCompanies[0]?.ticker;
  const primarySector = Array.from(sectorSet)[0];
  const expectedImpact = generateContextualImpactServer(article.headline, article.description, sentiment, primaryCompany, primarySector);

  return {
    id: `live-${Date.now()}-${index}`,
    headline: article.headline,
    summary: article.description || article.headline,
    source: article.source || "Financial News Feed",
    timestamp: article.timestamp || new Date().toISOString(),
    overallMarketSentiment: sentiment,
    confidence,
    urgency: isHighImpact ? "HIGH" : "MEDIUM",
    sectorAffected: Array.from(sectorSet),
    companies: matchedCompanies.length > 0 ? matchedCompanies : [
      {
        ticker: "NIFTY50",
        name: "Nifty 50 Benchmark",
        sentiment,
        sentimentScore: sentiment === "BULLISH" ? 0.85 : sentiment === "BEARISH" ? 0.35 : 0.50,
        inUserPortfolio: false,
        reason: "Broad Indian equity market commentary & macroeconomic trend.",
      }
    ],
    expectedImpact,
  };
}

function generateContextualImpactServer(headline: string, description: string, sentiment: "BULLISH" | "BEARISH" | "NEUTRAL", companyTicker?: string, sector?: string) {
  const text = `${headline} ${description}`.toLowerCase();
  const subject = companyTicker && companyTicker !== "NIFTY50" ? companyTicker : (sector || "market");

  // 0. TRAI / Telecom / 1601 Series / Spam / DLT Directives
  if (text.includes("trai") || text.includes("1601") || text.includes("telecom") || text.includes("caller") || text.includes("spam") || text.includes("dlt")) {
    if (sentiment === "BULLISH") return { shortTerm: "+0.8% to +1.6% upside momentum as enterprise voice/SMS compliance volume increases for Telecom carriers", longTerm: "Sustained enterprise CPaaS revenue growth & DLT network monetization for Telecom operators" };
    if (sentiment === "BEARISH") return { shortTerm: "-0.5% to -1.5% compliance cost burden expected on commercial voice senders", longTerm: "Higher operational overhead for enterprise senders complying with TRAI headers & numbering standards" };
    return { shortTerm: "Neutral price action as Telecom operators & enterprise senders implement TRAI's 1601 series routing", longTerm: "Enhanced anti-spam DLT compliance & fraud prevention with steady enterprise communication revenues" };
  }

  // 1. Employment / Unemployment / Labor Force / LFPR / Job Market
  if (text.includes("unemployment") || text.includes("labor") || text.includes("labour") || text.includes("lfpr") || text.includes("hiring") || text.includes("payroll") || text.includes("jobs") || text.includes("employment")) {
    if (sentiment === "BULLISH") return { shortTerm: "+0.6% to +1.4% positive sentiment as expanding employment signals strong economic activity & consumer confidence", longTerm: "Higher labor force participation drives urban disposable income growth, boosting retail, FMCG, and consumer durables" };
    if (sentiment === "BEARISH") return { shortTerm: "-0.5% to -1.5% intraday caution as dipping LFPR signals potential softness in urban household income & consumer sentiment", longTerm: "Muted urban wage growth & labor participation may constrain consumer discretionary spending & FMCG/retail volume growth" };
    return { shortTerm: "Range-bound market reaction as labor market indicators remain broadly steady", longTerm: "Balanced economic outlook with steady labor participation supporting consumption stability" };
  }

  // 2. Interest Rates / Central Bank / Inflation / Monetary Policy
  if (text.includes("interest rate") || text.includes("repo rate") || text.includes("fed rate") || text.includes("rate hike") || text.includes("rate cut") || text.includes("rbi") || text.includes("fed") || text.includes("inflation") || text.includes("boj") || text.includes("monetary") || text.includes("yield")) {
    if (sentiment === "BULLISH") return { shortTerm: "+0.8% to +1.8% relief rally expected as rate trajectory favors equity valuations", longTerm: `Lower cost of capital & NIM stabilization expected to expand P/E multiples for ${subject}` };
    if (sentiment === "BEARISH") return { shortTerm: "-0.8% to -2.0% pressure expected as rate hawkishness & inflation risks weigh on trading", longTerm: `Elevated borrowing costs may temper capital expenditure & earnings expansion for ${subject}` };
    return { shortTerm: "Range-bound price action expected as markets digest monetary policy & inflation signals", longTerm: "Balanced macro posture with policy stance remaining data-dependent over coming quarters" };
  }

  if (text.includes("profit") || text.includes("revenue") || text.includes("q4") || text.includes("q3") || text.includes("guidance") || text.includes("result") || text.includes("margin") || text.includes("earnings") || text.includes("beat") || text.includes("miss")) {
    if (sentiment === "BULLISH") return { shortTerm: "+1.5% to +3.0% post-earnings surge driven by strong financial beat & operating leverage", longTerm: `Multi-quarter earnings compounding backed by revenue momentum & margin expansion for ${subject}` };
    if (sentiment === "BEARISH") return { shortTerm: "-2.0% to -4.2% intraday pullback following earnings/guidance disappointment", longTerm: `Consolidation phase until discretionary demand & margin recovery materialize for ${subject}` };
    return { shortTerm: "In-line financial performance likely to keep stock trading in a tight consolidation range", longTerm: "Stable cash flow generation & steady operating trajectory aligned with market expectations" };
  }

  if (text.includes("deal") || text.includes("contract") || text.includes("order") || text.includes("acquisition") || text.includes("expansion") || text.includes("partnership") || text.includes("ipo") || text.includes("subscribe")) {
    if (sentiment === "BULLISH") return { shortTerm: "+1.2% to +2.5% upside momentum following major deal & revenue visibility announcement", longTerm: `Sustained top-line compounding & market share gains over multi-year contract term for ${subject}` };
    if (sentiment === "BEARISH") return { shortTerm: "-0.8% to -1.8% cautious market reaction as investors evaluate execution & integration risks", longTerm: `Margin compression risks if project implementation encounters cost overruns for ${subject}` };
    return { shortTerm: "Neutral price action as subscription & deal terms are evaluated relative to current valuations", longTerm: "Gradual strategic contribution aligned with management's long-term business roadmap" };
  }

  if (text.includes("policy") || text.includes("pli") || text.includes("government") || text.includes("cabinet") || text.includes("scheme") || text.includes("tax") || text.includes("probe") || text.includes("penalty") || text.includes("fda")) {
    if (sentiment === "BULLISH") return { shortTerm: "+1.0% to +2.2% policy-driven momentum across sector beneficiaries", longTerm: `Structural tailwinds & government incentives enhancing domestic competitiveness for ${subject}` };
    if (sentiment === "BEARISH") return { shortTerm: "-1.2% to -2.8% regulatory overhang creating short-term valuation discount", longTerm: `Compliance overhead & regulatory scrutiny tempering long-term valuation multiples for ${subject}` };
    return { shortTerm: "Limited immediate price reaction as policy guidelines await formal implementation details", longTerm: "Neutral structural impact with compliance costs balanced by domestic market opportunity" };
  }

  const cleanHeadline = headline.split("-")[0].split(":")[0].replace(/[^a-zA-Z0-9 ]/g, "").trim();
  const topicSnippet = cleanHeadline.length > 5 && cleanHeadline.length < 45 ? cleanHeadline : subject;

  if (sentiment === "BULLISH") return { shortTerm: `+0.8% to +2.0% positive momentum expected as market sentiment favors ${topicSnippet}`, longTerm: `Positive structural growth trajectory with potential multi-quarter re-rating for ${subject}` };
  if (sentiment === "BEARISH") return { shortTerm: `-0.8% to -2.2% selling pressure & consolidation expected on ${topicSnippet}`, longTerm: `Near-term consolidation phase until fundamental catalysts & demand rebound for ${subject}` };
  return { shortTerm: `Range-bound intraday movement as market participants evaluate developments in ${topicSnippet}`, longTerm: `Balanced risk-reward outlook with steady fundamental positioning for ${subject}` };
}

/**
 * Fetches 100% REAL LIVE aggregated financial news from Zerodha Pulse, Google News, ET, and Moneycontrol.
 */
export async function getLiveNewsFeed(portfolioTickers: string[] = []): Promise<AnalyzedLiveArticle[]> {
  const now = Date.now();
  if (cachedLiveArticles.length > 0 && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedLiveArticles;
  }

  try {
    const rawArticles = await fetchCombinedRssNews({
      portfolioTickers,
      maxArticles: 50,
    });

    if (rawArticles.length > 0) {
      const processed = rawArticles.map((art, idx) =>
        tagAndAnalyzeArticle(
          {
            headline: art.headline || "",
            description: art.description || "",
            source: art.source || "News",
            timestamp: art.timestamp || new Date().toISOString(),
          },
          idx,
          portfolioTickers
        )
      );
      cachedLiveArticles = processed;
      lastFetchTime = now;
      console.log(`[NewsService] 📰 Processed & cached ${processed.length} live financial news articles.`);
      return processed;
    }
  } catch (err: any) {
    console.warn(`[NewsService] ⚠️ Live RSS fetch failed (${err.message}). Using fallback cached news.`);
  }

  return cachedLiveArticles;
}
