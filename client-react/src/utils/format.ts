/** Lightweight markdown → HTML for AI chat responses */
export function formatResponse(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^#{1,3} (.+)$/gm, (_, t) => `<strong style="display:block;margin-top:10px;color:var(--accent-secondary)">${t}</strong>`)
    .replace(/^[•\-\*] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^(.+)$/, '<p>$1</p>')
    .replace(/\b(Bullish)\b/g, `<span style="color:var(--accent-bull);font-weight:600">▲ $1</span>`)
    .replace(/\b(Bearish)\b/g, `<span style="color:var(--accent-danger);font-weight:600">▼ $1</span>`)
    .replace(/\b(Neutral)\b/g,  `<span style="color:var(--accent-warn);font-weight:600">◆ $1</span>`);
}

/** Formatter for the Layer 3 stock report */
export function formatStockReport(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\*\*(Summary|Trend|Technical Signals|News Sentiment|Key Risks|Your Position):\*\*/gm,
      (_, t) => `<strong style="display:block;margin-top:16px;margin-bottom:4px;color:var(--accent-secondary);font-size:0.78rem;text-transform:uppercase;letter-spacing:0.08em">${t}</strong>`)
    .replace(/^• (.+)$/gm, `<span style="display:block;padding-left:16px;margin:3px 0">• $1</span>`)
    .replace(/\bUPTREND\b/g,   `<span class="r-trend-up">▲ UPTREND</span>`)
    .replace(/\bDOWNTREND\b/g, `<span class="r-trend-down">▼ DOWNTREND</span>`)
    .replace(/\bSIDEWAYS\b/g,  `<span class="r-trend-side">◆ SIDEWAYS</span>`)
    .replace(/\bBULLISH\b/g,   `<span style="color:var(--accent-bull);font-weight:600">▲ BULLISH</span>`)
    .replace(/\bBEARISH\b/g,   `<span style="color:var(--accent-danger);font-weight:600">▼ BEARISH</span>`)
    .replace(/\bNEUTRAL\b/g,   `<span style="color:var(--accent-warn);font-weight:600">◆ NEUTRAL</span>`)
    .replace(/\bMIXED\b/g,     `<span style="color:var(--accent-warn);font-weight:600">⊕ MIXED</span>`)
    .replace(/₹([\d,]+)/g,     `<span style="font-family:var(--font-mono);color:var(--accent-secondary)">₹$1</span>`)
    .replace(/\n/g, '<br>');
}

/** Formatter for the Layer 4 market commentary */
export function formatMarketReport(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\*\*(Summary|Key Drivers|Sector Snapshot|Global Cues Impact|Market Breadth|Your Portfolio Today|Pre-Market Signals|Opening Outlook|Outlook):\*\*$/gm,
      (_, t) => `<strong class="mkt-section-head">${t}</strong>`)
    .replace(/^\*\*(Summary|Key Drivers|Sector Snapshot|Global Cues Impact|Market Breadth|Your Portfolio Today|Pre-Market Signals|Opening Outlook|Outlook)\*\*:/gm,
      (_, t) => `<strong class="mkt-section-head">${t}:</strong>`)
    .replace(/^[•\-\*] (.+)$/gm, `<span class="mkt-bullet">• $1</span>`)
    .replace(/\bUP\b/g,      `<span style="color:var(--accent-bull);font-weight:600">▲ UP</span>`)
    .replace(/\bDOWN\b/g,    `<span style="color:var(--accent-danger);font-weight:600">▼ DOWN</span>`)
    .replace(/\bFLAT\b/g,    `<span style="color:var(--accent-warn);font-weight:600">◆ FLAT</span>`)
    .replace(/\bBULLISH\b/g, `<span style="color:var(--accent-bull);font-weight:600">▲ BULLISH</span>`)
    .replace(/\bBEARISH\b/g, `<span style="color:var(--accent-danger);font-weight:600">▼ BEARISH</span>`)
    .replace(/\bNEUTRAL\b/g, `<span style="color:var(--accent-warn);font-weight:600">◆ NEUTRAL</span>`)
    .replace(/₹([\d,]+)/g,   `<span style="font-family:var(--font-mono);color:var(--accent-secondary)">₹$1</span>`)
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
}


