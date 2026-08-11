/**
 * Per-key LLM rate-limit queues.
 *
 * Gemini free tier = 15 RPM per key → 1 request every ~4.2s per key.
 * Chat key and analysis key each have their own independent queue
 * so they don't throttle each other.
 *
 * Uses promise chaining to guarantee serial execution — each caller
 * waits for the previous one to complete before starting its gap timer.
 */

const MIN_GAP_MS = 4_200; // ~14 RPM — just under the 15 RPM free-tier cap

function makeQueue() {
  let lastCallAt = 0;
  let pendingCount = 0;
  let chain: Promise<void> = Promise.resolve();

  return {
    depth: () => pendingCount,
    enqueue: async <T>(fn: () => Promise<T>): Promise<T> => {
      pendingCount++;
      try {
        return await new Promise<T>((resolve, reject) => {
          chain = chain
            .then(async () => {
              const wait = Math.max(0, lastCallAt + MIN_GAP_MS - Date.now());
              if (wait > 0) await new Promise((r) => setTimeout(r, wait));
              lastCallAt = Date.now();
              try {
                const res = await fn();
                resolve(res);
              } catch (err) {
                reject(err);
              }
            })
            .catch(() => {
              // Swallow chain errors so a failed call doesn't break
              // subsequent queued calls. The actual error is propagated
              // via the reject() above.
            });
        });
      } finally {
        pendingCount--;
      }
    },
  };
}

// One queue per API key bucket
export const analysisQueue = makeQueue(); // used by withRetry (news/stock/market analyzers)
export const chatQueue = makeQueue();     // used by chat() / chatStream()
