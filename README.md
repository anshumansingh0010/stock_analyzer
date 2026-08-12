# Stock Sense (Nifty50GPT)

> **AI-Powered Financial Intelligence & Market Analysis Engine for Indian Nifty 50 Stocks**

Stock Sense (Nifty50GPT) is a modern full-stack web application designed for analyzing Nifty 50 stocks, tracking Indian market trends, conducting sentiment analysis on financial news feeds, and delivering AI-assisted financial insight with a multi-layer analytical engine.

---

## Key Features

The application is structured into **6 Core Intelligence Layers**:

1. **Layer 1: Master Prompt Engine (Financial AI Chat)**
   - Context-aware financial AI assistant powered by OpenAI/Gemini.
   - Answers questions regarding Nifty 50 equities, market concepts, portfolio strategies, and technical indicators.
2. **Layer 2: News Sentiment Analyzer**
   - Real-time aggregation of Indian market news via financial RSS feeds.
   - Automatic AI sentiment classification (Bullish / Bearish / Neutral) with sentiment scoring and impact analysis.
   - Background news scheduler running at configurable intervals.
3. **Layer 3: Stock Technical Analyst**
   - Detailed stock metrics for all Nifty 50 components.
   - Interactive price charts (Candlesticks & Line plots) with overlay technical indicators (RSI, MACD, Moving Averages).
   - Live & historical price action tracking.
4. **Layer 4: Market Movement Commentator**
   - Market indices tracking (Nifty 50, Bank Nifty, Sensex).
   - Institutional activity monitoring (FII & DII net flows).
   - Top gainers, losers, and overall market breadth analysis.
5. **Layer 5: Intelligent Alert Engine**
   - Customizable price threshold and news sentiment alerts.
   - Notification triggers for user portfolio stocks.
6. **Layer 6: Persistence & Data Engine**
   - MongoDB database integration for user accounts, watchlists, custom portfolios, and chat logs.
   - Support for in-memory fallback mode when database is offline.
   - Data caching for market feeds (Groww & Yahoo Finance services).

---

## Architecture Overview

```
                      ┌─────────────────────────────────┐
                      │    React 19 + Vite Frontend     │
                      │  (Tailwind CSS v4 + TypeScript)  │
                      └────────────────┬────────────────┘
                                       │ HTTP / REST
                                       ▼
                      ┌─────────────────────────────────┐
                      │   Fastify 4 Node.js Server      │
                      │        (TypeScript)             │
                      └────────────────┬────────────────┘
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         ▼                             ▼                             ▼
┌──────────────────┐         ┌──────────────────┐          ┌──────────────────┐
│ MongoDB Database │         │  Market Data     │          │  AI LLM Services │
│ (Mongoose Models)│         │ (Yahoo / Groww)  │          │ (Gemini / OpenAI)│
└──────────────────┘         └──────────────────┘          └──────────────────┘
```

---

## Tech Stack

