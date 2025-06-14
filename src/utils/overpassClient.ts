
import { BoundingBox, OverpassResponse } from '@/types/transit';

const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

export class OverpassClient {
  private buildQuery(bounds: BoundingBox): string {
    // More inclusive query that captures Seattle area transit without restrictive network filters
    return `
      [out:json][timeout:25];
      (
        // All subway/light rail routes in the area
        relation["route"="subway"]["public_transport"="route"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        relation["route"="light_rail"]["public_transport"="route"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        
        // All bus routes in the area (without network restriction)
        relation["route"="bus"]["public_transport"="route"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        
        // All tram/streetcar routes
        relation["route"="tram"]["public_transport"="route"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        
        // All train/rail routes
        relation["route"="train"]["public_transport"="route"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        
        // Also include railway ways directly
        way["railway"~"light_rail|subway|tram"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        
        // Bus ways and busways
        way["highway"="busway"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      );
      (._;>;);
      out geom;
    `;
  }

  async fetchTransitRoutes(bounds: BoundingBox): Promise<OverpassResponse> {
    const query = this.buildQuery(bounds);
    
    console.log('🌐 Querying Overpass API for Seattle transit routes (INCLUSIVE QUERY)...');
    console.log('📋 Updated Overpass Query:', query);

    const response = await fetch(OVERPASS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`
    });

    if (!response.ok) {
      throw new Error(`Overpass API request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Overpass API Response received');
    console.log('📊 Raw Overpass Data:', data);
    console.log(`📈 Elements found: ${data.elements ? data.elements.length : 0}`);
    
    return data;
  }
}

export const overpassClient = new OverpassClient();
