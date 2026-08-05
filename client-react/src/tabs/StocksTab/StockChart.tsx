import { useState } from 'react';

interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  rsi: number;
  macd: number;
  macdSignal: number;
  macdHist: number;
  ema20: number;
  vwap: number;
  bbUpper: number;
  bbLower: number;
}

export function StockChart({ ticker, stockName, price = 2840 }: { ticker: string; stockName: string; price?: number }) {
  const [overlayEma, setOverlayEma] = useState<boolean>(true);
  const [overlayVwap, setOverlayVwap] = useState<boolean>(false);
  const [overlayBB, setOverlayBB] = useState<boolean>(false);

  const [subChartMode, setSubChartMode] = useState<'volume' | 'rsi' | 'macd' | 'none'>('volume');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Generate 25 daily candles around `price`
  const generateCandles = (): CandleData[] => {
    const base = price || 2840;
    const dates = ['Jul 1', 'Jul 2', 'Jul 3', 'Jul 6', 'Jul 7', 'Jul 8', 'Jul 9', 'Jul 10',
                   'Jul 13', 'Jul 14', 'Jul 15', 'Jul 16', 'Jul 17', 'Jul 20', 'Jul 21', 'Jul 22',
                   'Jul 23', 'Jul 24', 'Jul 27', 'Jul 28', 'Jul 29', 'Jul 30', 'Jul 31', 'Aug 3', 'Aug 4'];

    let currentClose = base * 0.94;
    return dates.map((date, idx) => {
      const change = (Math.sin(idx * 0.7) * 25) + ((Math.random() - 0.45) * 20);
      const open = currentClose;
      const close = Math.max(open + change, 100);
      const high = Math.max(open, close) + Math.random() * 15;
      const low = Math.min(open, close) - Math.random() * 15;
      currentClose = close;

      const volume = Math.floor(1200000 + Math.random() * 2500000);
      const rsi = Math.min(Math.max(45 + Math.sin(idx * 0.5) * 22, 25), 82);
      const macd = Math.sin(idx * 0.4) * 8;
      const macdSignal = Math.sin((idx - 1) * 0.4) * 7;
      const macdHist = macd - macdSignal;

      const ema20 = close * 0.98 + (idx * 0.8);
      const vwap = (high + low + close) / 3 + 2;
      const bbUpper = close * 1.035;
      const bbLower = close * 0.965;

      return {
        time: date, open, high, low, close, volume, rsi,
        macd, macdSignal, macdHist, ema20, vwap, bbUpper, bbLower
      };
    });
  };

  const candles = generateCandles();
  const minPrice = Math.min(...candles.map(c => c.low)) * 0.99;
  const maxPrice = Math.max(...candles.map(c => c.high)) * 1.01;
  const maxVolume = Math.max(...candles.map(c => c.volume));

  const svgWidth = 720;
  const svgHeight = 170; // Compact height
  const padding = { top: 12, right: 15, bottom: 20, left: 50 };
  const chartW = svgWidth - padding.left - padding.right;
  const chartH = svgHeight - padding.top - padding.bottom;

  const candleStep = chartW / candles.length;
  const candleW = Math.max(candleStep * 0.55, 5);

  const getY = (val: number) => padding.top + chartH - ((val - minPrice) / (maxPrice - minPrice)) * chartH;
  const activeCandle = hoverIndex !== null ? candles[hoverIndex] : candles[candles.length - 1];

  return (
    <div className="market-widget stock-chart-card compact-chart-card">
      {/* Chart Header & Compact Indicator Bar */}
      <div className="widget-header">
        <div className="compact-header-title">
          <h4>📊 Technical Candlestick Chart ({ticker})</h4>
          <div className="ohlc-inline-legend">
            <span>O: <strong>₹{activeCandle.open.toFixed(1)}</strong></span>
            <span>H: <strong>₹{activeCandle.high.toFixed(1)}</strong></span>
            <span>L: <strong>₹{activeCandle.low.toFixed(1)}</strong></span>
            <span>C: <strong className={activeCandle.close >= activeCandle.open ? 'up' : 'down'}>₹{activeCandle.close.toFixed(1)}</strong></span>
          </div>
        </div>

        {/* Overlays Selector */}
        <div className="indicator-toggles">
          <label className={`ind-toggle ${overlayEma ? 'active' : ''}`}>
            <input type="checkbox" checked={overlayEma} onChange={e => setOverlayEma(e.target.checked)} />
            <span>EMA 20</span>
          </label>
          <label className={`ind-toggle ${overlayVwap ? 'active' : ''}`}>
            <input type="checkbox" checked={overlayVwap} onChange={e => setOverlayVwap(e.target.checked)} />
            <span>VWAP</span>
          </label>
          <label className={`ind-toggle ${overlayBB ? 'active' : ''}`}>
            <input type="checkbox" checked={overlayBB} onChange={e => setOverlayBB(e.target.checked)} />
            <span>BB Bands</span>
          </label>
        </div>
      </div>

      {/* Main Candlestick SVG */}
      <div className="chart-svg-wrap compact-svg-wrap">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="candlestick-svg">
          {/* Price Axis Grid */}
          {[0, 0.5, 1].map((pct, idx) => {
            const y = padding.top + chartH * pct;
            const pVal = maxPrice - pct * (maxPrice - minPrice);
            return (
              <g key={idx}>
                <line x1={padding.left} y1={y} x2={svgWidth - padding.right} y2={y} stroke="var(--border-subtle)" strokeDasharray="3 3" />
                <text x={padding.left - 6} y={y + 4} textAnchor="end" fill="var(--text-muted)" fontSize="9" fontFamily="var(--font-mono)">
                  ₹{Math.round(pVal)}
                </text>
              </g>
            );
          })}

          {/* Bollinger Bands Overlay */}
          {overlayBB && (
            <path
              d={candles.reduce((acc, c, i) => {
                const x = padding.left + i * candleStep + candleStep / 2;
                const yTop = getY(c.bbUpper);
                return `${acc} ${i === 0 ? 'M' : 'L'} ${x} ${yTop}`;
              }, '') + candles.slice().reverse().reduce((acc, c, i) => {
                const x = padding.left + (candles.length - 1 - i) * candleStep + candleStep / 2;
                const yBot = getY(c.bbLower);
                return `${acc} L ${x} ${yBot}`;
              }, '') + ' Z'}
              fill="rgba(99,102,241,0.08)"
              stroke="rgba(99,102,241,0.25)"
              strokeDasharray="2 2"
            />
          )}

          {/* EMA Overlay Line */}
          {overlayEma && (
            <path
              d={candles.reduce((acc, c, i) => {
                const x = padding.left + i * candleStep + candleStep / 2;
                const y = getY(c.ema20);
                return `${acc} ${i === 0 ? 'M' : 'L'} ${x} ${y}`;
              }, '')}
              fill="none"
              stroke="#818cf8"
              strokeWidth="2"
            />
          )}

          {/* VWAP Overlay Line */}
          {overlayVwap && (
            <path
              d={candles.reduce((acc, c, i) => {
                const x = padding.left + i * candleStep + candleStep / 2;
                const y = getY(c.vwap);
                return `${acc} ${i === 0 ? 'M' : 'L'} ${x} ${y}`;
              }, '')}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeDasharray="4 2"
            />
          )}

          {/* Candlesticks */}
          {candles.map((c, i) => {
            const x = padding.left + i * candleStep + candleStep / 2;
            const isBullish = c.close >= c.open;
            const candleColor = isBullish ? 'var(--accent-bull)' : 'var(--accent-bear)';

            const yHigh = getY(c.high);
            const yLow = getY(c.low);
            const yOpen = getY(c.open);
            const yClose = getY(c.close);

            const candleTop = Math.min(yOpen, yClose);
            const candleHeight = Math.max(Math.abs(yOpen - yClose), 2);

            return (
              <g key={i} onMouseEnter={() => setHoverIndex(i)} style={{ cursor: 'pointer' }}>
                <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={candleColor} strokeWidth="1.2" />
                <rect
                  x={x - candleW / 2}
                  y={candleTop}
                  width={candleW}
                  height={candleHeight}
                  fill={candleColor}
                  rx="1"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Sub-Chart Selector Tabs & View */}
      <div className="subchart-tab-bar">
        <span className="stb-label">Sub-chart Indicator:</span>
        {(['volume', 'rsi', 'macd', 'none'] as const).map(mode => (
          <button
            key={mode}
            className={`sub-tab-btn ${subChartMode === mode ? 'active' : ''}`}
            onClick={() => setSubChartMode(mode)}
          >
            {mode.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Dynamic Single Sub-Chart View */}
      {subChartMode !== 'none' && (
        <div className="sub-chart-box compact-sub-box">
          {subChartMode === 'volume' && (
            <>
              <div className="sc-header"><span>Volume Traded</span><span className="sc-val">{(activeCandle.volume / 1000000).toFixed(2)}M shares</span></div>
              <svg viewBox={`0 0 ${svgWidth} 35`} className="sub-svg">
                {candles.map((c, i) => {
                  const x = padding.left + i * candleStep + candleStep / 2;
                  const isBull = c.close >= c.open;
                  const vHeight = (c.volume / maxVolume) * 28;
                  return (
                    <rect key={i} x={x - candleW / 2} y={32 - vHeight} width={candleW} height={vHeight} fill={isBull ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)'} />
                  );
                })}
              </svg>
            </>
          )}

          {subChartMode === 'rsi' && (
            <>
              <div className="sc-header"><span>RSI (14)</span><span className="sc-val">{activeCandle.rsi.toFixed(1)}</span></div>
              <svg viewBox={`0 0 ${svgWidth} 35`} className="sub-svg">
                <line x1={padding.left} y1={8} x2={svgWidth - padding.right} y2={8} stroke="rgba(239,68,68,0.4)" strokeDasharray="2 2" />
                <line x1={padding.left} y1={26} x2={svgWidth - padding.right} y2={26} stroke="rgba(16,185,129,0.4)" strokeDasharray="2 2" />
                <path
                  d={candles.reduce((acc, c, i) => {
                    const x = padding.left + i * candleStep + candleStep / 2;
                    const y = 32 - (c.rsi / 100) * 28;
                    return `${acc} ${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }, '')}
                  fill="none"
                  stroke="var(--accent-primary)"
                  strokeWidth="1.8"
                />
              </svg>
            </>
          )}

          {subChartMode === 'macd' && (
            <>
              <div className="sc-header"><span>MACD Histogram</span><span className="sc-val">{activeCandle.macdHist.toFixed(2)}</span></div>
              <svg viewBox={`0 0 ${svgWidth} 35`} className="sub-svg">
                <line x1={padding.left} y1={18} x2={svgWidth - padding.right} y2={18} stroke="var(--border-subtle)" />
                {candles.map((c, i) => {
                  const x = padding.left + i * candleStep + candleStep / 2;
                  const isPos = c.macdHist >= 0;
                  const hHeight = Math.min(Math.abs(c.macdHist) * 2, 14);
                  return (
                    <rect key={i} x={x - candleW / 2} y={isPos ? 18 - hHeight : 18} width={candleW} height={hHeight} fill={isPos ? 'rgba(16,185,129,0.6)' : 'rgba(239,68,68,0.6)'} />
                  );
                })}
              </svg>
            </>
          )}
        </div>
      )}
    </div>
  );
}
