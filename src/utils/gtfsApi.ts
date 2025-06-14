
import { TransitLine, TransitData, BoundingBox } from '@/types/transit';

// GTFS Real-time API endpoints for Seattle area
const KING_COUNTY_METRO_API = 'https://s3.amazonaws.com/kcm-alerts-realtime-prod/gtfsrt-vehiclepositions';
const SOUND_TRANSIT_API = 'https://s3.amazonaws.com/kingcounty-metro-gtfs/gtfs.zip';

// Static route data for major Seattle transit lines
const SEATTLE_TRANSIT_ROUTES = {
  lightRail: [
    {
      id: 'link-1-line',
      name: '1 Line (Northgate to Angle Lake)',
      type: 'subway' as const,
      color: '#0066CC',
      operator: 'Sound Transit',
      coordinates: [
        [-122.334437, 47.761689], // Northgate
        [-122.341614, 47.734150], // Roosevelt
        [-122.317375, 47.669952], // U District
        [-122.304688, 47.661378], // University of Washington
        [-122.303886, 47.649648], // Capitol Hill
        [-122.320328, 47.614848], // Westlake
        [-122.337189, 47.609722], // University Street
        [-122.327774, 47.602038], // Pioneer Square
        [-122.329597, 47.598445], // International District/Chinatown
        [-122.315102, 47.571415], // Stadium
        [-122.315788, 47.568710], // SODO
        [-122.327538, 47.540790], // Beacon Hill
        [-122.281471, 47.522098], // Mount Baker
        [-122.269206, 47.515626], // Columbia City
        [-122.257919, 47.515023], // Othello
        [-122.257347, 47.508990], // Rainier Beach
        [-122.296564, 47.471671], // Tukwila International Boulevard
        [-122.347160, 47.460710], // SeaTac/Airport
        [-122.298077, 47.422303]  // Angle Lake
      ] as [number, number][]
    }
  ],
  busRoutes: [
    {
      id: 'route-44',
      name: 'Route 44 (Ballard to University District)',
      type: 'bus' as const,
      color: '#00AA44',
      operator: 'King County Metro',
      coordinates: [
        [-122.383736, 47.668207], // Ballard
        [-122.375031, 47.663867],
        [-122.365112, 47.661972],
        [-122.354279, 47.660435],
        [-122.342987, 47.659447],
        [-122.331982, 47.659206],
        [-122.319336, 47.659847],
        [-122.307816, 47.661490],
        [-122.305031, 47.665859]  // University District
      ] as [number, number][]
    },
    {
      id: 'route-8',
      name: 'Route 8 (Capitol Hill to South Lake Union)',
      type: 'bus' as const,
      color: '#00AA44',
      operator: 'King County Metro',
      coordinates: [
        [-122.304688, 47.661378], // Capitol Hill
        [-122.315788, 47.652428],
        [-122.324905, 47.641428],
        [-122.331543, 47.628428],
        [-122.337189, 47.609722], // Downtown
        [-122.342987, 47.620859], // South Lake Union
        [-122.347755, 47.627932]
      ] as [number, number][]
    }
  ],
  streetcar: [
    {
      id: 'first-hill-streetcar',
      name: 'First Hill Streetcar',
      type: 'tram' as const,
      color: '#FF6600',
      operator: 'Seattle Streetcar',
      coordinates: [
        [-122.330017, 47.607832], // Pioneer Square
        [-122.324219, 47.608520],
        [-122.318420, 47.609722],
        [-122.314453, 47.612524],
        [-122.311668, 47.616326],
        [-122.309570, 47.620928],
        [-122.307816, 47.625530],
        [-122.306061, 47.630132]  // Capitol Hill
      ] as [number, number][]
    }
  ]
};

// Cache for static route data
const cache = new Map<string, { data: TransitData; timestamp: number }>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes for static data

