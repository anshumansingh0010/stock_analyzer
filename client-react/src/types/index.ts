export type TabType = 'chat' | 'market' | 'stocks' | 'news' | 'portfolio';

export interface BadgeData {
  value: string;
  change: string;
  dir: 'up' | 'down' | '' | string;
}

export interface ToastState {
  msg: string;
  type: 'success' | 'error' | 'warn' | 'info' | '' | string;
  visible: boolean;
}

export interface StockChartPoint {
  time: string;
  close: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
}

export interface StockData {
  symbol: string;
  companyName?: string;
  name?: string;
  price?: number;
  change?: number;
  percentChange?: number;
  high?: number;
  low?: number;
  volume?: number | string;
  marketCap?: string;
  peRatio?: number | string;
  pbRatio?: number | string;
  divYield?: number | string;
  week52High?: number;
  week52Low?: number;
  sector?: string;
  chartData?: StockChartPoint[];
  report?: string;
  summary?: string;
  trend?: string;
  signals?: string[];
  risks?: string[];
  [key: string]: any;
}

export interface IndexData {
  name: string;
  value: string | number;
  change: string | number;
  percentChange?: string | number;
  dir?: 'up' | 'down' | 'flat' | string;
}

export interface SectorData {
  name: string;
  change: string | number;
  sentiment?: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | string;
}

export interface MarketOverview {
  indices?: Record<string, IndexData> | IndexData[];
  breadth?: {
    advances: number;
    declines: number;
    unchanged: number;
  };
  sectors?: SectorData[];
  gainers?: any[];
  losers?: any[];
  report?: string;
  outlook?: string;
  [key: string]: any;
}

export interface NewsItem {
  id?: string | number;
  title: string;
  source: string;
  time?: string;
  publishedAt?: string;
  url?: string;
  summary?: string;
  category?: 'MARKET' | 'COMPANY' | 'MACRO' | 'ALERTS' | string;
  sentiment?: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | string;
  impact?: 'HIGH' | 'MEDIUM' | 'LOW' | string;
  symbol?: string;
  tags?: string[];
}

export interface PortfolioHolding {
  symbol?: string;
  stock?: string;
  ticker?: string;
  name?: string;
  shares?: number;
  qty?: number;
  quantity?: number;
  avgPrice?: number;
  avgBuyPrice?: number;
  buyPrice?: number;
  currentPrice?: number;
  value?: number;
  dayChange?: number;
  totalReturn?: number;
  totalReturnPercent?: number;
  sector?: string;
  pnl?: number;
  pnlPct?: number;
}

export interface ChatMessage {
  id?: string | number;
  role: 'user' | 'assistant' | 'typing' | 'system';
  content: string;
  warnings?: string[];
  timestamp?: string;
}

export interface AiContextState {
  marketData: MarketOverview | null;
  stockData: StockData | null;
  news: NewsItem[];
  portfolio: PortfolioHolding[];
}

export interface AppContextType {
  aiContext: AiContextState;
  setAiContext: React.Dispatch<React.SetStateAction<AiContextState>>;
  updateContext: (field: keyof AiContextState, value: any) => void;
  chatHistory: ChatMessage[];
  setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  niftyBadge: BadgeData;
  setNiftyBadge: React.Dispatch<React.SetStateAction<BadgeData>>;
  backendOnline: boolean;
  backendProvider: string;
  toast: ToastState;
  showToast: (msg: string, type?: ToastState['type']) => void;
}
