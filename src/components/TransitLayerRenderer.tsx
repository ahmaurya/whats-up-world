
import React, { useEffect } from 'react';
import L from 'leaflet';
import { TransitData } from '@/types/transit';

interface TransitLayerRendererProps {
  map: L.Map | null;
  transitData: TransitData | null;
  isLoading: boolean;
  showRailTransit: boolean;
  showBusTransit: boolean;
  railTransitLayer: L.LayerGroup | null;
  busTransitLayer: L.LayerGroup | null;
}

const TransitLayerRenderer: React.FC<TransitLayerRendererProps> = ({
  map,
  transitData,
  isLoading,
  showRailTransit,
  showBusTransit,
  railTransitLayer,
  busTransitLayer
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
        // Distance is reasonable, add to current segment
        currentSegment.push(coordinates[i]);
      } else {
        // Distance is too large, finish current segment and start new one
        if (currentSegment.length > 1) {
          segments.push(currentSegment);
        }
        currentSegment = [coordinates[i]];
      }
    }
    
    // Add the last segment if it has enough points
    if (currentSegment.length > 1) {
      segments.push(currentSegment);
    }
    
    return segments;
  };

  // Handle rail transit visibility toggle and layer management
  useEffect(() => {
    if (!map || !railTransitLayer) {
      console.log('🗺️ Map or rail layer not available for rail transit layer management');
      return;
    }

    console.log(`🔄 Rail transit visibility toggle: ${showRailTransit ? 'SHOWING' : 'HIDING'} rail transit lines`);

    if (showRailTransit && transitData && !isLoading) {
      console.log('🚇 Adding rail/subway/tram transit lines to map...');
      
      // Clear existing lines
      railTransitLayer.clearLayers();

      // Combine rail transit lines (subway, tram, rail)
      const railLines = [
        ...transitData.subway,
        ...transitData.tram,
        ...transitData.rail
      ];
      
      console.log(`📊 Processing ${railLines.length} rail transit lines`);
      
      let addedCount = 0;
      railLines.forEach((line) => {
        if (line.coordinates && line.coordinates.length > 1) {
          try {
            // Convert coordinates from [longitude, latitude] to [latitude, longitude] for Leaflet
            const leafletCoordinates: [number, number][] = line.coordinates.map(coord => [coord[1], coord[0]]);
            
            console.log(`🔍 Rail Line "${line.name}" (${line.type}): ${line.coordinates.length} coordinates, color: ${line.color}`);
            
            const polyline = L.polyline(leafletCoordinates, {
              color: line.color || '#0066CC',
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
            
            railTransitLayer.addLayer(polyline);
            addedCount++;
            
            console.log(`✅ Added ${line.type}: "${line.name}" (${line.coordinates.length} coordinates)`);
          } catch (error) {
            console.error(`❌ Error adding rail line "${line.name}":`, error);
          }
        }
      });
      
      console.log(`🎯 Successfully added ${addedCount}/${railLines.length} rail transit lines to map`);
      
    } else if (!showRailTransit) {
      console.log('🚇 Hiding all rail transit lines from map');
      railTransitLayer.clearLayers();
    }
  }, [map, showRailTransit, transitData, isLoading, railTransitLayer]);

  // Handle bus transit visibility toggle and layer management
  useEffect(() => {
    if (!map || !busTransitLayer) {
      console.log('🗺️ Map or bus layer not available for bus transit layer management');
      return;
    }

    console.log(`🔄 Bus transit visibility toggle: ${showBusTransit ? 'SHOWING' : 'HIDING'} bus transit lines`);

    if (showBusTransit && transitData && !isLoading) {
      console.log('🚌 Adding bus transit lines to map...');
      
      // Clear existing lines
      busTransitLayer.clearLayers();

      const busLines = transitData.bus;
      
      console.log(`📊 Processing ${busLines.length} bus transit lines`);
      
      let addedCount = 0;
      busLines.forEach((line) => {
        if (line.coordinates && line.coordinates.length > 1) {
          try {
            // Convert coordinates from [longitude, latitude] to [latitude, longitude] for Leaflet
            const leafletCoordinates: [number, number][] = line.coordinates.map(coord => [coord[1], coord[0]]);
            
            console.log(`🔍 Bus Line "${line.name}" (Route ${line.ref || 'Unknown'}): ${line.coordinates.length} coordinates, color: ${line.color}`);
            
            // Create route segments to avoid long straight lines over city blocks
            const routeSegments = createRouteSegments(leafletCoordinates, 2000); // Max 2km between points
            
            console.log(`📍 Created ${routeSegments.length} segments for bus route "${line.name}"`);
            
            routeSegments.forEach((segment, segmentIndex) => {
              if (segment.length > 1) {
                const polyline = L.polyline(segment, {
                  color: line.color || '#00AA44',
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
                
                busTransitLayer.addLayer(polyline);
                console.log(`✅ Added bus segment ${segmentIndex + 1}: ${segment.length} points`);
              }
            });
            
            addedCount++;
            console.log(`✅ Added bus: "${line.name}" Route ${line.ref || 'Unknown'} (${routeSegments.length} segments)`);
          } catch (error) {
            console.error(`❌ Error adding bus line "${line.name}":`, error);
          }
        }
      });
      
      console.log(`🎯 Successfully added ${addedCount}/${busLines.length} bus transit lines to map`);
      
    } else if (!showBusTransit) {
      console.log('🚌 Hiding all bus transit lines from map');
      busTransitLayer.clearLayers();
    }
  }, [map, showBusTransit, transitData, isLoading, busTransitLayer]);

  return null;
};

export default TransitLayerRenderer;
