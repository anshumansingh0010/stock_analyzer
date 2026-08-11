import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { API_BASE } from '../../utils/api';
import { sentimentColor, timeAgo, generateContextualImpact } from '../../utils/format';
import {
  PortfolioGrowthChart,
  SectorAllocationChart,
  ProfitDistributionChart,
  MonthlyReturnsGrid,
  RiskAndSharpeWidget
} from './PortfolioCharts';

interface RawHolding {
  stock?: string;
  ticker?: string;
  qty: number;
  avgPrice: number;
  currentPrice?: number;
  sector?: string;
}

interface HoldingEnriched extends RawHolding {
  current: number;
  value: number;
  pnl: number;
  pnlPct: number;
}

const FALLBACK_PORTFOLIO: RawHolding[] = [
  { stock: 'RELIANCE', ticker: 'RELIANCE', qty: 10, avgPrice: 2700, sector: 'Energy' },
  { stock: 'INFY',     ticker: 'INFY',     qty: 25, avgPrice: 1450, sector: 'IT' },
  { stock: 'HDFCBANK', ticker: 'HDFCBANK', qty: 15, avgPrice: 1620, sector: 'Banking' },
  { stock: 'TCS',      ticker: 'TCS',      qty: 8,  avgPrice: 3850, sector: 'IT' },
];

const MOCK_PRICES: Record<string, number> = {
  RELIANCE: 2834,
  INFY:     1512,
  HDFCBANK: 1588,
  TCS:      4010,
};

function pnlClass(pct: number): string {
  if (pct > 0) return 'pnl-up';
  if (pct < 0) return 'pnl-down';
  return 'pnl-flat';
}

