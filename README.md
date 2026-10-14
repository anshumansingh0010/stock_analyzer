# Nifty50GPT

> **AI-Powered Financial Intelligence & Market Analysis Engine for Indian Nifty 50 Equities**

Nifty50GPT is an enterprise-grade full-stack financial intelligence web application engineered specifically for the Indian equity market (NSE Nifty 50). It pairs real-time market data, institutional analyst consensus, and financial news feeds with modern LLM intelligence (Google Gemini & OpenAI) to provide actionable equity research, technical analysis, and portfolio intelligence.

---

## 🚀 Key Capabilities & Analytical Layers

Nifty50GPT is structured around a multi-layered analytical engine:

### 1. Layer 1 — Financial Copilot & Master Prompt Engine
- **Context-Aware AI Assistant:** Financial AI copilot powered by Google Gemini and OpenAI GPT models.
- **Dynamic Research & Inquiries:** Instant answers on Nifty 50 equities, macroeconomic indicators, derivatives, portfolio strategies, and technical setups.
- **Customizable Copilot Preferences:** Adjust response depth (Detailed vs. Concise) and risk sensitivity (Strict, Balanced, Aggressive).
- **Persistent Chat History:** Conversations are saved to MongoDB and synchronized seamlessly across client sessions.

### 2. Layer 2 — Real-Time News & Sentiment Engine
- **Financial RSS Ingestion:** Aggregates real-time news from leading Indian financial portals (Moneycontrol, Economic Times, Livemint, etc.).
- **Automated Sentiment Classification:** Every article is scored and classified (Bullish, Bearish, or Neutral) with confidence metrics and market impact analysis.
- **Background News Scheduler:** Continuously polls and refreshes market news in the background at configurable intervals.

### 3. Layer 3 — Stock Technical & Fundamental Analyst
- **Interactive Candlestick & Line Charts:** TradingView-style interactive multi-timeframe charts (1D, 1W, 1M, 1Y) with moving averages (SMA 20, SMA 50), volume profiles, and intraday polling.
- **Live Institutional Analyst Consensus:** Real-time analyst ratings (Strong Buy, Buy, Hold, Underperform, Sell) aggregated from institutional analyst desks via Yahoo Finance.
- **12-Month Target Price Guage:** Visual high, median, and low price targets with projected upside/downside percentages.
- **AI-Generated Equity Research Reports:** Generates structured institutional-grade research memos with investment thesis, key catalysts, valuation metrics, and risk factors at the click of a button.

### 4. Layer 4 — Macro Market Movement & Institutional Flows
- **Index Monitoring:** Real-time tracking of Nifty 50, Bank Nifty, and BSE Sensex.
- **FII / DII Net Flow Tracking:** Daily institutional cash market activity breakdown (Foreign Institutional Investors & Domestic Institutional Investors).
- **Market Breadth & Movers:** Live top gainers, losers, 52-week high/low monitors, and sectoral heatmaps.

### 5. Layer 5 — Intelligent Price & Sentiment Alert Engine
- **Automated Threshold Triggers:** Set custom price crossing alerts (Above / Below) and high-impact sentiment thresholds.
- **Background Price Scheduler:** Evaluates active user alerts against incoming price ticks and notifies users.

### 6. Layer 6 — High-Performance Market Caching & Scheduling
- **3-Hour Institutional Analyst Pre-warming:** Background scheduler pre-fetches and caches analyst targets for all 50 Nifty constituents every 3 hours, ensuring instantaneous (<1ms) page loads.
- **Multi-Tier TTL Cache:** In-memory caching layer with TTL expiration for stock quotes, market snapshots, and intraday candles.
- **Dual Persistence Architecture:** Full MongoDB integration with automated fallback to in-memory mock mode if database is offline.

### 7. Layer 7 — Portfolio Management & User Experience
- **Interactive Portfolio Visualizer:** Real-time P&L tracking, asset allocation breakdowns, and portfolio growth curves over time.
- **Multi-Factor Auth & Account Linking:** Seamless sign-in via Email/Phone OTP (Firebase/Nodemailer), Google OAuth, and passwordless authentication with multi-account linking.
- **Custom Keyboard Shortcuts:** Power-user keybindings for instant navigation across tabs, search modal, and market refresh.
- **In-App Feedback & Bug Reporting:** Integrated feedback modal delivering diagnostic reports via Nodemailer.

---

## 🏗 System Architecture

