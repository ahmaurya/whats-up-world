
import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import { useMap } from './MapProvider';
import { useCafes, Cafe } from '@/hooks/useCafes';
import { createCafeMarker } from '@/utils/cafeMarkers';
import { shouldFetchRestaurants, isZoomLevelSufficient, createDebouncer } from '@/utils/mapHelpers';

interface CafeMarkersManagerProps {
  map: L.Map | null;
  onCafeClick: (cafe: Cafe) => void;
}

const CafeMarkersManager: React.FC<CafeMarkersManagerProps> = ({ 
  map, 
  onCafeClick 
}) => {
  const { showCafes } = useMap();
  const { cafes, fetchCafes, loading, error } = useCafes();
  const cafeMarkersRef = useRef<L.Marker[]>([]);
  const lastFetchedBoundsRef = useRef<L.LatLngBounds | null>(null);
  const hasInitialFetchRef = useRef(false);

  const clearExistingMarkers = useCallback(() => {
    if (!map) return;

    cafeMarkersRef.current.forEach(marker => {
      if (map.hasLayer(marker)) {
        map.removeLayer(marker);
      }
    });
    cafeMarkersRef.current = [];
  }, [map]);

  const createAndAddMarkers = useCallback(() => {
    if (!map) return;

    clearExistingMarkers();

    cafes.forEach((cafe) => {
      if (!showCafes) return;
      
      const marker = createCafeMarker(cafe, onCafeClick);
      cafeMarkersRef.current.push(marker);
    });
  }, [map, cafes, showCafes, onCafeClick, clearExistingMarkers]);

  const fetchCafesForCurrentView = useCallback(() => {
    if (!map || !showCafes) return;

    const zoom = map.getZoom();
    if (!isZoomLevelSufficient(zoom)) return;

    const bounds = map.getBounds();
    if (!shouldFetchRestaurants(bounds, lastFetchedBoundsRef.current)) return;

    const center = bounds.getCenter();
    console.log(`Fetching cafes for new area: ${center.lat}, ${center.lng}`);
    
    fetchCafes(center.lat, center.lng, 5000);
    
    lastFetchedBoundsRef.current = bounds;
  }, [map, showCafes, fetchCafes]);

  const debouncedFetch = useCallback(
    createDebouncer(fetchCafesForCurrentView, 500),
    [fetchCafesForCurrentView]
  );

  const handleInitialFetch = useCallback(() => {
    if (!map || hasInitialFetchRef.current) return;
    
    console.log('☕ Attempting initial cafe fetch...');
    console.log('Show cafes:', showCafes);
    
    if (showCafes) {
      const center = map.getCenter();
      console.log(`🌟 Initial cafe fetch at: ${center.lat}, ${center.lng}`);
      
      fetchCafes(center.lat, center.lng, 5000);
      
      hasInitialFetchRef.current = true;
      lastFetchedBoundsRef.current = map.getBounds();
    }
  }, [map, showCafes, fetchCafes]);

  // Initial fetch when map is ready
  useEffect(() => {
    if (!map) return;
    
    console.log('☕ Map is ready, setting up initial cafe fetch timer...');
    
    const timer = setTimeout(() => {
      handleInitialFetch();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [map, handleInitialFetch]);

  // Set up map event listeners
  useEffect(() => {
    if (!map) return;

    map.on('moveend', debouncedFetch);
    map.on('zoomend', debouncedFetch);

    return () => {
      if (map) {
        map.off('moveend', debouncedFetch);
        map.off('zoomend', debouncedFetch);
      }
    };
  }, [map, debouncedFetch]);

  // Fetch when toggle state changes
  useEffect(() => {
    if (!map || !showCafes) {
      clearExistingMarkers();
      return;
    }

    const center = map.getCenter();
    console.log('☕ Cafe toggle enabled, fetching cafes...');
    
    fetchCafes(center.lat, center.lng, 5000);
  }, [showCafes, fetchCafes, map, clearExistingMarkers]);

  // Create and display markers when cafes data changes
  useEffect(() => {
    console.log(`☕ Cafe data changed: ${cafes.length} cafes available`);
    
    createAndAddMarkers();
    
    if (showCafes) {
      cafeMarkersRef.current.forEach(marker => {
        marker.addTo(map!);
      });
      console.log(`✅ Added ${cafeMarkersRef.current.length} cafe markers to map`);
    }
  }, [createAndAddMarkers, showCafes]);

  // Debug logging
  useEffect(() => {
    if (loading) {
      console.log('⏳ Loading cafes...');
    }
    if (error) {
      console.error('❌ Cafe loading error:', error);
    }
  }, [loading, error]);

  return null;
};

export default CafeMarkersManager;