export default function PortfolioTab() {
  const { updateContext, showToast } = useApp();
  const [holdings, setHoldings]       = useState<HoldingEnriched[]>([]);
  const [loading, setLoading]         = useState<boolean>(true);

  // Custom analyzed news state
  const [customNews, setCustomNews]   = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('stock_sense_custom_news');
      return saved ? JSON.parse(saved) : [
        {
          id: "custom-demo-1",
          headline: "Reliance Industries reports Q4 net profit beat driven by Jio & Retail margin expansion",
          summary: "Reliance Industries Limited posted Q4 FY26 net profit of ₹21,243 crore, exceeding analyst estimates of ₹19,500 crore driven by Jio and Retail margin expansion.",
          source: "Custom Analysis (Economic Times)",
          timestamp: new Date().toISOString(),
          overallMarketSentiment: "BULLISH",
          confidence: 94,
          urgency: "HIGH",
          sectorAffected: ["Energy", "Telecom", "Retail"],
          companies: [
            { ticker: "RELIANCE", name: "Reliance Industries", sentiment: "BULLISH", sentimentScore: 0.94, inUserPortfolio: true, reason: "Q4 net profit beat Street estimates by 8.9% with margin expansion in Jio & Retail." }
          ],
          expectedImpact: {
            shortTerm: "+1.8% to +2.5% intraday surge expected on Q4 beat",
            longTerm: "+8% to +14% upside supported by Jio tariff hikes"
          }
        }
      ];
    } catch {
      return [];
    }
  });

  // ── Load portfolio ────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    async function loadPortfolio() {
      setLoading(true);
      let finalHoldings: RawHolding[] = [];
      try {
        const res = await fetch(`${API_BASE}/portfolio/demoUser`);
        const d   = await res.json();
        if (d.success && d.portfolio?.holdings?.length) {
          finalHoldings = d.portfolio.holdings;
        } else {
          finalHoldings = FALLBACK_PORTFOLIO;
        }
      } catch {
        finalHoldings = FALLBACK_PORTFOLIO;
      }

      // Enrich with current price & P&L
      const enriched: HoldingEnriched[] = finalHoldings.map(h => {
        const symbol = h.ticker || h.stock || '';
        const current = h.currentPrice ?? MOCK_PRICES[symbol] ?? h.avgPrice;
        const invested = h.qty * h.avgPrice;
        const value    = h.qty * current;
        const pnl      = value - invested;
        const pnlPct   = parseFloat(((pnl / (invested || 1)) * 100).toFixed(2));
        return { ...h, current, value, pnl, pnlPct };
      });

      if (mounted) {
        setHoldings(enriched);
        updateContext('portfolio', enriched);
        setLoading(false);
      }
    }
    loadPortfolio();
    return () => { mounted = false; };
  }, [updateContext]);

  // Load latest custom news on tab switch and sync in real time
  useEffect(() => {
    const handleSync = () => {
      try {
        const saved = localStorage.getItem('stock_sense_custom_news');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCustomNews(parsed);
          }
        }
      } catch {}
    };
    handleSync();
    window.addEventListener('storage', handleSync);
    return () => window.removeEventListener('storage', handleSync);
  }, []);

  const totalInvested = holdings.reduce((s, h) => s + h.qty * h.avgPrice, 0);
  const totalValue    = holdings.reduce((s, h) => s + (h.value || h.qty * h.avgPrice), 0);
  const totalPnL      = totalValue - totalInvested;
  const totalPct      = totalInvested ? ((totalPnL / totalInvested) * 100).toFixed(2) : '0.00';

  return (
    <section className="tab-section active" style={{ flexDirection: 'column', overflowY: 'auto' }}>
      <div className="page-container full-width-dashboard">

        {/* ── Header ── */}
        <div className="page-header">
          <div>
            <h1>My Portfolio Dashboard</h1>
            <p>Real-time performance graphs, risk metrics, sector allocation &amp; AI intelligence</p>
          </div>
          <div className="portfolio-status-badge">
            <span className="psb-dot live" />
            <span>Live Analytics · Demo User</span>
          </div>
        </div>

        {/* ── Summary Metrics Grid ── */}
        <div className="metrics-hero-grid">
          <SummaryCard
            label="Total Invested"
            value={`₹${totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
            sub="Capital Deployed"
          />
          <SummaryCard
            label="Current Value"
            value={`₹${totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
            sub="Mark-to-Market"
          />
          <SummaryCard
            label="Unrealized P&L"
            value={`${totalPnL >= 0 ? '+' : ''}₹${totalPnL.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
            sub={`${Number(totalPct) >= 0 ? '+' : ''}${totalPct}% Total Return`}
            highlight={totalPnL >= 0 ? 'bull' : 'bear'}
          />
          <SummaryCard
            label="Sharpe Ratio"
            value="1.85"
            sub="Risk Adjusted Return"
            highlight="bull"
          />
          <SummaryCard
            label="Max Drawdown"
            value="-4.20%"
            sub="Low Risk Exposure"
          />
        </div>

        {/* ── 1. Portfolio Growth & Sector Allocation Row ── */}
        <div className="dashboard-two-col">
          <PortfolioGrowthChart totalValue={totalValue} />
          <SectorAllocationChart holdings={holdings} />
        </div>

        {/* ── 2. P&L Distribution & Risk Analytics Row ── */}
        <div className="dashboard-two-col">
          <ProfitDistributionChart holdings={holdings} />
          <RiskAndSharpeWidget />
        </div>

        {/* ── 3. Monthly Returns Grid ── */}
        <MonthlyReturnsGrid />

        {/* ── Holdings Position Table ── */}
        <div className="ptf-section">
          <div className="ptf-section-title">Holding Position Details</div>
          {loading ? (
            <div className="ptf-loading"><span className="ptf-spinner" />Loading portfolio holdings...</div>
          ) : (
            <div className="ptf-table-wrap">
              <table className="ptf-table">
                <thead>
                  <tr>
                    <th>Stock / Symbol</th>
                    <th>Sector</th>
                    <th className="num">Quantity</th>
                    <th className="num">Avg Buy (₹)</th>
                    <th className="num">Current Price (₹)</th>
                    <th className="num">Invested Value (₹)</th>
                    <th className="num">Current Value (₹)</th>
                    <th className="num">Total P&amp;L</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h, i) => (
                    <tr key={i}>
                      <td>
                        <div className="ptf-stock-cell">
                          <span className="ptf-ticker">{h.ticker || h.stock}</span>
                          {h.stock !== h.ticker && <span className="ptf-name">{h.stock}</span>}
                        </div>
                      </td>
                      <td><span className="ptf-sector-tag">{h.sector || '—'}</span></td>
                      <td className="num">{h.qty}</td>
                      <td className="num">₹{Number(h.avgPrice).toLocaleString('en-IN')}</td>
                      <td className="num">₹{Number(h.current).toLocaleString('en-IN')}</td>
                      <td className="num">₹{Number(h.qty * h.avgPrice).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                      <td className="num">₹{Number(h.value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                      <td className="num">
                        <span className={`ptf-pnl ${pnlClass(h.pnlPct)}`}>
                          {h.pnlPct >= 0 ? '+' : ''}{h.pnlPct}% (₹{h.pnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })})
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Analyzed Custom News & Impact Section ── */}
        <div className="ptf-section" style={{ marginTop: 24 }}>
          <div className="ptf-section-title" style={{ marginBottom: 12 }}>Analyzed Custom News &amp; Impact</div>
          <p className="data-card-desc" style={{ marginBottom: 16 }}>News articles analyzed using <strong>Analyze Custom Article</strong> with AI sentiment tagging, portfolio mapping &amp; price impact</p>

          {/* Display Only Analyzed Custom News Cards */}
          {customNews.length === 0 ? (
            <div className="ptf-empty" style={{ padding: '30px', textAlign: 'center' }}>
              No custom articles analyzed yet. Analyze any article using <strong>Analyze Custom Article</strong> in the News tab.
            </div>
          ) : (
            <div className="ptf-news-grid">
              {customNews.map((r, i) => <CustomNewsCard key={i} result={r} />)}
            </div>
          )}
        </div>

      </div>
    </section>
  );
}

interface SummaryCardProps {
  label: string;
  value: string | number;
  sub?: string;
  highlight?: 'bull' | 'bear';
}

function SummaryCard({ label, value, sub, highlight }: SummaryCardProps) {
  return (
    <div className={`metric-card ${highlight ? highlight : ''}`}>
      <div className="mc-top">
        <span className="mc-label">{label}</span>
        {highlight && <span className={`mc-badge ${highlight}`}>{highlight === 'bull' ? 'Optimal' : 'Loss'}</span>}
      </div>
      <div className="mc-value">{value}</div>
      {sub && <div className="mc-footer"><span className={`mc-sub ${highlight ? `ptf-${highlight}` : ''}`}>{sub}</span></div>}
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
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function CustomNewsCard({ result }: { result: any }) {
  const [bookmarked, setBookmarked] = useState(false);
  const { showToast } = useApp();

  const hasPortfolio = result.companies?.some((c: any) => c.inUserPortfolio);
  const headline     = result.headline || result._meta?.article?.headline || 'Custom Analyzed News';
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
              <polyline points="12 6 12 16 14" />
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
        <div className={`impact-col short-term impact-${sentiment.toLowerCase()}`}>
          <div className="ic-icon-badge">
            {renderImpactIcon(sentiment)}
          </div>
          <div className="ic-content">
            <span className="ic-label">EXPECTED IMPACT (SHORT TERM)</span>
            <span className="ic-text">{shortTermImpact}</span>
          </div>
        </div>

        <div className={`impact-col long-term impact-${sentiment.toLowerCase()}`}>
          <div className="ic-icon-badge">
            {renderImpactIcon(sentiment)}
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

