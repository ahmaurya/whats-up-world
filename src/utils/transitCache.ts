
import { TransitData, BoundingBox } from '@/types/transit';

interface CacheEntry {
  data: TransitData;
  timestamp: number;
  bounds: BoundingBox;
}

class TransitCache {
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  generateKey(south: number, west: number, north: number, east: number): string {
    return `king-county-metro-${south.toFixed(3)},${west.toFixed(3)},${north.toFixed(3)},${east.toFixed(3)}`;
  }

  // Get immediate cached data if available
  getImmediate(requestedBounds: BoundingBox): TransitData | null {
    const coverageCheck = this.isBoundsCovered(requestedBounds);
    if (coverageCheck.covered && coverageCheck.cachedData) {
      console.log('🚀 Using immediate cached data for faster display');
      return coverageCheck.cachedData;
    }
    return null;
  }

  // Check if a bounding box is covered by existing cached data
  isBoundsCovered(requestedBounds: BoundingBox): { covered: boolean; cachedData?: TransitData } {
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      // Skip expired entries
      if (now - entry.timestamp >= this.CACHE_DURATION) {
        this.cache.delete(key);
        continue;
      }
      
      // Check if requested bounds are within cached bounds (with small buffer)
      const buffer = 0.002; // Small buffer to account for minor map movements
      const cachedBounds = entry.bounds;
      
      if (requestedBounds.north <= cachedBounds.north + buffer &&
          requestedBounds.south >= cachedBounds.south - buffer &&
          requestedBounds.east <= cachedBounds.east + buffer &&
          requestedBounds.west >= cachedBounds.west - buffer) {
        
        console.log('🎯 Found cached data that covers requested bounds');
        console.log('📊 Cached bounds:', cachedBounds);
        console.log('📊 Requested bounds:', requestedBounds);
        
        return { covered: true, cachedData: entry.data };
      }
    }
    
    return { covered: false };
  }

  get(key: string): TransitData | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('🚌 Using exact cached King County Metro transit data');
      return cached.data;
    }
    return null;
  }

  set(key: string, data: TransitData, bounds: BoundingBox): void {
    this.cache.set(key, { data, timestamp: Date.now(), bounds });
    console.log(`💾 Cached transit data for bounds: ${JSON.stringify(bounds)}`);
  }

  // Get the optimal bounds to fetch that covers the requested area plus uncovered adjacent areas
  getOptimalFetchBounds(requestedBounds: BoundingBox): BoundingBox {
    // Expand bounds slightly to reduce future API calls
    const expansion = 0.01; // Expand by ~1km in each direction
    
    return {
      north: requestedBounds.north + expansion,
      south: requestedBounds.south - expansion,
      east: requestedBounds.east + expansion,
      west: requestedBounds.west - expansion
    };
  }

  clear(): void {
    this.cache.clear();
    console.log('🧹 King County Metro transit data cache cleared');
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= this.CACHE_DURATION) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired cache entries`);
    }
  }
}

export const transitCache = new TransitCache();
