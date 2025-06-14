
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
        console.log(`⚠️ Unknown route type: ${routeType}, defaulting to bus`);
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

  private extractCoordinatesFromWay(way: OverpassWay, nodes: Map<number, OverpassNode>): [number, number][] {
    const coordinates: [number, number][] = [];
    
    if (way.geometry) {
      // Use way geometry if available (preferred)
      way.geometry.forEach((coord) => {
        coordinates.push([coord.lon, coord.lat]);
      });
      console.log(`  📍 Using way geometry: ${coordinates.length} coordinates`);
    } else if (way.nodes) {
      // Fallback to node references
      way.nodes.forEach((nodeId) => {
        const node = nodes.get(nodeId);
        if (node) {
          coordinates.push([node.lon, node.lat]);
        }
      });
      console.log(`  📍 Using node references: ${coordinates.length} coordinates`);
    }
    
    return coordinates;
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
          if (way) {
            const wayCoords = this.extractCoordinatesFromWay(way, nodes);
            coordinates.push(...wayCoords);
            console.log(`  📍 Way ${memberIndex + 1}: Added ${wayCoords.length} coordinates`);
          } else {
            console.log(`  ❌ Way ${member.ref} not found in dataset`);
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

    console.log(`🔍 Processing ${elements.length} total elements from Overpass API`);

    // Separate elements by type
    const relations = elements.filter((el): el is OverpassRelation => el.type === 'relation');
    const ways = elements.filter((el): el is OverpassWay => el.type === 'way');
    const nodeElements = elements.filter((el): el is OverpassNode => el.type === 'node');
    
    const nodes = new Map<number, OverpassNode>();
    const waysMap = new Map<number, OverpassWay>();
    
    nodeElements.forEach((node) => {
      nodes.set(node.id, node);
    });
    
    ways.forEach((way) => {
      waysMap.set(way.id, way);
    });

    console.log(`🔍 Found ${relations.length} transit relations, ${ways.length} ways, ${nodeElements.length} nodes`);

    // Process relations (transit routes)
    relations.forEach((relation, index) => {
      console.log(`\n🚌 Processing relation ${index + 1}/${relations.length}:`, relation.tags?.name || `ID: ${relation.id}`);
      
      if (!relation.tags) {
        console.log('❌ Skipping relation without tags');
        return;
      }
      
      console.log('🏷️ All relation tags:', relation.tags);

      const routeType = relation.tags.route;
      if (!routeType) {
        console.log('❌ Skipping relation without route tag');
        return;
      }

      const routeName = relation.tags.name || relation.tags.ref || `Route ${relation.id}`;
      const operator = relation.tags.operator || relation.tags.network || 'Unknown';
      const color = relation.tags.colour || this.getDefaultColor(routeType);

      console.log(`📋 Route Details:`, {
        type: routeType,
        name: routeName,
        operator: operator,
        color: color,
        network: relation.tags.network
      });

      const coordinates = this.extractCoordinatesFromRelation(relation, nodes, waysMap);
      console.log(`📍 Total coordinates extracted: ${coordinates.length}`);

      if (coordinates.length > 1) {
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
        console.log(`❌ Insufficient coordinates for ${routeName} (${coordinates.length} points)`);
      }
    });

    // Process standalone ways (railway infrastructure)
    console.log(`\n🛤️ Processing ${ways.length} standalone ways...`);
    ways.forEach((way, index) => {
      if (!way.tags) return;
      
      const railway = way.tags.railway;
      const highway = way.tags.highway;
      
      if (railway && ['light_rail', 'subway', 'tram'].includes(railway)) {
        console.log(`\n🚇 Processing railway way ${index + 1}: ${way.tags.name || `ID: ${way.id}`}`);
        console.log('🏷️ Way tags:', way.tags);
        
        const coordinates = this.extractCoordinatesFromWay(way, nodes);
        
        if (coordinates.length > 1) {
          const transitLine: TransitLine = {
            id: `way-${way.id}`,
            name: way.tags.name || `${railway} ${way.id}`,
            type: this.mapRouteType(railway),
            coordinates: coordinates,
            color: this.getDefaultColor(railway),
            operator: way.tags.operator,
            ref: way.tags.ref
          };
          
          const category = transitLine.type;
          transitData[category].push(transitLine);
          console.log(`✅ Added ${category} way: ${transitLine.name}`);
        }
      } else if (highway === 'busway') {
        console.log(`\n🚌 Processing busway ${index + 1}: ${way.tags.name || `ID: ${way.id}`}`);
        
        const coordinates = this.extractCoordinatesFromWay(way, nodes);
        
        if (coordinates.length > 1) {
          const transitLine: TransitLine = {
            id: `busway-${way.id}`,
            name: way.tags.name || `Busway ${way.id}`,
            type: 'bus',
            coordinates: coordinates,
            color: this.getDefaultColor('bus'),
            operator: way.tags.operator,
            ref: way.tags.ref
          };
          
          transitData.bus.push(transitLine);
          console.log(`✅ Added busway: ${transitLine.name}`);
        }
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