```
                      ┌──────────────────────────────────────┐
                      │       React 19 + Vite Frontend       │
                      │  (Tailwind CSS v4 + TypeScript, SPA) │
                      └──────────────────┬───────────────────┘
                                         │ HTTP / REST & SSE
                                         ▼
                      ┌──────────────────────────────────────┐
                      │       Fastify 4 Node.js Server       │
                      │       (TypeScript, ESM, Helmet)      │
                      └──────────────────┬───────────────────┘
                                         │
         ┌───────────────────────────────┼───────────────────────────────┐
         ▼                               ▼                               ▼
┌──────────────────┐          ┌────────────────────┐          ┌──────────────────┐
│ MongoDB Database │          │ Market Data Feeds  │          │  AI LLM Services │
│ (Mongoose Models │          │ • Yahoo Finance    │          │ • Google Gemini  │
│  & Memory Store) │          │ • Groww / RSS Feeds│          │ • OpenAI GPT     │
└──────────────────┘          └────────────────────┘          └──────────────────┘
         │                               │                               │
         ▼                               ▼                               ▼
  User Profiles &                 3-Hour Analyst &              Automated AI
  Chat History                    Price Schedulers              Research Reports
```

---

## 🛠 Tech Stack

### **Backend**
- **Runtime & Framework**: [Node.js](https://nodejs.org/) (ESM) + [Fastify](https://fastify.dev/) 4.x (TypeScript)
- **Database**: [MongoDB](https://www.mongodb.com/) via [Mongoose](https://mongoosejs.com/) (with automatic in-memory fallback)
- **AI Integrations**: [Google Gemini API](https://ai.google.dev/) (`@google/genai` / SDK) & [OpenAI API](https://platform.openai.com/)
- **Market Data**: Yahoo Finance API integration, Groww API client, Financial RSS Parser
- **Background Workers**: 3-Hour Analyst Pre-warming Scheduler, Intraday Price Alert Scheduler, News Poller
- **Security & Networking**: `@fastify/helmet`, `@fastify/cors`, `@fastify/rate-limit`, `zod`
- **Email & Notifications**: [Nodemailer](https://nodemailer.com/) (SMTP OTPs and User Feedback Delivery)

### **Frontend**
- **Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) + Custom Glassmorphic Dark Design System
- **Icons**: [Lucide React](https://lucide.dev/)
- **Type Safety**: TypeScript 5.x throughout client and server

---

## 🚦 Getting Started

### Prerequisites

Ensure you have the following installed:
- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Docker & Docker Compose** (Optional, for single-command stack launch)

---

### Step 1: Clone Repository & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/anshumansingh0010/stock_analyzer.git
cd stock_analyzer

# Install server/root dependencies
npm install

# Install client dependencies
cd client-react
npm install
cd ..
```

---

### Step 2: Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Open `.env` and fill in your keys:

```env
# Server
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# LLM Configuration ("gemini" or "openai")
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_CHAT_KEY=your_gemini_chat_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Database (Optional - in-memory fallback runs automatically if omitted)
MONGODB_URI=mongodb://stockadmin:stockpassword123@localhost:27017/stock_sense_ai?authSource=admin

# Nodemailer / Feedback / OTP (Optional)
SMTP_EMAIL=your_email@gmail.com
SMTP_PASSWORD=your_gmail_app_password
FEEDBACK_RECEIVER_EMAIL=your_email@gmail.com

# Google & Firebase Authentication (Optional)
GOOGLE_CLIENT_ID=your_google_client_id_here
FIREBASE_PROJECT_ID=your_firebase_project_id
```

---

### Step 3: Run the Application

#### Option A: Docker Compose (All-in-One)
To run MongoDB, the Fastify backend, and the React frontend simultaneously:

```bash
docker-compose up -d
```
- **Web App**: [http://localhost:5173](http://localhost:5173)
- **API Server**: [http://localhost:3001](http://localhost:3001)

#### Option B: Local Development (Terminal)

In Terminal 1 (Start Fastify Backend):
```bash
npm run dev
# Server boots on http://localhost:3001 with hot reloading
```

In Terminal 2 (Start React Frontend):
```bash
npm run client
# Client boots on http://localhost:5173 with Vite HMR
```

---

## 📜 Available NPM Scripts

### Root Scripts
| Script | Command | Description |
| :--- | :--- | :--- |
| `npm run dev` | `tsx watch server/index.ts` | Runs Fastify backend in watch mode |
| `npm run start` | `node dist/server/index.js` | Runs compiled production backend |
| `npm run server:build` | `tsc` | Compiles backend TypeScript to `dist/` |
| `npm run client` | `cd client-react && npm run dev` | Starts Vite React client development server |
| `npm run client:build` | `cd client-react && npm run build` | Builds optimized production client bundle |

### Client Scripts (`client-react/`)
| Script | Command | Description |
| :--- | :--- | :--- |
| `npm run dev` | `vite` | Starts Vite local development server |
| `npm run build` | `tsc -b && vite build` | Type-checks and builds production assets |
| `npm run lint` | `eslint .` | Runs ESLint analysis |
| `npm run preview` | `vite preview` | Previews production build locally |

---

## 📂 Project Structure

```
stock_analyzer/
├── client-react/                     # React 19 Single Page Application
│   ├── src/
│   │   ├── components/               # Navbar, Header, Modals, Search, Feedback
│   │   ├── context/                  # AppContext, AuthContext, ThemeProvider
│   │   ├── styles/                   # Glassmorphic CSS design system
│   │   ├── tabs/                     # Core Views & Features
│   │   │   ├── ChatTab/              # AI Financial Chat & Copilot Settings
│   │   │   ├── HelpTab/              # Documentation, Keybinds & Feedback
│   │   │   ├── MarketTab/            # Indices, Sector Heatmap, FII/DII Flows
│   │   │   ├── NewsTab/              # RSS News with Sentiment Classification
│   │   │   ├── PortfolioTab/         # Visual Portfolio & Watchlist Manager
│   │   │   └── StocksTab/            # Candlestick Charts, Analyst Target Gauge & AI Report
│   │   ├── types/                    # Shared TypeScript Interfaces
│   │   ├── utils/                    # API clients, Firebase, Formatters
│   │   └── App.tsx                   # Main Routing & Shell
│   └── vite.config.ts                # Vite Configuration
│
├── server/                           # Fastify TypeScript Backend
│   ├── constants/                    # Nifty 50 Constituents & Sector Mappings
│   ├── db/                           # MongoDB Connection & In-Memory Fallback
│   ├── middleware/                   # JWT Auth & Security Hooks
│   ├── models/                       # Mongoose Schemas (User, Alert, News, Chat)
│   ├── prompts/                      # Financial AI Prompts & System Instructions
│   ├── routes/                       # Fastify API Routes
│   │   ├── alert.ts                  # Sentiment & Portfolio Alerts
│   │   ├── auth.ts                   # OTP, Google, Firebase & Account Linking
│   │   ├── chat.ts                   # LLM Streaming & Chat History
│   │   ├── feedback.ts               # User Feedback Submission via Email
│   │   ├── market.ts                 # Market Breadth & FII/DII Endpoints
│   │   ├── marketdata.ts             # Live Quotes, Candles, Movers, Analyst Targets
│   │   ├── news.ts                   # News Feed & Sentiment
│   │   ├── portfolio.ts              # Holdings & Watchlists
│   │   ├── priceAlert.ts             # Price Threshold Triggers
│   │   ├── stock.ts                  # Technical Indicators & Metrics
│   │   └── user.ts                   # User Settings & Copilot Preferences
│   ├── services/                     # Business Logic & Integrations
│   │   ├── alertService.ts           # Alert Evaluation Engine
│   │   ├── analystScheduler.ts       # 3-Hour Nifty 50 Analyst Pre-warming Scheduler
│   │   ├── fiiDiiService.ts          # Institutional Cash Flow Fetcher
│   │   ├── growwService.ts           # Groww Data Client
│   │   ├── llmService.ts             # Gemini / OpenAI Provider Router
│   │   ├── marketAnalyzer.ts         # Macro Synthesizer
│   │   ├── marketDataService.ts      # Multi-source Market Data & Aggregation
│   │   ├── newsAnalyzer.ts           # News Sentiment Classifier
│   │   ├── newsScheduler.ts          # Background RSS Ingestion Poller
│   │   ├── priceScheduler.ts         # Price Alert Monitor
│   │   ├── rssService.ts             # Multi-source RSS Aggregator
│   │   ├── stockAnalyzer.ts          # Technical Indicators Calculator
│   │   └── yahooFinanceService.ts    # Yahoo Finance Live Analyst & Price Engine
│   ├── utils/                        # TTL Cache, Nodemailer, Helpers
│   └── index.ts                      # Server Bootstrap & Health Check
│
├── docker-compose.yml                # Docker Service Orchestration
├── package.json                      # Workspace Manifest & Scripts
└── tsconfig.json                     # Root TypeScript Configuration
```

---

## 🔐 Environment Variables Reference

| Variable | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `PORT` | No | `3001` | Fastify backend server listening port |
| `NODE_ENV` | No | `development` | Environment mode (`development` / `production`) |
| `ALLOWED_ORIGINS` | No | `http://localhost:5173,http://localhost:3000` | Allowed CORS origins (comma-separated) |
| `RATE_LIMIT_WINDOW_MS`| No | `60000` | Rate limiting sliding window in ms |
| `RATE_LIMIT_MAX` | No | `500` | Maximum requests per IP per window |
| `LLM_PROVIDER` | Yes | `gemini` | LLM backend to use (`gemini` or `openai`) |
| `GEMINI_API_KEY` | Optional | - | Google Gemini API key for analysis & reports |
| `GEMINI_CHAT_KEY` | Optional | - | Dedicated Gemini API key for Copilot chat |
| `OPENAI_API_KEY` | Optional | - | OpenAI API key (for GPT-4o / GPT-3.5) |
| `MONGODB_URI` | No | - | MongoDB connection URI (memory mode used if omitted) |
| `SMTP_EMAIL` | Optional | - | Sender email address for OTPs and user feedback |
| `SMTP_PASSWORD` | Optional | - | Gmail App Password or SMTP credentials |
| `FEEDBACK_RECEIVER_EMAIL` | Optional | - | Destination email for user feedback submissions |
| `GOOGLE_CLIENT_ID` | Optional | - | Google OAuth Client ID for web sign-in |
| `FIREBASE_PROJECT_ID` | Optional | - | Firebase Project ID for Phone Auth verification |
| `GROWW_API_KEY` | Optional | - | Optional Groww API key for equity quotes |
| `MARKET_DATA_CACHE_TTL_MS` | No | `60000` | Default cache TTL in ms for market responses |
| `DISABLE_NEWS_SCHEDULER` | No | `false` | Set `true` to disable background news polling |

---

## 🔌 API Endpoints Summary

### Public Market Data & Intelligence
| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/health` | `GET` | Health status of server, schedulers (News, Price, Analyst) & database |
| `/api/marketdata/snapshot` | `GET` | Full Nifty 50 market breadth snapshot |
| `/api/marketdata/indices` | `GET` | Current levels for Nifty 50, Bank Nifty, Sensex |
| `/api/marketdata/movers` | `GET` | Top 5 gainers and losers across Nifty 50 |
| `/api/marketdata/sectors` | `GET` | Sectoral breakdown and performance heat |
| `/api/marketdata/quote/:ticker` | `GET` | Live stock quote with Day/52W High & Low |
| `/api/marketdata/candles/:ticker` | `GET` | Multi-timeframe OHLCV candles (`?interval=15m&days=25`) |
| `/api/marketdata/analyst/:ticker` | `GET` | Real-time institutional analyst consensus & price targets |
| `/api/market/overview` | `GET` | Macro overview and index health commentary |
| `/api/market/fii-dii` | `GET` | Daily FII / DII net cash flows |
| `/api/stock/:symbol` | `GET` | Technical indicators (RSI, MACD, Bollinger Bands) |
| `/api/news` | `GET` | Curated RSS news stream with AI sentiment classification |

### Authentication & Feedback
| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/auth/check-user` | `POST` | Check whether an account exists by email/phone |
| `/api/auth/send-otp` | `POST` | Dispatch OTP via SMTP email or SMS |
| `/api/auth/verify-otp` | `POST` | Validate OTP code and issue JWT |
| `/api/auth/google` | `POST` | Sign in or link account with Google OAuth |
| `/api/auth/firebase` | `POST` | Sign in or link account with Firebase Auth |
| `/api/feedback` | `POST` | Submit user feedback and bug diagnostics via email |

### Protected User & Copilot Routes *(Requires Bearer Token)*
| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/chat` | `POST` | Send financial query to Copilot; streams AI response |
| `/api/user/:userId` | `GET` | Fetch user profile, preferences, and chat history |
| `/api/user/:userId/preferences` | `PATCH` | Update Copilot response length & risk profile |
| `/api/user/:userId/chat-history` | `PATCH` / `DELETE`| Persist or reset conversation history |
| `/api/portfolio` | `GET` / `POST` | Manage holdings, transactions & custom watchlists |
| `/api/alerts` | `GET` / `POST` | Create and monitor news sentiment alerts |
| `/api/price-alerts` | `GET` / `POST` | Create and monitor real-time stock price alerts |

---

## 🤝 Contributing

Contributions are warmly welcome! If you want to contribute to Nifty50GPT:

1. **Fork** the repository.
2. Create a dedicated branch (`git checkout -b feature/NewFeature`).
3. Commit your modifications (`git commit -m 'Add NewFeature'`).
4. Push your branch (`git push origin feature/NewFeature`).
5. Submit a **Pull Request**.

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for details.
