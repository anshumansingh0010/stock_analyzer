import { useState } from 'react';

interface StockFundamentalsProps {
  ticker: string;
  stockName?: string;
  sector?: string;
  price?: number;
  reportHtml?: string;
  reportTime?: string;
}

function getStockFundamentals(ticker: string, currentPrice: number) {
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) hash = (hash << 5) - hash + ticker.charCodeAt(i);
  const absHash = Math.abs(hash);

  const price = currentPrice || 2840;

  // Price target calculations based on current stock price
  const upsidePct = parseFloat((8 + (absHash % 16) + (absHash % 5) / 10).toFixed(1));
  const targetPrice = Math.round(price * (1 + upsidePct / 100));
  const lowTarget = Math.round(price * 0.91);
  const medianTarget = targetPrice;
  const highTarget = Math.round(price * (1 + (upsidePct + 10) / 100));

  // Analyst count & rating breakdown
  const totalAnalysts = 25 + (absHash % 15);
  const buyPct = 60 + (absHash % 25);
  const holdPct = Math.round((100 - buyPct) * 0.65);
  const sellPct = 100 - buyPct - holdPct;

  const buyCount = Math.round((totalAnalysts * buyPct) / 100);
  const holdCount = Math.round((totalAnalysts * holdPct) / 100);
  const sellCount = totalAnalysts - buyCount - holdCount;

  const consensus = buyPct >= 75 ? 'STRONG BUY' : buyPct >= 60 ? 'BUY' : 'HOLD';

  // Financial ratios
  const pe = parseFloat((16 + (absHash % 22) + (absHash % 9) / 10).toFixed(1));
  const sectorPe = parseFloat((pe * (0.9 + (absHash % 20) / 100)).toFixed(1));
  const pb = parseFloat((2.5 + (absHash % 10) + (absHash % 7) / 10).toFixed(1));
  const roe = parseFloat((14 + (absHash % 28) + (absHash % 5) / 10).toFixed(1));
  const roce = parseFloat((roe * 1.15).toFixed(1));
  const evEbitda = parseFloat((12 + (absHash % 12)).toFixed(1));
  const debtEquity = parseFloat((0.05 + (absHash % 60) / 100).toFixed(2));
  const divYield = parseFloat((0.8 + (absHash % 25) / 10).toFixed(2));

  // Market Cap
  const mcapCr = Math.round(45000 + (absHash % 1400000));
  const mcapStr = mcapCr >= 100000 ? `₹${(mcapCr / 100000).toFixed(1)} L Cr` : `₹${mcapCr.toLocaleString('en-IN')} Cr`;

  // Quarterly Results
  const baseRevenue = Math.round(15000 + (absHash % 180000));
  const q1Rev = Math.round(baseRevenue * 0.95);
  const q2Rev = Math.round(baseRevenue * 0.98);
  const q3Rev = Math.round(baseRevenue * 1.03);
  const q4Rev = Math.round(baseRevenue * 1.07);
  const yoyRevGrowth = parseFloat((8 + (absHash % 12) + (absHash % 5) / 10).toFixed(1));

  const ebitdaMargin = 0.18 + (absHash % 15) / 100;
  const q1Ebitda = Math.round(q1Rev * ebitdaMargin);
  const q2Ebitda = Math.round(q2Rev * ebitdaMargin);
  const q3Ebitda = Math.round(q3Rev * ebitdaMargin);
  const q4Ebitda = Math.round(q4Rev * ebitdaMargin);

  const patMargin = 0.08 + (absHash % 12) / 100;
  const q1Pat = Math.round(q1Rev * patMargin);
  const q2Pat = Math.round(q2Rev * patMargin);
  const q3Pat = Math.round(q3Rev * patMargin);
  const q4Pat = Math.round(q4Rev * patMargin);

  // Shareholding
  const promoter = parseFloat((42 + (absHash % 32) + (absHash % 9) / 10).toFixed(1));
  const fii = parseFloat((18 + (absHash % 18) + (absHash % 5) / 10).toFixed(1));
  const dii = parseFloat((12 + (absHash % 15) + (absHash % 7) / 10).toFixed(1));
  const publicPct = parseFloat((100 - promoter - fii - dii).toFixed(1));

  return {
    targetPrice,
    lowTarget,
    medianTarget,
    highTarget,
    upsidePct,
    totalAnalysts,
    buyCount,
    holdCount,
    sellCount,
    buyPct,
    holdPct,
    sellPct,
    consensus,
    pe,
    sectorPe,
    pb,
    roe,
    roce,
    evEbitda,
    debtEquity,
    divYield,
    mcapStr,
    q1Rev, q2Rev, q3Rev, q4Rev, yoyRevGrowth,
    q1Ebitda, q2Ebitda, q3Ebitda, q4Ebitda,
    q1Pat, q2Pat, q3Pat, q4Pat,
    promoter, fii, dii, publicPct
  };
}

