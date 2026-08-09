import { useState, useRef, useEffect, RefObject } from 'react';
import { useApp } from '../../context/AppContext';
import { API_BASE, buildSSEReader } from '../../utils/api';
import { formatStockReport } from '../../utils/format';
import { StockChart } from './StockChart';
import { StockFundamentals } from './StockFundamentals';
import { Sparkles, Search } from 'lucide-react';

interface StockItem {
  ticker: string;
  name: string;
  sector: string;
  prevClose?: number;
  price?: number;
}

interface DerivedStockData {
  trend?: string;
  rsiZone?: string;
  macdDirection?: string;
  volumeConviction?: string;
  volumeRatio?: number;
}

const PRICE_MAP: Record<string, number> = {
  RELIANCE: 2840,
  TCS: 4120,
  INFY: 1780,
  HDFCBANK: 1640,
  ICICIBANK: 1150,
  SBIN: 820,
  BHARTIARTL: 1420,
  KOTAKBANK: 1780,
  LT: 3650,
  AXISBANK: 1180,
  ASIANPAINT: 2950,
  MARUTI: 12400,
  SUNPHARMA: 1720,
  TITAN: 3450,
  WIPRO: 495,
  ULTRACEMCO: 9850,
  BAJFINANCE: 7150,
  NESTLEIND: 2480,
  POWERGRID: 320,
  NTPC: 390,
  ONGC: 310,
  "M&M": 2920,
  HCLTECH: 1540,
  JSWSTEEL: 930,
  TATASTEEL: 165,
  ADANIENT: 3180,
  ADANIPORTS: 1350,
  COALINDIA: 490,
  TATAMOTORS: 980,
  TECHM: 1420,
  TRENT: 6450,
  APOLLOHOSP: 6750,
  SHRIRAMFIN: 2850,
  GRASIM: 2680,
  EICHERMOT: 4850,
  CIPLA: 1520,
  DIVISLAB: 4920,
  DRREDDY: 6850,
  BPCL: 340,
  HEROMOTOCO: 5350,
  HINDALCO: 680,
  INDUSINDBK: 1410,
  IOC: 175,
  TATACONSUM: 1180,
  BEL: 310,
};

function getStockPrice(ticker: string): number {
  if (PRICE_MAP[ticker.toUpperCase()]) return PRICE_MAP[ticker.toUpperCase()];
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) hash = (hash << 5) - hash + ticker.charCodeAt(i);
  return Math.abs(hash % 3500) + 450;
}

function getStockChangePct(ticker: string): number {
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) hash = (hash << 5) - hash + ticker.charCodeAt(i);
  const val = ((hash % 45) / 10);
  return parseFloat(val.toFixed(2));
}

