
import { BoundingBox, OverpassResponse } from '@/types/transit';

const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

export class OverpassClient {
  private buildQuery(bounds: BoundingBox): string {
    // Comprehensive query specifically targeting Seattle area transit including King County Metro buses
    return `
      [out:json][timeout:30];
      (
        // King County Metro bus routes specifically
        relation["route"="bus"]["operator"~"King County Metro|Metro Transit|Sound Transit"]["public_transport"="route"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        
        // All bus routes in the area (broader catch)
        relation["route"="bus"]["public_transport"="route"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        
        // Bus routes by network
        relation["route"="bus"]["network"~"King County Metro|Metro|Sound Transit"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        
        // Specific route references for popular Seattle bus routes
        relation["route"="bus"]["ref"~"^(1|2|5|7|8|10|11|13|14|15|16|18|21|22|24|26|27|28|31|32|33|36|40|41|43|44|45|47|48|49|50|54|55|62|65|66|67|70|71|72|73|74|75|77|101|102|106|107|116|118|119|120|121|122|124|125|131|132|133|135|140|143|150|161|162|166|167|168|169|177|178|179|180|181|182|183|190|192|193|194|195|196|197|199|201|202|203|204|205|206|209|211|212|214|215|216|217|218|219|221|224|225|226|227|229|230|231|232|235|236|237|238|240|241|243|244|245|246|247|248|249|250|252|255|256|257|260|261|262|265|266|267|268|269|271|272|280|345|346|347|348)$"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        
        // Light rail and subway routes
        relation["route"="subway"]["public_transport"="route"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        relation["route"="light_rail"]["public_transport"="route"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        
        // Tram/streetcar routes
        relation["route"="tram"]["public_transport"="route"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        
        // Train/rail routes
        relation["route"="train"]["public_transport"="route"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        
        // Railway infrastructure
        way["railway"~"light_rail|subway|tram"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        way["highway"="busway"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      );
      (._;>;);
      out geom;
    `;
  }

  async fetchTransitRoutes(bounds: BoundingBox): Promise<OverpassResponse> {
    const query = this.buildQuery(bounds);
    
    console.log('🌐 Querying Overpass API for Seattle/King County Metro transit routes...');
    console.log('📋 Enhanced Overpass Query for Bus Routes:', query);
    console.log('🗺️ Search bounds:', bounds);

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
    console.log(`📈 Total elements found: ${data.elements ? data.elements.length : 0}`);
    
    // Log breakdown by element type
    if (data.elements) {
      const relations = data.elements.filter(el => el.type === 'relation');
      const ways = data.elements.filter(el => el.type === 'way');
      const nodes = data.elements.filter(el => el.type === 'node');
      
      console.log('📋 Element breakdown:');
      console.log(`   Relations: ${relations.length}`);
      console.log(`   Ways: ${ways.length}`);
      console.log(`   Nodes: ${nodes.length}`);
      
      // Log specific bus route relations found
      const busRelations = relations.filter(rel => rel.tags?.route === 'bus');
      console.log(`🚌 Bus route relations found: ${busRelations.length}`);
      
      if (busRelations.length > 0) {
        console.log('🚌 Bus routes detected:');
        busRelations.forEach((busRoute, i) => {
          console.log(`   ${i + 1}. Route ${busRoute.tags?.ref || 'Unknown'}: ${busRoute.tags?.name || 'Unnamed'} (Operator: ${busRoute.tags?.operator || 'Unknown'})`);
        });
      } else {
        console.log('⚠️ No bus route relations found in this area');
      }
    }
    
    return data;
  }
}

export const overpassClient = new OverpassClient();
