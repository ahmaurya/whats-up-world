
import { TransitData } from '@/types/transit';

interface CacheEntry {
  data: TransitData;
  timestamp: number;
}

class TransitCache {
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  generateKey(south: number, west: number, north: number, east: number): string {
    return `king-county-metro-${south.toFixed(3)},${west.toFixed(3)},${north.toFixed(3)},${east.toFixed(3)}`;
  }

  get(key: string): TransitData | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('🚌 Using cached King County Metro transit data');
      return cached.data;
    }
    return null;
  }

  set(key: string, data: TransitData): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
    console.log('🧹 King County Metro transit data cache cleared');
  }
}

export const transitCache = new TransitCache();
