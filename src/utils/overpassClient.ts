
import { BoundingBox, OverpassResponse } from '@/types/transit';

const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

export class OverpassClient {
  private buildQuery(bounds: BoundingBox): string {
    return `
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
  }

  async fetchTransitRoutes(bounds: BoundingBox): Promise<OverpassResponse> {
    const query = this.buildQuery(bounds);
    
    console.log('🌐 Querying Overpass API for Seattle transit routes...');
    console.log('📋 Overpass Query:', query);

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
    
    return data;
  }
}

export const overpassClient = new OverpassClient();
