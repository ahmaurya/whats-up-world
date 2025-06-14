
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useMap } from './MapProvider';
import { fetchTransitData } from '@/utils/gtfsApi';
import { TransitData, BoundingBox } from '@/types/transit';

interface TransitLinesManagerProps {
  map: L.Map | null;
}

const TransitLinesManager: React.FC<TransitLinesManagerProps> = ({ map }) => {
  const { showTransit } = useMap();
  const transitLayerRef = useRef<L.LayerGroup | null>(null);
  const [transitData, setTransitData] = useState<TransitData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch transit data when component mounts or map changes
  useEffect(() => {
    const loadTransitData = async () => {
      if (!map) {
        console.log('🗺️ Map not ready, skipping transit data load');
        return;
      }
      
      setIsLoading(true);
      console.log('🚌 Loading King County Metro real-time transit data...');
      
      const bounds = map.getBounds();
      const boundingBox: BoundingBox = {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
      };

      console.log('📍 Current map bounds:', boundingBox);

      try {
        const data = await fetchTransitData(boundingBox);
        console.log('✅ King County Metro Transit Data Loaded Successfully!');
        setTransitData(data);
      } catch (error) {
        console.error('❌ Error loading King County Metro transit data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTransitData();
  }, [map]);

  // Handle transit visibility toggle and layer management
  useEffect(() => {
    if (!map) {
      console.log('🗺️ Map not available for transit layer management');
      return;
    }

    // Initialize transit layer if not exists
    if (!transitLayerRef.current) {
      transitLayerRef.current = L.layerGroup().addTo(map);
      console.log('🗺️ Created new transit layer group');
    }

    const transitLayer = transitLayerRef.current;
    console.log(`🔄 Transit visibility toggle: ${showTransit ? 'SHOWING' : 'HIDING'} transit lines`);

    if (showTransit && transitData && !isLoading) {
      console.log('🚌 Adding King County Metro transit lines to map...');
      
      // Clear existing lines
      transitLayer.clearLayers();

      // Combine all transit lines
      const allLines = [
        ...transitData.subway,
        ...transitData.bus,
        ...transitData.tram,
        ...transitData.rail
      ];
      
      console.log(`📊 Processing ${allLines.length} total transit lines`);
      
      let addedCount = 0;
      allLines.forEach((line, index) => {
        if (line.coordinates && line.coordinates.length > 1) {
          try {
            // Convert coordinates from [longitude, latitude] to [latitude, longitude] for Leaflet
            const leafletCoordinates: [number, number][] = line.coordinates.map(coord => [coord[1], coord[0]]);
            
            console.log(`🔍 Line "${line.name}": Original coords sample: [${line.coordinates[0]}], Converted: [${leafletCoordinates[0]}]`);
            
            const polyline = L.polyline(leafletCoordinates, {
              color: line.color || '#666666',
              weight: line.type === 'subway' ? 4 : 3,
              opacity: 0.8,
              dashArray: line.type === 'bus' ? '5, 5' : undefined
            }).bindPopup(`
              <div class="transit-popup">
                <strong>${line.name}</strong><br/>
                <em>${line.operator || 'Unknown Operator'}</em><br/>
                Type: ${line.type.toUpperCase()}<br/>
                ${line.ref ? `Route: ${line.ref}<br/>` : ''}
                Coordinates: ${line.coordinates.length} points
              </div>
            `);
            
            transitLayer.addLayer(polyline);
            addedCount++;
            
            console.log(`✅ Added ${line.type}: "${line.name}" (${line.coordinates.length} coordinates, color: ${line.color})`);
          } catch (error) {
            console.error(`❌ Error adding line "${line.name}":`, error);
          }
        } else {
          console.log(`⚠️ Skipping line "${line.name}" - insufficient coordinates (${line.coordinates?.length || 0})`);
        }
      });
      
      console.log(`🎯 Successfully added ${addedCount}/${allLines.length} transit lines to map`);
      console.log(`🗺️ Transit layer now contains ${transitLayer.getLayers().length} total layers`);
      
    } else if (!showTransit) {
      console.log('🚌 Hiding all transit lines from map');
      transitLayer.clearLayers();
      console.log(`🗺️ Cleared transit layer - now contains ${transitLayer.getLayers().length} layers`);
    } else if (isLoading) {
      console.log('⏳ Transit data still loading...');
    } else if (!transitData) {
      console.log('📭 No transit data available to display');
    }
  }, [map, showTransit, transitData, isLoading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (transitLayerRef.current) {
        console.log('🧹 Cleaning up transit layer on component unmount');
        transitLayerRef.current.clearLayers();
        transitLayerRef.current.remove();
        transitLayerRef.current = null;
      }
    };
  }, []);

  // Log loading state changes
  useEffect(() => {
    if (isLoading) {
      console.log('⏳ Transit data loading started...');
    } else {
      console.log('✅ Transit data loading completed');
    }
  }, [isLoading]);

  return null;
};

export default TransitLinesManager;
