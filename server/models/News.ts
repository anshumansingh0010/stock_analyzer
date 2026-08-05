/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║       NIFTY50GPT — LAYER 6: MONGOOSE MODELS                        ║
 * ║       server/models/News.ts  +  ProcessedNews.ts                   ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import mongoose, { Schema, Document, Model } from "mongoose";

// ─── Raw News Article Interface & Schema ──────────────────────
export interface INews extends Document {
  headline: string;
  description: string;
  source: string;
  url: string;
  publishedAt: Date;
  ticker?: string | null;
  processed: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const NewsSchema = new Schema<INews>(
  {
    headline: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    source: { type: String, default: "Unknown" },
    url: { type: String, default: "" },
    publishedAt: { type: Date, default: Date.now, index: true },
    ticker: { type: String, default: null },
    processed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Prevent duplicate articles by headline + source
NewsSchema.index({ headline: 1, source: 1 }, { unique: true });

export const News: Model<INews> = mongoose.model<INews>("News", NewsSchema);

// ─── Processed News (Layer 2 output) Interface & Schema ───────
export interface ICompanyInsight {
  ticker?: string;
  name?: string;
  sentiment?: "BULLISH" | "BEARISH" | "NEUTRAL";
  sentimentScore?: number;
  reason?: string;
  inUserPortfolio?: boolean;
  portfolioRelevance?: string | null;
}

export interface IProcessedNews extends Omit<Document, "model"> {
  newsId: mongoose.Types.ObjectId;
  headline: string;
  source?: string;
  summary?: string;
  overallMarketSentiment?: "BULLISH" | "BEARISH" | "NEUTRAL";
  urgency?: "HIGH" | "MEDIUM" | "LOW";
  sectorAffected: string[];
  companies: ICompanyInsight[];
  alertsGenerated: number;
  analyzedAt: Date;
  model: string;
  tokens: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const CompanyInsightSchema = new Schema<ICompanyInsight>(
  {
    ticker: { type: String },
    name: { type: String },
    sentiment: { type: String, enum: ["BULLISH", "BEARISH", "NEUTRAL"] },
    sentimentScore: { type: Number, min: 0, max: 1 },
    reason: { type: String },
    inUserPortfolio: { type: Boolean, default: false },
    portfolioRelevance: { type: String, default: null },
  },
  { _id: false }
);

const ProcessedNewsSchema = new Schema<IProcessedNews>(
  {
    newsId: { type: Schema.Types.ObjectId, ref: "News", required: true, index: true },
    headline: { type: String, required: true },
    source: { type: String },
    summary: { type: String },
    overallMarketSentiment: { type: String, enum: ["BULLISH", "BEARISH", "NEUTRAL"] },
    urgency: { type: String, enum: ["HIGH", "MEDIUM", "LOW"] },
    sectorAffected: { type: [String], default: [] },
    companies: { type: [CompanyInsightSchema], default: [] },
    alertsGenerated: { type: Number, default: 0 },
    analyzedAt: { type: Date, default: Date.now, index: true },
    model: { type: String, default: "" },
    tokens: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const ProcessedNews: Model<IProcessedNews> = mongoose.model<IProcessedNews>(
  "ProcessedNews",
  ProcessedNewsSchema
);
