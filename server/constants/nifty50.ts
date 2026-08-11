/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║       NIFTY50GPT — NIFTY 50 STOCK CONSTANTS                         ║
 * ║                                                                      ║
 * ║  Shared reference list of all Nifty 50 constituent companies.       ║
 * ║  Imported by routes, services, and analyzers.                       ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

export interface Nifty50Stock {
  ticker: string;
  name: string;
  sector: string;
}

export const NIFTY50_STOCKS: Nifty50Stock[] = [
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
  { ticker: "JIOFIN", name: "Jio Financial Services", sector: "Financial" },
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
