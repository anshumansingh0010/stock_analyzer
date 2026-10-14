export class TTLCache<T> {
  private cache = new Map<string, { data: T; expiresAt: number }>();
  private defaultTtlMs: number;

  constructor(defaultTtlMs: number = 60_000) {
    this.defaultTtlMs = defaultTtlMs;
  }

  get<R = T>(key: string): R | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as unknown as R;
  }

  set(key: string, data: T, ttlMs?: number): void {
    this.cache.set(key, { 
      data, 
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs) 
    });
  }

  async getOrSet<R = T>(key: string, fetchFn: () => Promise<R>, ttlMs?: number): Promise<R> {
    const cached = this.get<R>(key);
    if (cached !== null) return cached;
    
    const data = await fetchFn();
    this.set(key, data as unknown as T, ttlMs);
    return data;
  }

  clear(): void {
    this.cache.clear();
  }
}

// Global market data cache instance
export const marketCache = new TTLCache<any>(60_000);
