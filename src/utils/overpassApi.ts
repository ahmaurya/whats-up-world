
import { TransitLine, TransitData, OverpassResponse } from '@/types/transit';

const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

// Color scheme for different transit types
const TRANSIT_COLORS = {
  subway: '#3b82f6',  // Blue
  bus: '#10b981',     // Green
  tram: '#f59e0b',    // Amber
  rail: '#8b5cf6'     // Purple
};

export const fetchTransitData = async (
  bounds: { north: number; south: number; east: number; west: number }
): Promise<TransitData> => {
  const { north, south, east, west } = bounds;
  
  // Overpass QL query to fetch transit routes
  const query = `
    [out:json][timeout:25];
    (
      relation["type"="route"]["route"~"^(subway|bus|tram|train)$"](${south},${west},${north},${east});
    );
    out geom;
  `;

  try {
    const response = await fetch(OVERPASS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: query,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: OverpassResponse = await response.json();
    
    return processTransitData(data);
  } catch (error) {
    console.error('Error fetching transit data:', error);
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

  data.elements.forEach((element) => {
    if (element.type === 'relation' && element.tags && element.geometry) {
      const routeType = element.tags.route;
      const name = element.tags.name || element.tags.ref || `Route ${element.id}`;
      
      // Convert geometry to coordinates array
      const coordinates: [number, number][] = element.geometry
        .filter(point => point.lat && point.lon)
        .map(point => [point.lon, point.lat]);

      if (coordinates.length < 2) return; // Skip routes with insufficient points

      const transitLine: TransitLine = {
        id: element.id.toString(),
        name,
        type: mapRouteType(routeType),
        coordinates,
        color: TRANSIT_COLORS[mapRouteType(routeType)]
      };

      const category = mapRouteType(routeType);
      if (category in transitData) {
        transitData[category].push(transitLine);
      }
    }
  });

  return transitData;
};

const mapRouteType = (routeType: string): keyof TransitData => {
  switch (routeType) {
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
