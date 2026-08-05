/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║          NIFTY50GPT — STOCK API ROUTES (Fastify Plugin)             ║
 * ║                                                                      ║
 * ║  POST /api/stock/analyze         → Full analyst report (standard)   ║
 * ║  POST /api/stock/analyze/stream  → Streaming analyst report (SSE)   ║
 * ║  POST /api/stock/screen          → Multi-stock technical screener   ║
 * ║  GET  /api/stock/nifty50         → Nifty 50 tickers reference list  ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */
import { analyzeStock, analyzeStockStream, screenStocks, } from "../services/stockAnalyzer.js";
import { deriveTechnicalSummary } from "../prompts/stockPrompt.js";
export const NIFTY50_STOCKS = [
    { ticker: "RELIANCE", name: "Reliance Industries", sector: "Energy" },
    { ticker: "TCS", name: "Tata Consultancy Services", sector: "IT" },
    { ticker: "HDFCBANK", name: "HDFC Bank", sector: "Banking" },
    { ticker: "INFY", name: "Infosys", sector: "IT" },
    { ticker: "ICICIBANK", name: "ICICI Bank", sector: "Banking" },
    { ticker: "HINDUNILVR", name: "Hindustan Unilever", sector: "FMCG" },
    { ticker: "ITC", name: "ITC Limited", sector: "FMCG" },
    { ticker: "SBIN", name: "State Bank of India", sector: "Banking" },
    { ticker: "BHARTIARTL", name: "Bharti Airtel", sector: "Telecom" },
    { ticker: "KOTAKBANK", name: "Kotak Mahindra Bank", sector: "Banking" },
    { ticker: "LT", name: "Larsen & Toubro", sector: "Infra" },
    { ticker: "AXISBANK", name: "Axis Bank", sector: "Banking" },
    { ticker: "ASIANPAINT", name: "Asian Paints", sector: "Consumer" },
    { ticker: "MARUTI", name: "Maruti Suzuki", sector: "Auto" },
    { ticker: "SUNPHARMA", name: "Sun Pharmaceutical", sector: "Pharma" },
    { ticker: "TITAN", name: "Titan Company", sector: "Consumer" },
    { ticker: "WIPRO", name: "Wipro", sector: "IT" },
    { ticker: "ULTRACEMCO", name: "UltraTech Cement", sector: "Cement" },
    { ticker: "BAJFINANCE", name: "Bajaj Finance", sector: "NBFC" },
    { ticker: "NESTLEIND", name: "Nestle India", sector: "FMCG" },
    { ticker: "POWERGRID", name: "Power Grid Corp", sector: "Utilities" },
    { ticker: "NTPC", name: "NTPC Limited", sector: "Utilities" },
    { ticker: "ONGC", name: "ONGC", sector: "Energy" },
    { ticker: "M&M", name: "Mahindra & Mahindra", sector: "Auto" },
    { ticker: "HCLTECH", name: "HCL Technologies", sector: "IT" },
    { ticker: "JSWSTEEL", name: "JSW Steel", sector: "Metals" },
    { ticker: "TATASTEEL", name: "Tata Steel", sector: "Metals" },
    { ticker: "ADANIENT", name: "Adani Enterprises", sector: "Conglomerate" },
    { ticker: "ADANIPORTS", name: "Adani Ports", sector: "Logistics" },
    { ticker: "COALINDIA", name: "Coal India", sector: "Energy" },
    { ticker: "GRASIM", name: "Grasim Industries", sector: "Diversified" },
    { ticker: "BAJAJFINSV", name: "Bajaj Finserv", sector: "Financial" },
    { ticker: "BPCL", name: "BPCL", sector: "Energy" },
    { ticker: "BRITANNIA", name: "Britannia Industries", sector: "FMCG" },
    { ticker: "CIPLA", name: "Cipla", sector: "Pharma" },
    { ticker: "DIVISLAB", name: "Divi's Laboratories", sector: "Pharma" },
    { ticker: "DRREDDY", name: "Dr. Reddy's Laboratories", sector: "Pharma" },
    { ticker: "EICHERMOT", name: "Eicher Motors", sector: "Auto" },
    { ticker: "HDFC", name: "HDFC Limited", sector: "Finance" },
    { ticker: "HEROMOTOCO", name: "Hero MotoCorp", sector: "Auto" },
    { ticker: "HINDALCO", name: "Hindalco Industries", sector: "Metals" },
    { ticker: "INDUSINDBK", name: "IndusInd Bank", sector: "Banking" },
    { ticker: "IOC", name: "Indian Oil Corp", sector: "Energy" },
    { ticker: "SHRIRAMFIN", name: "Shriram Finance", sector: "NBFC" },
    { ticker: "TATACONSUM", name: "Tata Consumer Products", sector: "FMCG" },
    { ticker: "TATAMOTORS", name: "Tata Motors", sector: "Auto" },
    { ticker: "TECHM", name: "Tech Mahindra", sector: "IT" },
    { ticker: "TRENT", name: "Trent", sector: "Retail" },
    { ticker: "APOLLOHOSP", name: "Apollo Hospitals", sector: "Healthcare" },
    { ticker: "BEL", name: "Bharat Electronics", sector: "Defence" },
];
export default async function stockRoutes(fastify) {
    fastify.post("/analyze", async (request, reply) => {
        try {
            const { stock, technical = {}, news = [], userHolding = null, options = {} } = request.body;
            if (!stock || !stock.ticker) {
                return reply.status(400).send({
                    error: "Bad Request",
                    message: "'stock.ticker' is required.",
                });
            }
            if (!stock.name) {
                const ref = NIFTY50_STOCKS.find((s) => s.ticker.toUpperCase() === stock.ticker.toUpperCase());
                if (ref)
                    stock.name = ref.name;
            }
            const result = await analyzeStock(stock, technical, news, userHolding, options);
            return reply.send({
                success: true,
                ticker: stock.ticker,
                report: result.report,
                derived: result.derived,
                meta: result.meta,
            });
        }
        catch (err) {
            request.log.error(err, "[Stock/analyze]");
            if (err.status === 401)
                return reply.status(401).send({ error: "Invalid API key" });
            if (err.status === 429)
                return reply.status(429).send({ error: "LLM rate limit — retry shortly" });
            return reply.status(500).send({ error: "Analysis failed", message: err.message });
        }
    });
    fastify.post("/analyze/stream", async (request, reply) => {
        try {
            const { stock, technical = {}, news = [], userHolding = null, options = {} } = request.body;
            if (!stock?.ticker) {
                return reply.status(400).send({ error: "'stock.ticker' is required." });
            }
            if (!stock.name) {
                const ref = NIFTY50_STOCKS.find((s) => s.ticker.toUpperCase() === stock.ticker.toUpperCase());
                if (ref)
                    stock.name = ref.name;
            }
            reply.raw.setHeader("Content-Type", "text/event-stream");
            reply.raw.setHeader("Cache-Control", "no-cache");
            reply.raw.setHeader("Connection", "keep-alive");
            const derived = deriveTechnicalSummary(stock, technical);
            reply.raw.write(`data: ${JSON.stringify({ type: "derived", derived })}\n\n`);
            const meta = await analyzeStockStream(stock, technical, news, userHolding, (token) => {
                reply.raw.write(`data: ${JSON.stringify({ type: "token", token })}\n\n`);
            }, options);
            reply.raw.write(`data: ${JSON.stringify({ type: "done", meta })}\n\n`);
            reply.raw.end();
        }
        catch (err) {
            request.log.error(err, "[Stock/stream]");
            reply.raw.write(`data: ${JSON.stringify({ type: "error", error: err.message })}\n\n`);
            reply.raw.end();
        }
    });
    fastify.post("/screen", async (request, reply) => {
        try {
            const { stocks } = request.body;
            if (!Array.isArray(stocks) || stocks.length === 0) {
                return reply.status(400).send({
                    error: "Bad Request",
                    message: "'stocks' must be a non-empty array of { stock, technical } objects.",
                });
            }
            if (stocks.length > 50) {
                return reply.status(400).send({ error: "Maximum 50 stocks per screen." });
            }
            const ranked = screenStocks(stocks);
            return reply.send({
                success: true,
                count: ranked.length,
                ranked,
                screenedAt: new Date().toISOString(),
            });
        }
        catch (err) {
            request.log.error(err, "[Stock/screen]");
            return reply.status(500).send({ error: err.message });
        }
    });
    fastify.get("/nifty50", async (request, reply) => {
        const { sector } = request.query;
        let list = NIFTY50_STOCKS;
        if (sector) {
            list = list.filter((s) => s.sector.toLowerCase() === sector.toLowerCase());
        }
        return reply.send({
            success: true,
            count: list.length,
            stocks: list,
        });
    });
}
