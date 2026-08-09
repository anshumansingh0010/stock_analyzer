import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { API_BASE } from '../../utils/api';
import { sentimentColor, timeAgo } from '../../utils/format';
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

  // Load latest custom news on tab switch
  useEffect(() => {
    try {
      const saved = localStorage.getItem('stock_sense_custom_news');
      if (saved) setCustomNews(JSON.parse(saved));
    } catch {}
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

function CustomNewsCard({ result }: { result: any }) {
  const hasPortfolio = result.companies?.some((c: any) => c.inUserPortfolio);
  const headline     = result.headline || result._meta?.article?.headline || 'Custom Analyzed News';
  const source       = result.source || result._meta?.article?.source || 'Custom Analysis';
  const timestamp    = result.timestamp || result._meta?.analyzedAt;

  return (
    <div className={`ptf-news-card${hasPortfolio ? ' has-portfolio-hit' : ''}`}>
      <div className="ptf-news-header">
        <span className={`ptf-urgency urgency-${result.urgency || 'HIGH'}`}>{result.urgency || 'HIGH'}</span>
        {hasPortfolio && <span className="portfolio-badge">Portfolio Hit</span>}
      </div>
      <div className="ptf-news-headline">{headline}</div>
      <div className="ptf-news-source">{source} {timestamp && `· ${timeAgo(timestamp)}`}</div>
      {result.summary && <p className="ptf-news-summary">{result.summary}</p>}
      {result.companies?.map((c: any, i: number) => {
        const compName = (c.name && !c.name.startsWith('Unknown')) ? c.name : (c.ticker && c.ticker !== 'UNKNOWN' ? c.ticker : 'Market Update');
        const compTicker = (c.ticker && c.ticker !== 'UNKNOWN') ? `(${c.ticker})` : '';
        return (
          <div key={i} className="ptf-news-company" style={{ flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
            <span className="ptf-ticker-sm" style={{ fontWeight: 600 }}>{compName} {compTicker}</span>
            <span className={`sentiment-pill sentiment-${c.sentiment || 'NEUTRAL'}`}>
              {c.sentiment || 'NEUTRAL'}
            </span>
            {c.reason && <span style={{ fontSize: '0.80rem', opacity: 0.85, flex: '1 1 100%', marginTop: 2, color: 'var(--text-secondary)' }}>{c.reason}</span>}
          </div>
        );
      })}
      {result.expectedImpact && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.78rem' }}>
          {result.expectedImpact.shortTerm && <div style={{ color: '#00e676' }}>⚡ <strong>Short Term:</strong> {result.expectedImpact.shortTerm}</div>}
          {result.expectedImpact.longTerm && <div style={{ color: '#3d5afe', marginTop: 3 }}>📈 <strong>Long Term:</strong> {result.expectedImpact.longTerm}</div>}
        </div>
      )}
      <div className="ptf-news-overall">
        Overall Sentiment: <strong style={{ color: sentimentColor(result.overallMarketSentiment) }}>
          {result.overallMarketSentiment}
        </strong>
      </div>
    </div>
  );
}

