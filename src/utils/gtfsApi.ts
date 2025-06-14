
import { TransitLine, TransitData, BoundingBox } from '@/types/transit';

// King County Metro GTFS Real-time API endpoints
const KING_COUNTY_METRO_GTFS_STATIC = 'https://www.soundtransit.org/GTFS/google_transit.zip';
const KING_COUNTY_METRO_VEHICLE_POSITIONS = 'https://s3.amazonaws.com/kcm-alerts-realtime-prod/gtfsrt-vehiclepositions';
const KING_COUNTY_METRO_TRIP_UPDATES = 'https://s3.amazonaws.com/kcm-alerts-realtime-prod/gtfsrt-tripupdates';

// Overpass API for Seattle area transit infrastructure
const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

// Cache for transit data
const cache = new Map<string, { data: TransitData; timestamp: number }>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes for real-time data

export const fetchTransitData = async (bounds: BoundingBox): Promise<TransitData> => {
  const cacheKey = `king-county-metro-${bounds.south.toFixed(3)},${bounds.west.toFixed(3)},${bounds.north.toFixed(3)},${bounds.east.toFixed(3)}`;
  
  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('🚌 Using cached King County Metro transit data');
    return cached.data;
  }

  console.log('🚌 Fetching real King County Metro transit data for bounds:', bounds);
  console.log('📍 Bounds:', {
    north: bounds.north,
    south: bounds.south,
    east: bounds.east,
    west: bounds.west
  });

  try {
    // Initialize transit data structure
    const transitData: TransitData = {
      subway: [],
      bus: [],
      tram: [],
      rail: []
    };

    // Fetch transit routes from Overpass API for Seattle area
    const overpassQuery = `
      [out:json][timeout:25];
      (
        relation["route"="subway"]["network"~"Sound Transit|Link Light Rail"]["public_transport"="route"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        relation["route"="light_rail"]["network"~"Sound Transit|Link Light Rail"]["public_transport"="route"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        relation["route"="bus"]["network"~"King County Metro|Metro Transit"]["public_transport"="route"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        relation["route"="tram"]["network"~"Seattle Streetcar"]["public_transport"="route"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        relation["route"="train"]["network"~"Sound Transit"]["public_transport"="route"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      );
      (._;>;);
      out geom;
    `;

    console.log('🌐 Querying Overpass API for Seattle transit routes...');
    console.log('📋 Overpass Query:', overpassQuery);

    const overpassResponse = await fetch(OVERPASS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(overpassQuery)}`
    });

    if (!overpassResponse.ok) {
      throw new Error(`Overpass API request failed: ${overpassResponse.status}`);
    }

    const overpassData = await overpassResponse.json();
    console.log('✅ Overpass API Response received');
    console.log('📊 Raw Overpass Data:', overpassData);
    
    if (!overpassData.elements || overpassData.elements.length === 0) {
      console.log('⚠️ No transit elements found in Overpass response');
      return transitData;
    }

    // Process relations (transit routes)
    const relations = overpassData.elements.filter((el: any) => el.type === 'relation');
    console.log(`🔍 Found ${relations.length} transit relations`);

    // Group nodes and ways by ID for easy lookup
    const nodes = new Map();
    const ways = new Map();
    
    overpassData.elements.forEach((el: any) => {
      if (el.type === 'node') {
        nodes.set(el.id, el);
      } else if (el.type === 'way') {
        ways.set(el.id, el);
      }
    });

    console.log(`📍 Loaded ${nodes.size} nodes and ${ways.size} ways`);

    relations.forEach((relation: any, index: number) => {
      console.log(`\n🚌 Processing relation ${index + 1}/${relations.length}:`, relation.tags?.name || `ID: ${relation.id}`);
      console.log('🏷️ Tags:', relation.tags);

      if (!relation.tags || !relation.tags.route) {
        console.log('❌ Skipping relation without route tag');
        return;
      }

      const routeType = relation.tags.route;
      const routeName = relation.tags.name || relation.tags.ref || `Route ${relation.id}`;
      const operator = relation.tags.operator || relation.tags.network || 'Unknown';
      const color = relation.tags.colour || getDefaultColor(routeType);

      console.log(`📋 Route Details:`, {
        type: routeType,
        name: routeName,
        operator: operator,
        color: color
      });

      // Extract coordinates from ways in the relation
      const coordinates: [number, number][] = [];
      
      if (relation.members) {
        console.log(`🔗 Processing ${relation.members.length} members`);
        
        relation.members.forEach((member: any, memberIndex: number) => {
          if (member.type === 'way') {
            const way = ways.get(member.ref);
            if (way && way.geometry) {
              console.log(`  📍 Way ${memberIndex + 1}: ${way.geometry.length} coordinates`);
              way.geometry.forEach((coord: any) => {
                coordinates.push([coord.lon, coord.lat]);
              });
            } else if (way && way.nodes) {
              console.log(`  📍 Way ${memberIndex + 1}: ${way.nodes.length} node references`);
              way.nodes.forEach((nodeId: number) => {
                const node = nodes.get(nodeId);
                if (node) {
                  coordinates.push([node.lon, node.lat]);
                }
              });
            }
          }
        });
      }

      console.log(`📍 Total coordinates extracted: ${coordinates.length}`);

      if (coordinates.length > 0) {
        const transitLine: TransitLine = {
          id: `overpass-${relation.id}`,
          name: routeName,
          type: mapRouteType(routeType),
          coordinates: coordinates,
          color: color,
          operator: operator,
          ref: relation.tags.ref
        };

        // Add to appropriate category
        switch (transitLine.type) {
          case 'subway':
            transitData.subway.push(transitLine);
            console.log(`✅ Added to subway: ${routeName}`);
            break;
          case 'bus':
            transitData.bus.push(transitLine);
            console.log(`✅ Added to bus: ${routeName}`);
            break;
          case 'tram':
            transitData.tram.push(transitLine);
            console.log(`✅ Added to tram: ${routeName}`);
            break;
          case 'rail':
            transitData.rail.push(transitLine);
            console.log(`✅ Added to rail: ${routeName}`);
            break;
        }
      } else {
        console.log(`❌ No coordinates found for ${routeName}`);
      }
    });

    const summary = {
      subway: transitData.subway.length,
      bus: transitData.bus.length,
      tram: transitData.tram.length,
      rail: transitData.rail.length,
      total: transitData.subway.length + transitData.bus.length + transitData.tram.length + transitData.rail.length
    };
    
    console.log('\n🎯 KING COUNTY METRO TRANSIT DATA SUMMARY:');
    console.log('==========================================');
    console.log(`📊 Light Rail/Subway Lines: ${summary.subway}`);
    console.log(`📊 Bus Routes: ${summary.bus}`);
    console.log(`📊 Streetcar/Tram Lines: ${summary.tram}`);
    console.log(`📊 Commuter Rail Lines: ${summary.rail}`);
    console.log(`📊 Total Transit Lines: ${summary.total}`);
    console.log('==========================================');

    // Log detailed information for each category
    if (transitData.subway.length > 0) {
      console.log('\n🚇 LIGHT RAIL/SUBWAY LINES:');
      transitData.subway.forEach((line, i) => {
        console.log(`${i + 1}. ${line.name} (${line.operator})`);
        console.log(`   Color: ${line.color}, Coordinates: ${line.coordinates.length}`);
      });
    }

    if (transitData.bus.length > 0) {
      console.log('\n🚌 BUS ROUTES:');
      transitData.bus.forEach((line, i) => {
        console.log(`${i + 1}. ${line.name} (${line.operator})`);
        console.log(`   Color: ${line.color}, Coordinates: ${line.coordinates.length}`);
      });
    }

    if (transitData.tram.length > 0) {
      console.log('\n🚋 STREETCAR/TRAM LINES:');
      transitData.tram.forEach((line, i) => {
        console.log(`${i + 1}. ${line.name} (${line.operator})`);
        console.log(`   Color: ${line.color}, Coordinates: ${line.coordinates.length}`);
      });
    }

    if (transitData.rail.length > 0) {
      console.log('\n🚂 COMMUTER RAIL LINES:');
      transitData.rail.forEach((line, i) => {
        console.log(`${i + 1}. ${line.name} (${line.operator})`);
        console.log(`   Color: ${line.color}, Coordinates: ${line.coordinates.length}`);
      });
    }

    console.log('\n🗺️ MAP BOUNDS USED:');
    console.log(`   North: ${bounds.north}`);
    console.log(`   South: ${bounds.south}`);
    console.log(`   East: ${bounds.east}`);
    console.log(`   West: ${bounds.west}`);
    console.log('==========================================');

    // Cache the data
    cache.set(cacheKey, { data: transitData, timestamp: Date.now() });
    
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

// Helper function to map Overpass route types to our transit types
const mapRouteType = (routeType: string): 'subway' | 'bus' | 'tram' | 'rail' => {
  switch (routeType.toLowerCase()) {
    case 'subway':
    case 'light_rail':
      return 'subway';
    case 'bus':
      return 'bus';
    case 'tram':
    case 'streetcar':
      return 'tram';
    case 'train':
    case 'rail':
      return 'rail';
    default:
      return 'bus'; // Default fallback
  }
};

// Helper function to get default colors for route types
const getDefaultColor = (routeType: string): string => {
  switch (routeType.toLowerCase()) {
    case 'subway':
    case 'light_rail':
      return '#0066CC'; // Blue for light rail
    case 'bus':
      return '#00AA44'; // Green for buses
    case 'tram':
    case 'streetcar':
      return '#FF6600'; // Orange for streetcars
    case 'train':
    case 'rail':
      return '#800080'; // Purple for commuter rail
    default:
      return '#666666'; // Gray fallback
  }
};

// Clear cache function
export const clearTransitCache = () => {
  cache.clear();
  console.log('🧹 King County Metro transit data cache cleared');
};
