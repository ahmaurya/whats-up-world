
import { TransitLine, TransitData, OverpassElement, OverpassRelation, OverpassNode, OverpassWay } from '@/types/transit';

export class TransitDataTransformer {
  private mapRouteType(routeType: string): 'subway' | 'bus' | 'tram' | 'rail' {
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
  }

  private getDefaultColor(routeType: string): string {
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
  }

  private extractCoordinatesFromRelation(
    relation: OverpassRelation,
    nodes: Map<number, OverpassNode>,
    ways: Map<number, OverpassWay>
  ): [number, number][] {
    const coordinates: [number, number][] = [];
    
    if (relation.members) {
      console.log(`🔗 Processing ${relation.members.length} members`);
      
      relation.members.forEach((member, memberIndex) => {
        if (member.type === 'way') {
          const way = ways.get(member.ref);
          if (way && way.geometry) {
            console.log(`  📍 Way ${memberIndex + 1}: ${way.geometry.length} coordinates`);
            way.geometry.forEach((coord) => {
              coordinates.push([coord.lon, coord.lat]);
            });
          } else if (way && way.nodes) {
            console.log(`  📍 Way ${memberIndex + 1}: ${way.nodes.length} node references`);
            way.nodes.forEach((nodeId) => {
              const node = nodes.get(nodeId);
              if (node) {
                coordinates.push([node.lon, node.lat]);
              }
            });
          }
        }
      });
    }

    return coordinates;
  }

  transformOverpassData(elements: OverpassElement[]): TransitData {
    const transitData: TransitData = {
      subway: [],
      bus: [],
      tram: [],
      rail: []
    };

    if (!elements || elements.length === 0) {
      console.log('⚠️ No transit elements found in Overpass response');
      return transitData;
    }

    // Separate elements by type
    const relations = elements.filter((el): el is OverpassRelation => el.type === 'relation');
    const nodes = new Map<number, OverpassNode>();
    const ways = new Map<number, OverpassWay>();
    
    elements.forEach((el) => {
      if (el.type === 'node') {
        nodes.set(el.id, el as OverpassNode);
      } else if (el.type === 'way') {
        ways.set(el.id, el as OverpassWay);
      }
    });

    console.log(`🔍 Found ${relations.length} transit relations`);
    console.log(`📍 Loaded ${nodes.size} nodes and ${ways.size} ways`);

    relations.forEach((relation, index) => {
      console.log(`\n🚌 Processing relation ${index + 1}/${relations.length}:`, relation.tags?.name || `ID: ${relation.id}`);
      console.log('🏷️ Tags:', relation.tags);

      if (!relation.tags || !relation.tags.route) {
        console.log('❌ Skipping relation without route tag');
        return;
      }

      const routeType = relation.tags.route;
      const routeName = relation.tags.name || relation.tags.ref || `Route ${relation.id}`;
      const operator = relation.tags.operator || relation.tags.network || 'Unknown';
      const color = relation.tags.colour || this.getDefaultColor(routeType);

      console.log(`📋 Route Details:`, {
        type: routeType,
        name: routeName,
        operator: operator,
        color: color
      });

      const coordinates = this.extractCoordinatesFromRelation(relation, nodes, ways);
      console.log(`📍 Total coordinates extracted: ${coordinates.length}`);

      if (coordinates.length > 0) {
        const transitLine: TransitLine = {
          id: `overpass-${relation.id}`,
          name: routeName,
          type: this.mapRouteType(routeType),
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

    return transitData;
  }

  logTransitDataSummary(transitData: TransitData): void {
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
  }
}

export const transitDataTransformer = new TransitDataTransformer();
