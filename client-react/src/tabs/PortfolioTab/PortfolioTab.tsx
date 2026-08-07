import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { API_BASE } from '../../utils/api';
import { sentimentIcon, sentimentColor, timeAgo } from '../../utils/format';
import {
  PortfolioGrowthChart,
  SectorAllocationChart,
  ProfitDistributionChart,
  MonthlyReturnsGrid,
  RiskAndSharpeWidget
} from './PortfolioCharts';
import { BarChart3, Briefcase, TrendingDown, TrendingUp, Zap } from 'lucide-react';

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
  const { updateContext } = useApp();
  const [holdings, setHoldings]       = useState<HoldingEnriched[]>([]);
  const [news, setNews]               = useState<any[]>([]);
  const [loading, setLoading]         = useState<boolean>(true);
  const [newsLoading, setNewsLoading] = useState<boolean>(true);

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

  // ── Load news ─────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    async function loadNews() {
      setNewsLoading(true);
      try {
        const res = await fetch(`${API_BASE}/news/results`);
        const d   = await res.json();
        if (d.success && d.results?.length) {
          if (mounted) { setNews(d.results.slice(0, 6)); updateContext('news', d.results); }
        }
      } catch {}
      if (mounted) setNewsLoading(false);
    }
    loadNews();
    return () => { mounted = false; };
  }, [updateContext]);

  const totalInvested = holdings.reduce((s, h) => s + h.qty * h.avgPrice, 0);
  const totalValue    = holdings.reduce((s, h) => s + (h.value || h.qty * h.avgPrice), 0);
  const totalPnL      = totalValue - totalInvested;
  const totalPct      = totalInvested ? ((totalPnL / totalInvested) * 100).toFixed(2) : '0.00';

  // Calculate sector distribution
  const sectorMap: Record<string, number> = {};
  holdings.forEach(h => {
    const sec = h.sector || 'Others';
    sectorMap[sec] = (sectorMap[sec] || 0) + (h.value || 0);
  });
  const sectorList = Object.entries(sectorMap).map(([name, val]) => ({
    name,
    val,
    pct: totalValue > 0 ? ((val / totalValue) * 100).toFixed(1) : '0'
  })).sort((a, b) => Number(b.pct) - Number(a.pct));

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
            icon={<Briefcase className="w-4 h-4 text-indigo-400" />}
          />
          <SummaryCard
            label="Current Value"
            value={`₹${totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
            sub="Mark-to-Market"
            icon={<BarChart3 className="w-4 h-4 text-blue-400" />}
          />
          <SummaryCard
            label="Unrealized P&L"
            value={`${totalPnL >= 0 ? '+' : ''}₹${totalPnL.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
            sub={`${Number(totalPct) >= 0 ? '+' : ''}${totalPct}% Total Return`}
            icon={totalPnL >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-rose-400" />}
            highlight={totalPnL >= 0 ? 'bull' : 'bear'}
          />
          <SummaryCard
            label="Sharpe Ratio"
            value="1.85"
            sub="Risk Adjusted Return"
            icon={<Zap className="w-4 h-4 text-amber-400" />}
            highlight="bull"
          />
          <SummaryCard
            label="Max Drawdown"
            value="-4.20%"
            sub="Low Risk Exposure"
            icon="🛡️"
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

        {/* ── News Impact Section ── */}
        <div className="ptf-section" style={{ marginTop: 16 }}>
          <div className="ptf-section-title" style={{ marginBottom: 16 }}>Market News &amp; Watchlist Impact</div>
          {newsLoading ? (
            <div className="ptf-loading"><span className="ptf-spinner" />Fetching portfolio news impact...</div>
          ) : news.length === 0 ? (
            <div className="ptf-empty">No analyzed news yet. The news scheduler runs every 15 min.</div>
          ) : (
            <div className="ptf-news-grid">
              {news.map((r, i) => <NewsCard key={i} result={r} />)}
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
  icon: React.ReactNode;
  highlight?: 'bull' | 'bear';
}

function SummaryCard({ label, value, sub, icon, highlight }: SummaryCardProps) {
  return (
    <div className={`metric-card ${highlight ? highlight : ''}`}>
      <div className="mc-top">
        <span className="mc-label"><span className="mc-icon">{icon}</span>{label}</span>
        {highlight && <span className={`mc-badge ${highlight}`}>{highlight === 'bull' ? 'Optimal' : 'Loss'}</span>}
      </div>
      <div className="mc-value">{value}</div>
      {sub && <div className="mc-footer"><span className={`mc-sub ${highlight ? `ptf-${highlight}` : ''}`}>{sub}</span></div>}
    </div>
  );
}

function NewsCard({ result }: { result: any }) {
  const hasPortfolio = result.companies?.some((c: any) => c.inUserPortfolio);
  const headline     = result._meta?.article?.headline || 'Market News';
  const source       = result._meta?.article?.source;
  const analyzedAt   = result._meta?.analyzedAt;

  return (
    <div className={`ptf-news-card${hasPortfolio ? ' has-portfolio-hit' : ''}`}>
      <div className="ptf-news-header">
        <span className={`ptf-urgency urgency-${result.urgency}`}>{result.urgency}</span>
        {hasPortfolio && <span className="portfolio-badge">💼 Your Portfolio</span>}
      </div>
      <div className="ptf-news-headline">{headline}</div>
      {source && <div className="ptf-news-source">{source} {analyzedAt && `· ${timeAgo(analyzedAt)}`}</div>}
      {result.summary && <p className="ptf-news-summary">{result.summary}</p>}
      {result.companies?.slice(0, 3).map((c: any, i: number) => (
        <div key={i} className="ptf-news-company">
          <span className="ptf-ticker-sm">{c.ticker}</span>
          <span className={`sentiment-pill sentiment-${c.sentiment}`}>
            {sentimentIcon(c.sentiment)} {c.sentiment}
          </span>
        </div>
      ))}
      <div className="ptf-news-overall">
        Overall: <strong style={{ color: sentimentColor(result.overallMarketSentiment) }}>
          {sentimentIcon(result.overallMarketSentiment)} {result.overallMarketSentiment}
        </strong>
      </div>
    </div>
  );
}
