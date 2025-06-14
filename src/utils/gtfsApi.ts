
import { TransitData, BoundingBox } from '@/types/transit';
import { transitCache } from './transitCache';
import { overpassClient } from './overpassClient';
import { transitDataTransformer } from './transitDataTransformer';

export const fetchTransitData = async (bounds: BoundingBox): Promise<TransitData> => {
  // Clean up expired cache entries first
  transitCache.cleanup();
  
  // Check for immediate cached data first
  const immediateData = transitCache.getImmediate(bounds);
  if (immediateData) {
    // Return cached data immediately, but still fetch in background if needed
    const coverageCheck = transitCache.isBoundsCovered(bounds);
    if (coverageCheck.covered) {
      console.log('✅ Using immediate cached data, no background fetch needed');
      return immediateData;
    }
  }

  // Check exact cache match as fallback
  const cacheKey = transitCache.generateKey(bounds.south, bounds.west, bounds.north, bounds.east);
  const exactCached = transitCache.get(cacheKey);
  if (exactCached) {
    return exactCached;
  }

  console.log('🚌 Fetching NEW King County Metro transit data for bounds:', bounds);
  console.log('📍 Bounds:', {
    north: bounds.north,
    south: bounds.south,
    east: bounds.east,
    west: bounds.west
  });

  try {
    // Get optimal bounds to reduce future API calls
    const optimalBounds = transitCache.getOptimalFetchBounds(bounds);
    console.log('📈 Fetching with expanded bounds to improve caching:', optimalBounds);
    
    // Fetch data from Overpass API using optimal bounds
    const overpassData = await overpassClient.fetchTransitRoutes(optimalBounds);
    
    // Transform the data
    const transitData = transitDataTransformer.transformOverpassData(overpassData.elements);
    
    // Log summary
    transitDataTransformer.logTransitDataSummary(transitData);

    console.log('\n🗺️ OPTIMAL FETCH BOUNDS USED:');
    console.log(`   North: ${optimalBounds.north}`);
    console.log(`   South: ${optimalBounds.south}`);
    console.log(`   East: ${optimalBounds.east}`);
    console.log(`   West: ${optimalBounds.west}`);
    console.log('==========================================');

    // Cache the data with the optimal bounds
    const optimalCacheKey = transitCache.generateKey(
      optimalBounds.south, 
      optimalBounds.west, 
      optimalBounds.north, 
      optimalBounds.east
    );
    transitCache.set(optimalCacheKey, transitData, optimalBounds);
    
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
