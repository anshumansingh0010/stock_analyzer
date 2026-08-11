import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAlert extends Document {
  title: string;
  body: string;
  sentiment: string;
  urgency: string;
  cta: string;
  eventType: string;
  ticker: string;
  stockName: string;
  change: number | string;
  holdsStock: boolean;
  meta: {
    model?: string;
    tokens?: number;
    generatedAt: string;
  };
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AlertSchema = new Schema<IAlert>(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
    sentiment: { type: String, default: "NEUTRAL" },
    urgency: { type: String, default: "LOW" },
    cta: { type: String, default: "" },
    eventType: { type: String, required: true },
    ticker: { type: String, required: true },
    stockName: { type: String, required: true },
    change: { type: Schema.Types.Mixed, default: 0 },
    holdsStock: { type: Boolean, default: false },
    meta: {
      model: { type: String },
      tokens: { type: Number },
      generatedAt: { type: String },
    },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Alert: Model<IAlert> = mongoose.models.Alert || mongoose.model<IAlert>("Alert", AlertSchema);
