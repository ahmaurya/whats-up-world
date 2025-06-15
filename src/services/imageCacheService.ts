
export interface CachedImage {
  data: any;
  timestamp: number;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

class ImageCacheService {
  private cache = new Map<string, CachedImage>();
  private cacheExpiry = 10 * 60 * 1000; // 10 minutes
  private maxCacheSize = 100; // Maximum number of cached entries

  private generateCacheKey(source: string, bounds: any): string {
    return `${source}_${bounds.north}_${bounds.south}_${bounds.east}_${bounds.west}`;
  }

  private isWithinBounds(cachedBounds: any, requestedBounds: any, tolerance = 0.001): boolean {
    return (
      Math.abs(cachedBounds.north - requestedBounds.north) <= tolerance &&
      Math.abs(cachedBounds.south - requestedBounds.south) <= tolerance &&
      Math.abs(cachedBounds.east - requestedBounds.east) <= tolerance &&
      Math.abs(cachedBounds.west - requestedBounds.west) <= tolerance
    );
  }

  get(source: string, bounds: any): any[] | null {
    // First try exact match
    const exactKey = this.generateCacheKey(source, bounds);
    const exactMatch = this.cache.get(exactKey);
    
    if (exactMatch && Date.now() - exactMatch.timestamp < this.cacheExpiry) {
      console.log(`📦 Cache hit for ${source} (exact match)`);
      return exactMatch.data;
    }

    // Try to find a close match
    for (const [key, cached] of this.cache.entries()) {
      if (key.startsWith(source) && 
          Date.now() - cached.timestamp < this.cacheExpiry &&
          this.isWithinBounds(cached.bounds, bounds)) {
        console.log(`📦 Cache hit for ${source} (close match)`);
        return cached.data;
      }
    }

    console.log(`📦 Cache miss for ${source}`);
    return null;
  }

  set(source: string, bounds: any, data: any[]): void {
    const key = this.generateCacheKey(source, bounds);
    
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      bounds
    });

    console.log(`📦 Cached ${data.length} items for ${source}`);
  }

  clear(): void {
    this.cache.clear();
    console.log('📦 Cache cleared');
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp >= this.cacheExpiry) {
        this.cache.delete(key);
      }
    }
    console.log('📦 Cache cleanup completed');
  }
}

export const imageCacheService = new ImageCacheService();
