import mongoose, { Document, Schema, Model } from "mongoose";

export interface IPriceAlert extends Document {
  userId: string;
  ticker: string;
  targetPrice: number;
  condition: "ABOVE" | "BELOW";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PriceAlertSchema = new Schema<IPriceAlert>(
  {
    userId: { type: String, required: true, index: true },
    ticker: { type: String, required: true, index: true },
    targetPrice: { type: Number, required: true },
    condition: { type: String, enum: ["ABOVE", "BELOW"], required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const PriceAlert: Model<IPriceAlert> = mongoose.models.PriceAlert || mongoose.model<IPriceAlert>("PriceAlert", PriceAlertSchema);
