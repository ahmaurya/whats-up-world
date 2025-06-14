
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
    
    setTimeout(() => {
      const zoom = map.getZoom();
      
      if (isZoomLevelSufficient(zoom) && (showVegetarianRestaurants || showNonVegetarianRestaurants)) {
        const center = map.getCenter();
        console.log(`Initial restaurant fetch at: ${center.lat}, ${center.lng}`);
        
        fetchRestaurants(
          center.lat, 
          center.lng, 
          5000, 
          showVegetarianRestaurants, 
          showNonVegetarianRestaurants
        );
        
        hasInitialFetchRef.current = true;
        lastFetchedBoundsRef.current = map.getBounds();
      }
    }, 1000);
  }, [map, showVegetarianRestaurants, showNonVegetarianRestaurants, fetchRestaurants]);

  // Initial fetch when map is ready
  useEffect(() => {
    handleInitialFetch();
  }, [handleInitialFetch]);

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
    const zoom = map.getZoom();
    
    if (isZoomLevelSufficient(zoom)) {
      fetchRestaurants(center.lat, center.lng, 5000, showVegetarianRestaurants, showNonVegetarianRestaurants);
    }
  }, [showVegetarianRestaurants, showNonVegetarianRestaurants, fetchRestaurants, map, clearExistingMarkers]);

  // Create and display markers when restaurants data changes
  useEffect(() => {
    createAndAddMarkers();
    
    if (showVegetarianRestaurants || showNonVegetarianRestaurants) {
      restaurantMarkersRef.current.forEach(marker => {
        marker.addTo(map!);
      });
    }
  }, [createAndAddMarkers, showVegetarianRestaurants, showNonVegetarianRestaurants]);

  // Debug logging
  useEffect(() => {
    if (loading) {
      console.log('Loading restaurants...');
    }
    if (error) {
      console.error('Restaurant loading error:', error);
    }
  }, [loading, error]);

  return null;
};

export default RestaurantMarkersManager;
