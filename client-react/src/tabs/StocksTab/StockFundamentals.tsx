import { useState } from 'react';
import { Sparkles, BarChart3, Users, Landmark, FileText, Target, PieChart, TrendingUp, Briefcase } from 'lucide-react';

interface StockFundamentalsProps {
  ticker: string;
  stockName?: string;
  sector?: string;
  price?: number;
  reportHtml?: string;
  reportTime?: string;
}

export function StockFundamentals({ ticker, stockName, sector = 'Technology', reportHtml, reportTime }: StockFundamentalsProps) {
  const [viewTab, setViewTab] = useState<'overview' | 'financials' | 'peers' | 'shareholding' | 'all'>('overview');

  const peerList = [
    { ticker: 'TCS', name: 'Tata Consultancy', price: 4120, pe: 30.2, pb: 12.8, roe: 48.2, mcap: '₹14.9 L Cr', rating: 'BUY' },
    { ticker: 'INFY', name: 'Infosys Ltd', price: 1780, pe: 24.8, pb: 7.2, roe: 31.5, mcap: '₹7.4 L Cr', rating: 'BUY' },
    { ticker: 'HCLTECH', name: 'HCL Technologies', price: 1540, pe: 23.1, pb: 5.6, roe: 25.8, mcap: '₹4.2 L Cr', rating: 'OUTPERFORM' },
    { ticker: 'WIPRO', name: 'Wipro Ltd', price: 495, pe: 20.4, pb: 3.1, roe: 15.8, mcap: '₹2.6 L Cr', rating: 'HOLD' },
  ];

  return (
    <div className="stock-fundamentals-container">

      {/* View Section Navigation Tabs */}
      <div className="fundamentals-nav-tabs">
        {[
          ['overview', 'AI & Analyst Overview', <Sparkles className="w-4 h-4 text-indigo-400 inline mr-1.5" />],
          ['financials', 'Financial Ratios & Quarterly', <BarChart3 className="w-4 h-4 text-blue-400 inline mr-1.5" />],
          ['peers', 'Peer Benchmarking', <Users className="w-4 h-4 text-amber-400 inline mr-1.5" />],
          ['shareholding', 'Shareholding & FII/DII', <Landmark className="w-4 h-4 text-emerald-400 inline mr-1.5" />],
          ['all', 'View All Sections', <FileText className="w-4 h-4 text-slate-400 inline mr-1.5" />],
        ].map(([key, label, icon]) => (
          <button
            key={key as string}
            className={`f-nav-btn ${viewTab === key ? 'active' : ''}`}
            onClick={() => setViewTab(key as any)}
          >
            {icon}
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
                <h4 className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-indigo-400" /> AI Summary &amp; Comprehensive Report</h4>
                <span className="widget-tag bull">Layer 3 Analysis · {reportTime || 'Live'}</span>
              </div>
              <div className="stock-report-content" dangerouslySetInnerHTML={{ __html: reportHtml }} />
            </div>
          ) : (
            <div className="market-widget sf-widget ai-summary-widget">
              <div className="widget-header">
                <h4 className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-indigo-400" /> AI Technical &amp; Fundamental Summary</h4>
                <span className="widget-tag bull">Bullish Bias</span>
              </div>
              <div className="ai-summary-bullets">
                <div className="as-bullet bull">
                  <span className="as-icon">🟢</span>
                  <div>
                    <strong>Strong Technical Momentum:</strong> {ticker} is trading above its 20-day &amp; 50-day Exponential Moving Averages with healthy volume expansion.
                  </div>
                </div>
                <div className="as-bullet info">
                  <span className="as-icon">🛡️</span>
                  <div>
                    <strong>Solid Balance Sheet &amp; Earnings Quality:</strong> Robust return on equity (ROE &gt; 18%) and healthy debt-to-equity ratio of 0.38x.
                  </div>
                </div>
                <div className="as-bullet warn">
                  <span className="as-icon">⚠️</span>
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
              <h4 className="flex items-center gap-2"><Target className="w-5 h-5 text-indigo-400" /> Analyst Ratings &amp; Target Price</h4>
              <span className="widget-tag bull">Consensus: BUY</span>
            </div>
            <div className="analyst-ratings-body">
              <div className="target-price-box">
                <div className="tp-main">
                  <span className="tp-label">Consensus Target</span>
                  <span className="tp-price">₹3,250</span>
                  <span className="tp-upside up">+14.4% Upside</span>
                </div>
                <div className="tp-range">
                  <span>Low: ₹2,650</span>
                  <span>Median: ₹3,250</span>
                  <span>High: ₹3,600</span>
                </div>
              </div>

              <div className="ratings-breakdown">
                <div className="rb-row">
                  <span className="rb-label">Buy (24 Analysts)</span>
                  <div className="rb-bar-bg"><div className="rb-bar-fill bull" style={{ width: '70%' }} /></div>
                  <span className="rb-pct">70%</span>
                </div>
                <div className="rb-row">
                  <span className="rb-label">Hold (7 Analysts)</span>
                  <div className="rb-bar-bg"><div className="rb-bar-fill warn" style={{ width: '20%' }} /></div>
                  <span className="rb-pct">20%</span>
                </div>
                <div className="rb-row">
                  <span className="rb-label">Sell (3 Analysts)</span>
                  <div className="rb-bar-bg"><div className="rb-bar-fill bear" style={{ width: '10%' }} /></div>
                  <span className="rb-pct">10%</span>
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
              <h4 className="flex items-center gap-2"><PieChart className="w-5 h-5 text-blue-400" /> Key Financial Ratios</h4>
              <span className="widget-tag">TTM Metrics</span>
            </div>
            <div className="ratios-grid">
              <div className="ratio-item">
                <span className="r-label">P/E Ratio</span>
                <span className="r-val">28.4x</span>
                <span className="r-sub">Sector: 26.2x</span>
              </div>
              <div className="ratio-item">
                <span className="r-label">P/B Ratio</span>
                <span className="r-val">4.2x</span>
                <span className="r-sub">BV: ₹676</span>
              </div>
              <div className="ratio-item">
                <span className="r-label">ROE %</span>
                <span className="r-val up">18.5%</span>
                <span className="r-sub">Return on Equity</span>
              </div>
              <div className="ratio-item">
                <span className="r-label">ROCE %</span>
                <span className="r-val up">21.2%</span>
                <span className="r-sub">Capital Employed</span>
              </div>
              <div className="ratio-item">
                <span className="r-label">EV / EBITDA</span>
                <span className="r-val">16.8x</span>
                <span className="r-sub">Enterprise Value</span>
              </div>
              <div className="ratio-item">
                <span className="r-label">Debt / Equity</span>
                <span className="r-val bull">0.38</span>
                <span className="r-sub">Low Leverage</span>
              </div>
              <div className="ratio-item">
                <span className="r-label">Dividend Yield</span>
                <span className="r-val">1.25%</span>
                <span className="r-sub">Payout ₹35.5</span>
              </div>
              <div className="ratio-item">
                <span className="r-label">Market Cap</span>
                <span className="r-val">₹19.2 L Cr</span>
                <span className="r-sub">Large Cap</span>
              </div>
            </div>
          </div>

          {/* Quarterly Results */}
          <div className="market-widget sf-widget">
            <div className="widget-header">
              <h4 className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-400" /> Quarterly Financial Results (₹ Cr)</h4>
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
                    <td className="num">₹2,31,880</td>
                    <td className="num">₹2,35,480</td>
                    <td className="num">₹2,42,100</td>
                    <td className="num">₹2,48,500</td>
                    <td className="num"><span className="ptf-pnl pnl-up">+11.4%</span></td>
                  </tr>
                  <tr>
                    <td><strong>Operating Profit (EBITDA)</strong></td>
                    <td className="num">₹42,500</td>
                    <td className="num">₹43,890</td>
                    <td className="num">₹46,200</td>
                    <td className="num">₹48,100</td>
                    <td className="num"><span className="ptf-pnl pnl-up">+13.2%</span></td>
                  </tr>
                  <tr>
                    <td><strong>Net Profit (PAT)</strong></td>
                    <td className="num">₹19,640</td>
                    <td className="num">₹20,120</td>
                    <td className="num">₹21,850</td>
                    <td className="num">₹22,900</td>
                    <td className="num"><span className="ptf-pnl pnl-up">+15.8%</span></td>
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
            <h4 className="flex items-center gap-2"><Users className="w-5 h-5 text-amber-400" /> Peer Comparison &amp; Sector Benchmarking</h4>
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
                    <td><span className="ac-badge bull">{peer.rating}</span></td>
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
              <h4 className="flex items-center gap-2"><Landmark className="w-5 h-5 text-indigo-400" /> Shareholding Pattern</h4>
              <span className="widget-tag">Q3 FY25</span>
            </div>
            <div className="shareholding-list">
              <div className="sh-item">
                <div className="sh-info"><span className="sh-name">Promoters</span><span className="sh-val">50.3%</span></div>
                <div className="alloc-bar-bg"><div className="alloc-bar-fill" style={{ width: '50.3%', background: 'var(--primary)' }} /></div>
              </div>
              <div className="sh-item">
                <div className="sh-info"><span className="sh-name">Foreign Institutions (FII)</span><span className="sh-val">22.4%</span></div>
                <div className="alloc-bar-bg"><div className="alloc-bar-fill" style={{ width: '22.4%', background: 'var(--secondary)' }} /></div>
              </div>
              <div className="sh-item">
                <div className="sh-info"><span className="sh-name">Domestic Institutions (DII)</span><span className="sh-val">16.8%</span></div>
                <div className="alloc-bar-bg"><div className="alloc-bar-fill" style={{ width: '16.8%', background: 'var(--accent)' }} /></div>
              </div>
              <div className="sh-item">
                <div className="sh-info"><span className="sh-name">Public &amp; Retail</span><span className="sh-val">10.5%</span></div>
                <div className="alloc-bar-bg"><div className="alloc-bar-fill" style={{ width: '10.5%', background: 'var(--muted-foreground)' }} /></div>
              </div>
            </div>
          </div>

          {/* Institutional Holdings Trends */}
          <div className="market-widget sf-widget">
            <div className="widget-header">
              <h4 className="flex items-center gap-2"><Briefcase className="w-5 h-5 text-blue-400" /> Institutional Holdings Trend</h4>
              <span className="widget-tag bull">FII Buying +1.2%</span>
            </div>
            <div className="inst-trend-body">
              <div className="inst-box">
                <span className="ib-title">FII Shareholding</span>
                <span className="ib-val up">22.4% <small>(+1.2% vs Q2)</small></span>
                <span className="ib-sub">Increased stake across 4 consecutive quarters</span>
              </div>
              <div className="inst-box">
                <span className="ib-title">Mutual Funds (DII)</span>
                <span className="ib-val up">16.8% <small>(+0.5% vs Q2)</small></span>
                <span className="ib-sub">Held by 42 domestic mutual fund schemes</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
