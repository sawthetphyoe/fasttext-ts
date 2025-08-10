import type { DetectionResult } from './types';

interface CacheEntry {
  result: DetectionResult;
  timestamp: number;
}

export class DetectionCache {
  private cache: Map<string, CacheEntry>;
  private readonly maxSize: number;
  private readonly ttl: number; // in milliseconds

  constructor(maxSize = 1000, ttl = 3600000) { // 1 hour default TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  /**
   * Get a cached result if it exists and is not expired
   */
  get(text: string): DetectionResult | null {
    const entry = this.cache.get(text);
    
    if (!entry) {
      return null;
    }

    // Check if entry is expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(text);
      return null;
    }

    return entry.result;
  }

  /**
   * Store a result in the cache
   */
  set(text: string, result: DetectionResult): void {
    // If cache is full, remove oldest entry
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(text, {
      result,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; ttl: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl,
    };
  }
}