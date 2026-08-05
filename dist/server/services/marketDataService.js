/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║       NIFTY50GPT — LAYER 6: MARKET DATA SERVICE                    ║
 * ║                                                                      ║
 * ║  Fetches real-time Nifty 50 market data.                           ║
 * ║  Primary:  NSE India unofficial API (no auth required for quotes)  ║
 * ║  Fallback: Simulated realistic data for offline/demo mode          ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */
import axios from "axios";
const NSE_BASE = "https://www.nseindia.com";
const NSE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    Referer: "https://www.nseindia.com/",
    Connection: "keep-alive",
};
let nseSessionCookie = null;
export async function getNSESession() {
    if (nseSessionCookie !== null)
        return nseSessionCookie;
    try {
        const res = await axios.get(NSE_BASE, { headers: NSE_HEADERS, timeout: 8000 });
        const setCookie = res.headers["set-cookie"];
        if (setCookie) {
            nseSessionCookie = setCookie.map((c) => c.split(";")[0]).join("; ");
        }
        else {
            nseSessionCookie = "";
        }
    }
    catch {
        nseSessionCookie = "";
    }
    return nseSessionCookie;
}
export async function fetchNifty50Indices() {
    try {
        const cookie = await getNSESession();
        const res = await axios.get(`${NSE_BASE}/api/allIndices`, {
            headers: { ...NSE_HEADERS, Cookie: cookie },
            timeout: 8000,
        });
        const indices = res.data?.data ?? [];
        const find = (name) => indices.find((i) => i.indexSymbol === name) || {};
        const nifty50 = find("NIFTY 50");
        const bankNifty = find("NIFTY BANK");
        return {
            nifty50: parseFloat(nifty50.last ?? 0),
            bankNifty: parseFloat(bankNifty.last ?? 0),
            "change%": parseFloat(nifty50.percentChange ?? 0),
            dayHigh: parseFloat(nifty50.high ?? 0),
            dayLow: parseFloat(nifty50.low ?? 0),
            advance: parseInt(nifty50.advances ?? 0),
            decline: parseInt(nifty50.declines ?? 0),
            unchanged: parseInt(nifty50.unchanged ?? 0),
            fetchedAt: new Date().toISOString(),
            source: "NSE India",
        };
    }
    catch (err) {
        console.warn("[MarketData] NSE index fetch failed — using simulation:", err.message);
        return simulateIndices();
    }
}
export async function fetchNifty50Movers() {
    try {
        const cookie = await getNSESession();
        const res = await axios.get(`${NSE_BASE}/api/equity-stockIndices?index=NIFTY%2050`, {
            headers: { ...NSE_HEADERS, Cookie: cookie },
            timeout: 8000,
        });
        const stocks = (res.data?.data ?? []).slice(1);
        const mapped = stocks.map((s) => ({
            stock: s.symbol,
            name: s.meta?.companyName ?? s.symbol,
            price: parseFloat(s.lastPrice ?? 0),
            "change%": parseFloat(s.pChange ?? 0),
            volume: parseInt(s.totalTradedVolume ?? 0),
        }));
        const sorted = [...mapped].sort((a, b) => b["change%"] - a["change%"]);
        const gainers = sorted.filter((s) => s["change%"] > 0).slice(0, 10);
        const losers = sorted.filter((s) => s["change%"] < 0).slice(-10).reverse();
        return { gainers, losers, allStocks: mapped, source: "NSE India" };
    }
    catch (err) {
        console.warn("[MarketData] NSE movers fetch failed — using simulation:", err.message);
        return simulateMovers();
    }
}
export async function fetchStockQuote(ticker) {
    try {
        const cookie = await getNSESession();
        const res = await axios.get(`${NSE_BASE}/api/quote-equity?symbol=${encodeURIComponent(ticker)}`, {
            headers: { ...NSE_HEADERS, Cookie: cookie },
            timeout: 8000,
        });
        const d = res.data;
        const p = d?.priceInfo ?? {};
        const t = d?.tradeInfo ?? {};
        return {
            ticker,
            name: d?.info?.companyName ?? ticker,
            price: parseFloat(p.lastPrice ?? 0),
            prevClose: parseFloat(p.previousClose ?? 0),
            "change%": parseFloat(p.pChange ?? 0),
            dayHigh: parseFloat(p.intraDayHighLow?.max ?? 0),
            dayLow: parseFloat(p.intraDayHighLow?.min ?? 0),
            volume: parseInt(t.totalTradedVolume ?? 0),
            pe: parseFloat(d?.metadata?.pdSymbolPe ?? 0),
            sector: d?.metadata?.industry ?? "Unknown",
            fetchedAt: new Date().toISOString(),
            source: "NSE India",
        };
    }
    catch (err) {
        console.warn(`[MarketData] Quote fetch failed for ${ticker}:`, err.message);
        return null;
    }
}
export async function fetchSectorPerformance() {
    const SECTOR_INDICES = [
        "NIFTY IT",
        "NIFTY BANK",
        "NIFTY AUTO",
        "NIFTY PHARMA",
        "NIFTY FMCG",
        "NIFTY METAL",
        "NIFTY REALTY",
        "NIFTY ENERGY",
        "NIFTY INFRA",
        "NIFTY MEDIA",
    ];
    try {
        const cookie = await getNSESession();
        const res = await axios.get(`${NSE_BASE}/api/allIndices`, {
            headers: { ...NSE_HEADERS, Cookie: cookie },
            timeout: 8000,
        });
        const all = res.data?.data ?? [];
        return SECTOR_INDICES.map((name) => {
            const idx = all.find((i) => i.indexSymbol === name);
            return {
                name: name.replace("NIFTY ", ""),
                "performance%": idx ? parseFloat(idx.percentChange ?? 0) : 0,
                level: idx ? parseFloat(idx.last ?? 0) : 0,
            };
        });
    }
    catch {
        return simulateSectors();
    }
}
export async function fetchFullMarketSnapshot() {
    const [indices, movers, sectors] = await Promise.all([
        fetchNifty50Indices(),
        fetchNifty50Movers(),
        fetchSectorPerformance(),
    ]);
    return {
        index: indices,
        gainers: movers.gainers,
        losers: movers.losers,
        allStocks: movers.allStocks,
        sectors,
        fetchedAt: new Date().toISOString(),
        mode: indices.source === "NSE India" ? "live" : "simulated",
    };
}
function simulateIndices() {
    const base = 22350 + (Math.random() - 0.5) * 200;
    const change = parseFloat(((Math.random() - 0.45) * 2).toFixed(2));
    return {
        nifty50: parseFloat(base.toFixed(2)),
        bankNifty: parseFloat((48200 + (Math.random() - 0.5) * 400).toFixed(2)),
        sensex: parseFloat((73800 + (Math.random() - 0.5) * 600).toFixed(2)),
        "change%": change,
        dayHigh: parseFloat((base + 80).toFixed(2)),
        dayLow: parseFloat((base - 120).toFixed(2)),
        advance: Math.floor(20 + Math.random() * 15),
        decline: Math.floor(10 + Math.random() * 15),
        unchanged: Math.floor(1 + Math.random() * 5),
        fetchedAt: new Date().toISOString(),
        source: "Simulation",
    };
}
function simulateMovers() {
    const NIFTY50 = [
        "RELIANCE",
        "TCS",
        "HDFCBANK",
        "INFY",
        "ICICIBANK",
        "HINDUNILVR",
        "LT",
        "KOTAKBANK",
        "SBIN",
        "BHARTIARTL",
        "AXISBANK",
        "WIPRO",
        "TECHM",
        "HCLTECH",
        "ITC",
        "BAJFINANCE",
        "ONGC",
        "NTPC",
        "M&M",
        "POWERGRID",
    ];
    const stocks = NIFTY50.map((s) => ({
        stock: s,
        name: s,
        price: parseFloat((1000 + Math.random() * 3000).toFixed(2)),
        "change%": parseFloat(((Math.random() - 0.5) * 6).toFixed(2)),
        volume: Math.floor(500000 + Math.random() * 5000000),
    }));
    const sorted = [...stocks].sort((a, b) => b["change%"] - a["change%"]);
    return {
        gainers: sorted.filter((s) => s["change%"] > 0).slice(0, 10),
        losers: sorted.filter((s) => s["change%"] < 0).slice(-10).reverse(),
        allStocks: stocks,
        source: "Simulation",
    };
}
function simulateSectors() {
    const sectors = ["IT", "Banking", "Auto", "Pharma", "FMCG", "Metal", "Realty", "Energy", "Infra", "Media"];
    return sectors.map((name) => ({
        name,
        "performance%": parseFloat(((Math.random() - 0.5) * 4).toFixed(2)),
        level: parseFloat((5000 + Math.random() * 15000).toFixed(2)),
    }));
}
