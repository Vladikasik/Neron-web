import type { GraphData } from '../types/graph';

interface CacheEntry {
  data: GraphData;
  timestamp: number;
  version: number;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  updates: number;
  lastAccess: number;
}

class GraphCache {
  private cache: Map<string, CacheEntry> = new Map();
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    updates: 0,
    lastAccess: 0
  };
  private version = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: GraphData): void {
    this.version++;
    this.cache.set(key, {
      data: JSON.parse(JSON.stringify(data)), // Deep clone
      timestamp: Date.now(),
      version: this.version
    });
    this.metrics.updates++;
  }

  get(key: string): GraphData | null {
    const entry = this.cache.get(key);
    this.metrics.lastAccess = Date.now();

    if (!entry) {
      this.metrics.misses++;
      return null;
    }

    // Check if cache entry is expired
    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      this.metrics.misses++;
      return null;
    }

    this.metrics.hits++;
    return JSON.parse(JSON.stringify(entry.data)); // Deep clone
  }

  invalidate(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
    this.version++;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check expiration
    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  getMetrics(): CacheMetrics & { size: number; version: number } {
    return {
      ...this.metrics,
      size: this.cache.size,
      version: this.version
    };
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
    this.metrics = {
      hits: 0,
      misses: 0,
      updates: 0,
      lastAccess: 0
    };
    this.version = 0;
  }
}

// Singleton instance
export const graphCache = new GraphCache();

// Cache keys
export const CACHE_KEYS = {
  FULL_GRAPH: 'full_graph',
  FILTERED_GRAPH: 'filtered_graph',
  SEARCH_RESULTS: 'search_results'
} as const;

// Cache strategies
export const CacheStrategy = {
  // Always use cache if available
  CACHE_FIRST: 'cache_first',
  // Always fetch fresh data
  NETWORK_FIRST: 'network_first',
  // Use cache but refresh in background
  STALE_WHILE_REVALIDATE: 'stale_while_revalidate'
} as const;

export type CacheStrategyType = typeof CacheStrategy[keyof typeof CacheStrategy];

// Cleanup interval (run every 5 minutes)
if (typeof window !== 'undefined') {
  setInterval(() => {
    graphCache.cleanup();
  }, 5 * 60 * 1000);
} 