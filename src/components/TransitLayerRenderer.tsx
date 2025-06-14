
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
              opacity: 0.8,
              dashArray: undefined // Ensure solid lines
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
            
            const polyline = L.polyline(leafletCoordinates, {
              color: line.color || '#00AA44',
              weight: 2,
              opacity: 0.8,
              dashArray: undefined // Ensure solid lines, no dashes
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
                Coordinates: ${line.coordinates.length} points
              </div>
            `);
            
            busTransitLayer.addLayer(polyline);
            addedCount++;
            
            console.log(`✅ Added bus: "${line.name}" Route ${line.ref || 'Unknown'} (${line.coordinates.length} coordinates)`);
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
