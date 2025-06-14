
import { TransitLine, TransitData, OverpassResponse, OverpassElement, BoundingBox } from '@/types/transit';

const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

// Color scheme for different transit types
const TRANSIT_COLORS = {
  subway: '#3b82f6',  // Blue
  bus: '#10b981',     // Green  
  tram: '#f59e0b',    // Amber
  rail: '#8b5cf6'     // Purple
};

// Cache for API responses to reduce requests
const cache = new Map<string, { data: TransitData; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const fetchTransitData = async (bounds: BoundingBox): Promise<TransitData> => {
  const cacheKey = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
  
  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('Using cached transit data');
    return cached.data;
  }

  const { north, south, east, west } = bounds;
  
  // Optimized Overpass QL query for transit routes
  const query = `
    [out:json][timeout:30];
    (
      relation["type"="route"]["route"~"^(subway|metro|bus|tram|train|light_rail)$"](${south},${west},${north},${east});
    );
    (._;>;);
    out geom;
  `;

  try {
    console.log('Fetching transit data from Overpass API...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout

    const response = await fetch(OVERPASS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: OverpassResponse = await response.json();
    console.log(`Received ${data.elements.length} elements from Overpass API`);
    
    const processedData = processTransitData(data);
    
    // Cache the processed data
    cache.set(cacheKey, { data: processedData, timestamp: Date.now() });
    
    return processedData;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('Transit data request timed out');
    } else {
      console.error('Error fetching transit data:', error);
    }
    
    // Return empty data on error
    return {
      subway: [],
      bus: [],
      tram: [],
      rail: []
    };
  }
};

const processTransitData = (data: OverpassResponse): TransitData => {
  const transitData: TransitData = {
    subway: [],
    bus: [],
    tram: [],
    rail: []
  };

  // Group elements by type for easier processing
  const relations = data.elements.filter(el => el.type === 'relation') as Array<OverpassElement & { type: 'relation' }>;
  const ways = data.elements.filter(el => el.type === 'way') as Array<OverpassElement & { type: 'way' }>;
  const nodes = new Map(
    data.elements
      .filter(el => el.type === 'node')
      .map(node => [node.id, node as OverpassElement & { type: 'node' }])
  );

  relations.forEach((relation) => {
    if (!relation.tags || !relation.tags.route) return;

    const routeType = relation.tags.route;
    const name = relation.tags.name || relation.tags.ref || `Route ${relation.id}`;
    const operator = relation.tags.operator;
    const ref = relation.tags.ref;
    
    // Extract coordinates from relation geometry or member ways
    let coordinates: [number, number][] = [];
    
    if (relation.geometry && relation.geometry.length > 0) {
      // Use relation geometry if available
      coordinates = relation.geometry.map(point => [point.lon, point.lat]);
    } else {
      // Fallback to processing member ways
      const memberWays = relation.members
        ?.filter(member => member.type === 'way')
        .map(member => ways.find(way => way.id === member.ref))
        .filter(Boolean) || [];

      for (const way of memberWays) {
        if (way?.geometry) {
          const wayCoords = way.geometry.map(point => [point.lon, point.lat] as [number, number]);
          coordinates.push(...wayCoords);
        }
      }
    }

    // Only create transit line if we have sufficient coordinates
    if (coordinates.length >= 2) {
      const transitType = mapRouteType(routeType);
      const transitLine: TransitLine = {
        id: relation.id.toString(),
        name,
        type: transitType,
        coordinates,
        color: relation.tags.colour || TRANSIT_COLORS[transitType],
        operator,
        ref
      };

      if (transitType in transitData) {
        transitData[transitType].push(transitLine);
      }
    }
  });

  console.log('Processed transit data:', {
    subway: transitData.subway.length,
    bus: transitData.bus.length,
    tram: transitData.tram.length,
    rail: transitData.rail.length
  });

  return transitData;
};

const mapRouteType = (routeType: string): keyof TransitData => {
  const type = routeType.toLowerCase();
  
  switch (type) {
    case 'subway':
    case 'metro':
      return 'subway';
    case 'bus':
      return 'bus';
    case 'tram':
    case 'light_rail':
      return 'tram';
    case 'train':
    case 'railway':
      return 'rail';
    default:
      return 'bus'; // Default fallback
  }
};

// Clear cache function for manual cache management
export const clearTransitCache = () => {
  cache.clear();
  console.log('Transit data cache cleared');
};
