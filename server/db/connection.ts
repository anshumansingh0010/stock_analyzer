/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║       NIFTY50GPT — LAYER 6: DATABASE CONNECTION                    ║
 * ║       Mongoose + MongoDB Atlas / local connection                  ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import mongoose from "mongoose";

export interface DBStatus {
  connected: boolean;
  readyState: number;
  host: string | null;
}

let isConnected = false;
let retryCount = 0;
const MAX_RETRIES = 5;

/**
 * Connect to MongoDB.
 * Uses MONGODB_URI from env (Atlas or local).
 * Retries up to MAX_RETRIES times on failure.
 */
export async function connectDB(): Promise<void> {
  if (isConnected) return;

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn("⚠️  [DB] MONGODB_URI not set — running WITHOUT database (in-memory mode).");
    console.warn("     Set MONGODB_URI in .env to enable Layer 6 persistence.");
    return;
  }

  mongoose.set("strictQuery", false);

  // Mongoose events
  mongoose.connection.on("connected", () => {
    isConnected = true;
    retryCount = 0;
    console.log("✅ [DB] MongoDB connected");
  });

  mongoose.connection.on("error", (err: Error) => {
    console.error("❌ [DB] MongoDB error:", err.message);
  });

  mongoose.connection.on("disconnected", () => {
    isConnected = false;
    console.warn("⚠️  [DB] MongoDB disconnected — retrying...");
    scheduleReconnect();
  });

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    });
  } catch (err: any) {
    console.error("❌ [DB] Initial connection failed:", err?.message || err);
    scheduleReconnect();
  }
}

function scheduleReconnect(): void {
  if (retryCount >= MAX_RETRIES) {
    console.error("❌ [DB] Max reconnect attempts reached. Continuing without DB.");
    return;
  }
  retryCount++;
  const delay = Math.min(1000 * 2 ** retryCount, 30000);
  console.log(`[DB] Reconnecting in ${delay / 1000}s (attempt ${retryCount}/${MAX_RETRIES})`);
  setTimeout(connectDB, delay);
}

export function getDBStatus(): DBStatus {
  return {
    connected: isConnected,
    readyState: mongoose.connection.readyState,
    host: isConnected ? mongoose.connection.host : null,
  };
}
