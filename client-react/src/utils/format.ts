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

export function escHtml(str: string | undefined | null): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
