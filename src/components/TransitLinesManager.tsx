
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useMap } from './MapProvider';
import { fetchTransitData } from '@/utils/gtfsApi';
import { TransitData, BoundingBox } from '@/types/transit';

interface TransitLinesManagerProps {
  map: L.Map | null;
}

const TransitLinesManager: React.FC<TransitLinesManagerProps> = ({ map }) => {
  const { showRailTransit, showBusTransit } = useMap();
  const railTransitLayerRef = useRef<L.LayerGroup | null>(null);
  const busTransitLayerRef = useRef<L.LayerGroup | null>(null);
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
        console.log('🔄 Map bounds changed significantly, checking cache for transit data...');
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

  // Handle rail transit visibility toggle and layer management
  useEffect(() => {
    if (!map) {
      console.log('🗺️ Map not available for rail transit layer management');
      return;
    }

    // Initialize rail transit layer if not exists
    if (!railTransitLayerRef.current) {
      railTransitLayerRef.current = L.layerGroup().addTo(map);
      console.log('🗺️ Created new rail transit layer group');
    }

    const railLayer = railTransitLayerRef.current;
    console.log(`🔄 Rail transit visibility toggle: ${showRailTransit ? 'SHOWING' : 'HIDING'} rail transit lines`);

    if (showRailTransit && transitData && !isLoading) {
      console.log('🚇 Adding rail/subway/tram transit lines to map...');
      
      // Clear existing lines
      railLayer.clearLayers();

      // Combine rail transit lines (subway, tram, rail)
      const railLines = [
        ...transitData.subway,
        ...transitData.tram,
        ...transitData.rail
      ];
      
      console.log(`📊 Processing ${railLines.length} rail transit lines`);
      
      let addedCount = 0;
      railLines.forEach((line, index) => {
        if (line.coordinates && line.coordinates.length > 1) {
          try {
            // Convert coordinates from [longitude, latitude] to [latitude, longitude] for Leaflet
            const leafletCoordinates: [number, number][] = line.coordinates.map(coord => [coord[1], coord[0]]);
            
            console.log(`🔍 Rail Line "${line.name}" (${line.type}): ${line.coordinates.length} coordinates, color: ${line.color}`);
            
            const polyline = L.polyline(leafletCoordinates, {
              color: line.color || '#0066CC',
              weight: line.type === 'subway' ? 4 : 3,
              opacity: 0.8
            }).bindPopup(`
              <div class="transit-popup">
                <strong>${line.name}</strong><br/>
                <em>${line.operator || 'Unknown Operator'}</em><br/>
                Type: ${line.type.toUpperCase()}<br/>
                ${line.ref ? `Route: ${line.ref}<br/>` : ''}
                Coordinates: ${line.coordinates.length} points
              </div>
            `);
            
            railLayer.addLayer(polyline);
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
      railLayer.clearLayers();
    }
  }, [map, showRailTransit, transitData, isLoading]);

  // Handle bus transit visibility toggle and layer management
  useEffect(() => {
    if (!map) {
      console.log('🗺️ Map not available for bus transit layer management');
      return;
    }

    // Initialize bus transit layer if not exists
    if (!busTransitLayerRef.current) {
      busTransitLayerRef.current = L.layerGroup().addTo(map);
      console.log('🗺️ Created new bus transit layer group');
    }

    const busLayer = busTransitLayerRef.current;
    console.log(`🔄 Bus transit visibility toggle: ${showBusTransit ? 'SHOWING' : 'HIDING'} bus transit lines`);

    if (showBusTransit && transitData && !isLoading) {
      console.log('🚌 Adding bus transit lines to map...');
      
      // Clear existing lines
      busLayer.clearLayers();

      const busLines = transitData.bus;
      
      console.log(`📊 Processing ${busLines.length} bus transit lines`);
      
      let addedCount = 0;
      busLines.forEach((line, index) => {
        if (line.coordinates && line.coordinates.length > 1) {
          try {
            // Convert coordinates from [longitude, latitude] to [latitude, longitude] for Leaflet
            const leafletCoordinates: [number, number][] = line.coordinates.map(coord => [coord[1], coord[0]]);
            
            console.log(`🔍 Bus Line "${line.name}" (Route ${line.ref || 'Unknown'}): ${line.coordinates.length} coordinates, color: ${line.color}`);
            
            const polyline = L.polyline(leafletCoordinates, {
              color: line.color || '#00AA44',
              weight: 2,
              opacity: 0.8,
              dashArray: '5, 5'
            }).bindPopup(`
              <div class="transit-popup">
                <strong>${line.name}</strong><br/>
                <em>${line.operator || 'Unknown Operator'}</em><br/>
                Type: BUS<br/>
                ${line.ref ? `Route: ${line.ref}<br/>` : ''}
                Coordinates: ${line.coordinates.length} points
              </div>
            `);
            
            busLayer.addLayer(polyline);
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
      busLayer.clearLayers();
    }
  }, [map, showBusTransit, transitData, isLoading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (railTransitLayerRef.current) {
        console.log('🧹 Cleaning up rail transit layer on component unmount');
        railTransitLayerRef.current.clearLayers();
        railTransitLayerRef.current.remove();
        railTransitLayerRef.current = null;
      }
      if (busTransitLayerRef.current) {
        console.log('🧹 Cleaning up bus transit layer on component unmount');
        busTransitLayerRef.current.clearLayers();
        busTransitLayerRef.current.remove();
        busTransitLayerRef.current = null;
      }
    };
  }, []);

  return null;
};

export default TransitLinesManager;