### **Backend**
- **Framework**: [Fastify](https://fastify.dev/) 4.x (TypeScript)
- **Database**: [MongoDB](https://www.mongodb.com/) via [Mongoose](https://mongoosejs.com/)
- **AI Integrations**: OpenAI API & Google Gemini API
- **Data & Feeds**: RSS Parser, Axios, Yahoo Finance API, Groww API
- **Security & Utilities**: `@fastify/helmet`, `@fastify/cors`, `@fastify/rate-limit`, `zod`

### **Frontend**
- **Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) + Custom Glassmorphic Dark/Light Theme System
- **Icons**: [Lucide React](https://lucide.dev/)
- **Language**: TypeScript

---

## Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Docker & Docker Compose** (Optional, for running MongoDB locally)

---

### Step 1: Clone & Install Dependencies

Clone the repository and install dependencies for both the root (server) and client app:

```bash
# Clone the repository
git clone https://github.com/your-username/Stock_Sense.git
cd Stock_Sense

# Install root & server dependencies
npm install

# Install client dependencies
cd client-react
npm install
cd ..
```

---

### Step 2: Configure Environment Variables

Create a `.env` file in the root directory by copying `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` to configure your API keys and configuration settings:

```env
# Server Config
PORT=3001
NODE_ENV=development

# LLM Provider ("gemini" or "openai")
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key

# MongoDB Database Connection
MONGODB_URI=mongodb://stockadmin:stockpassword123@localhost:27017/stock_sense_ai?authSource=admin
```

---

### Step 3: Start MongoDB Database (Optional)

You can run MongoDB locally using Docker Compose:

```bash
docker-compose up -d
```

*Note: If `MONGODB_URI` is left blank or database connection fails, the server automatically degrades to in-memory mode.*

---

### Step 4: Run the Application

#### Option A: Start Server and Client Separately

In terminal window 1 (Start Fastify Backend Server):
```bash
npm run dev
# Server will start on http://localhost:3001
```

In terminal window 2 (Start React Frontend Client):
```bash
npm run client
# Client will start on http://localhost:5173
```

---

## Available NPM Scripts

### Root Project Scripts
| Script | Command | Description |
| :--- | :--- | :--- |
| `npm run dev` | `tsx watch server/index.ts` | Runs backend Fastify server in watch mode |
| `npm run start` | `node dist/server/index.js` | Runs compiled production backend server |
| `npm run server:build` | `tsc` | Compiles TypeScript backend files to `dist/` |
| `npm run client` | `cd client-react && npm run dev` | Launches React client development server |
| `npm run client:build` | `cd client-react && npm run build` | Builds production bundle for React client |

### Client-React Scripts (`cd client-react`)
| Script | Command | Description |
| :--- | :--- | :--- |
| `npm run dev` | `vite` | Starts Vite HMR dev server |
| `npm run build` | `vite build` | Builds production frontend assets |
| `npm run lint` | `eslint .` | Runs ESLint for code quality |
| `npm run preview` | `vite preview` | Previews production build locally |

---

## Project Structure

```
Stock_Sense/
├── client-react/             # React 19 Frontend App
│   ├── src/
│   │   ├── components/       # Reusable UI components (Navbar, Header, Cards, etc.)
│   │   ├── context/          # React Context (AuthContext, ThemeContext, etc.)
│   │   ├── styles/           # CSS styles & design tokens
│   │   ├── tabs/             # Main Application Views
│   │   │   ├── ChatTab/      # Layer 1: AI Financial Chat Interface
│   │   │   ├── MarketTab/    # Layer 4: Market Indices & FII/DII Overview
│   │   │   ├── NewsTab/      # Layer 2: RSS News & Sentiment Feed
│   │   │   ├── PortfolioTab/ # Portfolio Manager & Watchlist
│   │   │   └── StocksTab/    # Layer 3: Interactive Stock Analysis & Charts
│   │   ├── types/            # TypeScript interfaces & types
│   │   └── App.tsx           # Main App layout & routing
│   └── vite.config.ts        # Vite build configuration
├── server/                   # Fastify Backend Server
│   ├── constants/            # Nifty 50 stock list & market metadata
│   ├── db/                   # MongoDB connection & status tracker
│   ├── middleware/           # Fastify authentication & route hooks
│   ├── models/               # Mongoose Schemas (User, Chat, Alert, News, etc.)
│   ├── prompts/              # Master prompt templates for LLM layers
│   ├── routes/               # Fastify API Endpoint Routes
│   │   ├── alert.ts          # Alert management routes
│   │   ├── auth.ts           # Authentication (Login / Register) routes
│   │   ├── chat.ts           # AI Chat stream & query routes
│   │   ├── market.ts         # Overall market indices & FII/DII routes
│   │   ├── marketdata.ts     # Live market data fetch routes
│   │   ├── news.ts           # News feed & sentiment analysis routes
│   │   ├── portfolio.ts      # User holdings & portfolio management routes
│   │   └── stock.ts          # Technical stock analysis routes
│   ├── services/             # Core Business Logic & External APIs
│   │   ├── alertService.ts   # Alert evaluation service
│   │   ├── fiiDiiService.ts  # FII / DII net flow fetcher
│   │   ├── growwService.ts   # Groww API integration service
│   │   ├── llmQueue.ts       # LLM rate limiting request queue
│   │   ├── llmService.ts     # OpenAI & Gemini LLM router
│   │   ├── marketAnalyzer.ts # Market overview synthesizer
│   │   ├── newsAnalyzer.ts   # AI News sentiment scoring engine
│   │   ├── newsScheduler.ts  # Background RSS feed fetch scheduler
│   │   ├── rssService.ts     # Financial RSS feeds aggregator
│   │   ├── stockAnalyzer.ts  # Stock technical analysis engine
│   │   └── yahooFinanceService.ts # Historical & intraday price service
│   └── index.ts              # Fastify server entry point
├── docker-compose.yml        # Local MongoDB Docker orchestration
├── package.json              # Main root dependencies & workspace scripts
├── tsconfig.json             # Root TypeScript compiler options
└── README.md                 # Project Documentation
```

---

## Environment Variables Reference

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `PORT` | No | `3001` | Fastify backend server listening port |
| `NODE_ENV` | No | `development` | Environment mode (`development` / `production`) |
| `ALLOWED_ORIGINS` | No | `http://localhost:5173` | CORS allowed origins (comma-separated) |
| `RATE_LIMIT_WINDOW_MS` | No | `60000` | Rate limiting window size in milliseconds |
| `RATE_LIMIT_MAX` | No | `500` | Max API requests per IP within rate limit window |
| `LLM_PROVIDER` | Yes | `gemini` | AI LLM backend service (`gemini` or `openai`) |
| `GEMINI_API_KEY` | Optional | - | API key for Google Gemini AI service |
| `OPENAI_API_KEY` | Optional | - | API key for OpenAI GPT models |
| `GROWW_API_KEY` | Optional | - | Groww API client key for live stock feeds |
| `MONGODB_URI` | No | - | MongoDB connection string (falls back to memory mode if empty) |

---

## API Endpoints Overview

| Base Endpoint | Method | Description | Authentication |
| :--- | :--- | :--- | :---: |
| `/api/health` | `GET` | Health check endpoint returning layer status | Public |
| `/api/auth/register` | `POST` | Create a new user account | Public |
| `/api/auth/login` | `POST` | Authenticate user & receive JWT token | Public |
| `/api/market/overview` | `GET` | Get Nifty 50, Bank Nifty, & overall market health | Public |
| `/api/market/fii-dii` | `GET` | Get daily FII & DII institutional cash flows | Public |
| `/api/stock/:symbol` | `GET` | Fetch stock metrics, historical charts & RSI/MACD | Public |
| `/api/news` | `GET` | Fetch recent financial news feeds with sentiment scores | Public |
| `/api/chat` | `POST` | Send financial query to Layer 1 Master Prompt AI | Required |
| `/api/portfolio` | `GET` / `POST` | Manage holdings, transactions & custom watchlists | Required |
| `/api/alerts` | `GET` / `POST` | Set and monitor custom price & market alerts | Required |

---

## Contributing

Contributions are welcome! If you'd like to improve Stock Sense or add new capabilities:

1. Fork the project repository.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## License

This project is licensed under the **MIT License**.
