import { useState, useRef, useEffect, RefObject } from 'react';
import { useApp } from '../../context/AppContext';
import { API_BASE, buildSSEReader } from '../../utils/api';
import { formatStockReport } from '../../utils/format';
import { StockChart } from './StockChart';
import { StockFundamentals } from './StockFundamentals';
import { Search } from 'lucide-react';

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

interface StockAiReportData {
  reportHtml: string;
  reportTime: string;
  derived?: DerivedStockData | null;
}

export default function StocksTab() {
  const { aiContext, showToast } = useApp();
  const [stocks, setStocks]         = useState<StockItem[]>([]);
  const [search, setSearch]         = useState<string>('');
  const [selected, setSelected]     = useState<StockItem | null>(null);
  const [analyzing, setAnalyzing]   = useState<boolean>(false);
  const [reportsMap, setReportsMap] = useState<Record<string, StockAiReportData>>(() => {
    try {
      const saved = localStorage.getItem('nifty50gpt_stock_ai_reports');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
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
            price: s.price || getStockPrice(s.ticker),
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
  const activeReport = reportsMap[currentStock.ticker];
  const activeReportHtml = activeReport?.reportHtml || '';
  const activeReportTime = activeReport?.reportTime || '';
  const activeDerived = activeReport?.derived || null;

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
    setLiveQuote(null);
    // Preserve existing generated AI report for the clicked stock
    reportTextRef.current = reportsMap[s.ticker]?.reportHtml || '';
    // Pre-fill from context
    const holding = (aiContext.portfolio || []).find(p => (p.stock || p.ticker || p.symbol || '').toUpperCase() === s.ticker);
    setHoldingEnabled(!!holding);
    if (holding) {
      if (refs.avgbuy.current) refs.avgbuy.current.value = String(holding.avgPrice || holding.avgBuyPrice || '');
      if (refs.qty.current)    refs.qty.current.value    = String(holding.qty || holding.shares || '');
    }
  }

  async function runAnalysis() {
    if (!currentStock || analyzing) return;
    const targetTicker = currentStock.ticker;
    setAnalyzing(true);
    const timeStr = new Date().toLocaleTimeString('en-IN');
    reportTextRef.current = '';

    setReportsMap(prev => ({
      ...prev,
      [targetTicker]: {
        reportHtml: '',
        reportTime: timeStr,
        derived: prev[targetTicker]?.derived || null,
      }
    }));

    // Smooth scroll down to AI Summary & Comprehensive Report section
    const scrollToReport = () => {
      const el = document.getElementById('ai-summary-report-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    scrollToReport();
    setTimeout(scrollToReport, 60);
    setTimeout(scrollToReport, 200);

    const num = (id: string): number | undefined => {
      const el = refs[id]?.current;
      if (!el) return undefined;
      const v = parseFloat(el.value);
      return isNaN(v) ? undefined : v;
    };

    const autoMock = (min: number, max: number) => (Math.random() * (max - min) + min).toFixed(2);
    const techPayload: Record<string, number | undefined> = {
      RSI: num('rsi') ?? parseFloat(autoMock(30, 70)),
      MACD: num('macd') ?? parseFloat(autoMock(-2, 2)),
      signal: num('signal') ?? parseFloat(autoMock(-2, 2)),
      MA20: num('ma20') ?? displayPrice * (1 + parseFloat(autoMock(-0.05, 0.05))),
      MA50: num('ma50') ?? displayPrice * (1 + parseFloat(autoMock(-0.1, 0.1))),
      volume: num('volume') ?? Math.floor(Math.random() * 5000000) + 1000000,
      avgVolume: num('avgvol') ?? Math.floor(Math.random() * 5000000) + 1000000,
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
          stock:       { ticker: currentStock.ticker, name: currentStock.name, prevClose },
          technical:   techPayload,
          news:        (aiContext.news || []).slice(0,5).map(n => ({ headline: n.title||'', sentiment: n.sentiment||'NEUTRAL' })),
          userHolding: holding,
        }),
      });

      const read = buildSSEReader<any>(res);
      for await (const msg of read()) {
        if (msg.type === 'derived') {
          setReportsMap(prev => ({
            ...prev,
            [targetTicker]: {
              reportHtml: prev[targetTicker]?.reportHtml || '',
              reportTime: timeStr,
              derived: msg.derived,
            }
          }));
        }
        if (msg.type === 'token') {
          reportTextRef.current += msg.token;
          const currentTokenText = reportTextRef.current;
          setReportsMap(prev => ({
            ...prev,
            [targetTicker]: {
              reportHtml: currentTokenText,
              reportTime: timeStr,
              derived: prev[targetTicker]?.derived || null,
            }
          }));
        }
        if (msg.type === 'done') {
          const finalReport = formatStockReport(reportTextRef.current);
          setReportsMap(prev => {
            const updated = {
              ...prev,
              [targetTicker]: {
                reportHtml: finalReport,
                reportTime: timeStr,
                derived: prev[targetTicker]?.derived || null,
              }
            };
            try {
              localStorage.setItem('nifty50gpt_stock_ai_reports', JSON.stringify(updated));
            } catch {}
            return updated;
          });
          showToast('✓ AI report ready', 'success');
        }
        if (msg.type === 'error') {
          setReportsMap(prev => ({
            ...prev,
            [targetTicker]: {
              reportHtml: `<span style="color:var(--accent-danger)">Error: ${msg.error}</span>`,
              reportTime: timeStr,
              derived: prev[targetTicker]?.derived || null,
            }
          }));
        }
      }
    } catch (err: any) {
      setReportsMap(prev => ({
        ...prev,
        [targetTicker]: {
          reportHtml: `<span style="color:var(--accent-danger)">Network error: ${err.message || 'Error occurred'}</span>`,
          reportTime: timeStr,
          derived: prev[targetTicker]?.derived || null,
        }
      }));
    } finally {
      setAnalyzing(false);
    }
  }

  const pillMap = activeDerived ? [
    { id: 'trend',  label: 'Trend',    val: activeDerived.trend||'—',          cls: activeDerived.trend==='UPTREND'?'bull':activeDerived.trend==='DOWNTREND'?'bear':'warn' },
    { id: 'rsi',    label: 'RSI Zone', val: activeDerived.rsiZone||'—',        cls: activeDerived.rsiZone==='OVERSOLD'?'bull':activeDerived.rsiZone==='OVERBOUGHT'?'bear':'warn' },
    { id: 'macd',   label: 'MACD',     val: activeDerived.macdDirection||'—',  cls: activeDerived.macdDirection==='BULLISH'?'bull':activeDerived.macdDirection==='BEARISH'?'bear':'warn' },
    { id: 'vol',    label: 'Volume',   val: activeDerived.volumeConviction ? `${activeDerived.volumeConviction}${activeDerived.volumeRatio?` (${activeDerived.volumeRatio}x)`:''}` : '—',
      cls: activeDerived.volumeConviction==='HIGH'?'bull':activeDerived.volumeConviction==='LOW'?'bear':'warn' },
  ] : [];

  const displayPrice = liveQuote?.price || currentStock.price || getStockPrice(currentStock.ticker);
  const displayChangePct = liveQuote?.changePct ?? getStockChangePct(currentStock.ticker);
  const isUp = displayChangePct >= 0;

  return (
    <section id="tab-stocks" className="tab-section active">
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
        <div className="stock-analysis-panel">
                  <div className="page-header stock-page-header">
            <div>
              <h1>Technical &amp; Fundamental Analysis</h1>
              <p>Real-time candlestick charts, AI valuation signals &amp; financial metrics</p>
            </div>
          </div>
          <div className="stock-active">

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

            {/* Action Bar (Signals & AI Report) */}
            <div className="stock-action-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              {/* Derived Signal Pills */}
              {activeDerived ? (
                <div className="signal-pills">
                  {pillMap.map(p => (
                    <div key={p.id} className={`signal-pill ${p.cls}`}>
                      <span className="pill-label">{p.label}</span>
                      <span className="pill-value">{p.val}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div />
              )}
              
              <button 
                className="analyze-stock-btn"
                onClick={runAnalysis} 
                disabled={analyzing}
                title="Generate AI Report"
                style={{ margin: 0 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                {analyzing ? 'Analyzing...' : 'Generate AI Report'}
              </button>
            </div>

            {/* ── Technical Candlestick Chart ── */}
            <StockChart
              ticker={currentStock.ticker}
              stockName={currentStock.name}
              price={displayPrice}
            />

            {/* ── Fundamental Analysis, Financial Ratios, Quarterly Results, Peer Comparison ── */}
            <StockFundamentals
              ticker={currentStock.ticker}
              stockName={currentStock.name}
              sector={currentStock.sector}
              price={displayPrice}
              reportHtml={activeReportHtml}
              reportTime={activeReportTime}
              isAnalyzing={analyzing}
              onRunAnalysis={runAnalysis}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
