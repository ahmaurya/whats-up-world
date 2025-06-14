
import { TransitLine, TransitData, OverpassResponse, OverpassElement, BoundingBox } from '@/types/transit';

const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

// Color scheme for different transit types (Seattle-specific)
const TRANSIT_COLORS = {
  subway: '#0066CC',     // Seattle Link Light Rail blue
  bus: '#00AA44',        // King County Metro green
  tram: '#FF6600',       // Seattle Streetcar orange
  rail: '#8B5CF6'        // Purple for other rail
};

// Cache for API responses to reduce requests
const cache = new Map<string, { data: TransitData; timestamp: number }>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

export const fetchTransitData = async (bounds: BoundingBox): Promise<TransitData> => {
  const cacheKey = `${bounds.south.toFixed(4)},${bounds.west.toFixed(4)},${bounds.north.toFixed(4)},${bounds.east.toFixed(4)}`;
  
  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('Using cached transit data for bounds:', cacheKey);
    return cached.data;
  }

  const { north, south, east, west } = bounds;
  
  // More comprehensive Overpass QL query for Seattle area transit
  const query = `
    [out:json][timeout:25];
    (
      // Public transport routes
      relation["type"="route"]["route"~"^(subway|metro|light_rail|bus|tram|train)$"](${south},${west},${north},${east});
      
      // Additional ways that might be transit routes
      way["railway"~"^(light_rail|subway|tram)$"](${south},${west},${north},${east});
      way["public_transport"="platform"]["bus"="yes"](${south},${west},${north},${east});
    );
    (._;>;);
    out geom;
  `;

  try {
    console.log('Fetching transit data from Overpass API for bounds:', bounds);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout

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

  console.log(`Processing ${relations.length} relations and ${ways.length} ways`);

  // Process relations (routes)
  relations.forEach((relation) => {
    if (!relation.tags) return;

    const routeType = relation.tags.route;
    if (!routeType) return;

    const name = relation.tags.name || relation.tags.ref || `Route ${relation.id}`;
    const operator = relation.tags.operator;
    const ref = relation.tags.ref;
    
    console.log(`Processing route: ${name} (type: ${routeType})`);
    
    // Extract coordinates from relation geometry or member ways
    let coordinates: [number, number][] = [];
    
    if (relation.geometry && relation.geometry.length > 0) {
      // Use relation geometry if available
      coordinates = relation.geometry.map(point => [point.lon, point.lat]);
      console.log(`Using relation geometry: ${coordinates.length} points`);
    } else {
      // Fallback to processing member ways
      const memberWays = relation.members
        ?.filter(member => member.type === 'way')
        .map(member => ways.find(way => way.id === member.ref))
        .filter(Boolean) || [];

      console.log(`Processing ${memberWays.length} member ways for ${name}`);

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

      console.log(`Adding ${transitType} line: ${name} with ${coordinates.length} coordinates`);
      
      if (transitType in transitData) {
        transitData[transitType].push(transitLine);
      }
    } else {
      console.log(`Skipping route ${name} - insufficient coordinates (${coordinates.length})`);
    }
  });

  // Process individual ways (for railway lines without relations)
  ways.forEach((way) => {
    if (!way.tags || !way.geometry) return;

    const railway = way.tags.railway;
    if (!railway || !['light_rail', 'subway', 'tram'].includes(railway)) return;

    const name = way.tags.name || `${railway} ${way.id}`;
    const coordinates = way.geometry.map(point => [point.lon, point.lat] as [number, number]);

    if (coordinates.length >= 2) {
      const transitType = mapRouteType(railway);
      const transitLine: TransitLine = {
        id: way.id.toString(),
        name,
        type: transitType,
        coordinates,
        color: TRANSIT_COLORS[transitType],
        operator: way.tags.operator,
        ref: way.tags.ref
      };

      console.log(`Adding ${transitType} way: ${name} with ${coordinates.length} coordinates`);
      
      if (transitType in transitData) {
        transitData[transitType].push(transitLine);
      }
    }
  });

  const summary = {
    subway: transitData.subway.length,
    bus: transitData.bus.length,
    tram: transitData.tram.length,
    rail: transitData.rail.length
  };
  
  console.log('Processed transit data summary:', summary);

  return transitData;
};

const mapRouteType = (routeType: string): keyof TransitData => {
  const type = routeType.toLowerCase();
  
  switch (type) {
    case 'subway':
    case 'metro':
    case 'light_rail':
      return 'subway';
    case 'bus':
      return 'bus';
    case 'tram':
    case 'streetcar':
      return 'tram';
    case 'train':
    case 'railway':
    case 'rail':
      return 'rail';
    default:
      console.log(`Unknown route type: ${routeType}, defaulting to bus`);
      return 'bus';
  }
};

// Clear cache function for manual cache management
export const clearTransitCache = () => {
  cache.clear();
  console.log('Transit data cache cleared');
};
