
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
    // Use rounded coordinates to increase cache hits for similar areas
    const roundedBounds = {
      north: Math.round(bounds.north * 1000) / 1000,
      south: Math.round(bounds.south * 1000) / 1000,
      east: Math.round(bounds.east * 1000) / 1000,
      west: Math.round(bounds.west * 1000) / 1000
    };
    return `${source}_${roundedBounds.north}_${roundedBounds.south}_${roundedBounds.east}_${roundedBounds.west}`;
  }

  private boundsOverlap(bounds1: any, bounds2: any, overlapThreshold = 0.7): boolean {
    const intersection = {
      north: Math.min(bounds1.north, bounds2.north),
      south: Math.max(bounds1.south, bounds2.south),
      east: Math.min(bounds1.east, bounds2.east),
      west: Math.max(bounds1.west, bounds2.west)
    };

    // Check if there's actual intersection
    if (intersection.north <= intersection.south || intersection.east <= intersection.west) {
      return false;
    }

    // Calculate overlap area vs requested area
    const intersectionArea = (intersection.north - intersection.south) * (intersection.east - intersection.west);
    const requestedArea = (bounds2.north - bounds2.south) * (bounds2.east - bounds2.west);
    
    return (intersectionArea / requestedArea) >= overlapThreshold;
  }

  get(source: string, bounds: any): any[] | null {
    // First try exact match with rounded bounds
    const exactKey = this.generateCacheKey(source, bounds);
    const exactMatch = this.cache.get(exactKey);
    
    if (exactMatch && Date.now() - exactMatch.timestamp < this.cacheExpiry) {
      console.log(`📦 Cache hit for ${source} (exact match)`);
      return exactMatch.data;
    }

    // Try to find overlapping cached areas
    for (const [key, cached] of this.cache.entries()) {
      if (key.startsWith(source) && 
          Date.now() - cached.timestamp < this.cacheExpiry &&
          this.boundsOverlap(cached.bounds, bounds)) {
        console.log(`📦 Cache hit for ${source} (overlapping bounds)`);
        // Filter images to only return those within the requested bounds
        return cached.data.filter((image: any) => 
          image.latitude >= bounds.south && 
          image.latitude <= bounds.north &&
          image.longitude >= bounds.west && 
          image.longitude <= bounds.east
        );
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
