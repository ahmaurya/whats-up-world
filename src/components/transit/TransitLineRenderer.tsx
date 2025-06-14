
import React from 'react';
import L from 'leaflet';
import { TransitLine } from '@/types/transit';

interface TransitLineRendererProps {
  lines: TransitLine[];
  layerGroup: L.LayerGroup;
  getTransitColor: (type: string) => string;
  lineType: 'rail' | 'bus';
}

const TransitLineRenderer: React.FC<TransitLineRendererProps> = ({
  lines,
  layerGroup,
  getTransitColor,
  lineType
}) => {
  // Helper function to calculate distance between two coordinates in meters
  const getDistance = (coord1: [number, number], coord2: [number, number]): number => {
    const R = 6371000; // Earth's radius in meters
    const lat1 = coord1[1] * Math.PI / 180;
    const lat2 = coord2[1] * Math.PI / 180;
    const deltaLat = (coord2[1] - coord1[1]) * Math.PI / 180;
    const deltaLon = (coord2[0] - coord1[0]) * Math.PI / 180;

    const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  // Helper function to filter coordinates and create route segments
  const createRouteSegments = (coordinates: [number, number][], maxDistance: number = 2000): [number, number][][] => {
    if (coordinates.length < 2) return [];
    
    const segments: [number, number][][] = [];
    let currentSegment: [number, number][] = [coordinates[0]];
    
    for (let i = 1; i < coordinates.length; i++) {
      const distance = getDistance(coordinates[i-1], coordinates[i]);
      
      if (distance <= maxDistance) {
        currentSegment.push(coordinates[i]);
      } else {
        if (currentSegment.length > 1) {
          segments.push(currentSegment);
        }
        currentSegment = [coordinates[i]];
      }
    }
    
    if (currentSegment.length > 1) {
      segments.push(currentSegment);
    }
    
    return segments;
  };

  React.useEffect(() => {
    // Clear existing lines
    layerGroup.clearLayers();

    console.log(`📊 Processing ${lines.length} ${lineType} transit lines`);
    
    let addedCount = 0;
    lines.forEach((line) => {
      if (line.coordinates && line.coordinates.length > 1) {
        try {
          // Convert coordinates from [longitude, latitude] to [latitude, longitude] for Leaflet
          const leafletCoordinates: [number, number][] = line.coordinates.map(coord => [coord[1], coord[0]]);
          
          console.log(`🔍 ${lineType} Line "${line.name}" (${line.type}): ${line.coordinates.length} coordinates, color: ${getTransitColor(line.type)}`);
          
          if (lineType === 'bus') {
            // Create route segments to avoid long straight lines over city blocks
            const routeSegments = createRouteSegments(leafletCoordinates, 2000);
            
            console.log(`📍 Created ${routeSegments.length} segments for bus route "${line.name}"`);
            
            routeSegments.forEach((segment, segmentIndex) => {
              if (segment.length > 1) {
                const polyline = L.polyline(segment, {
                  color: getTransitColor('bus'),
                  weight: 2,
                  opacity: 0.8
                });

                // Add hover tooltip
                const tooltipContent = `<strong>${line.name}</strong>${line.ref ? ` (Route ${line.ref})` : ''}`;
                polyline.bindTooltip(tooltipContent, {
                  permanent: false,
                  direction: 'top',
                  offset: [0, -10],
                  className: 'transit-tooltip'
                });

                // Add click popup with more details
                polyline.bindPopup(`
                  <div class="transit-popup">
                    <strong>${line.name}</strong><br/>
                    <em>${line.operator || 'Unknown Operator'}</em><br/>
                    Type: BUS<br/>
                    ${line.ref ? `Route: ${line.ref}<br/>` : ''}
                    Segment: ${segmentIndex + 1}/${routeSegments.length}<br/>
                    Points: ${segment.length}
                  </div>
                `);
                
                layerGroup.addLayer(polyline);
                console.log(`✅ Added bus segment ${segmentIndex + 1}: ${segment.length} points`);
              }
            });
          } else {
            // For rail/subway/tram, use full coordinates
            const polyline = L.polyline(leafletCoordinates, {
              color: getTransitColor(line.type),
              weight: line.type === 'subway' ? 4 : 3,
              opacity: 0.8
            });

            // Add hover tooltip
            const tooltipContent = `<strong>${line.name}</strong>${line.ref ? ` (Route ${line.ref})` : ''}`;
            polyline.bindTooltip(tooltipContent, {
              permanent: false,
              direction: 'top',
              offset: [0, -10],
              className: 'transit-tooltip'
            });

            // Add click popup with more details
            polyline.bindPopup(`
              <div class="transit-popup">
                <strong>${line.name}</strong><br/>
                <em>${line.operator || 'Unknown Operator'}</em><br/>
                Type: ${line.type.toUpperCase()}<br/>
                ${line.ref ? `Route: ${line.ref}<br/>` : ''}
                Coordinates: ${line.coordinates.length} points
              </div>
            `);
            
            layerGroup.addLayer(polyline);
          }
          
          addedCount++;
          console.log(`✅ Added ${line.type}: "${line.name}" (${line.coordinates.length} coordinates)`);
        } catch (error) {
          console.error(`❌ Error adding ${lineType} line "${line.name}":`, error);
        }
      }
    });
    
    console.log(`🎯 Successfully added ${addedCount}/${lines.length} ${lineType} transit lines to map`);
  }, [lines, layerGroup, getTransitColor, lineType]);

  return null;
};

export default TransitLineRenderer;
