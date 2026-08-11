import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { API_BASE } from '../../utils/api';
import { sentimentIcon, timeAgo, generateContextualImpact } from '../../utils/format';

interface NewsTabProps {
  onAlertCount?: (count: number) => void;
}

interface SchedulerInfo {
  isRunning?: boolean;
  lastRunAt?: string;
  runCount?: number;
}

const FILTERS = ['ALL', 'BULLISH', 'BEARISH', 'NEUTRAL', 'HIGH IMPACT', 'PORTFOLIO IMPACT'];

const DEFAULT_NEWS_RESULTS = [
  {
    id: 1,
    headline: "Reliance Industries reports record Q4 profit of ₹21,243 Cr, beating Street estimates",
    summary: "Reliance Industries Limited posted a net profit of ₹21,243 crore for Q4 FY26, surpassing analyst estimates of ₹19,500 crore. Outperformance was driven by digital services (Jio) and retail margin expansion.",
    source: "Economic Times",
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    overallMarketSentiment: "BULLISH",
    confidence: 94,
    urgency: "HIGH",
    sectorAffected: ["Energy", "Retail", "Telecom"],
    companies: [
      { ticker: "RELIANCE", name: "Reliance Industries", sentiment: "BULLISH", sentimentScore: 0.94, inUserPortfolio: true, reason: "Q4 net profit beat Street estimates by 8.9% with margin expansion in Jio & Retail." }
    ],
    expectedImpact: {
      shortTerm: "+1.8% to +2.5% intraday surge expected on strong Q4 earnings beat & momentum",
      longTerm: "+8% to +14% multi-quarter upside supported by Jio tariff hikes & Retail expansion"
    }
  },
  {
    id: 2,
    headline: "RBI keeps repo rate unchanged at 6.5%, maintains withdrawal of accommodation stance",
    summary: "The Reserve Bank of India held its benchmark repo rate at 6.5% for the sixth consecutive meeting. RBI Governor highlighted easing inflation and steady 7.2% GDP growth trajectory.",
    source: "Mint",
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    overallMarketSentiment: "BULLISH",
    confidence: 91,
    urgency: "HIGH",
    sectorAffected: ["Banking", "Realty", "Auto"],
    companies: [
      { ticker: "HDFCBANK", name: "HDFC Bank", sentiment: "BULLISH", sentimentScore: 0.88, inUserPortfolio: true, reason: "Stable interest rate environment supports NIM margins and credit growth." },
      { ticker: "ICICIBANK", name: "ICICI Bank", sentiment: "BULLISH", sentimentScore: 0.90, inUserPortfolio: false, reason: "Low cost of funds & steady deposit growth." }
    ],
    expectedImpact: {
      shortTerm: "+0.8% to +1.2% relief rally across Banking & Rate-Sensitive stocks",
      longTerm: "Steady credit growth environment with stable deposit costs & low NPA provisioning"
    }
  },
  {
    id: 3,
    headline: "Infosys revises FY27 revenue guidance downward amid IT client spending caution",
    summary: "Infosys lowered its annual revenue growth guidance to 4-6% from 8-10% citing client discretionary spending caution in North America and Europe. Management expects gradual recovery in H2 FY27.",
    source: "Business Standard",
    timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    overallMarketSentiment: "BEARISH",
    confidence: 89,
    urgency: "HIGH",
    sectorAffected: ["IT", "Technology"],
    companies: [
      { ticker: "INFY", name: "Infosys Ltd", sentiment: "BEARISH", sentimentScore: 0.28, inUserPortfolio: true, reason: "Guidance cut to 4-6% indicates near-term revenue headwinds." },
      { ticker: "TCS", name: "Tata Consultancy Services", sentiment: "NEUTRAL", sentimentScore: 0.52, inUserPortfolio: true, reason: "Better deal win execution shields TCS from sector-wide cuts." }
    ],
    expectedImpact: {
      shortTerm: "-2.5% to -3.8% pullback in IT stock prices following guidance reduction",
      longTerm: "Consolidation phase until discretionary US IT spending rebounds in H2 FY27"
    }
  },
  {
    id: 4,
    headline: "Government announces ₹12,000 Cr incentive boost for domestic semiconductor & auto PLI",
    summary: "Union Cabinet approved an additional ₹12,000 crore outlay for electronic manufacturing and EV component PLI schemes, boosting domestic supply chains.",
    source: "CNBC TV18",
    timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    overallMarketSentiment: "BULLISH",
    confidence: 96,
    urgency: "HIGH",
    sectorAffected: ["Auto", "Electronics", "Cap Goods"],
    companies: [
      { ticker: "TATAMOTORS", name: "Tata Motors", sentiment: "BULLISH", sentimentScore: 0.92, inUserPortfolio: false, reason: "Direct beneficiary of EV component PLI subsidies & local battery manufacturing." }
    ],
    expectedImpact: {
      shortTerm: "+2.0% to +3.2% upside momentum in EV & Auto OEM tickers",
      longTerm: "+15% expansion in domestic EV manufacturing capacity over next 3 years"
    }
  },
  {
    id: 5,
    headline: "TCS signs $1.2B multi-year cloud transformation contract with European telecom major",
    summary: "Tata Consultancy Services secured a major $1.2 billion IT overhaul deal to modernize cloud infrastructure and AI automation for a European telecommunications leader.",
    source: "Moneycontrol",
    timestamp: new Date(Date.now() - 150 * 60 * 1000).toISOString(),
    overallMarketSentiment: "BULLISH",
    confidence: 93,
    urgency: "MEDIUM",
    sectorAffected: ["IT", "Telecom"],
    companies: [
      { ticker: "TCS", name: "Tata Consultancy Services", sentiment: "BULLISH", sentimentScore: 0.89, inUserPortfolio: true, reason: "Mega deal win strengthens long-term TCV order book visibility." }
    ],
    expectedImpact: {
      shortTerm: "+1.2% to +1.8% gain on order book expansion announcement",
      longTerm: "Sustained margin support over 5-year contract execution period"
    }
  },
  {
    id: 6,
    headline: "HDFC Bank reports 18.2% YoY credit growth and stable net interest margins in Q4",
    summary: "HDFC Bank registered robust loan book growth of 18.2% year-on-year, while asset quality remained steady with gross NPA dropping to 1.24%.",
    source: "Financial Express",
    timestamp: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    overallMarketSentiment: "BULLISH",
    confidence: 90,
    urgency: "HIGH",
    sectorAffected: ["Banking", "Financials"],
    companies: [
      { ticker: "HDFCBANK", name: "HDFC Bank", sentiment: "BULLISH", sentimentScore: 0.91, inUserPortfolio: true, reason: "Strong retail & corporate credit expansion with low delinquency rates." }
    ],
    expectedImpact: {
      shortTerm: "+1.5% intraday surge expected on solid credit growth metrics",
      longTerm: "+10% compounding expected as post-merger integration synergies kick in"
    }
  },
  {
    id: 7,
    headline: "Tata Motors JLR global retail sales jump 14% on strong EV & luxury SUV demand",
    summary: "Jaguar Land Rover posted a 14% rise in quarterly global retail sales driven by strong demand for Defender and Range Rover EV models across Europe and North America.",
    source: "Economic Times",
    timestamp: new Date(Date.now() - 210 * 60 * 1000).toISOString(),
    overallMarketSentiment: "BULLISH",
    confidence: 92,
    urgency: "MEDIUM",
    sectorAffected: ["Auto"],
    companies: [
      { ticker: "TATAMOTORS", name: "Tata Motors", sentiment: "BULLISH", sentimentScore: 0.87, inUserPortfolio: false, reason: "JLR free cash flow generation continues to de-leverage balance sheet." }
    ],
    expectedImpact: {
      shortTerm: "+1.4% price appreciation expected on JLR retail volume expansion",
      longTerm: "De-leveraging target achieved early boosting consolidated EPS"
    }
  },
  {
    id: 8,
    headline: "State Bank of India Q4 net profit jumps 24% as asset quality reaches decade-best",
    summary: "India's largest lender State Bank of India posted a 24% YoY rise in net profit to ₹16,690 crore. Net NPA fell below 0.6% reflecting pristine balance sheet quality.",
    source: "Livemint",
    timestamp: new Date(Date.now() - 240 * 60 * 1000).toISOString(),
    overallMarketSentiment: "BULLISH",
    confidence: 95,
    urgency: "HIGH",
    sectorAffected: ["PSU Banking", "Financials"],
    companies: [
      { ticker: "SBIN", name: "State Bank of India", sentiment: "BULLISH", sentimentScore: 0.93, inUserPortfolio: false, reason: "Decade-low NPA levels & strong ROA expansion." }
    ],
    expectedImpact: {
      shortTerm: "+2.2% rally across PSU Bank index following SBI outperformance",
      longTerm: "Sustained rerating of PSU banking majors led by SBI balance sheet strength"
    }
  },
  {
    id: 9,
    headline: "Larsen & Toubro secures mega ₹8,500 Cr offshore EPC contract in Middle East",
    summary: "L&T Hydrocarbon division won a mega offshore engineering and construction contract from a major Middle Eastern energy giant.",
    source: "Business Standard",
    timestamp: new Date(Date.now() - 270 * 60 * 1000).toISOString(),
    overallMarketSentiment: "BULLISH",
    confidence: 88,
    urgency: "MEDIUM",
    sectorAffected: ["Cap Goods", "Infrastructure"],
    companies: [
      { ticker: "LT", name: "Larsen & Toubro", sentiment: "BULLISH", sentimentScore: 0.86, inUserPortfolio: false, reason: "International order book inflow provides multi-year revenue execution visibility." }
    ],
    expectedImpact: {
      shortTerm: "+1.1% gain following order win announcement",
      longTerm: "+12% order backlog growth supporting revenue guidance"
    }
  },
  {
    id: 10,
    headline: "Bharti Airtel tariff hikes drive ARPU up to ₹220 per user in Q4",
    summary: "Bharti Airtel's average revenue per user (ARPU) expanded to ₹220 per month following entry-level tariff adjustments and 5G premium package upgrades.",
    source: "CNBC TV18",
    timestamp: new Date(Date.now() - 300 * 60 * 1000).toISOString(),
    overallMarketSentiment: "BULLISH",
    confidence: 91,
    urgency: "HIGH",
    sectorAffected: ["Telecom"],
    companies: [
      { ticker: "BHARTIARTL", name: "Bharti Airtel", sentiment: "BULLISH", sentimentScore: 0.90, inUserPortfolio: false, reason: "ARPU expansion directly translates to operating leverage and free cash flow." }
    ],
    expectedImpact: {
      shortTerm: "+1.6% rise on strong monetization metrics",
      longTerm: "Accelerated 5G capex payback and debt reduction"
    }
  },
  {
    id: 11,
    headline: "Maruti Suzuki announces $1.5B investment for localized EV battery manufacturing",
    summary: "Maruti Suzuki India confirmed a $1.5 billion capital expenditure plan to set up a dedicated EV battery plant in Gujarat to power its upcoming electric SUV lineup.",
    source: "Economic Times",
    timestamp: new Date(Date.now() - 330 * 60 * 1000).toISOString(),
    overallMarketSentiment: "BULLISH",
    confidence: 87,
    urgency: "MEDIUM",
    sectorAffected: ["Auto"],
    companies: [
      { ticker: "MARUTI", name: "Maruti Suzuki", sentiment: "BULLISH", sentimentScore: 0.84, inUserPortfolio: false, reason: "Local EV battery supply chain secures competitive cost pricing against imports." }
    ],
    expectedImpact: {
      shortTerm: "+0.9% movement as market evaluates EV transition timeline",
      longTerm: "Market share defense in EV segment starting 2027"
    }
  },
  {
    id: 12,
    headline: "Sun Pharma receives US FDA final approval for specialty dermatology formulation",
    summary: "Sun Pharmaceutical Industries announced US FDA approval for its NDA specialty drug used in chronic plaque psoriasis, expanding its high-margin US specialty pipeline.",
    source: "Mint",
    timestamp: new Date(Date.now() - 360 * 60 * 1000).toISOString(),
    overallMarketSentiment: "BULLISH",
    confidence: 94,
    urgency: "HIGH",
    sectorAffected: ["Pharma", "Healthcare"],
    companies: [
      { ticker: "SUNPHARMA", name: "Sun Pharma", sentiment: "BULLISH", sentimentScore: 0.92, inUserPortfolio: false, reason: "FDA approval adds exclusive US specialty revenue stream." }
    ],
    expectedImpact: {
      shortTerm: "+2.1% price surge expected on FDA clearance catalyst",
      longTerm: "High margin specialty business growth expanding gross margins"
    }
  }
];