export const fetchTransitData = async (bounds: BoundingBox): Promise<TransitData> => {
  const cacheKey = `seattle-transit-${bounds.south.toFixed(3)},${bounds.west.toFixed(3)},${bounds.north.toFixed(3)},${bounds.east.toFixed(3)}`;
  
  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('Using cached Seattle transit data');
    return cached.data;
  }

  console.log('Fetching Seattle transit data for bounds:', bounds);

  try {
    // Initialize transit data structure
    const transitData: TransitData = {
      subway: [],
      bus: [],
      tram: [],
      rail: []
    };

    console.log('Processing Light Rail routes...');
    // Process Light Rail
    SEATTLE_TRANSIT_ROUTES.lightRail.forEach(route => {
      console.log(`Checking light rail route: ${route.name}`);
      console.log(`Route coordinates sample:`, route.coordinates.slice(0, 3));
      
      if (routeIntersectsBounds(route.coordinates, bounds)) {
        transitData.subway.push({
          id: route.id,
          name: route.name,
          type: route.type,
          coordinates: route.coordinates,
          color: route.color,
          operator: route.operator
        });
        console.log(`✓ Added light rail: ${route.name} with ${route.coordinates.length} coordinates`);
      } else {
        console.log(`✗ Light rail ${route.name} does not intersect bounds`);
      }
    });

    console.log('Processing Bus routes...');
    // Process Bus Routes
    SEATTLE_TRANSIT_ROUTES.busRoutes.forEach(route => {
      console.log(`Checking bus route: ${route.name}`);
      console.log(`Route coordinates sample:`, route.coordinates.slice(0, 3));
      
      if (routeIntersectsBounds(route.coordinates, bounds)) {
        transitData.bus.push({
          id: route.id,
          name: route.name,
          type: route.type,
          coordinates: route.coordinates,
          color: route.color,
          operator: route.operator
        });
        console.log(`✓ Added bus route: ${route.name} with ${route.coordinates.length} coordinates`);
      } else {
        console.log(`✗ Bus route ${route.name} does not intersect bounds`);
      }
    });

    console.log('Processing Streetcar routes...');
    // Process Streetcar
    SEATTLE_TRANSIT_ROUTES.streetcar.forEach(route => {
      console.log(`Checking streetcar route: ${route.name}`);
      console.log(`Route coordinates sample:`, route.coordinates.slice(0, 3));
      
      if (routeIntersectsBounds(route.coordinates, bounds)) {
        transitData.tram.push({
          id: route.id,
          name: route.name,
          type: route.type,
          coordinates: route.coordinates,
          color: route.color,
          operator: route.operator
        });
        console.log(`✓ Added streetcar: ${route.name} with ${route.coordinates.length} coordinates`);
      } else {
        console.log(`✗ Streetcar ${route.name} does not intersect bounds`);
      }
    });

    const summary = {
      subway: transitData.subway.length,
      bus: transitData.bus.length,
      tram: transitData.tram.length,
      rail: transitData.rail.length
    };
    
    console.log('Seattle transit data processing complete. Summary:', summary);
    console.log('Bounds used for filtering:', bounds);

    // Cache the data
    cache.set(cacheKey, { data: transitData, timestamp: Date.now() });
    
    return transitData;
  } catch (error) {
    console.error('Error processing Seattle transit data:', error);
    return {
      subway: [],
      bus: [],
      tram: [],
      rail: []
    };
  }
};

// Helper function to check if a route intersects with the given bounds
const routeIntersectsBounds = (coordinates: [number, number][], bounds: BoundingBox): boolean => {
  console.log(`Checking route intersection with bounds: ${JSON.stringify(bounds)}`);
  console.log(`Route has ${coordinates.length} coordinates`);
  
  const intersects = coordinates.some(([lng, lat]) => {
    const withinBounds = lng >= bounds.west && 
                        lng <= bounds.east && 
                        lat >= bounds.south && 
                        lat <= bounds.north;
    
    if (withinBounds) {
      console.log(`Found intersection at coordinate: [${lng}, ${lat}]`);
    }
    
    return withinBounds;
  });
  
  console.log(`Route intersection result: ${intersects}`);
  return intersects;
};

// Clear cache function
export const clearTransitCache = () => {
  cache.clear();
  console.log('Seattle transit data cache cleared');
};
