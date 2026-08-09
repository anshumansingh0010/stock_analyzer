import { useState } from 'react';

// ── 1. Portfolio Growth Trajectory Chart ───────────────────────────
export function PortfolioGrowthChart({ totalValue }: { totalValue: number }) {
  const [timeframe, setTimeframe] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('6M');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Mock historical growth data trajectories based on selected timeframe
  const growthDataMap = {
    '1M':  [
      { label: 'Jul 5',  val: totalValue * 0.965 },
      { label: 'Jul 12', val: totalValue * 0.978 },
      { label: 'Jul 19', val: totalValue * 0.972 },
      { label: 'Jul 26', val: totalValue * 0.991 },
      { label: 'Aug 2',  val: totalValue * 0.995 },
      { label: 'Today',  val: totalValue },
    ],
    '3M':  [
      { label: 'May 5',  val: totalValue * 0.910 },
      { label: 'May 20', val: totalValue * 0.928 },
      { label: 'Jun 5',  val: totalValue * 0.952 },
      { label: 'Jun 20', val: totalValue * 0.941 },
      { label: 'Jul 10', val: totalValue * 0.985 },
      { label: 'Today',  val: totalValue },
    ],
    '6M':  [
      { label: 'Feb', val: totalValue * 0.860 },
      { label: 'Mar', val: totalValue * 0.895 },
      { label: 'Apr', val: totalValue * 0.920 },
      { label: 'May', val: totalValue * 0.910 },
      { label: 'Jun', val: totalValue * 0.955 },
      { label: 'Jul', val: totalValue * 0.982 },
      { label: 'Aug', val: totalValue },
    ],
    '1Y':  [
      { label: 'Aug 23', val: totalValue * 0.780 },
      { label: 'Nov 23', val: totalValue * 0.840 },
      { label: 'Feb 24', val: totalValue * 0.860 },
      { label: 'May 24', val: totalValue * 0.910 },
      { label: 'Today',  val: totalValue },
    ],
    'ALL': [
      { label: '2022', val: totalValue * 0.580 },
      { label: '2023', val: totalValue * 0.740 },
      { label: '2024', val: totalValue * 0.890 },
      { label: '2025', val: totalValue * 0.950 },
      { label: 'Now',  val: totalValue },
    ]
  };

  const points = growthDataMap[timeframe];
  const minVal = Math.min(...points.map(p => p.val)) * 0.98;
  const maxVal = Math.max(...points.map(p => p.val)) * 1.02;

  const width = 680;
  const height = 240;
  const padding = { top: 20, right: 20, bottom: 35, left: 50 };

  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  // Compute SVG coordinates
  const coords = points.map((p, i) => {
    const x = padding.left + (i / (points.length - 1)) * graphWidth;
    const y = padding.top + graphHeight - ((p.val - minVal) / (maxVal - minVal)) * graphHeight;
    return { x, y, label: p.label, val: p.val };
  });

  // Build cubic SVG path
  const pathD = coords.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = arr[i - 1];
    const cx1 = prev.x + (pt.x - prev.x) / 2;
    const cy1 = prev.y;
    const cx2 = prev.x + (pt.x - prev.x) / 2;
    const cy2 = pt.y;
    return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${pt.x} ${pt.y}`;
  }, '');

  const areaD = `${pathD} L ${coords[coords.length - 1].x} ${height - padding.bottom} L ${coords[0].x} ${height - padding.bottom} Z`;

  const hoveredPt = hoverIndex !== null ? coords[hoverIndex] : null;

  return (
    <div className="market-widget graph-widget">
      <div className="widget-header">
        <div>
          <h4>Portfolio Growth Trajectory</h4>
          <span className="widget-subtitle">Historical portfolio net asset value performance</span>
        </div>
        <div className="timeframe-pills">
          {(['1M', '3M', '6M', '1Y', 'ALL'] as const).map(tf => (
            <button
              key={tf}
              className={`tf-pill ${timeframe === tf ? 'active' : ''}`}
              onClick={() => { setTimeframe(tf); setHoverIndex(null); }}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className="svg-chart-container">
        <svg viewBox={`0 0 ${width} ${height}`} className="growth-svg">
          <defs>
            <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-bull)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--accent-bull)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal grid lines */}
          {[0, 0.33, 0.66, 1].map((pct, idx) => {
            const y = padding.top + graphHeight * pct;
            const val = maxVal - pct * (maxVal - minVal);
            return (
              <g key={idx}>
                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="var(--border-subtle)" strokeDasharray="4 4" />
                <text x={padding.left - 8} y={y + 4} textAnchor="end" fill="var(--text-muted)" fontSize="10" fontFamily="var(--font-mono)">
                  ₹{Math.round(val / 1000)}k
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path d={areaD} fill="url(#growthGrad)" />

          {/* Main line */}
          <path d={pathD} fill="none" stroke="var(--accent-bull)" strokeWidth="3" strokeLinecap="round" />

          {/* Data Points */}
          {coords.map((pt, i) => (
            <g key={i} onMouseEnter={() => setHoverIndex(i)} style={{ cursor: 'pointer' }}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={hoverIndex === i ? 6 : 4}
                fill={hoverIndex === i ? 'var(--accent-secondary)' : 'var(--bg-card)'}
                stroke="var(--accent-bull)"
                strokeWidth="2"
              />
              <text x={pt.x} y={height - 10} textAnchor="middle" fill="var(--text-muted)" fontSize="11" fontFamily="var(--font-mono)">
                {pt.label}
              </text>
            </g>
          ))}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPt && (
          <div
            className="chart-tooltip"
            style={{
              left: `${(hoveredPt.x / width) * 100}%`,
              top: `${(hoveredPt.y / height) * 100 - 15}%`
            }}
          >
            <span className="ct-date">{hoveredPt.label}</span>
            <span className="ct-val">₹{hoveredPt.val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 2. Sector & Asset Allocation Donut ─────────────────────────────
export function SectorAllocationChart({ holdings }: { holdings: any[] }) {
  const sectorColors: Record<string, string> = {
    IT: '#6366f1',
    Energy: '#00d4a8',
    Banking: '#f59e0b',
    Auto: '#ef4444',
    FMCG: '#10b981',
    Pharma: '#818cf8',
    Others: '#94a3b8'
  };

  const totalValue = holdings.reduce((s, h) => s + (h.value || h.qty * h.avgPrice), 0);

  const sectorMap: Record<string, number> = {};
  holdings.forEach(h => {
    const sec = h.sector || 'Others';
    sectorMap[sec] = (sectorMap[sec] || 0) + (h.value || h.qty * h.avgPrice);
  });

  const sectorList = Object.entries(sectorMap).map(([name, val]) => ({
    name,
    val,
    pct: totalValue > 0 ? (val / totalValue) * 100 : 0,
    color: sectorColors[name] || '#6366f1'
  })).sort((a, b) => b.val - a.val);

  // SVG Donut calculation
  const size = 180;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativePct = 0;

  return (
    <div className="market-widget graph-widget">
      <div className="widget-header">
        <h4>Sector &amp; Asset Allocation</h4>
        <span className="widget-tag bull">{sectorList.length} Sectors</span>
      </div>

      <div className="donut-container">
        <div className="donut-svg-wrap">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {sectorList.map((sec, i) => {
              const strokeDasharray = `${(sec.pct / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -((cumulativePct / 100) * circumference);
              cumulativePct += sec.pct;

              return (
                <circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={sec.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  style={{ transition: 'all 0.5s ease' }}
                />
              );
            })}
          </svg>
          <div className="donut-center-text">
            <span className="dct-val">₹{Math.round(totalValue / 1000)}k</span>
            <span className="dct-label">Total Value</span>
          </div>
        </div>

        <div className="donut-legend">
          {sectorList.map((sec, i) => (
            <div key={i} className="legend-item">
              <span className="legend-dot" style={{ background: sec.color }} />
              <span className="legend-name">{sec.name}</span>
              <span className="legend-pct">{sec.pct.toFixed(1)}%</span>
              <span className="legend-val">₹{sec.val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 3. Profit & Loss Distribution ──────────────────────────────────
export function ProfitDistributionChart({ holdings }: { holdings: any[] }) {
  const sorted = [...holdings].sort((a, b) => b.pnl - a.pnl);
  const maxAbsPnl = Math.max(...sorted.map(h => Math.abs(h.pnl)), 1);

  return (
    <div className="market-widget graph-widget">
      <div className="widget-header">
        <h4>Profit &amp; Loss Contribution</h4>
        <span className="widget-tag">Per Stock Return</span>
      </div>

      <div className="pnl-dist-list">
        {sorted.map((h, i) => {
          const isPos = h.pnl >= 0;
          const barWidth = Math.min((Math.abs(h.pnl) / maxAbsPnl) * 100, 100);

          return (
            <div key={i} className="pnl-dist-row">
              <div className="pdr-info">
                <span className="pdr-ticker">{h.ticker || h.stock}</span>
                <span className={`pdr-pnl ${isPos ? 'up' : 'down'}`}>
                  {isPos ? '+' : ''}₹{h.pnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({isPos ? '+' : ''}{h.pnlPct}%)
                </span>
              </div>
              <div className="pdr-bar-track">
                <div
                  className={`pdr-bar-fill ${isPos ? 'up' : 'down'}`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 4. Monthly Returns Heatmap Grid ─────────────────────────────────
export function MonthlyReturnsGrid() {
  const months = [
    { month: 'Jan', returnPct: 3.4 },
    { month: 'Feb', returnPct: 1.8 },
    { month: 'Mar', returnPct: -0.9 },
    { month: 'Apr', returnPct: 4.2 },
    { month: 'May', returnPct: -1.5 },
    { month: 'Jun', returnPct: 3.1 },
    { month: 'Jul', returnPct: 2.5 },
    { month: 'Aug', returnPct: 1.4 },
    { month: 'Sep', returnPct: 2.8 },
    { month: 'Oct', returnPct: 0.8 },
    { month: 'Nov', returnPct: 3.6 },
    { month: 'Dec', returnPct: 2.1 },
  ];

  return (
    <div className="market-widget graph-widget">
      <div className="widget-header">
        <h4>Monthly Returns Breakdown</h4>
        <span className="widget-tag bull">2026 YTD +23.3%</span>
      </div>

      <div className="monthly-grid">
        {months.map((m, i) => {
          const isPos = m.returnPct >= 0;
          return (
            <div key={i} className={`month-card ${isPos ? 'up' : 'down'}`}>
              <span className="mc-mname">{m.month}</span>
              <span className="mc-mret">{isPos ? '+' : ''}{m.returnPct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 5. Risk Meter & Sharpe Ratio Widget ─────────────────────────────
export function RiskAndSharpeWidget() {
  return (
    <div className="market-widget graph-widget risk-sharpe-widget">
      <div className="widget-header">
        <h4>Risk Meter &amp; Quantitative Analytics</h4>
        <span className="widget-tag">Layer 5 Metrics</span>
      </div>

      <div className="analytics-metrics-grid">
        {/* Risk Gauge */}
        <div className="metric-analytics-box risk-box">
          <span className="ab-title">Risk Meter</span>
          <div className="risk-gauge-wrap">
            <svg viewBox="0 0 100 55" className="gauge-svg">
              <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="var(--bg-surface)" strokeWidth="10" strokeLinecap="round" />
              <path d="M 10 50 A 40 40 0 0 1 50 10" fill="none" stroke="var(--accent-bull)" strokeWidth="10" strokeLinecap="round" />
              <path d="M 50 10 A 40 40 0 0 1 90 50" fill="none" stroke="var(--accent-warn)" strokeWidth="10" strokeLinecap="round" />
              {/* Needle pointer */}
              <line x1="50" y1="50" x2="35" y2="22" stroke="var(--text-primary)" strokeWidth="3" strokeLinecap="round" />
              <circle cx="50" cy="50" r="5" fill="var(--accent-primary)" />
            </svg>
            <span className="gauge-val up">34 / 100</span>
            <span className="gauge-label">Moderate Low Risk</span>
          </div>
        </div>

        {/* Sharpe Ratio */}
        <div className="metric-analytics-box">
          <span className="ab-title">Sharpe Ratio</span>
          <span className="ab-val up">1.85</span>
          <span className="ab-sub">Strong risk-adjusted return relative to risk-free rate (6.5%)</span>
        </div>

        {/* Max Drawdown */}
        <div className="metric-analytics-box">
          <span className="ab-title">Max Drawdown</span>
          <span className="ab-val down">-4.20%</span>
          <span className="ab-sub">Peak-to-trough decline over 12 months</span>
        </div>

        {/* Alpha & Beta */}
        <div className="metric-analytics-box">
          <span className="ab-title">Beta & Alpha</span>
          <div className="ab-row">
            <div><span className="ab-label">Beta:</span> <strong className="ab-val-sm">0.88</strong></div>
            <div><span className="ab-label">Alpha:</span> <strong className="ab-val-sm up">+3.4%</strong></div>
          </div>
          <span className="ab-sub">Outperforming Nifty 50 with 12% lower volatility</span>
        </div>
      </div>
    </div>
  );
}
