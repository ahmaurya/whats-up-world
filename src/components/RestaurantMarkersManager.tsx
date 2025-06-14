
import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import { useMap } from './MapProvider';
import { useRestaurants, Restaurant } from '@/hooks/useRestaurants';

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
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const createRestaurantMarkers = useCallback(() => {
    if (!map) return;

    // Clear existing markers
    restaurantMarkersRef.current.forEach(marker => {
      if (map.hasLayer(marker)) {
        map.removeLayer(marker);
      }
    });
    restaurantMarkersRef.current = [];

    restaurants.forEach((restaurant) => {
      // Determine marker color based on dietary type
      const isVegetarian = restaurant.isVegetarian;
      const markerColor = isVegetarian ? '#22c55e' : '#ef4444'; // Green for vegetarian, red for non-vegetarian
      
      // Check if we should show this restaurant based on toggle states
      const shouldShow = (isVegetarian && showVegetarianRestaurants) || 
                        (!isVegetarian && showNonVegetarianRestaurants);
      
      if (!shouldShow) return;
      
      const marker = L.marker([restaurant.coordinates[1], restaurant.coordinates[0]], {
        icon: L.divIcon({
          className: 'restaurant-marker',
          html: `<div style="background-color: ${markerColor}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; cursor: pointer;"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        })
      });

      // Add popup with restaurant description
      const popupContent = `
        <div style="max-width: 200px;">
          <h3 style="margin: 0 0 8px 0; font-weight: bold; font-size: 14px;">${restaurant.name}</h3>
          <div style="margin-bottom: 6px;">
            <span style="color: #f59e0b; font-weight: bold;">${restaurant.rating > 0 ? restaurant.rating.toFixed(1) : 'N/A'}</span>
            <span style="color: #fbbf24;">★</span>
            <span style="color: #666; font-size: 12px; margin-left: 4px;">(${restaurant.reviews.toLocaleString()} reviews)</span>
          </div>
          <div style="margin-bottom: 6px; font-size: 12px;">
            <strong>Cuisine:</strong> ${restaurant.cuisine}
          </div>
          <div style="margin-bottom: 6px; font-size: 12px;">
            <strong>Type:</strong> <span style="color: ${markerColor}; font-weight: bold;">${isVegetarian ? 'Vegetarian/Vegan' : 'Non-Vegetarian'}</span>
          </div>
          <div style="font-size: 12px; color: #666;">
            ${restaurant.description}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        maxWidth: 250,
        className: 'restaurant-popup'
      });

      marker.on('click', () => {
        onRestaurantClick(restaurant);
      });

      restaurantMarkersRef.current.push(marker);
    });
  }, [map, restaurants, showVegetarianRestaurants, showNonVegetarianRestaurants, onRestaurantClick]);

  const shouldFetchRestaurants = useCallback((currentBounds: L.LatLngBounds) => {
    if (!lastFetchedBoundsRef.current) return true;
    
    // Check if current view has moved significantly from last fetch
    const lastBounds = lastFetchedBoundsRef.current;
    const currentCenter = currentBounds.getCenter();
    const lastCenter = lastBounds.getCenter();
    
    // Calculate distance between centers
    const distance = currentCenter.distanceTo(lastCenter);
    
    // Fetch if moved more than 2km or if bounds don't overlap significantly
    return distance > 2000 || !lastBounds.intersects(currentBounds);
  }, []);

  const handleMapChange = useCallback(() => {
    if (!map || (!showVegetarianRestaurants && !showNonVegetarianRestaurants)) return;

    const zoom = map.getZoom();
    
    // Only fetch if zoomed in enough to see local restaurants
    if (zoom < 12) return;

    const bounds = map.getBounds();
    
    // Check if we should fetch based on movement
    if (!shouldFetchRestaurants(bounds)) return;

    // Clear any existing timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    // Debounce the fetch request to avoid too many API calls
    fetchTimeoutRef.current = setTimeout(() => {
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
    }, 500); // 500ms debounce
  }, [map, showVegetarianRestaurants, showNonVegetarianRestaurants, fetchRestaurants, shouldFetchRestaurants]);

  // Set up map event listeners for dynamic fetching
  useEffect(() => {
    if (!map) return;

    // Initial fetch if zoom is adequate and toggles are on
    handleMapChange();

    // Listen to map events
    map.on('moveend', handleMapChange);
    map.on('zoomend', handleMapChange);

    return () => {
      if (map) {
        map.off('moveend', handleMapChange);
        map.off('zoomend', handleMapChange);
      }
      
      // Clear timeout on cleanup
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [map, handleMapChange]);

  // Fetch restaurants when toggle states change
  useEffect(() => {
    if (!map || (!showVegetarianRestaurants && !showNonVegetarianRestaurants)) {
      // Clear restaurants if both toggles are off
      restaurantMarkersRef.current.forEach(marker => {
        if (map.hasLayer(marker)) {
          map.removeLayer(marker);
        }
      });
      return;
    }

    // If either toggle is turned on, trigger a fetch
    const center = map.getCenter();
    const zoom = map.getZoom();
    
    if (zoom >= 12) {
      fetchRestaurants(center.lat, center.lng, 5000, showVegetarianRestaurants, showNonVegetarianRestaurants);
    }
  }, [showVegetarianRestaurants, showNonVegetarianRestaurants, fetchRestaurants, map]);

  // Create and display markers when restaurants data changes
  useEffect(() => {
    createRestaurantMarkers();
    
    // Add markers to map if either toggle is true
    if (showVegetarianRestaurants || showNonVegetarianRestaurants) {
      restaurantMarkersRef.current.forEach(marker => {
        marker.addTo(map!);
      });
    }
  }, [createRestaurantMarkers, showVegetarianRestaurants, showNonVegetarianRestaurants]);

  // Show loading/error state in console for debugging
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
