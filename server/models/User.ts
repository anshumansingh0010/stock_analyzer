import mongoose, { Document, Schema, Model } from "mongoose";

export interface IUser extends Document {
  id: string;
  name: string;
  email: string;
  phone?: string;
  handle: string;
  since: string;
  avatarUrl: string;
  provider: string;
}

const UserSchema: Schema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    handle: { type: String, required: true },
    since: { type: String, required: true },
    avatarUrl: { type: String, required: true },
    provider: { type: String, required: true },
  },
  { timestamps: true }
);

// Prevent Next.js / dev hot-reload model overwriting error
export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
