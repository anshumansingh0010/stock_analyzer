export class TTLCache<T> {
  private cache = new Map<string, { data: T; expiresAt: number }>();
  private defaultTtlMs: number;

  constructor(defaultTtlMs: number = 60_000) {
    this.defaultTtlMs = defaultTtlMs;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: T, ttlMs?: number): void {
    this.cache.set(key, { 
      data, 
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs) 
    });
  }

  async getOrSet(key: string, fetchFn: () => Promise<T>, ttlMs?: number): Promise<T> {
    const cached = this.get(key);
    if (cached !== null) return cached;
    
    const data = await fetchFn();
    this.set(key, data, ttlMs);
    return data;
  }

  clear(): void {
    this.cache.clear();
  }
}

// Global market data cache instance
export const marketCache = new TTLCache<any>(60_000);
