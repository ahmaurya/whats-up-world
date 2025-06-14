
import { useState, useEffect, useRef } from 'react';
import { fetchTransitData } from '@/utils/gtfsApi';
import { TransitData, BoundingBox } from '@/types/transit';
import L from 'leaflet';

export const useTransitData = (map: L.Map | null) => {
  const [transitData, setTransitData] = useState<TransitData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const lastBoundsRef = useRef<BoundingBox | null>(null);
  const isInitialLoadRef = useRef(true);

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
  const loadTransitData = async (bounds: BoundingBox, useCache = true) => {
    console.log('🚌 Loading King County Metro real-time transit data...');
    console.log('📍 Map bounds:', bounds);

    // Only show loading for initial load, not for background updates
    if (isInitialLoadRef.current) {
      setIsLoading(true);
    }

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
      isInitialLoadRef.current = false;
    } catch (error) {
      console.error('❌ Error loading King County Metro transit data:', error);
    } finally {
      if (isInitialLoadRef.current) {
        setIsLoading(false);
      }
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
        console.log('🔄 Map bounds changed significantly, updating transit data in background...');
        // Load data asynchronously without blocking UI
        loadTransitData(newBoundingBox, true);
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

  return {
    transitData,
    isLoading
  };
};
