
import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import { useMap } from './MapProvider';
import { useRestaurants, Restaurant } from '@/hooks/useRestaurants';
import { createRestaurantMarker, shouldShowRestaurant } from '@/utils/restaurantMarkers';
import { shouldFetchRestaurants, isZoomLevelSufficient, createDebouncer } from '@/utils/mapHelpers';

interface RestaurantMarkersManagerProps {
  map: L.Map | null;
  onRestaurantClick: (restaurant: Restaurant) => void;
}

const RestaurantMarkersManager: React.FC<RestaurantMarkersManagerProps> = ({ 
  map, 
  onRestaurantClick 
}) => {
  const { showVegetarianRestaurants, showNonVegetarianRestaurants } = useMap();
  const { restaurants, fetchRestaurants, loading, error } = useRestaurants();
  const restaurantMarkersRef = useRef<L.Marker[]>([]);
  const lastFetchedBoundsRef = useRef<L.LatLngBounds | null>(null);
  const hasInitialFetchRef = useRef(false);

  const clearExistingMarkers = useCallback(() => {
    if (!map) return;

    restaurantMarkersRef.current.forEach(marker => {
      if (map.hasLayer(marker)) {
        map.removeLayer(marker);
      }
    });
    restaurantMarkersRef.current = [];
  }, [map]);

  const createAndAddMarkers = useCallback(() => {
    if (!map) return;

    clearExistingMarkers();

    restaurants.forEach((restaurant) => {
      const shouldShow = shouldShowRestaurant(
        restaurant, 
        showVegetarianRestaurants, 
        showNonVegetarianRestaurants
      );
      
      if (!shouldShow) return;
      
      const marker = createRestaurantMarker(restaurant, onRestaurantClick);
      restaurantMarkersRef.current.push(marker);
    });
  }, [map, restaurants, showVegetarianRestaurants, showNonVegetarianRestaurants, onRestaurantClick, clearExistingMarkers]);

  const fetchRestaurantsForCurrentView = useCallback(() => {
    if (!map || (!showVegetarianRestaurants && !showNonVegetarianRestaurants)) return;

    const zoom = map.getZoom();
    if (!isZoomLevelSufficient(zoom)) return;

    const bounds = map.getBounds();
    if (!shouldFetchRestaurants(bounds, lastFetchedBoundsRef.current)) return;

    const center = bounds.getCenter();
    console.log(`Fetching restaurants for new area: ${center.lat}, ${center.lng}`);
    
    fetchRestaurants(
      center.lat, 
      center.lng, 
      5000, 
      showVegetarianRestaurants, 
      showNonVegetarianRestaurants
    );
    
    lastFetchedBoundsRef.current = bounds;
  }, [map, showVegetarianRestaurants, showNonVegetarianRestaurants, fetchRestaurants]);

  const debouncedFetch = useCallback(
    createDebouncer(fetchRestaurantsForCurrentView, 500),
    [fetchRestaurantsForCurrentView]
  );

  const handleInitialFetch = useCallback(() => {
    if (!map || hasInitialFetchRef.current) return;
    
    console.log('🍽️ Attempting initial restaurant fetch...');
    console.log('Map zoom level:', map.getZoom());
    console.log('Show vegetarian:', showVegetarianRestaurants);
    console.log('Show non-vegetarian:', showNonVegetarianRestaurants);
    
    // Check if any restaurant type is enabled
    if (showVegetarianRestaurants || showNonVegetarianRestaurants) {
      const center = map.getCenter();
      console.log(`🌟 Initial restaurant fetch at: ${center.lat}, ${center.lng}`);
      
      // Force initial fetch regardless of zoom level
      fetchRestaurants(
        center.lat, 
        center.lng, 
        5000, 
        showVegetarianRestaurants, 
        showNonVegetarianRestaurants
      );
      
      hasInitialFetchRef.current = true;
      lastFetchedBoundsRef.current = map.getBounds();
    } else {
      console.log('🚫 No restaurant types enabled for initial fetch');
    }
  }, [map, showVegetarianRestaurants, showNonVegetarianRestaurants, fetchRestaurants]);

  // Initial fetch when map is ready
  useEffect(() => {
    if (!map) return;
    
    console.log('🗺️ Map is ready, setting up initial fetch timer...');
    
    // Add a small delay to ensure map is fully initialized
    const timer = setTimeout(() => {
      handleInitialFetch();
    }, 1000); // Increased delay to ensure map is fully ready
    
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

  // Fetch when toggle states change
  useEffect(() => {
    if (!map || (!showVegetarianRestaurants && !showNonVegetarianRestaurants)) {
      clearExistingMarkers();
      return;
    }

    const center = map.getCenter();
    console.log('🔄 Toggle states changed, fetching restaurants...');
    console.log('Vegetarian enabled:', showVegetarianRestaurants);
    console.log('Non-vegetarian enabled:', showNonVegetarianRestaurants);
    
    fetchRestaurants(center.lat, center.lng, 5000, showVegetarianRestaurants, showNonVegetarianRestaurants);
  }, [showVegetarianRestaurants, showNonVegetarianRestaurants, fetchRestaurants, map, clearExistingMarkers]);

  // Create and display markers when restaurants data changes
  useEffect(() => {
    console.log(`📍 Restaurant data changed: ${restaurants.length} restaurants available`);
    
    createAndAddMarkers();
    
    if (showVegetarianRestaurants || showNonVegetarianRestaurants) {
      restaurantMarkersRef.current.forEach(marker => {
        marker.addTo(map!);
      });
      console.log(`✅ Added ${restaurantMarkersRef.current.length} restaurant markers to map`);
    }
  }, [createAndAddMarkers, showVegetarianRestaurants, showNonVegetarianRestaurants]);

  // Debug logging
  useEffect(() => {
    if (loading) {
      console.log('⏳ Loading restaurants...');
    }
    if (error) {
      console.error('❌ Restaurant loading error:', error);
    }
  }, [loading, error]);

  return null;
};

export default RestaurantMarkersManager;