export function timeAgo(isoStr: string): string {
  if (!isoStr) return '—';
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.round(diff / 60000);
  if (isNaN(mins)) return '—';
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.round(mins / 60)}h ago`;
}

export function sentimentIcon(s?: string): string {
  return s === 'BULLISH' ? '▲' : s === 'BEARISH' ? '▼' : '◆';
}

export function sentimentColor(s?: string): string {
  return s === 'BULLISH' ? 'var(--accent-bull)'
    : s === 'BEARISH'   ? 'var(--accent-danger)'
    : 'var(--accent-warn)';
}

const GENERIC_FALLBACKS = new Set([
  "+0.5% to +1.5% positive momentum intraday",
  "Positive structural trajectory supported by fundamentals",
  "-0.5% to -1.5% cautious consolidation intraday",
  "-0.8% to -2.0% short-term selling pressure expected",
  "Near-term consolidation phase awaiting earnings catalysts",
  "Consolidation phase expected until margin recovery materializes",
  "Range-bound intraday movement",
  "Neutral long-term outlook",
  "Neutral short-term price movement anticipated",
  "Stable long-term business outlook"
]);

export function generateContextualImpact(
  headline: string = "",
  summary: string = "",
  sentiment: string = "NEUTRAL",
  companyTicker?: string,
  sector?: string,
  existingImpact?: { shortTerm?: string; longTerm?: string }
): { shortTerm: string; longTerm: string } {
  if (
    existingImpact?.shortTerm &&
    existingImpact?.longTerm &&
    !GENERIC_FALLBACKS.has(existingImpact.shortTerm.trim()) &&
    !GENERIC_FALLBACKS.has(existingImpact.longTerm.trim())
  ) {
    return {
      shortTerm: existingImpact.shortTerm,
      longTerm: existingImpact.longTerm
    };
  }

  const text = `${headline} ${summary}`.toLowerCase();
  const sentUpper = (sentiment || "NEUTRAL").toUpperCase() as "BULLISH" | "BEARISH" | "NEUTRAL";
  const subject = companyTicker && companyTicker !== "NIFTY50" ? companyTicker : (sector || "market");

  // 0. TRAI / Telecom / 1601 Series / Spam / DLT Directives
  if (text.includes("trai") || text.includes("1601") || text.includes("telecom") || text.includes("caller") || text.includes("spam") || text.includes("dlt")) {
    if (sentUpper === "BULLISH") {
      return {
        shortTerm: "+0.8% to +1.6% upside momentum as enterprise voice/SMS compliance volume increases for Telecom carriers",
        longTerm: "Sustained enterprise CPaaS revenue growth & DLT network monetization for Telecom operators",
      };
    }
    if (sentUpper === "BEARISH") {
      return {
        shortTerm: "-0.5% to -1.5% compliance cost burden expected on commercial voice senders",
        longTerm: "Higher operational overhead for enterprise senders complying with TRAI headers & numbering standards",
      };
    }
    return {
      shortTerm: "Neutral price action as Telecom operators & enterprise senders implement TRAI's 1601 series routing",
      longTerm: "Enhanced anti-spam DLT compliance & fraud prevention with steady enterprise communication revenues",
    };
  }

  // 1. Employment / Unemployment / Labor Force / LFPR / Job Market
  if (text.includes("unemployment") || text.includes("labor") || text.includes("labour") || text.includes("lfpr") || text.includes("hiring") || text.includes("payroll") || text.includes("jobs") || text.includes("employment")) {
    if (sentUpper === "BULLISH") {
      return {
        shortTerm: "+0.6% to +1.4% positive sentiment as expanding employment signals strong economic activity & consumer confidence",
        longTerm: "Higher labor force participation drives urban disposable income growth, boosting retail, FMCG, and consumer durables",
      };
    }
    if (sentUpper === "BEARISH") {
      return {
        shortTerm: "-0.5% to -1.5% intraday caution as dipping LFPR signals potential softness in urban household income & consumer sentiment",
        longTerm: "Muted urban wage growth & labor participation may constrain consumer discretionary spending & FMCG/retail volume growth",
      };
    }
    return {
      shortTerm: "Range-bound market reaction as labor market indicators remain broadly steady",
      longTerm: "Balanced economic outlook with steady labor participation supporting consumption stability",
    };
  }

  // 2. Interest Rates / Central Bank / Inflation / Monetary Policy
  if (text.includes("interest rate") || text.includes("repo rate") || text.includes("fed rate") || text.includes("rate hike") || text.includes("rate cut") || text.includes("rbi") || text.includes("fed") || text.includes("inflation") || text.includes("boj") || text.includes("monetary") || text.includes("yield")) {
    if (sentUpper === "BULLISH") {
      return {
        shortTerm: "+0.8% to +1.8% relief rally expected as rate trajectory favors equity valuations",
        longTerm: `Lower cost of capital & NIM stabilization expected to expand P/E multiples for ${subject}`,
      };
    }
    if (sentUpper === "BEARISH") {
      return {
        shortTerm: "-0.8% to -2.0% pressure expected as rate hawkishness & inflation risks weigh on trading",
        longTerm: `Elevated borrowing costs may temper capital expenditure & earnings expansion for ${subject}`,
      };
    }
    return {
      shortTerm: "Range-bound price action expected as markets digest monetary policy & inflation signals",
      longTerm: "Balanced macro posture with policy stance remaining data-dependent over coming quarters",
    };
  }

  // 2. Earnings / Quarterly Results / Profit / Guidance
  if (text.includes("profit") || text.includes("revenue") || text.includes("q4") || text.includes("q3") || text.includes("guidance") || text.includes("result") || text.includes("margin") || text.includes("earnings") || text.includes("beat") || text.includes("miss")) {
    if (sentUpper === "BULLISH") {
      return {
        shortTerm: "+1.5% to +3.0% post-earnings surge driven by strong financial beat & operating leverage",
        longTerm: `Multi-quarter earnings compounding backed by revenue momentum & margin expansion for ${subject}`,
      };
    }
    if (sentUpper === "BEARISH") {
      return {
        shortTerm: "-2.0% to -4.2% intraday pullback following earnings/guidance disappointment",
        longTerm: `Consolidation phase until discretionary demand & margin recovery materialize for ${subject}`,
      };
    }
    return {
      shortTerm: "In-line financial performance likely to keep stock trading in a tight consolidation range",
      longTerm: "Stable cash flow generation & steady operating trajectory aligned with market expectations",
    };
  }

  // 3. Deals / Contracts / Order Wins / Acquisitions / IPO
  if (text.includes("deal") || text.includes("contract") || text.includes("order") || text.includes("acquisition") || text.includes("expansion") || text.includes("partnership") || text.includes("ipo") || text.includes("subscribe")) {
    if (sentUpper === "BULLISH") {
      return {
        shortTerm: "+1.2% to +2.5% upside momentum following major deal & revenue visibility announcement",
        longTerm: `Sustained top-line compounding & market share gains over multi-year contract term for ${subject}`,
      };
    }
    if (sentUpper === "BEARISH") {
      return {
        shortTerm: "-0.8% to -1.8% cautious market reaction as investors evaluate execution & integration risks",
        longTerm: `Margin compression risks if project implementation encounters cost overruns for ${subject}`,
      };
    }
    return {
      shortTerm: "Neutral price action as subscription & deal terms are evaluated relative to current valuations",
      longTerm: "Gradual strategic contribution aligned with management's long-term business roadmap",
    };
  }

  // 4. Policy / Government / PLI / Regulation / Tax / Probe
  if (text.includes("policy") || text.includes("pli") || text.includes("government") || text.includes("cabinet") || text.includes("scheme") || text.includes("tax") || text.includes("probe") || text.includes("penalty") || text.includes("fda")) {
    if (sentUpper === "BULLISH") {
      return {
        shortTerm: "+1.0% to +2.2% policy-driven momentum across sector beneficiaries",
        longTerm: `Structural tailwinds & government incentives enhancing domestic competitiveness for ${subject}`,
      };
    }
    if (sentUpper === "BEARISH") {
      return {
        shortTerm: "-1.2% to -2.8% regulatory overhang creating short-term valuation discount",
        longTerm: `Compliance overhead & regulatory scrutiny tempering long-term valuation multiples for ${subject}`,
      };
    }
    return {
      shortTerm: "Limited immediate price reaction as policy guidelines await formal implementation details",
      longTerm: "Neutral structural impact with compliance costs balanced by domestic market opportunity",
    };
  }

  // 5. Dynamic Topic Extraction
  const cleanHeadline = headline.split("-")[0].split(":")[0].replace(/[^a-zA-Z0-9 ]/g, "").trim();
  const topicSnippet = cleanHeadline.length > 5 && cleanHeadline.length < 45 ? cleanHeadline : subject;

  if (sentUpper === "BULLISH") {
    return {
      shortTerm: `+0.8% to +2.0% positive momentum expected as market sentiment favors ${topicSnippet}`,
      longTerm: `Positive structural growth trajectory with potential multi-quarter re-rating for ${subject}`,
    };
  }
  if (sentUpper === "BEARISH") {
    return {
      shortTerm: `-0.8% to -2.2% selling pressure & consolidation expected on ${topicSnippet}`,
      longTerm: `Near-term consolidation phase until fundamental catalysts & demand rebound for ${subject}`,
    };
  }
  return {
    shortTerm: `Range-bound intraday movement as market participants evaluate developments in ${topicSnippet}`,
    longTerm: `Balanced risk-reward outlook with steady fundamental positioning for ${subject}`,
  };
}
