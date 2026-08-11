/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║       NIFTY50GPT — LAYER 6: MONGOOSE MODELS                        ║
 * ║       server/models/Portfolio.ts                                   ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import mongoose, { Schema, Document, Model } from "mongoose";

export interface IHolding {
  stock: string;
  ticker: string;
  qty: number;
  avgPrice: number;
  sector?: string;
  exchange?: "NSE" | "BSE" | "BOTH";
  currentPrice?: number | null;
  pnlPercent?: number | null;
  pnlAmount?: number | null;
  lastUpdated?: Date | null;
}

export interface IPortfolio extends Document {
  userId: string;
  displayName: string;
  holdings: IHolding[];
  riskProfile: "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE";
  totalInvested: number;
  currentValue: number;
  totalPnL: number;
  lastSyncedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  recomputePnL(): this;
}

export interface IPortfolioModel extends Model<IPortfolio> {
  getAllTickers(): Promise<string[]>;
}

const HoldingSchema = new Schema<IHolding>(
  {
    stock: { type: String, required: true, uppercase: true, trim: true },
    ticker: { type: String, required: true, uppercase: true, trim: true },
    qty: { type: Number, required: true, min: 0 },
    avgPrice: { type: Number, required: true, min: 0 },
    sector: { type: String, default: "Unknown" },
    exchange: { type: String, enum: ["NSE", "BSE", "BOTH"], default: "NSE" },
    currentPrice: { type: Number, default: null },
    pnlPercent: { type: Number, default: null },
    pnlAmount: { type: Number, default: null },
    lastUpdated: { type: Date, default: null },
  },
  { _id: false }
);

const PortfolioSchema = new Schema<IPortfolio, IPortfolioModel>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    displayName: { type: String, default: "" },
    holdings: { type: [HoldingSchema], default: [] },
    riskProfile: {
      type: String,
      enum: ["CONSERVATIVE", "MODERATE", "AGGRESSIVE"],
      default: "MODERATE",
    },
    totalInvested: { type: Number, default: 0 },
    currentValue: { type: Number, default: 0 },
    totalPnL: { type: Number, default: 0 },
    lastSyncedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

PortfolioSchema.methods.recomputePnL = function (this: IPortfolio) {
  let invested = 0;
  let current = 0;
  this.holdings.forEach((h: IHolding) => {
    const inv = h.qty * h.avgPrice;
    const cur = h.qty * (h.currentPrice ?? h.avgPrice);
    invested += inv;
    current += cur;
    h.pnlAmount = parseFloat((cur - inv).toFixed(2));
    h.pnlPercent = inv > 0 ? parseFloat((((cur - inv) / inv) * 100).toFixed(2)) : 0;
  });
  this.totalInvested = parseFloat(invested.toFixed(2));
  this.currentValue = parseFloat(current.toFixed(2));
  this.totalPnL = parseFloat((((current - invested) / (invested || 1)) * 100).toFixed(2));
  return this;
};

PortfolioSchema.statics.getAllTickers = async function (this: IPortfolioModel): Promise<string[]> {
  const result = await this.aggregate([
    { $unwind: "$holdings" },
    { $group: { _id: "$holdings.ticker" } },
  ]);
  return result.map((r: { _id: string }) => r._id);
};

export const Portfolio =
  (mongoose.models.Portfolio as IPortfolioModel) ||
  mongoose.model<IPortfolio, IPortfolioModel>("Portfolio", PortfolioSchema);
