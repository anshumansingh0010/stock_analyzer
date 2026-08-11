import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { API_BASE, buildSSEReader } from '../../utils/api';
import { formatMarketReport } from '../../utils/format';

interface MetricCardProps {
  label: string;
  sublabel?: string;
  value: string | number;
  change?: string | number | null;
  badge?: string;
  trend?: 'up' | 'down' | 'neutral';
}

function MetricCard({ label, sublabel, value, change, badge, trend }: MetricCardProps) {
  const numChg = change != null ? Number(String(change).replace(/[^0-9.-]/g, '')) : null;
  const isUp = trend === 'up' || (trend == null && ((numChg != null && numChg > 0) || String(change).startsWith('+')));
  const isDown = trend === 'down' || (trend == null && ((numChg != null && numChg < 0) || String(change).startsWith('-')));

  return (
    <div className="metric-card">
      <div className="mc-top">
        <span className="mc-label">{label}</span>
      </div>
      <div className="mc-value">
        {typeof value === 'number' ? value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value}
      </div>
      <div className="mc-footer">
        {change != null && (
          <span className={`mc-change ${isUp ? 'up' : isDown ? 'down' : ''}`}>
            {change}{typeof change === 'number' ? '%' : ''}
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

function FiiDiiCard({ data }: { data?: any }) {
  const dateStr = data?.date || "Today's Activity";
  const fiiCashStr = data?.fiiCashStr || "+₹480.24 Cr";
  const diiCashStr = data?.diiCashStr || "+₹235.56 Cr";
  const totalNetStr = data?.totalNetStr || "+₹715.80 Cr";
  const fiiIdxFutStr = data?.fiiIdxFutStr || "-₹818.33 Cr";
  const fiiStkFutStr = data?.fiiStkFutStr || "-₹140.32 Cr";
  const mtdNetStr = data?.mtdNetStr || "+₹45,712 Cr";

  const isFiiUp = !fiiCashStr.includes('-');
  const isDiiUp = !diiCashStr.includes('-');
  const isIdxUp = !fiiIdxFutStr.includes('-');
  const isStkUp = !fiiStkFutStr.includes('-');

  return (
    <div className="market-widget fii-dii-card">
      <div className="widget-header">
        <h4>FII / DII Institutional Activity</h4>
        <span className="widget-tag bull">{dateStr}</span>
      </div>
      <div className="fii-dii-grid">
        <div className="fii-stat fii">
          <span className="fs-title">FII Net Inflow</span>
          <span className={`fs-val ${isFiiUp ? 'up' : 'down'}`}>{fiiCashStr}</span>
          <span className="fs-sub">Foreign Institutional (Cash)</span>
        </div>
        <div className="fii-stat dii">
          <span className="fs-title">DII Net Inflow</span>
          <span className={`fs-val ${isDiiUp ? 'up' : 'down'}`}>{diiCashStr}</span>
          <span className="fs-sub">Domestic Mutual Funds (Cash)</span>
        </div>
        <div className="fii-stat total">
          <span className="fs-title">Net Institutional Flow</span>
          <span className="fs-val highlight">{totalNetStr}</span>
          <span className="fs-sub">Combined Institutional Support</span>
        </div>
        <div className="fii-stat index-fut">
          <span className="fs-title">FII Index Futures Net</span>
          <span className={`fs-val ${isIdxUp ? 'up' : 'down'}`}>{fiiIdxFutStr}</span>
          <span className="fs-sub">Index Long/Short Exposure</span>
        </div>
        <div className="fii-stat stock-fut">
          <span className="fs-title">FII Stock Futures Net</span>
          <span className={`fs-val ${isStkUp ? 'up' : 'down'}`}>{fiiStkFutStr}</span>
          <span className="fs-sub">Single Stock Futures Net</span>
        </div>
        <div className="fii-stat mtd-flow">
          <span className="fs-title">MTD Net Inflow</span>
          <span className="fs-val highlight">{mtdNetStr}</span>
          <span className="fs-sub">Month-to-Date Institutional Net</span>
        </div>
      </div>
    </div>
  );
}

function OpenInterestCard({ data, niftyVal = 24570 }: { data?: any; niftyVal?: number }) {
  const maxPain = data?.maxPain || (Math.round(niftyVal / 100) * 100);
  const callStrike = data?.callStrike || (maxPain + 100);
  const putStrike = data?.putStrike || (maxPain - 100);
  const pcr = data?.pcr != null ? data.pcr : 1.05;
  const pcrBias = data?.pcrBias || "Neutral / Balanced";
  const tagClass = pcr >= 1.05 ? 'bull' : pcr <= 0.95 ? 'bear' : 'neutral';

  return (
    <div className="market-widget oi-card">
      <div className="widget-header">
        <h4>Derivatives &amp; Open Interest (OI)</h4>
        <span className={`widget-tag ${tagClass}`}>PCR {pcr} ({pcrBias})</span>
      </div>
      <div className="oi-grid">
        <div className="oi-item">
          <span className="oi-label">Nifty Put-Call Ratio (PCR)</span>
          <span className="oi-val">{pcr}</span>
          <span className="oi-sub">{pcrBias}</span>
        </div>
        <div className="oi-item">
          <span className="oi-label">Max Pain Strike</span>
          <span className="oi-val">{maxPain.toLocaleString('en-IN')}</span>
          <span className="oi-sub">Option Expiry Pin</span>
        </div>
        <div className="oi-item">
          <span className="oi-label">Top Call OI Resistance</span>
          <span className="oi-val">{callStrike.toLocaleString('en-IN')} CE</span>
          <span className="oi-sub">{data?.callOiContracts || "14.2M Contracts"}</span>
        </div>
        <div className="oi-item">
          <span className="oi-label">Top Put OI Support</span>
          <span className="oi-val">{putStrike.toLocaleString('en-IN')} PE</span>
          <span className="oi-sub">{data?.putOiContracts || "18.5M Contracts"}</span>
        </div>
      </div>
    </div>
  );
}

function MarketMoversAndActivity({ gainers, losers, allStocks }: { gainers: any[]; losers: any[]; allStocks: any[] }) {
  const sampleStocks = allStocks.length ? allStocks : [
    { stock: 'HINDALCO', name: 'Hindalco Industries', price: 1059.6, 'change%': 6.5, volume: 9280000, deliveryPct: 50.14 },
    { stock: 'POWERGRID', name: 'Power Grid Corp', price: 271.6, 'change%': -5.4, volume: 4400000, deliveryPct: 49.44 },
    { stock: 'SBIN', name: 'State Bank of India', price: 1097.2, 'change%': 5.0, volume: 29400000, deliveryPct: 42.25 },
    { stock: 'HEROMOTOCO', name: 'Hero MotoCorp', price: 5725.0, 'change%': 4.8, volume: 850000, deliveryPct: 41.35 },
    { stock: 'BAJFINANCE', name: 'Bajaj Finance', price: 1078.0, 'change%': -6.5, volume: 15600000, deliveryPct: 38.70 },
  ];

  const topVolume = [...sampleStocks].sort((a, b) => (b.volume || 0) - (a.volume || 0)).slice(0, 5);
  const topDelivery = [...sampleStocks].sort((a, b) => (b.deliveryPct || 0) - (a.deliveryPct || 0)).slice(0, 5);

  const StockRow = ({ symbol, name, valueText, changePct, isUp }: { symbol: string; name?: string; valueText: string; changePct?: number; isUp?: boolean }) => {
    const isPositive = isUp ?? (changePct != null && changePct >= 0);
    return (
      <div className="mover-row-item">
        <div className="mri-info">
          <span className="mri-ticker">{symbol}</span>
          {name && <span className="mri-name">{name}</span>}
        </div>
        <div className="mri-meta">
          <span className="mri-val">{valueText}</span>
          {changePct != null && (
            <span className={`mri-chg ${isPositive ? 'up' : 'down'}`}>
              {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
            </span>
          )}
        </div>
      </div>
    );
  };

  const activeGainers = gainers.length ? gainers : sampleStocks.slice(0, 5);
  const activeLosers = losers.length ? losers : sampleStocks.slice(4, 9);

  return (
    <div className="market-activity-grid">
      {/* Top Gainers */}
      <div className="activity-card gainers-card">
        <div className="ac-header">
          <h4>Top Gainers</h4>
          <span className="ac-badge bull">Nifty 50</span>
        </div>
        <div className="ac-list">
          {activeGainers.slice(0, 5).map((g, i) => (
            <StockRow
              key={i}
              symbol={g.stock || g.name}
              name={g.name}
              valueText={`₹${Number(g.price || 0).toLocaleString('en-IN')}`}
              changePct={g['change%'] ?? g.change}
              isUp={true}
            />
          ))}
        </div>
      </div>

      {/* Top Losers */}
      <div className="activity-card losers-card">
        <div className="ac-header">
          <h4>Top Losers</h4>
          <span className="ac-badge bear">Nifty 50</span>
        </div>
        <div className="ac-list">
          {activeLosers.slice(0, 5).map((l, i) => (
            <StockRow
              key={i}
              symbol={l.stock || l.name}
              name={l.name}
              valueText={`₹${Number(l.price || 0).toLocaleString('en-IN')}`}
              changePct={l['change%'] ?? l.change}
              isUp={false}
            />
          ))}
        </div>
      </div>

      {/* Top Volume */}
      <div className="activity-card volume-card">
        <div className="ac-header">
          <h4>Top Volume (Traded Shares)</h4>
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
          <h4>Top Delivery %</h4>
        </div>
        <div className="ac-list">
          {topDelivery.map((d, i) => {
            const delPct = d.deliveryPct || 40.0;
            return (
              <StockRow
                key={i}
                symbol={d.stock || d.name}
                name={d.name}
                valueText={`${delPct.toFixed(2)}%`}
                changePct={d['change%']}
                isUp={d['change%'] >= 0}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SectorHeatmap({ sectors }: { sectors: any[] }) {
  const fallbackSectors = [
    { name: 'AUTO', 'performance%': 1.84 },
    { name: 'IT', 'performance%': 1.42 },
    { name: 'INFRA', 'performance%': 0.54 },
    { name: 'METAL', 'performance%': 0.50 },
    { name: 'ENERGY', 'performance%': 0.17 },
    { name: 'FMCG', 'performance%': 0.13 },
    { name: 'MEDIA', 'performance%': 0.00 },
    { name: 'PHARMA', 'performance%': -0.09 },
    { name: 'REALTY', 'performance%': -0.10 },
    { name: 'BANK', 'performance%': -0.55 },
  ];

  const activeSectors = sectors.length ? sectors : fallbackSectors;
  const sorted = [...activeSectors].sort((a,b) => (b['performance%']??0) - (a['performance%']??0));
  const max = Math.max(...sorted.map(s => Math.abs(s['performance%']??0)), 1);

  return (
    <div className="sector-heatmap-wrap">
      <div className="widget-header">
        <h4>Sector Performance &amp; Rotation</h4>
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
    dow: { label: 'DOW JONES', val: '54,036.93 (+2.96%)' },
    nasdaq: { label: 'NASDAQ 100', val: '26,690.62 (+5.19%)' },
    sgxNifty: { label: 'GIFT NIFTY', val: '24,586 (+0.55%)' },
    crude: { label: 'CRUDE OIL', val: '$78.18 (+3.18%)' },
    gold: { label: 'GOLD (₹/10G)', val: '₹1,18,821 (+7.43%)' },
  };

  const validEntries = Object.entries(cues).filter(([_, v]) => typeof v === 'string');

  const cueEntries = validEntries.length > 0
    ? validEntries.map(([k, v]) => ({
        key: k,
        label: defaults[k]?.label || k.toUpperCase(),
        val: String(v).replace(/^GIFT Nifty\s*/i, ''),
      }))
    : Object.entries(defaults).map(([k, d]) => ({ key: k, label: d.label, val: d.val }));

  return (
    <div className="global-cues-strip">
      <div className="widget-header">
        <h4>Global Cues &amp; Macro Factors</h4>
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
  const { aiContext, updateContext, setNiftyBadge } = useApp();

  const [snap, setSnap]         = useState<{ index: any; gainers: any[]; losers: any[]; sectors: any[]; globalCues: Record<string, any>; allStocks: any[]; fiiDii?: any; openInterest?: any }>({
    index: {}, gainers: [], losers: [], sectors: [], globalCues: {}, allStocks: []
  });
  const [snapLoading, setSnapLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    async function loadSnapshot() {
      setSnapLoading(true);
      try {
        const res = await fetch(`${API_BASE}/marketdata/snapshot`);
        const d   = await res.json();
        if (d.success && mounted) {
          const newSnap = {
            index:        d.index        || {},
            gainers:      d.gainers      || [],
            losers:       d.losers       || [],
            sectors:      d.sectors      || [],
            globalCues:   d.globalCues   || {},
            allStocks:    d.allStocks    || [],
            fiiDii:       d.fiiDii,
            openInterest: d.openInterest,
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

  // Key Market Indicators (Live Exchange Data)
  const niftyVal  = snap.index?.nifty50 ?? 24570.65;
  const niftyChg  = snap.index?.['change%'] ?? -0.82;
  const bankVal   = snap.index?.bankNifty ?? 57746.45;
  const bankChg   = snap.index?.bankNiftyChangePct ?? -0.86;
  const sensexVal = snap.index?.sensex ?? 78499.17;
  const sensexChg = snap.index?.sensexChangePct ?? -0.18;
  const vixVal    = snap.index?.indiaVix ?? 12.16;
  const vixChg    = snap.index?.vixChangePct != null
    ? `${snap.index.vixChangePct >= 0 ? '+' : ''}${Number(snap.index.vixChangePct).toFixed(2)}%`
    : '0.00%';

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
            {(() => {
              const goldObj = snap.globalCues?.gold;
              const goldVal = typeof goldObj === 'object' && goldObj?.priceStr ? goldObj.priceStr : (typeof goldObj === 'string' ? goldObj.split(' ')[0] : '₹1,18,821');
              const goldChg = typeof goldObj === 'object' && goldObj?.changeStr ? goldObj.changeStr : (typeof goldObj === 'string' ? (goldObj.split(' ')[1] || '').replace(/[()]/g, '') : '+7.43%');

              const crudeObj = snap.globalCues?.crude;
              const crudeVal = typeof crudeObj === 'object' && crudeObj?.priceStr ? crudeObj.priceStr : (typeof crudeObj === 'string' ? crudeObj.split(' ')[0] : '$78.18');
              const crudeChg = typeof crudeObj === 'object' && crudeObj?.changeStr ? crudeObj.changeStr : (typeof crudeObj === 'string' ? (crudeObj.split(' ')[1] || '').replace(/[()]/g, '') : '+3.18%');

              const formatChg = (val: number | string) => {
                if (typeof val === 'number') return `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`;
                return String(val);
              };

              return (
                <div className="metrics-hero-grid">
                  <MetricCard label="NIFTY 50" value={niftyVal} change={formatChg(niftyChg)} badge="Benchmark" />
                  <MetricCard label="BANK NIFTY" value={bankVal} change={formatChg(bankChg)} badge="Banking" />
                  <MetricCard label="SENSEX" value={sensexVal} change={formatChg(sensexChg)} badge="BSE 30" />
                  <MetricCard label="India VIX" value={vixVal} change={vixChg} sublabel="Volatility Index" badge="Volatile" />
                  <MetricCard label="Gold (₹/10g)" value={goldVal} change={goldChg} sublabel="Commodity" />
                  <MetricCard label="Crude Oil (Brent)" value={crudeVal} change={crudeChg} sublabel="Energy" />
                </div>
              );
            })()}

            {/* ── FII/DII & Open Interest 2-Column Section ── */}
            <div className="dashboard-two-col">
              <FiiDiiCard data={snap.fiiDii} />
              <OpenInterestCard data={snap.openInterest} niftyVal={niftyVal} />
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