export default function StocksTab() {
  const { aiContext, showToast } = useApp();
  const [stocks, setStocks]         = useState<StockItem[]>([]);
  const [search, setSearch]         = useState<string>('');
  const [selected, setSelected]     = useState<StockItem | null>(null);
  const [analyzing, setAnalyzing]   = useState<boolean>(false);
  const [derived, setDerived]       = useState<DerivedStockData | null>(null);
  const [reportHtml, setReportHtml] = useState<string>('');
  const [reportTime, setReportTime] = useState<string>('');
  const [liveQuote, setLiveQuote]   = useState<{ price: number; changePct: number } | null>(null);
  const reportTextRef = useRef<string>('');

  // Input refs for technical data
  const refs: Record<string, RefObject<HTMLInputElement | null>> = {
    rsi: useRef<HTMLInputElement>(null), macd: useRef<HTMLInputElement>(null), signal: useRef<HTMLInputElement>(null),
    ma20: useRef<HTMLInputElement>(null), ma50: useRef<HTMLInputElement>(null), volume: useRef<HTMLInputElement>(null),
    avgvol: useRef<HTMLInputElement>(null), prevclose: useRef<HTMLInputElement>(null),
    qty: useRef<HTMLInputElement>(null), avgbuy: useRef<HTMLInputElement>(null),
  };
  const [holdingEnabled, setHoldingEnabled] = useState<boolean>(false);

  useEffect(() => {
    fetch(`${API_BASE}/stock/nifty50`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.stocks?.length) {
          const mapped = d.stocks.map((s: StockItem) => ({
            ...s,
            price: getStockPrice(s.ticker),
          }));
          setStocks(mapped);
          if (!selected) setSelected(mapped[0]);
        }
      })
      .catch(() => {
        const fallback = [
          { ticker: 'RELIANCE', name: 'Reliance Industries', sector: 'Energy', price: 2840 },
          { ticker: 'TCS', name: 'Tata Consultancy', sector: 'IT', price: 4120 },
          { ticker: 'INFY', name: 'Infosys Ltd', sector: 'IT', price: 1780 },
          { ticker: 'HDFCBANK', name: 'HDFC Bank', sector: 'Banking', price: 1640 },
          { ticker: 'ICICIBANK', name: 'ICICI Bank', sector: 'Banking', price: 1150 },
        ];
        setStocks(fallback);
        if (!selected) setSelected(fallback[0]);
      });
  }, []);

  const currentStock = selected || stocks[0] || { ticker: 'RELIANCE', name: 'Reliance Industries', sector: 'Energy', price: 2840 };

  useEffect(() => {
    if (!currentStock?.ticker) return;
    fetch(`${API_BASE}/marketdata/quote/${currentStock.ticker}`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.quote?.price) {
          setLiveQuote({
            price: d.quote.price,
            changePct: d.quote['change%'] ?? getStockChangePct(currentStock.ticker),
          });
        } else {
          setLiveQuote(null);
        }
      })
      .catch(() => setLiveQuote(null));
  }, [currentStock?.ticker]);

  const filtered = stocks.filter(s =>
    s.ticker.toLowerCase().includes(search.toLowerCase()) ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.sector.toLowerCase().includes(search.toLowerCase())
  );

  function selectStock(s: StockItem) {
    setSelected(s);
    setDerived(null);
    setReportHtml('');
    reportTextRef.current = '';
    // Pre-fill from context
    const holding = (aiContext.portfolio || []).find(p => (p.stock || p.ticker || p.symbol || '').toUpperCase() === s.ticker);
    setHoldingEnabled(!!holding);
    if (holding) {
      if (refs.avgbuy.current) refs.avgbuy.current.value = String(holding.avgPrice || holding.avgBuyPrice || '');
      if (refs.qty.current)    refs.qty.current.value    = String(holding.qty || holding.shares || '');
    }
  }

  async function runAnalysis() {
    if (!selected || analyzing) return;
    setAnalyzing(true);
    setReportHtml('');
    setReportTime(new Date().toLocaleTimeString('en-IN'));
    reportTextRef.current = '';

    const num = (id: string): number | undefined => {
      const el = refs[id]?.current;
      if (!el) return undefined;
      const v = parseFloat(el.value);
      return isNaN(v) ? undefined : v;
    };

    const techPayload: Record<string, number | undefined> = {
      RSI: num('rsi'), MACD: num('macd'), signal: num('signal'),
      MA20: num('ma20'), MA50: num('ma50'), volume: num('volume'), avgVolume: num('avgvol'),
    };
    Object.keys(techPayload).forEach(k => techPayload[k] === undefined && delete techPayload[k]);

    const prevClose = num('prevclose');
    const qtyVal = num('qty');
    const buyVal = num('avgbuy');
    const holding   = holdingEnabled && qtyVal !== undefined && buyVal !== undefined
      ? { qty: qtyVal, avgBuyPrice: buyVal } : null;

    try {
      const res = await fetch(`${API_BASE}/stock/analyze/stream`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          stock:       { ticker: selected.ticker, name: selected.name, prevClose },
          technical:   techPayload,
          news:        (aiContext.news || []).slice(0,5).map(n => ({ headline: n.title||'', sentiment: n.sentiment||'NEUTRAL' })),
          userHolding: holding,
        }),
      });

      const read = buildSSEReader<any>(res);
      for await (const msg of read()) {
        if (msg.type === 'derived') setDerived(msg.derived);
        if (msg.type === 'token')   { reportTextRef.current += msg.token; setReportHtml(reportTextRef.current); }
        if (msg.type === 'done')    { setReportHtml(formatStockReport(reportTextRef.current)); showToast('✓ AI report ready', 'success'); }
        if (msg.type === 'error')   { setReportHtml(`<span style="color:var(--accent-danger)">Error: ${msg.error}</span>`); }
      }
    } catch (err: any) {
      setReportHtml(`<span style="color:var(--accent-danger)">Network error: ${err.message || 'Error occurred'}</span>`);
    } finally {
      setAnalyzing(false);
    }
  }

  const pillMap = derived ? [
    { id: 'trend',  label: 'Trend',    val: derived.trend||'—',          cls: derived.trend==='UPTREND'?'bull':derived.trend==='DOWNTREND'?'bear':'warn' },
    { id: 'rsi',    label: 'RSI Zone', val: derived.rsiZone||'—',        cls: derived.rsiZone==='OVERSOLD'?'bull':derived.rsiZone==='OVERBOUGHT'?'bear':'warn' },
    { id: 'macd',   label: 'MACD',     val: derived.macdDirection||'—',  cls: derived.macdDirection==='BULLISH'?'bull':derived.macdDirection==='BEARISH'?'bear':'warn' },
    { id: 'vol',    label: 'Volume',   val: derived.volumeConviction ? `${derived.volumeConviction}${derived.volumeRatio?` (${derived.volumeRatio}x)`:''}` : '—',
      cls: derived.volumeConviction==='HIGH'?'bull':derived.volumeConviction==='LOW'?'bear':'warn' },
  ] : [];

  const displayPrice = liveQuote?.price || currentStock.price || getStockPrice(currentStock.ticker);
  const displayChangePct = liveQuote?.changePct ?? getStockChangePct(currentStock.ticker);
  const isUp = displayChangePct >= 0;

  return (
    <section className="tab-section active" style={{ flexDirection: 'row' }}>
      <div className="stocks-layout">

        {/* Sidebar */}
        <aside className="stocks-sidebar">
          <div className="stock-search-wrap">
            <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input className="stock-search-input" placeholder="Search ticker or name..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="stock-list-header">
            <span>NIFTY 50</span><span>{filtered.length} stocks</span>
          </div>
          <div className="stock-list">
            {filtered.map(s => (
              <div key={s.ticker} className={`stock-list-item ${currentStock.ticker === s.ticker ? 'active' : ''}`} onClick={() => selectStock(s)}>
                <div className="sli-left">
                  <span className="sli-ticker">{s.ticker}</span>
                  <span className="sli-name">{s.name}</span>
                </div>
                <span className="sli-sector">{s.sector}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Analysis Panel */}
        <div className="stock-analysis-panel" style={{ overflowY: 'auto' }}>
          <div className="stock-active" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Header Bar */}
            <div className="stock-header-bar">
              <div className="stock-title-group">
                <span className="stock-ticker-large">{currentStock.ticker}</span>
                <span className="stock-name-large">{currentStock.name}</span>
                <span className="widget-tag bull">{currentStock.sector}</span>
              </div>
              <div className="stock-price-box">
                <span className="sp-price">₹{displayPrice.toLocaleString('en-IN')}</span>
                <span className={`sp-chg ${isUp ? 'up' : 'down'}`}>
                  {isUp ? '+' : ''}{displayChangePct.toFixed(2)}% Today
                </span>
              </div>
            </div>

            {/* Derived Signal Pills */}
            {derived && (
              <div className="signal-pills" style={{ display: 'flex' }}>
                {pillMap.map(p => (
                  <div key={p.id} className={`signal-pill ${p.cls}`}>
                    <span className="pill-label">{p.label}</span>
                    <span className="pill-value">{p.val}</span>
                  </div>
                ))}
              </div>
            )}

            {/* ── Technical Candlestick Chart ── */}
            <StockChart
              ticker={currentStock.ticker}
              stockName={currentStock.name}
              price={displayPrice}
            />

            {/* ── AI Report Generation Action Bar ── */}
            <div className="market-widget tech-inputs-card">
              <div className="widget-header">
                <h4 className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-indigo-400" /> AI Technical &amp; Fundamental Report Engine</h4>
                <span className="widget-tag bull">Layer 3 Generator</span>
              </div>

              {/* Holding toggle */}
              <div className="holding-row">
                <label className="holding-toggle">
                  <input type="checkbox" checked={holdingEnabled} onChange={e => setHoldingEnabled(e.target.checked)} />
                  <span>Include My Portfolio Holding Metrics in Analysis</span>
                </label>
                {holdingEnabled && (
                  <div className="holding-inputs" style={{ display: 'flex' }}>
                    <div className="stock-input-group"><label>Qty</label><input ref={refs.qty} type="number" placeholder="e.g. 10" className="stock-input" /></div>
                    <div className="stock-input-group"><label>Avg Buy Price (₹)</label><input ref={refs.avgbuy} type="number" placeholder="e.g. 2700" className="stock-input" /></div>
                  </div>
                )}
              </div>

              <button className="analyze-stock-btn" onClick={runAnalysis} disabled={analyzing}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                {analyzing ? 'Analyzing Stock Data...' : 'Generate Comprehensive AI Report'}
              </button>
            </div>

            {/* ── Fundamental Analysis, Financial Ratios, Quarterly Results, Peer Comparison ── */}
            <StockFundamentals
              ticker={currentStock.ticker}
              stockName={currentStock.name}
              sector={currentStock.sector}
              price={displayPrice}
              reportHtml={reportHtml}
              reportTime={reportTime}
            />

          </div>
        </div>
      </div>
    </section>
  );
}