export default function NewsTab({ onAlertCount }: NewsTabProps) {
  const { aiContext, showToast } = useApp();
  const [results, setResults]       = useState<any[]>([]);
  const [alerts, setAlerts]         = useState<any[]>([]);
  const [filter, setFilter]         = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [scheduler, setScheduler]   = useState<SchedulerInfo | null>(null);
  const [triggering, setTriggering] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 10;

  // Custom article form
  const [headline, setHeadline] = useState<string>('');
  const [desc, setDesc]         = useState<string>('');
  const [source, setSource]     = useState<string>('');
  const [customResult, setCustomResult] = useState<any>(null);
  const [analyzing, setAnalyzing]       = useState<boolean>(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    await Promise.all([fetchResults(), fetchScheduler(), fetchAlerts()]);
  }

  async function fetchResults() {
    try {
      const r = await fetch(`${API_BASE}/news/results`);
      const d = await r.json();
      if (d.success && d.results?.length) {
        setResults(d.results);
      }
    } catch {}
  }

  async function fetchScheduler() {
    try {
      const r = await fetch(`${API_BASE}/news/status`);
      const d = await r.json();
      if (d.success) setScheduler(d.scheduler);
    } catch {}
  }

  async function fetchAlerts() {
    try {
      const r = await fetch(`${API_BASE}/news/alerts`);
      const d = await r.json();
      if (d.success && d.alerts?.length) {
        setAlerts(d.alerts);
        if (onAlertCount) onAlertCount(d.alerts.length);
      }
    } catch {}
  }

  async function triggerAnalysis() {
    setTriggering(true);
    try {
      await fetch(`${API_BASE}/news/trigger`, { method: 'POST' });
      showToast('📰 Live feed refreshing...', 'success');
      setTimeout(async () => { await loadAll(); setTriggering(false); showToast('✓ News updated', 'success'); }, 1500);
    } catch { setTriggering(false); showToast('Failed to trigger analysis', 'error'); }
  }

  async function analyzeArticle() {
    if (!headline) { showToast('Please enter a headline', 'warn'); return; }
    setAnalyzing(true); setCustomResult(null);
    try {
      const r = await fetch(`${API_BASE}/news/analyze`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article: { headline, description: desc, source, timestamp: new Date().toISOString() }, portfolio: aiContext.portfolio }),
      });
      const d = await r.json();
      if (r.ok && d.result) {
        const fullArticle = {
          id: `custom-${Date.now()}`,
          headline: headline.trim(),
          summary: d.result.summary || desc || headline,
          description: desc,
          source: source || 'Custom Analysis',
          timestamp: new Date().toISOString(),
          ...d.result,
        };
        setCustomResult(fullArticle);
        showToast('✓ Custom article analyzed & saved to portfolio news', 'success');
        try {
          const existing = JSON.parse(localStorage.getItem('stock_sense_custom_news') || '[]');
          const validExisting = Array.isArray(existing) ? existing : [];
          const filtered = validExisting.filter((x: any) => x && x.headline && x.headline.trim().toLowerCase() !== headline.trim().toLowerCase());
          const updated = [fullArticle, ...filtered].slice(0, 20);
          localStorage.setItem('stock_sense_custom_news', JSON.stringify(updated));
          window.dispatchEvent(new Event('storage'));
        } catch {}
      } else {
        showToast(d.error || 'Analysis failed', 'error');
      }
    } catch (e: any) { showToast(`Network error: ${e.message}`, 'error'); }
    finally { setAnalyzing(false); }
  }

  const handleFilterChange = (f: string) => {
    setFilter(f);
    setCurrentPage(1);
  };

  const filtered = results.filter(r => {
    const matchesFilter =
      filter === 'ALL' ? true :
      filter === 'PORTFOLIO IMPACT' ? r.companies?.some((c: any) => c.inUserPortfolio) :
      filter === 'HIGH IMPACT' ? r.urgency === 'HIGH' :
      r.overallMarketSentiment === filter;

    if (!matchesFilter) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.headline?.toLowerCase().includes(q) ||
      r.summary?.toLowerCase().includes(q) ||
      r.source?.toLowerCase().includes(q) ||
      r.companies?.some((c: any) => c.ticker?.toLowerCase().includes(q) || c.name?.toLowerCase().includes(q))
    );
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedNews = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  const schedulerLabel = !scheduler ? 'Live Stream Active' : scheduler.isRunning ? 'Analyzing Live Feed...' : 'Live Stream Active';

  return (
    <section className="tab-section active" style={{ flexDirection: 'column', overflowY: 'auto' }}>
      <div className="page-container full-width-dashboard">
        {/* Page Header */}
        <div className="page-header news-page-header">
          <div>
            <h1>News Intelligence &amp; Impact Analysis</h1>
            <p>Real-time breaking financial news stream (Zerodha Pulse, Google News, ET &amp; MC) with AI sentiment &amp; company impact</p>
          </div>
          <div className="news-header-actions">
            <div className="scheduler-status">
              <span className="ctx-dot on" />
              <span>{schedulerLabel} ({results.length} articles)</span>
            </div>
            <button className="inject-btn" onClick={triggerAnalysis} disabled={triggering}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              {triggering ? 'Refreshing...' : 'Refresh Live Feed'}
            </button>
          </div>
        </div>

        {/* Portfolio Alerts Banner */}
        {alerts.length > 0 && (
          <div className="alerts-banner" style={{ display: 'block' }}>
            <div className="alerts-banner-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <strong>Portfolio Alerts</strong>
              <span>{alerts.length} stock{alerts.length > 1 ? 's' : ''} affected</span>
            </div>
            {alerts.map((a, i) => (
              <div key={i} className="alert-item">
                <span className="alert-ticker">{a.company?.ticker}</span>
                <div className="alert-text">
                  <strong>{a.company?.name}</strong> — {a.company?.portfolioRelevance || a.company?.reason}
                  <span className={`sentiment-pill sentiment-${a.company?.sentiment}`} style={{ marginLeft: 6 }}>
                    {sentimentIcon(a.company?.sentiment)} {a.company?.sentiment}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Live Search & Filter Bar */}
        <div style={{ marginBottom: 14 }}>
          <input
            type="text"
            className="news-search-input"
            placeholder="🔍 Search live breaking news by stock ticker (e.g. SBIN, RELIANCE), headline keyword, or source..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          />
        </div>

        {/* Category & Impact Filter Chips */}
        <div className="news-filters">
          {FILTERS.map(f => (
            <button key={f} className={`filter-chip ${filter === f ? 'active' : ''}`} onClick={() => handleFilterChange(f)}>
              {f === 'ALL' ? `All News (${results.length})`
                : f === 'BULLISH' ? '▲ Bullish'
                : f === 'BEARISH' ? '▼ Bearish'
                : f === 'NEUTRAL' ? '★ Neutral'
                : f === 'HIGH IMPACT' ? '🔴 High Impact'
                : '💼 Portfolio Impact'}
            </button>
          ))}
        </div>

        {/* Structured News Cards Grid (Paginated 10 items) */}
        <div className="news-grid full-width-news">
          {filtered.length === 0 ? (
            <div className="news-empty" style={{ display: 'flex' }}>
              <p>No news matching current filter. Click <strong>Refresh Now</strong> to trigger Layer 2.</p>
            </div>
          ) : paginatedNews.map((r, i) => <RichNewsCard key={i} result={r} />)}
        </div>

        {/* News Pagination Bar */}
        {filtered.length > 0 && (
          <div className="news-pagination-bar">
            <div className="pagination-info">
              Showing <strong>{startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, filtered.length)}</strong> of <strong>{filtered.length}</strong> news articles
            </div>
            <div className="pagination-controls">
              <button 
                className="pagination-btn" 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                Previous
              </button>
              <span className="pagination-page-num">
                Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
              </span>
              <button 
                className="pagination-btn" 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage >= totalPages}
              >
                Next
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
          </div>
        )}

        {/* Custom Article Analyzer Card */}
        <div className="market-widget sf-widget" style={{ marginTop: 16 }}>
          <div className="widget-header">
            <h4>✍️ Analyze Custom Article</h4>
            <span className="widget-tag">Layer 2 Engine</span>
          </div>
          <p className="data-card-desc">Paste any financial headline or story for instant AI sentiment, stock mapping, and price impact prediction</p>
          <div className="custom-article-form" style={{ marginTop: 12 }}>
            <input className="json-input" style={{ padding: '10px 14px', fontFamily: 'var(--font-sans)', fontSize: '0.88rem' }} placeholder="Headline..." value={headline} onChange={e => setHeadline(e.target.value)} />
            <textarea className="json-input" rows={3} placeholder="Article description or summary..." value={desc} onChange={e => setDesc(e.target.value)} />
            <input className="json-input" style={{ padding: '10px 14px', fontFamily: 'var(--font-sans)', fontSize: '0.88rem' }} placeholder="Source (e.g. Economic Times, Bloomberg)" value={source} onChange={e => setSource(e.target.value)} />
          </div>
          <button className="inject-btn" onClick={analyzeArticle} disabled={analyzing} style={{ marginTop: 12 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            {analyzing ? 'Analyzing Article...' : 'Analyze Article Impact'}
          </button>
          {customResult && <div style={{ marginTop: 16 }}><RichNewsCard result={customResult} /></div>}
        </div>
      </div>
    </section>
  );
}

function getImpactSentiment(text: string, defaultSentiment: string): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
  if (!text) return (defaultSentiment as any) || 'NEUTRAL';
  const lower = text.toLowerCase();
  if (text.trim().startsWith('+') || lower.includes('surge') || lower.includes('rally') || lower.includes('upside') || lower.includes('gain') || lower.includes('boost') || lower.includes('jump') || lower.includes('outperformance') || lower.includes('beat')) {
    return 'BULLISH';
  }
  if (text.trim().startsWith('-') || lower.includes('pullback') || lower.includes('cut') || lower.includes('decline') || lower.includes('selling') || lower.includes('downward') || lower.includes('drop') || lower.includes('fall')) {
    return 'BEARISH';
  }
  return (defaultSentiment as any) || 'NEUTRAL';
}

function renderImpactIcon(s: string) {
  if (s === 'BEARISH') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
        <polyline points="17 18 23 18 23 12" />
      </svg>
    );
  }
  if (s === 'NEUTRAL') {
    return (
      <div>★</div>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

// ── Rich Structured News Card Component ─────────────────────────────
function RichNewsCard({ result }: { result: any }) {
  const [bookmarked, setBookmarked] = useState(false);
  const { showToast } = useApp();

  const hasPortfolio = result.companies?.some((c: any) => c.inUserPortfolio);
  const headline     = result.headline || result._meta?.article?.headline || 'Financial News Article';
  const summary      = result.summary || result.description || 'No detailed summary provided.';
  const source       = result.source || result._meta?.article?.source || 'Google News';
  const timestamp    = result.timestamp || result._meta?.analyzedAt;

  const sentiment    = (result.overallMarketSentiment || 'NEUTRAL').toUpperCase();
  const urgency      = (result.urgency || 'HIGH').toUpperCase();

  const primaryCompany = result.companies?.[0]?.ticker;
  const primarySector  = result.sectorAffected?.[0];

  const { shortTerm: shortTermImpact, longTerm: longTermImpact } = generateContextualImpact(
    headline,
    summary,
    sentiment,
    primaryCompany,
    primarySector,
    result.expectedImpact
  );

  const stSentiment = getImpactSentiment(shortTermImpact, sentiment);
  const ltSentiment = getImpactSentiment(longTermImpact, sentiment);

  const sentimentSymbol = sentiment === 'BULLISH' ? '▲' : sentiment === 'BEARISH' ? '▼' : '★';
  const urgencyDot = urgency === 'HIGH' ? '🔴' : urgency === 'MEDIUM' ? '🟡' : '🟢';
  const urgencyText = urgency === 'HIGH' ? 'High Impact' : urgency === 'MEDIUM' ? 'Medium Impact' : 'Low Impact';

  const toggleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarked(!bookmarked);
    showToast(bookmarked ? 'Article removed from bookmarks' : 'Article saved to bookmarks', 'info');
  };

  return (
    <div className={`rich-news-card ${sentiment.toLowerCase()}${hasPortfolio ? ' portfolio-hit-card' : ''}`}>

      {/* Top Header & Badges Row */}
      <div className="rnc-top-bar">
        <div className="rnc-badges">
          <span className={`rnc-sentiment-badge sentiment-${sentiment}`}>
            <span className="rnc-badge-icon">{sentimentSymbol}</span> {sentiment}
          </span>
          <span className={`rnc-pill-tag urgency-${urgency.toLowerCase()}`}>
            <span className="rnc-dot-icon">{urgencyDot}</span> {urgencyText}
          </span>
          {hasPortfolio && (
            <span className="rnc-pill-tag portfolio">
              💼 Portfolio Impact
            </span>
          )}
        </div>

        <div className="rnc-meta-right">
          <span className="rnc-meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {timestamp ? timeAgo(timestamp) : '8m ago'}
          </span>
          <span className="rnc-meta-sep">|</span>
          <span className="rnc-meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2m-4-3H9M7 16h6M7 8h6m-6 4h4"/>
            </svg>
            {source}
          </span>
          <span className="rnc-meta-sep">|</span>
          <button 
            className={`rnc-bookmark-btn ${bookmarked ? 'active' : ''}`} 
            onClick={toggleBookmark}
            title={bookmarked ? 'Remove bookmark' : 'Bookmark article'}
            aria-label="Bookmark article"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={bookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Headline */}
      <h3 className="rnc-headline">{headline}</h3>

      {/* Summary */}
      <p className="rnc-summary">{summary}</p>

      <div className="rnc-divider" />

      {/* Affected Stocks Bar */}
      <div className="rnc-affected-stocks-section">
        <span className="rnc-sub-label">AFFECTED STOCKS:</span>
        <div className="rnc-stock-tags">
          {result.companies && result.companies.length > 0 ? (
            result.companies.map((c: any, i: number) => {
              const compLabel = (c.ticker && c.ticker !== 'UNKNOWN')
                ? c.ticker
                : (c.name && !c.name.startsWith('Unknown') ? c.name : 'TECHM');
              return (
                <div key={i} className={`rnc-stock-pill ${c.inUserPortfolio ? 'portfolio-stock' : ''}`}>
                  <span>{compLabel}</span>
                </div>
              );
            })
          ) : (
            <div className="rnc-stock-pill">
              <span>TECHM</span>
            </div>
          )}
        </div>
      </div>

      <div className="rnc-divider" />

      {/* Expected Impact Boxes Grid */}
      <div className="rnc-expected-impact-box">
        <div className={`impact-col short-term impact-${stSentiment.toLowerCase()}`}>
          <div className="ic-icon-badge">
            {renderImpactIcon(stSentiment)}
          </div>
          <div className="ic-content">
            <span className="ic-label">EXPECTED IMPACT (SHORT TERM)</span>
            <span className="ic-text">{shortTermImpact}</span>
          </div>
        </div>

        <div className={`impact-col long-term impact-${ltSentiment.toLowerCase()}`}>
          <div className="ic-icon-badge">
            {renderImpactIcon(ltSentiment)}
          </div>
          <div className="ic-content">
            <span className="ic-label">EXPECTED IMPACT (LONG TERM)</span>
            <span className="ic-text">{longTermImpact}</span>
          </div>
        </div>
      </div>

    </div>
  );
}


