
import { TransitData, BoundingBox } from '@/types/transit';
import { transitCache } from './transitCache';
import { overpassClient } from './overpassClient';
import { transitDataTransformer } from './transitDataTransformer';

export const fetchTransitData = async (bounds: BoundingBox): Promise<TransitData> => {
  const cacheKey = transitCache.generateKey(bounds.south, bounds.west, bounds.north, bounds.east);
  
  // Check cache first
  const cached = transitCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  console.log('🚌 Fetching real King County Metro transit data for bounds:', bounds);
  console.log('📍 Bounds:', {
    north: bounds.north,
    south: bounds.south,
    east: bounds.east,
    west: bounds.west
  });

  try {
    // Fetch data from Overpass API
    const overpassData = await overpassClient.fetchTransitRoutes(bounds);
    
    // Transform the data
    const transitData = transitDataTransformer.transformOverpassData(overpassData.elements);
    
    // Log summary
    transitDataTransformer.logTransitDataSummary(transitData);

    console.log('\n🗺️ MAP BOUNDS USED:');
    console.log(`   North: ${bounds.north}`);
    console.log(`   South: ${bounds.south}`);
    console.log(`   East: ${bounds.east}`);
    console.log(`   West: ${bounds.west}`);
    console.log('==========================================');

    // Cache the data
    transitCache.set(cacheKey, transitData);
    
    return transitData;
  } catch (error) {
    console.error('❌ Error fetching King County Metro transit data:', error);
    console.error('📊 Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return {
      subway: [],
      bus: [],
      tram: [],
      rail: []
    };
  }
};

// Clear cache function
export const clearTransitCache = () => {
  transitCache.clear();
};
