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
let listenersBound = false;
const MAX_RETRIES = 3;

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

  // Bind Mongoose events only once
  if (!listenersBound) {
    listenersBound = true;

    mongoose.connection.on("connected", () => {
      isConnected = true;
      retryCount = 0;
      console.log("✅ [DB] MongoDB connected");
    });

    mongoose.connection.on("error", (err: Error) => {
      if (!isConnected && retryCount >= MAX_RETRIES) return;
      console.error("❌ [DB] MongoDB error:", err.message);
    });

    mongoose.connection.on("disconnected", () => {
      isConnected = false;
      if (retryCount < MAX_RETRIES) {
        console.warn("⚠️  [DB] MongoDB disconnected — retrying...");
        scheduleReconnect();
      }
    });
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 4000,
      socketTimeoutMS: 15000,
    });
  } catch (err: any) {
    if (retryCount === 0) {
      console.error("❌ [DB] Connection failed:", err?.message || err);
      console.warn("ℹ️  [DB] If using MongoDB Atlas, make sure your IP is whitelisted in Atlas Network Access.");
    }
    if (retryCount < MAX_RETRIES) {
      scheduleReconnect();
    } else {
      console.warn("❌ [DB] Max reconnect attempts reached. Operating in in-memory mode (DB offline).");
    }
  }
}

function scheduleReconnect(): void {
  if (retryCount >= MAX_RETRIES) return;
  retryCount++;
  const delay = Math.min(1000 * 2 ** retryCount, 10000);
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
