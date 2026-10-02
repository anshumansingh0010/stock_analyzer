import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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

  // Dynamically calculate trending keywords from live news feed
  const trendingKeywords = useMemo(() => {
    const counts: Record<string, number> = {};
    results.forEach(r => {
      // Extract sectors safely
      if (Array.isArray(r.sectorAffected)) {
        r.sectorAffected.forEach((s: string) => {
          if (typeof s === 'string' && s && s !== 'Unknown') counts[s] = (counts[s] || 0) + 1;
        });
      } else if (typeof r.sectorAffected === 'string' && r.sectorAffected !== 'Unknown') {
        counts[r.sectorAffected] = (counts[r.sectorAffected] || 0) + 1;
      }
      
      // Extract tickers safely
      if (Array.isArray(r.companies)) {
        r.companies.forEach((c: any) => {
          if (c && typeof c.ticker === 'string' && c.ticker !== 'UNKNOWN') {
             counts[c.ticker] = (counts[c.ticker] || 0) + 1.5; // weight tickers slightly higher
          }
        });
      }
    });
    
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(entry => entry[0]);
      
    // Fallback if no data
    return sorted.length > 0 ? sorted : ['RBI Policy', 'Q2 Earnings', 'Semiconductors', 'FII Selling'];
  }, [results]);

  // Custom article form
  const [headline, setHeadline] = useState<string>('');
  const [desc, setDesc]         = useState<string>('');
  const [source, setSource]     = useState<string>('');
  const [customResult, setCustomResult] = useState<any>(null);
  const [showReport, setShowReport]     = useState<boolean>(false);
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

  return (
    <section className="tab-section active" style={{ flexDirection: 'column', overflowY: 'auto' }}>
      <div className="page-container full-width-dashboard">
        {/* Page Header */}
        <div className="page-header news-page-header">
          <div>
            <h1>News Intelligence &amp; Impact Analysis</h1>
            <p>Real-time breaking financial news stream (Zerodha Pulse, Google News, ET &amp; MC) with AI sentiment &amp; company impact</p>
          </div>
        </div>

        {/* ── TWO COLUMN LAYOUT ── */}
        <div className="news-two-column-layout">
          
          {/* LEFT COLUMN: Main Feed */}
          <div className="news-main-feed">
            {/* Live Search & Filter Bar */}
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                style={{ position: 'absolute', left: 14, top: '40%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                className="news-search-input"
                style={{ paddingLeft: 40 }}
                placeholder="Search live breaking news by stock ticker (e.g. SBIN, RELIANCE), headline keyword, or source..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              />
            </div>

            {/* Category & Impact Filter Chips */}
            <div className="news-filters" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {FILTERS.map(f => (
                  <button key={f} className={`filter-chip ${filter === f ? 'active' : ''}`} onClick={() => handleFilterChange(f)}>
                    {f === 'ALL' ? `All News (${results.length})`
                      : f === 'BULLISH' ? '▲ Bullish'
                      : f === 'BEARISH' ? '▼ Bearish'
                      : f === 'NEUTRAL' ? '★ Neutral'
                      : f === 'HIGH IMPACT' ? ' High Impact'
                      : ' Portfolio Impact'}
                  </button>
                ))}
              </div>
              <button className="inject-btn" onClick={triggerAnalysis} disabled={triggering} style={{ marginLeft: 'auto', padding: '8px 14px', fontSize: '0.82rem' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                {triggering ? 'Refreshing...' : 'Refresh Live Feed'}
              </button>
            </div>

            {/* Structured News Cards Grid (Paginated 10 items) */}
            <div className="news-grid full-width-news">
              {filtered.length === 0 ? (
                <div className="news-empty" style={{ display: 'flex' }}>
                  <p>No news matching current filter. Click <strong>Refresh Live Feed</strong>.</p>
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
          </div>

          {/* RIGHT COLUMN: Sidebar (Alerts + Custom Analyzer) */}
          <div className="news-sidebar">
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

            {/* Custom Article Analyzer Card */}
            <div className="market-widget news-sidebar-widget">
              <div className="widget-header">
                <h4>Analyze Custom Article</h4>
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
          
          {customResult && !analyzing && (
            <button 
              className="inject-btn" 
              onClick={() => setShowReport(true)} 
              style={{ marginTop: 8, background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', boxShadow: 'none' }}
            >
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
               View Generated Report
            </button>
          )}
        </div>

        {/* Trending Keywords Widget */}
        <div className="market-widget news-sidebar-widget">
          <div className="widget-header">
            <h4>Trending in News</h4>
          </div>
          <p className="data-card-desc">Most discussed topics in the financial markets over the last 24 hours.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '12px' }}>
            {trendingKeywords.map(tag => (
              <span 
                key={tag} 
                onClick={() => {
                  setSearchQuery(tag);
                  setCurrentPage(1);
                  // Optional: scroll to top of feed if needed, but usually it's already visible
                }}
                style={{
                  fontSize: '0.75rem',
                  padding: '4px 10px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '99px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        </div>
      </div>
    </div>
    
    {/* Full Page Report Modal */}
    {showReport && customResult && createPortal(
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', backdropFilter: 'blur(5px)' }}>
        <div className="hide-scrollbar" style={{ background: 'var(--bg-surface)', borderRadius: '24px', width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', padding: '32px', position: 'relative', border: '1px solid var(--border-subtle)', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
          <button 
            onClick={() => setShowReport(false)} 
            style={{ position: 'absolute', top: 20, right: 24, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', cursor: 'pointer', zIndex: 10 }}
          >
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
          <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border-subtle)' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>Custom Article Analysis Report</h2>
            <p style={{ margin: '8px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Generated by Layer 2 Engine</p>
          </div>
          <CustomArticleDetailedReport result={customResult} />
        </div>
      </div>,
      document.body
    )}
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

// ── Detailed Full-Page Report Component for Custom Articles ─────────────────
function CustomArticleDetailedReport({ result }: { result: any }) {
  const headline     = result.headline || result._meta?.article?.headline || 'Financial News Article';
  const summary      = result.summary || result.description || 'No detailed summary provided.';
  const source       = result.source || result._meta?.article?.source || 'Custom Source';
  const timestamp    = result.timestamp || result._meta?.analyzedAt;
  const sentiment    = (result.overallMarketSentiment || 'NEUTRAL').toUpperCase();
  const urgency      = (result.urgency || 'HIGH').toUpperCase();
  
  const sentimentColor = sentiment === 'BULLISH' ? 'var(--accent-bull, #10b981)' : sentiment === 'BEARISH' ? 'var(--accent-bear, #ef4444)' : 'var(--text-muted)';
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Info */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 12px 0', lineHeight: 1.3 }}>{headline}</h1>
        <div style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          <span><strong>Source:</strong> {source}</span>
          <span><strong>Time:</strong> {timeAgo(timestamp)}</span>
          <span><strong>Sectors:</strong> {result.sectorAffected?.join(', ') || 'N/A'}</span>
        </div>
      </div>

      {/* Macro Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ background: 'var(--bg-elevated)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
          <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Overall Market Sentiment</h4>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: sentimentColor }}>
            {sentiment}
          </div>
        </div>
        <div style={{ background: 'var(--bg-elevated)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
          <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Action Urgency</h4>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: urgency === 'HIGH' ? 'var(--accent-danger)' : 'var(--text-primary)' }}>
            {urgency} IMPACT
          </div>
        </div>
      </div>

      {/* Summary Section */}
      <div style={{ background: 'var(--bg-elevated)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem' }}>Executive Summary</h3>
        <p style={{ margin: 0, lineHeight: 1.6, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{summary}</p>
      </div>

      {/* Predicted Impact */}
      {result.expectedImpact && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ background: 'color-mix(in srgb, var(--accent-primary) 5%, transparent)', padding: '20px', borderRadius: '16px', border: '1px solid color-mix(in srgb, var(--accent-primary) 20%, transparent)' }}>
            <h4 style={{ margin: '0 0 8px 0', color: 'var(--accent-primary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Short-Term Horizon (Days/Weeks)</h4>
            <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>{result.expectedImpact.shortTerm || 'Not specified.'}</p>
          </div>
          <div style={{ background: 'color-mix(in srgb, var(--accent-secondary) 5%, transparent)', padding: '20px', borderRadius: '16px', border: '1px solid color-mix(in srgb, var(--accent-secondary) 20%, transparent)' }}>
            <h4 style={{ margin: '0 0 8px 0', color: 'var(--accent-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Long-Term Horizon (Months+)</h4>
            <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>{result.expectedImpact.longTerm || 'Not specified.'}</p>
          </div>
        </div>
      )}

      {/* Deep Dive Insights (If available) */}
      {result.detailedAnalysis && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ margin: '12px 0 4px 0', fontSize: '1.2rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>Deep Dive Analysis</h3>
          
          <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '1.05rem', color: 'var(--text-primary)' }}>Key Takeaways</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.95rem' }}>
              {result.detailedAnalysis.keyTakeaways?.map((pt: string, i: number) => (
                <li key={i} style={{ marginBottom: '8px' }}>{pt}</li>
              ))}
            </ul>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', color: 'var(--text-primary)' }}>Macro & Economic Factors</h4>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {result.detailedAnalysis.macroFactors}
              </p>
            </div>
            <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', color: 'var(--text-primary)' }}>Risk Factors</h4>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {result.detailedAnalysis.riskFactors}
              </p>
            </div>
          </div>
          
          <div style={{ background: 'color-mix(in srgb, var(--accent-bull) 5%, transparent)', padding: '20px', borderRadius: '16px', border: '1px solid color-mix(in srgb, var(--accent-bull) 20%, transparent)' }}>
            <h4 style={{ margin: '0 0 8px 0', color: 'var(--accent-bull)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recommended Strategic Actions</h4>
            <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.5 }}>
              {result.detailedAnalysis.recommendedActions}
            </p>
          </div>
        </div>
      )}

      {/* Extracted Company Data */}
      {result.companies && result.companies.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>Impacted Companies & Assets</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {result.companies.map((c: any, idx: number) => {
              const cSent = c.sentiment || 'NEUTRAL';
              const cColor = cSent === 'BULLISH' ? 'var(--accent-bull)' : cSent === 'BEARISH' ? 'var(--accent-bear)' : 'var(--text-muted)';
              const scorePercent = c.sentimentScore ? Math.round(c.sentimentScore * 100) : 50;
              
              return (
                <div key={idx} style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {c.name} <span style={{ fontSize: '0.8rem', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '99px', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>{c.ticker}</span>
                        {c.inUserPortfolio && <span style={{ fontSize: '0.75rem', background: 'color-mix(in srgb, var(--accent-primary) 15%, transparent)', color: 'var(--accent-primary)', padding: '2px 8px', borderRadius: '99px' }}>In Portfolio</span>}
                      </h4>
                      <div style={{ color: cColor, fontSize: '0.85rem', fontWeight: 600 }}>{cSent} IMPACT ({c.impact?.replace('_', ' ')})</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Confidence Score</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '60px', height: '6px', background: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${scorePercent}%`, height: '100%', background: cColor }} />
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{scorePercent}%</span>
                      </div>
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    <strong>AI Analysis:</strong> {c.reason}
                  </p>
                  {c.inUserPortfolio && c.portfolioRelevance && (
                    <div style={{ marginTop: '12px', padding: '12px', background: 'color-mix(in srgb, var(--accent-primary) 5%, transparent)', borderRadius: '8px', borderLeft: '3px solid var(--accent-primary)', fontSize: '0.85rem' }}>
                      <strong style={{ color: 'var(--accent-primary)' }}>Portfolio Actionable Insight:</strong> {c.portfolioRelevance}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
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
             {urgencyText}
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
            {source.replace(/".*?" - /g, '').replace(/NIFTY 50.*? - /gi, '')}
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

      {/* Summary - Only show if it provides new information */}
      {summary && summary.trim() !== headline.trim() && !summary.includes(headline) && !headline.includes(summary) && (
        <p className="rnc-summary">{summary}</p>
      )}

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