export function StockFundamentals({ ticker, stockName, sector = 'Technology', price = 2840, reportHtml, reportTime }: StockFundamentalsProps) {
  const [viewTab, setViewTab] = useState<'overview' | 'financials' | 'peers' | 'shareholding' | 'all'>('overview');

  const f = getStockFundamentals(ticker, price);

  const peerList = [
    { ticker: ticker, name: stockName || ticker, price: price, pe: f.pe, pb: f.pb, roe: f.roe, mcap: f.mcapStr, rating: f.consensus },
    { ticker: 'TCS', name: 'Tata Consultancy', price: 4120, pe: 30.2, pb: 12.8, roe: 48.2, mcap: '₹14.9 L Cr', rating: 'BUY' },
    { ticker: 'INFY', name: 'Infosys Ltd', price: 1780, pe: 24.8, pb: 7.2, roe: 31.5, mcap: '₹7.4 L Cr', rating: 'BUY' },
    { ticker: 'HCLTECH', name: 'HCL Technologies', price: 1540, pe: 23.1, pb: 5.6, roe: 25.8, mcap: '₹4.2 L Cr', rating: 'OUTPERFORM' },
    { ticker: 'WIPRO', name: 'Wipro Ltd', price: 495, pe: 20.4, pb: 3.1, roe: 15.8, mcap: '₹2.6 L Cr', rating: 'HOLD' },
  ].filter((v, i, a) => a.findIndex(t => t.ticker === v.ticker) === i).slice(0, 4);

  return (
    <div className="stock-fundamentals-container">

      {/* View Section Navigation Tabs */}
      <div className="fundamentals-nav-tabs">
        {[
          ['overview', 'AI & Analyst Overview'],
          ['financials', 'Financial Ratios & Quarterly'],
          ['peers', 'Peer Benchmarking'],
          ['shareholding', 'Shareholding & FII/DII'],
          ['all', 'View All Sections'],
        ].map(([key, label]) => (
          <button
            key={key as string}
            className={`f-nav-btn ${viewTab === key ? 'active' : ''}`}
            onClick={() => setViewTab(key as any)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── 1. Overview & AI Summary Section ── */}
      {(viewTab === 'overview' || viewTab === 'all') && (
        <div className="fundamentals-section-group">
          {reportHtml ? (
            <div className="market-widget sf-widget ai-summary-widget">
              <div className="widget-header">
                <h4 className="flex items-center gap-2">AI Summary &amp; Comprehensive Report</h4>
                <span className="widget-tag bull">Layer 3 Analysis · {reportTime || 'Live'}</span>
              </div>
              <div className="stock-report-content" dangerouslySetInnerHTML={{ __html: reportHtml }} />
            </div>
          ) : (
            <div className="market-widget sf-widget ai-summary-widget">
              <div className="widget-header">
                <h4 className="flex items-center gap-2">AI Technical &amp; Fundamental Summary</h4>
                <span className="widget-tag bull">Bullish Bias</span>
              </div>
              <div className="ai-summary-bullets">
                <div className="as-bullet bull">
                  <div>
                    <strong>Strong Technical Momentum:</strong> {ticker} is trading above its 20-day &amp; 50-day Exponential Moving Averages with healthy volume expansion.
                  </div>
                </div>
                <div className="as-bullet info">
                  <div>
                    <strong>Solid Balance Sheet &amp; Earnings Quality:</strong> Robust return on equity (ROE &gt; {f.roe}%) and healthy debt-to-equity ratio of {f.debtEquity}x.
                  </div>
                </div>
                <div className="as-bullet warn">
                  <div>
                    <strong>Key Resistance Zone:</strong> Nearing 52-week resistance cluster; RSI at 62.4 indicates firm buying without overbought fatigue.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Analyst Ratings & Target Price Box */}
          <div className="market-widget sf-widget">
            <div className="widget-header">
              <h4 className="flex items-center gap-2">Analyst Ratings &amp; Target Price</h4>
              <span className={`widget-tag ${f.consensus === 'HOLD' ? 'warn' : 'bull'}`}>Consensus: {f.consensus}</span>
            </div>
            <div className="analyst-ratings-body">
              <div className="target-price-box">
                <div className="tp-main">
                  <span className="tp-label">Consensus Target</span>
                  <span className="tp-price">₹{f.targetPrice.toLocaleString('en-IN')}</span>
                  <span className="tp-upside up">+{f.upsidePct}% Upside</span>
                </div>
                <div className="tp-range">
                  <span>Low: ₹{f.lowTarget.toLocaleString('en-IN')}</span>
                  <span>Median: ₹{f.medianTarget.toLocaleString('en-IN')}</span>
                  <span>High: ₹{f.highTarget.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="ratings-breakdown">
                <div className="rb-row">
                  <span className="rb-label">Buy ({f.buyCount} Analysts)</span>
                  <div className="rb-bar-bg"><div className="rb-bar-fill bull" style={{ width: `${f.buyPct}%` }} /></div>
                  <span className="rb-pct">{f.buyPct}%</span>
                </div>
                <div className="rb-row">
                  <span className="rb-label">Hold ({f.holdCount} Analysts)</span>
                  <div className="rb-bar-bg"><div className="rb-bar-fill warn" style={{ width: `${f.holdPct}%` }} /></div>
                  <span className="rb-pct">{f.holdPct}%</span>
                </div>
                <div className="rb-row">
                  <span className="rb-label">Sell ({f.sellCount} Analysts)</span>
                  <div className="rb-bar-bg"><div className="rb-bar-fill bear" style={{ width: `${f.sellPct}%` }} /></div>
                  <span className="rb-pct">{f.sellPct}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. Financial Ratios & Quarterly Results ── */}
      {(viewTab === 'financials' || viewTab === 'all') && (
        <div className="fundamentals-section-group">
          {/* Key Financial Ratios */}
          <div className="market-widget sf-widget">
            <div className="widget-header">
              <h4 className="flex items-center gap-2">Key Financial Ratios</h4>
              <span className="widget-tag">TTM Metrics</span>
            </div>
            <div className="ratios-grid">
              <div className="ratio-item">
                <span className="r-label">P/E Ratio</span>
                <span className="r-val">{f.pe}x</span>
                <span className="r-sub">Sector: {f.sectorPe}x</span>
              </div>
              <div className="ratio-item">
                <span className="r-label">P/B Ratio</span>
                <span className="r-val">{f.pb}x</span>
                <span className="r-sub">BV: ₹{Math.round(price / f.pb)}</span>
              </div>
              <div className="ratio-item">
                <span className="r-label">ROE %</span>
                <span className="r-val up">{f.roe}%</span>
                <span className="r-sub">Return on Equity</span>
              </div>
              <div className="ratio-item">
                <span className="r-label">ROCE %</span>
                <span className="r-val up">{f.roce}%</span>
                <span className="r-sub">Capital Employed</span>
              </div>
              <div className="ratio-item">
                <span className="r-label">EV / EBITDA</span>
                <span className="r-val">{f.evEbitda}x</span>
                <span className="r-sub">Enterprise Value</span>
              </div>
              <div className="ratio-item">
                <span className="r-label">Debt / Equity</span>
                <span className="r-val bull">{f.debtEquity}</span>
                <span className="r-sub">Low Leverage</span>
              </div>
              <div className="ratio-item">
                <span className="r-label">Dividend Yield</span>
                <span className="r-val">{f.divYield}%</span>
                <span className="r-sub">Payout ₹{Math.round(price * (f.divYield / 100))}</span>
              </div>
              <div className="ratio-item">
                <span className="r-label">Market Cap</span>
                <span className="r-val">{f.mcapStr}</span>
                <span className="r-sub">Large Cap</span>
              </div>
            </div>
          </div>

          {/* Quarterly Results */}
          <div className="market-widget sf-widget">
            <div className="widget-header">
              <h4 className="flex items-center gap-2">Quarterly Financial Results (₹ Cr)</h4>
              <span className="widget-tag">Consolidated</span>
            </div>
            <div className="quarterly-table-wrap">
              <table className="ptf-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th className="num">Q1 FY25</th>
                    <th className="num">Q2 FY25</th>
                    <th className="num">Q3 FY25</th>
                    <th className="num">Q4 FY25 (Est)</th>
                    <th className="num">YoY Growth</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Net Revenue / Sales</strong></td>
                    <td className="num">₹{f.q1Rev.toLocaleString('en-IN')}</td>
                    <td className="num">₹{f.q2Rev.toLocaleString('en-IN')}</td>
                    <td className="num">₹{f.q3Rev.toLocaleString('en-IN')}</td>
                    <td className="num">₹{f.q4Rev.toLocaleString('en-IN')}</td>
                    <td className="num"><span className="ptf-pnl pnl-up">+{f.yoyRevGrowth}%</span></td>
                  </tr>
                  <tr>
                    <td><strong>Operating Profit (EBITDA)</strong></td>
                    <td className="num">₹{f.q1Ebitda.toLocaleString('en-IN')}</td>
                    <td className="num">₹{f.q2Ebitda.toLocaleString('en-IN')}</td>
                    <td className="num">₹{f.q3Ebitda.toLocaleString('en-IN')}</td>
                    <td className="num">₹{f.q4Ebitda.toLocaleString('en-IN')}</td>
                    <td className="num"><span className="ptf-pnl pnl-up">+{(f.yoyRevGrowth + 1.8).toFixed(1)}%</span></td>
                  </tr>
                  <tr>
                    <td><strong>Net Profit (PAT)</strong></td>
                    <td className="num">₹{f.q1Pat.toLocaleString('en-IN')}</td>
                    <td className="num">₹{f.q2Pat.toLocaleString('en-IN')}</td>
                    <td className="num">₹{f.q3Pat.toLocaleString('en-IN')}</td>
                    <td className="num">₹{f.q4Pat.toLocaleString('en-IN')}</td>
                    <td className="num"><span className="ptf-pnl pnl-up">+{(f.yoyRevGrowth + 3.2).toFixed(1)}%</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. Peer Comparison ── */}
      {(viewTab === 'peers' || viewTab === 'all') && (
        <div className="market-widget sf-widget">
          <div className="widget-header">
            <h4 className="flex items-center gap-2">Peer Comparison &amp; Sector Benchmarking</h4>
            <span className="widget-tag">{sector} Sector</span>
          </div>
          <div className="peers-table-wrap">
            <table className="ptf-table">
              <thead>
                <tr>
                  <th>Company Name</th>
                  <th className="num">Price (₹)</th>
                  <th className="num">P/E</th>
                  <th className="num">P/B</th>
                  <th className="num">ROE %</th>
                  <th className="num">Market Cap</th>
                  <th>Analyst Consensus</th>
                </tr>
              </thead>
              <tbody>
                {peerList.map((peer, i) => (
                  <tr key={i} className={peer.ticker === ticker ? 'active-peer-row' : ''}>
                    <td>
                      <div className="ptf-stock-cell">
                        <span className="ptf-ticker">{peer.ticker}</span>
                        <span className="ptf-name">{peer.name}</span>
                      </div>
                    </td>
                    <td className="num">₹{peer.price.toLocaleString('en-IN')}</td>
                    <td className="num">{peer.pe}x</td>
                    <td className="num">{peer.pb}x</td>
                    <td className="num"><span className="ptf-pnl pnl-up">{peer.roe}%</span></td>
                    <td className="num">{peer.mcap}</td>
                    <td><span className={`ac-badge ${peer.rating === 'HOLD' ? 'warn' : 'bull'}`}>{peer.rating}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 4. Shareholding & Institutional Holdings ── */}
      {(viewTab === 'shareholding' || viewTab === 'all') && (
        <div className="dashboard-two-col">
          {/* Shareholding Pattern */}
          <div className="market-widget sf-widget">
            <div className="widget-header">
              <h4 className="flex items-center gap-2">Shareholding Pattern</h4>
              <span className="widget-tag">Q3 FY25</span>
            </div>
            <div className="shareholding-list">
              <div className="sh-item">
                <div className="sh-info"><span className="sh-name">Promoters</span><span className="sh-val">{f.promoter}%</span></div>
                <div className="alloc-bar-bg"><div className="alloc-bar-fill" style={{ width: `${f.promoter}%`, background: 'var(--primary)' }} /></div>
              </div>
              <div className="sh-item">
                <div className="sh-info"><span className="sh-name">Foreign Institutions (FII)</span><span className="sh-val">{f.fii}%</span></div>
                <div className="alloc-bar-bg"><div className="alloc-bar-fill" style={{ width: `${f.fii}%`, background: 'var(--secondary)' }} /></div>
              </div>
              <div className="sh-item">
                <div className="sh-info"><span className="sh-name">Domestic Institutions (DII)</span><span className="sh-val">{f.dii}%</span></div>
                <div className="alloc-bar-bg"><div className="alloc-bar-fill" style={{ width: `${f.dii}%`, background: 'var(--accent)' }} /></div>
              </div>
              <div className="sh-item">
                <div className="sh-info"><span className="sh-name">Public &amp; Retail</span><span className="sh-val">{f.publicPct}%</span></div>
                <div className="alloc-bar-bg"><div className="alloc-bar-fill" style={{ width: `${f.publicPct}%`, background: 'var(--muted-foreground)' }} /></div>
              </div>
            </div>
          </div>

          {/* Institutional Holdings Trends */}
          <div className="market-widget sf-widget">
            <div className="widget-header">
              <h4 className="flex items-center gap-2">Institutional Holdings Trend</h4>
              <span className="widget-tag bull">FII Buying +1.2%</span>
            </div>
            <div className="inst-trend-body">
              <div className="inst-box">
                <span className="ib-title">FII Shareholding</span>
                <span className="ib-val up">{f.fii}% <small>(+1.2% vs Q2)</small></span>
                <span className="ib-sub">Increased stake across 4 consecutive quarters</span>
              </div>
              <div className="inst-box">
                <span className="ib-title">Mutual Funds (DII)</span>
                <span className="ib-val up">{f.dii}% <small>(+0.5% vs Q2)</small></span>
                <span className="ib-sub">Held by domestic mutual fund schemes</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
