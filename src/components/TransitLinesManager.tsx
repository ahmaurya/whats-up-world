
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
  const lastBoundsRef = useRef<BoundingBox | null>(null);

  // Helper function to check if bounds have changed significantly
  const boundsChangedSignificantly = (newBounds: BoundingBox, oldBounds: BoundingBox | null): boolean => {
    if (!oldBounds) return true;
    
    const threshold = 0.01; // Adjust this value to control sensitivity
    return (
      Math.abs(newBounds.north - oldBounds.north) > threshold ||
      Math.abs(newBounds.south - oldBounds.south) > threshold ||
      Math.abs(newBounds.east - oldBounds.east) > threshold ||
      Math.abs(newBounds.west - oldBounds.west) > threshold
    );
  };

  // Fetch transit data for current map bounds
  const loadTransitData = async (bounds: BoundingBox) => {
    setIsLoading(true);
    console.log('🚌 Loading King County Metro real-time transit data...');
    console.log('📍 Map bounds:', bounds);

    try {
      const data = await fetchTransitData(bounds);
      console.log('✅ King County Metro Transit Data Loaded Successfully!');
      console.log('📊 Data summary:', {
        subway: data.subway.length,
        bus: data.bus.length,
        tram: data.tram.length,
        rail: data.rail.length
      });
      setTransitData(data);
      lastBoundsRef.current = bounds;
    } catch (error) {
      console.error('❌ Error loading King County Metro transit data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data load and map event listeners
  useEffect(() => {
    if (!map) {
      console.log('🗺️ Map not ready, skipping transit data load');
      return;
    }

    // Load initial data
    const bounds = map.getBounds();
    const boundingBox: BoundingBox = {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest()
    };

    loadTransitData(boundingBox);

    // Set up event listeners for map movement
    const handleMapMove = () => {
      const newBounds = map.getBounds();
      const newBoundingBox: BoundingBox = {
        north: newBounds.getNorth(),
        south: newBounds.getSouth(),
        east: newBounds.getEast(),
        west: newBounds.getWest()
      };

      if (boundsChangedSignificantly(newBoundingBox, lastBoundsRef.current)) {
        console.log('🔄 Map bounds changed significantly, refetching transit data...');
        loadTransitData(newBoundingBox);
      }
    };

    // Add event listeners
    map.on('moveend', handleMapMove);
    map.on('zoomend', handleMapMove);

    // Cleanup event listeners
    return () => {
      map.off('moveend', handleMapMove);
      map.off('zoomend', handleMapMove);
    };
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
      console.log('📋 Lines by type:', {
        subway: transitData.subway.length,
        bus: transitData.bus.length,
        tram: transitData.tram.length,
        rail: transitData.rail.length
      });
      
      let addedCount = 0;
      allLines.forEach((line, index) => {
        if (line.coordinates && line.coordinates.length > 1) {
          try {
            // Convert coordinates from [longitude, latitude] to [latitude, longitude] for Leaflet
            const leafletCoordinates: [number, number][] = line.coordinates.map(coord => [coord[1], coord[0]]);
            
            console.log(`🔍 Line "${line.name}" (${line.type}): ${line.coordinates.length} coordinates, color: ${line.color}`);
            
            const polyline = L.polyline(leafletCoordinates, {
              color: line.color || '#666666',
              weight: line.type === 'subway' ? 4 : line.type === 'bus' ? 2 : 3,
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
            
            console.log(`✅ Added ${line.type}: "${line.name}" (${line.coordinates.length} coordinates)`);
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
