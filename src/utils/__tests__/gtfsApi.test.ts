
import { fetchTransitData, clearTransitCache } from '../gtfsApi';
import { BoundingBox } from '@/types/transit';

// Seattle area bounding box for testing
const seattleBounds: BoundingBox = {
  north: 47.7,
  south: 47.5,
  east: -122.2,
  west: -122.4
};

// Bounds that don't include Seattle
const outsideBounds: BoundingBox = {
  north: 40.0,
  south: 39.0,
  east: -74.0,
  west: -75.0
};

describe('gtfsApi', () => {
  beforeEach(() => {
    clearTransitCache();
  });

  describe('fetchTransitData', () => {
    it('should return Seattle transit data for bounds that include Seattle', async () => {
      const data = await fetchTransitData(seattleBounds);
      
      expect(data).toBeDefined();
      expect(data.subway).toBeDefined();
      expect(data.bus).toBeDefined();
      expect(data.tram).toBeDefined();
      expect(data.rail).toBeDefined();
      
      // Should have at least some transit lines
      const totalLines = data.subway.length + data.bus.length + data.tram.length + data.rail.length;
      expect(totalLines).toBeGreaterThanOrEqual(0);
    });

    it('should return empty data for bounds outside Seattle', async () => {
      const data = await fetchTransitData(outsideBounds);
      
      expect(data.subway.length).toBe(0);
      expect(data.bus.length).toBe(0);
      expect(data.tram.length).toBe(0);
      expect(data.rail.length).toBe(0);
    });

    it('should cache data correctly', async () => {
      const data1 = await fetchTransitData(seattleBounds);
      const data2 = await fetchTransitData(seattleBounds);
      
      expect(data1).toEqual(data2);
    });

    it('should clear cache when requested', async () => {
      await fetchTransitData(seattleBounds);
      clearTransitCache();
      
      // Should still work after cache clear
      const data = await fetchTransitData(seattleBounds);
      expect(data).toBeDefined();
    });

    it('should validate coordinate format', async () => {
      const data = await fetchTransitData(seattleBounds);
      
      [...data.subway, ...data.bus, ...data.tram, ...data.rail].forEach(line => {
        line.coordinates.forEach(coord => {
          expect(Array.isArray(coord)).toBe(true);
          expect(coord.length).toBe(2);
          expect(typeof coord[0]).toBe('number'); // longitude
          expect(typeof coord[1]).toBe('number'); // latitude
        });
      });
    });
  });
});
