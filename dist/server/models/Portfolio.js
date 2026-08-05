/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║       NIFTY50GPT — LAYER 6: MONGOOSE MODELS                        ║
 * ║       server/models/Portfolio.ts                                   ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */
import mongoose, { Schema } from "mongoose";
const HoldingSchema = new Schema({
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
}, { _id: false });
const PortfolioSchema = new Schema({
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
}, {
    timestamps: true,
});
PortfolioSchema.methods.recomputePnL = function () {
    let invested = 0;
    let current = 0;
    this.holdings.forEach((h) => {
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
PortfolioSchema.statics.getAllTickers = async function () {
    const result = await this.aggregate([
        { $unwind: "$holdings" },
        { $group: { _id: "$holdings.ticker" } },
    ]);
    return result.map((r) => r._id);
};
export const Portfolio = mongoose.model("Portfolio", PortfolioSchema);
export default Portfolio;
