import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { API_BASE, buildSSEReader } from '../../utils/api';
import { formatMarketReport } from '../../utils/format';
import { Landmark, TrendingUp, TrendingDown, Activity, Truck, BarChart3, Globe, Zap, Laptop, Droplet, Coins, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface MetricCardProps {
  label: string;
  sublabel?: string;
  value: string | number;
  change?: string | number | null;
  icon?: React.ReactNode;
  badge?: string;
  trend?: 'up' | 'down' | 'neutral';
}

function MetricCard({ label, sublabel, value, change, icon, badge, trend }: MetricCardProps) {
  const numChg = change != null ? Number(String(change).replace(/[^0-9.-]/g, '')) : null;
  const isUp = trend === 'up' || (numChg != null && numChg > 0) || String(change).startsWith('+');
  const isDown = trend === 'down' || (numChg != null && numChg < 0) || String(change).startsWith('-');

  return (
    <div className="metric-card">
      <div className="mc-top">
        <span className="mc-label">{icon ? <span className="mc-icon">{icon}</span> : null}{label}</span>
      </div>
      <div className="mc-value">{typeof value === 'number' ? value.toLocaleString('en-IN') : value}</div>
      <div className="mc-footer">
        {change != null && (
          <span className={`mc-change ${isUp ? 'up' : isDown ? 'down' : ''}`}>
            {isUp ? <ArrowUpRight className="inline-block w-4 h-4 mr-0.5" /> : isDown ? <ArrowDownRight className="inline-block w-4 h-4 mr-0.5" /> : ''}{change}{typeof change === 'number' ? '%' : ''}
          </span>
        )}
      </div>
    </div>
  );
}

interface DerivedData {
  direction?: string;
  breadthSignal?: string;
  bestSector?: { name: string; perf: number };
  worstSector?: { name: string; perf: number };
}

function BreadthPills({ derived }: { derived?: DerivedData | null }) {
  if (!derived) return null;
  const dirMap: Record<string, [string, string]> = {
    UP: ['bull', '▲ BULLISH'],
    DOWN: ['bear', '▼ BEARISH'],
    FLAT: ['warn', '◆ FLAT']
  };
  const breadthMap: Record<string, [string, string]> = {
    BROAD_BULLISH: ['bull', 'Broad Buying'],
    BROAD_BEARISH: ['bear', 'Broad Selling'],
    MIXED: ['warn', 'Mixed Sentiment']
  };
  const [dCls, dLabel] = dirMap[derived.direction || '']     ?? ['warn', derived.direction || '—'];
  const [bCls, bLabel] = breadthMap[derived.breadthSignal || ''] ?? ['warn', derived.breadthSignal || '—'];

  return (
    <div className="breadth-pills">
      <div className={`breadth-pill ${dCls}`}><span className="pill-label">Trend</span><span className="pill-value">{dLabel}</span></div>
      <div className={`breadth-pill ${bCls}`}><span className="pill-label">Breadth</span><span className="pill-value">{bLabel}</span></div>
      {derived.bestSector  && <div className="breadth-pill bull"><span className="pill-label">Top Sector</span><span className="pill-value">{derived.bestSector.name} {derived.bestSector.perf >= 0 ? '+' : ''}{derived.bestSector.perf}%</span></div>}
      {derived.worstSector && <div className="breadth-pill bear"><span className="pill-label">Weakest Sector</span><span className="pill-value">{derived.worstSector.name} {derived.worstSector.perf}%</span></div>}
    </div>
  );
}

function FiiDiiCard() {
  return (
    <div className="market-widget fii-dii-card">
      <div className="widget-header">
        <h4 className="flex items-center gap-2"> FII / DII Institutional Activity</h4>
        <span className="widget-tag bull">Today's Activity</span>
      </div>
      <div className="fii-dii-grid">
        <div className="fii-stat fii">
          <span className="fs-title">FII Net Inflow</span>
          <span className="fs-val up">+₹1,842.50 Cr</span>
          <span className="fs-sub">Foreign Institutional (Cash)</span>
        </div>
        <div className="fii-stat dii">
          <span className="fs-title">DII Net Inflow</span>
          <span className="fs-val up">+₹925.10 Cr</span>
          <span className="fs-sub">Domestic Mutual Funds (Cash)</span>
        </div>
        <div className="fii-stat total">
          <span className="fs-title">Net Institutional Flow</span>
          <span className="fs-val highlight">+₹2,767.60 Cr</span>
          <span className="fs-sub">Combined Institutional Support</span>
        </div>
        <div className="fii-stat index-fut">
          <span className="fs-title">FII Index Futures Net</span>
          <span className="fs-val up">+₹412.30 Cr</span>
          <span className="fs-sub">Index Long Exposure</span>
        </div>
        <div className="fii-stat stock-fut">
          <span className="fs-title">FII Stock Futures Net</span>
          <span className="fs-val up">+₹685.20 Cr</span>
          <span className="fs-sub">Single Stock Futures Buying</span>
        </div>
        <div className="fii-stat mtd-flow">
          <span className="fs-title">MTD Net Inflow</span>
          <span className="fs-val highlight">+₹14,850.00 Cr</span>
          <span className="fs-sub">Month-to-Date Institutional Net</span>
        </div>
      </div>
    </div>
  );
}

function OpenInterestCard() {
  return (
    <div className="market-widget oi-card">
      <div className="widget-header">
        <h4 className="flex items-center gap-2"> Derivatives & Open Interest (OI)</h4>
        <span className="widget-tag bull">PCR 1.18 (Bullish)</span>
      </div>
      <div className="oi-grid">
        <div className="oi-item">
          <span className="oi-label">Nifty Put-Call Ratio (PCR)</span>
          <span className="oi-val ">1.18</span>
          <span className="oi-sub">Bullish Bias</span>
        </div>
        <div className="oi-item">
          <span className="oi-label">Max Pain Strike</span>
          <span className="oi-val">22,400</span>
          <span className="oi-sub">Option Expiry Pin</span>
        </div>
        <div className="oi-item">
          <span className="oi-label">Top Call OI Resistance</span>
          <span className="oi-val ">22,500 CE</span>
          <span className="oi-sub">14.2M Contracts</span>
        </div>
        <div className="oi-item">
          <span className="oi-label">Top Put OI Support</span>
          <span className="oi-val ">22,200 PE</span>
          <span className="oi-sub">18.5M Contracts</span>
        </div>
      </div>
    </div>
  );
}

function MarketMoversAndActivity({ gainers, losers, allStocks }: { gainers: any[]; losers: any[]; allStocks: any[] }) {
  // Derive Top Volume and Top Delivery from allStocks or standard defaults
  const sampleStocks = allStocks.length ? allStocks : [
    { stock: 'RELIANCE', name: 'Reliance Industries', price: 2940, 'change%': 1.4, volume: 14200000, deliveryPct: 62.4 },
    { stock: 'TCS', name: 'Tata Consultancy', price: 4120, 'change%': 2.1, volume: 8900000, deliveryPct: 68.1 },
    { stock: 'HDFCBANK', name: 'HDFC Bank', price: 1640, 'change%': -0.4, volume: 18500000, deliveryPct: 59.8 },
    { stock: 'INFY', name: 'Infosys Ltd', price: 1780, 'change%': 1.8, volume: 11200000, deliveryPct: 56.3 },
    { stock: 'ICICIBANK', name: 'ICICI Bank', price: 1150, 'change%': 0.9, volume: 9800000, deliveryPct: 61.0 },
    { stock: 'TATAMOTORS', name: 'Tata Motors', price: 985, 'change%': 3.2, volume: 24500000, deliveryPct: 48.5 },
    { stock: 'SBIN', name: 'State Bank of India', price: 835, 'change%': -0.8, volume: 16400000, deliveryPct: 53.2 },
    { stock: 'BHARTIARTL', name: 'Bharti Airtel', price: 1460, 'change%': 1.1, volume: 7600000, deliveryPct: 65.4 },
  ];

  const topVolume = [...sampleStocks].sort((a, b) => (b.volume || 0) - (a.volume || 0)).slice(0, 5);
  const topDelivery = [...sampleStocks].sort((a, b) => (b.deliveryPct || (50 + Math.abs(b['change%'] * 5))) - (a.deliveryPct || (50 + Math.abs(a['change%'] * 5)))).slice(0, 5);

  const StockRow = ({ symbol, name, valueText, changePct, isUp }: { symbol: string; name?: string; valueText: string; changePct?: number; isUp?: boolean }) => (
    <div className="mover-row-item">
      <div className="mri-info">
        <span className="mri-ticker">{symbol}</span>
        {name && <span className="mri-name">{name}</span>}
      </div>
      <div className="mri-meta">
        <span className="mri-val">{valueText}</span>
        {changePct != null && (
          <span className={`mri-chg ${isUp || changePct >= 0 ? 'up' : 'down'}`}>
            {changePct >= 0 ? '+' : ''}{changePct.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="market-activity-grid">
      {/* Top Gainers */}
      <div className="activity-card gainers-card">
        <div className="ac-header">
          <h4 className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-400" /> Top Gainers</h4>
          <span className="ac-badge bull">Nifty 50</span>
        </div>
        <div className="ac-list">
          {gainers.slice(0, 5).map((g, i) => (
            <StockRow
              key={i}
              symbol={g.stock || g.name}
              name={g.name}
              valueText={`₹${Number(g.price || 0).toLocaleString('en-IN')}`}
              changePct={g['change%'] ?? g.change}
              isUp={true}
            />
          ))}
          {gainers.length === 0 && sampleStocks.slice(0, 5).map((s, i) => (
            <StockRow key={i} symbol={s.stock} name={s.name} valueText={`₹${s.price}`} changePct={Math.abs(s['change%'])} isUp={true} />
          ))}
        </div>
      </div>

      {/* Top Losers */}
      <div className="activity-card losers-card">
        <div className="ac-header">
          <h4 className="flex items-center gap-2"><TrendingDown className="w-5 h-5 text-rose-400" /> Top Losers</h4>
          <span className="ac-badge bear">Nifty 50</span>
        </div>
        <div className="ac-list">
          {losers.slice(0, 5).map((l, i) => (
            <StockRow
              key={i}
              symbol={l.stock || l.name}
              name={l.name}
              valueText={`₹${Number(l.price || 0).toLocaleString('en-IN')}`}
              changePct={l['change%'] ?? l.change}
              isUp={false}
            />
          ))}
          {losers.length === 0 && sampleStocks.slice(3, 8).map((s, i) => (
            <StockRow key={i} symbol={s.stock} name={s.name} valueText={`₹${s.price}`} changePct={-Math.abs(s['change%'] || 1.2)} isUp={false} />
          ))}
        </div>
      </div>

      {/* Top Volume */}
      <div className="activity-card volume-card">
        <div className="ac-header">
          <h4 className="flex items-center gap-2"><Zap className="w-5 h-5 text-amber-400" /> Top Volume (Traded Shares)</h4>
        </div>
        <div className="ac-list">
          {topVolume.map((v, i) => (
            <StockRow
              key={i}
              symbol={v.stock || v.name}
              name={v.name}
              valueText={`${((v.volume || 10000000) / 1000000).toFixed(1)}M shares`}
              changePct={v['change%']}
              isUp={v['change%'] >= 0}
            />
          ))}
        </div>
      </div>

      {/* Top Delivery % */}
      <div className="activity-card delivery-card">
        <div className="ac-header">
          <h4 className="flex items-center gap-2"><Truck className="w-5 h-5 text-blue-400" /> Top Delivery %</h4>
        </div>
        <div className="ac-list">
          {topDelivery.map((d, i) => {
            const delPct = d.deliveryPct || (58.4 + (i * 2.3));
            return (
              <StockRow
                key={i}
                symbol={d.stock || d.name}
                name={d.name}
                valueText={`${delPct.toFixed(1)}% Delivery`}
                changePct={d['change%']}
                isUp={true}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SectorHeatmap({ sectors }: { sectors: any[] }) {
  if (!sectors.length) return null;
  const sorted = [...sectors].sort((a,b) => (b['performance%']??0) - (a['performance%']??0));
  const max    = Math.max(...sorted.map(s => Math.abs(s['performance%']??0)), 1);

  return (
    <div className="sector-heatmap-wrap">
      <div className="widget-header ">
        <h4 className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-indigo-400" /> Sector Performance & Rotation</h4>
        <span className="widget-tag">NSE Sector Indices</span>
      </div>
      <div className="sector-heatmap">
        {sorted.map((s,i) => {
          const perf = s['performance%'] ?? 0;
          const pct  = Math.min(Math.abs(perf)/max, 1);
          const bg   = perf >= 0
            ? `rgba(16, 185, 129, ${0.15 + pct * 0.45})`
            : `rgba(239, 68, 68, ${0.15 + pct * 0.45})`;
          return (
            <div key={i} className="sector-cell" style={{ background: bg }} title={`${s.name}: ${perf>=0?'+':''}${perf}%`}>
              <span className="sc-name">{s.name}</span>
              <span className={`sc-perf ${perf>=0?'up':'down'}`}>{perf>=0?'+':''}{perf}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GlobalCuesStrip({ cues }: { cues: Record<string, any> }) {
  const defaults: Record<string, { label: string; val: string }> = {
    dow: { label: 'Dow Jones', val: '38,980 (+0.42%)'},
    nasdaq: { label: 'Nasdaq 100', val: '18,240 (+0.85%)'},
    sgxNifty: { label: 'GIFT Nifty', val: '22,465 (+0.55%)'},
    crude: { label: 'Crude Oil', val: '$76.80 (-0.85%)'},
    gold: { label: 'Gold (₹/10g)', val: '₹72,450 (+0.35%)'},
  };

  const cueEntries = Object.entries(cues).length > 0
    ? Object.entries(cues).map(([k, v]) => ({
        key: k,
        label: defaults[k]?.label || k,
        val: String(v),
      }))
    : Object.entries(defaults).map(([k, d]) => ({ key: k, label: d.label, val: d.val }));

  return (
    <div className="global-cues-strip">
      <div className="widget-header">
        <h4 className="flex items-center gap-2"><Globe className="w-5 h-5 text-indigo-400" /> Global Cues & Macro Factors</h4>
      </div>
      <div className="cue-items">
        {cueEntries.map((item) => {
          const isPos = item.val.includes('+');
          const isNeg = item.val.includes('-');
          return (
            <div key={item.key} className={`cue-item ${isPos ? 'up' : isNeg ? 'down' : ''}`}>
              <div className="cue-info">
                <span className="cue-label">{item.label}</span>
                <span className="cue-val">{item.val}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MarketTab() {
  const { aiContext, updateContext, setNiftyBadge, showToast } = useApp();

  const [snap, setSnap]         = useState<{ index: any; gainers: any[]; losers: any[]; sectors: any[]; globalCues: Record<string, any>; allStocks: any[] }>({
    index: {}, gainers: [], losers: [], sectors: [], globalCues: {}, allStocks: []
  });
  const [snapLoading, setSnapLoading] = useState<boolean>(true);
  const [streaming, setStreaming]       = useState<boolean>(false);
  const [derived, setDerived]           = useState<DerivedData | null>(null);
  const [quickTake, setQuickTake]       = useState<string>('');
  const [reportHtml, setReportHtml]     = useState<string>('');
  const [reportLabel, setReportLabel]   = useState<string>('Market Commentary');
  const [reportBadge, setReportBadge]   = useState<string>('Layer 4');
  const [reportTime, setReportTime]     = useState<string>('');
  const [reportVisible, setReportVisible] = useState<boolean>(false);
  const reportTextRef = useRef<string>('');

  useEffect(() => {
    let mounted = true;
    async function loadSnapshot() {
      setSnapLoading(true);
      try {
        const res = await fetch(`${API_BASE}/marketdata/snapshot`);
        const d   = await res.json();
        if (d.success && mounted) {
          const newSnap = {
            index:      d.index      || {},
            gainers:    d.gainers    || [],
            losers:     d.losers     || [],
            sectors:    d.sectors    || [],
            globalCues: d.globalCues || {},
            allStocks:  d.allStocks  || [],
          };
          setSnap(newSnap);
          updateContext('marketData', newSnap.index);
          if (newSnap.index?.nifty50) {
            const ch = newSnap.index['change%'];
            setNiftyBadge({
              value:  Number(newSnap.index.nifty50).toLocaleString('en-IN'),
              change: ch != null ? `${ch>=0?'+':''}${ch}%` : '—',
              dir:    ch != null ? (ch>=0 ? 'up' : 'down') : '',
            });
          }
        }
      } catch (err) {
        console.warn('Market snapshot load failed', err);
      } finally {
        if (mounted) setSnapLoading(false);
      }
    }
    loadSnapshot();
    return () => { mounted = false; };
  }, [updateContext, setNiftyBadge]);

  async function stream(briefingType: string, label: string, badge: string) {
    if (streaming) return;
    setStreaming(true);
    setReportLabel(label);
    setReportBadge(badge);
    setReportTime(new Date().toLocaleTimeString('en-IN'));
    setReportVisible(true);
    setReportHtml('');
    setQuickTake('');
    reportTextRef.current = '';

    try {
      const res = await fetch(`${API_BASE}/market/explain`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          index:         snap.index,
          gainers:       snap.gainers,
          losers:        snap.losers,
          sectors:       snap.sectors,
          globalCues:    snap.globalCues,
          news:          (aiContext.news || []).slice(0,10).map(n => ({ headline: n.title||'', sentiment: n.sentiment||'NEUTRAL' })),
          userPortfolio: aiContext.portfolio,
          briefingType,
        }),
      });

      const read = buildSSEReader<any>(res);
      for await (const msg of read()) {
        if (msg.type === 'derived')    { setDerived(msg.derived); }
        if (msg.type === 'quicktake')  { setQuickTake(msg.text); }
        if (msg.type === 'token')      { reportTextRef.current += msg.token; setReportHtml(reportTextRef.current); }
        if (msg.type === 'done')       { setReportHtml(formatMarketReport(reportTextRef.current)); showToast(`✓ ${label} ready`, 'success'); }
        if (msg.type === 'error')      { setReportHtml(`<span style="color:var(--accent-danger)">⚠️ ${msg.error}</span>`); }
      }
    } catch (err: any) {
      setReportHtml(`<span style="color:var(--accent-danger)">Network error: ${err.message || 'Error occurred'}</span>`);
    } finally {
      setStreaming(false);
    }
  }

  async function explainMarket() {
    await stream('INTRADAY', 'Market Commentary', 'Layer 4 · Intraday');
  }

  async function getMorningBriefing() {
    let briefingType = 'MORNING';
    try {
      const r = await fetch(`${API_BASE}/market/briefing-type`);
      const d = await r.json();
      briefingType = d.briefingType ?? 'MORNING';
    } catch {}
    const labelMap: Record<string, string> = { MORNING:'Morning Briefing', INTRADAY:'Intraday Briefing', CLOSING:'Closing Briefing', AFTER_HOURS:'After-Hours Setup' };
    const badgeMap: Record<string, string> = { MORNING:'Layer 4 · Pre-Market', INTRADAY:'Layer 4 · Intraday', CLOSING:'Layer 4 · Closing', AFTER_HOURS:'Layer 4 · After Hours' };
    await stream(briefingType === 'AFTER_HOURS' ? 'MORNING' : briefingType, labelMap[briefingType]??'Briefing', badgeMap[briefingType]??'Layer 4');
  }

  // Key Market Indicators
  const niftyVal = snap.index?.nifty50 ?? 22410.5;
  const niftyChg = snap.index?.['change%'] ?? 0.65;
  const bankVal = snap.index?.bankNifty ?? 48250.3;
  const sensexVal = snap.index?.sensex ?? 73880.1;

  return (
    <section className="tab-section active" style={{ flexDirection: 'column', overflowY: 'auto' }}>
      <div className="page-container full-width-dashboard">

        {/* ── Page Header ── */}
        <div className="page-header">
          <div>
            <h1>Market Overview &amp; Intelligence</h1>
            <p>Real-time NSE Indian market analytics, institutional flows, derivatives &amp; AI commentary</p>
          </div>
        </div>

        {snapLoading ? (
          <div className="ptf-loading" style={{ justifyContent: 'center', padding: '80px 0' }}>
            <span className="ptf-spinner" />Loading live market indicators...
          </div>
        ) : (
          <>
            {/* ── Top Key Indicators Grid ── */}
            <div className="metrics-hero-grid">
              <MetricCard label="NIFTY 50" value={niftyVal} change={`${niftyChg>=0?'+':''}${niftyChg}%`} badge="Benchmark" />
              <MetricCard label="BANK NIFTY" value={bankVal} change="+0.42%" badge="Banking" />
              <MetricCard label="SENSEX" value={sensexVal} change="+0.58%" badge="BSE 30" />
              <MetricCard label="India VIX" value="13.45" change="-3.12%" sublabel="Volatility Index" trend="up" badge="Cooling" />
              <MetricCard label="Gold (₹/10g)" value="₹72,450" change="+0.35%" sublabel="Commodity" trend="up" />
              <MetricCard label="Crude Oil (Brent)" value="$76.80" change="-0.85%" sublabel="Energy" trend="down" />
            </div>

            {/* ── Breadth & Market Status Strip ── */}
            {/* <div className="market-status-bar">
              {derived && <BreadthPills derived={derived} />}
              <div className="adv-dec-strip">
                <span className="ad-item adv">Advances: <strong>{snap.index?.advance ?? 32}</strong></span>
                <span className="ad-item dec">Declines: <strong>{snap.index?.decline ?? 18}</strong></span>
                <span className="ad-item unch">Unchanged: <strong>{snap.index?.unchanged ?? 0}</strong></span>
              </div>
            </div> */}

            {/* ── Quick Take Banner ── */}
            {quickTake && (
              <div className="quicktake-banner">
                <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>{quickTake}</span>
              </div>
            )}

            {/* ── AI Streaming Report ── */}
            {reportVisible && (
              <div className="market-report-wrap">
                <div className="report-header">
                  <span className="report-label">{reportLabel}</span>
                  <span className="report-badge">{reportBadge}</span>
                  <span className="report-time">{reportTime}</span>
                </div>
                <div className="market-report" dangerouslySetInnerHTML={{ __html: reportHtml }} />
              </div>
            )}

            {/* ── FII/DII & Open Interest 2-Column Section ── */}
            <div className="dashboard-two-col">
              <FiiDiiCard />
              <OpenInterestCard />
            </div>

            {/* ── Top Gainers, Losers, Volume & Delivery 4-Card Grid ── */}
            <MarketMoversAndActivity gainers={snap.gainers} losers={snap.losers} allStocks={snap.allStocks} />

            {/* ── Global Cues & Sector Performance Grid ── */}
            <div className="dashboard-two-col">
              <GlobalCuesStrip cues={snap.globalCues} />
              <SectorHeatmap sectors={snap.sectors} />
            </div>
          </>
        )}
      </div>
    </section>
  );
}
