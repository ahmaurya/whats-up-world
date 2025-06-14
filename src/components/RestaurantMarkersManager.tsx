
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useMap } from './MapProvider';
import { useRestaurants, Restaurant } from '@/hooks/useRestaurants';

interface RestaurantMarkersManagerProps {
  map: React.MutableRefObject<L.Map | null>;
  onRestaurantClick: (restaurant: Restaurant) => void;
}

const RestaurantMarkersManager: React.FC<RestaurantMarkersManagerProps> = ({ 
  map, 
  onRestaurantClick 
}) => {
  const { showRestaurants } = useMap();
  const { restaurants, fetchRestaurants, loading, error } = useRestaurants();
  const restaurantMarkersRef = useRef<L.Marker[]>([]);

  const addRestaurantMarkers = () => {
    if (!map.current) return;

    // Clear existing markers
    restaurantMarkersRef.current.forEach(marker => {
      map.current!.removeLayer(marker);
    });
    restaurantMarkersRef.current = [];

    restaurants.forEach((restaurant) => {
      const marker = L.marker([restaurant.coordinates[1], restaurant.coordinates[0]], {
        icon: L.divIcon({
          className: 'restaurant-marker',
          html: '<div style="background-color: #f59e0b; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; cursor: pointer;"></div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        })
      });

      marker.on('click', () => {
        onRestaurantClick(restaurant);
      });

      restaurantMarkersRef.current.push(marker);
      
      if (showRestaurants) {
        marker.addTo(map.current!);
      }
    });
  };

  // Fetch restaurants when map center changes or when restaurants are toggled on
  useEffect(() => {
    if (!map.current || !showRestaurants) return;

    const handleMoveEnd = () => {
      if (!map.current) return;
      
      const center = map.current.getCenter();
      const zoom = map.current.getZoom();
      
      // Only fetch if zoomed in enough to see local restaurants
      if (zoom >= 12) {
        fetchRestaurants(center.lat, center.lng);
      }
    };

    // Fetch restaurants immediately if zoomed in enough
    const center = map.current.getCenter();
    const zoom = map.current.getZoom();
    if (zoom >= 12) {
      fetchRestaurants(center.lat, center.lng);
    }

    map.current.on('moveend', handleMoveEnd);

    return () => {
      if (map.current) {
        map.current.off('moveend', handleMoveEnd);
      }
    };
  }, [showRestaurants, fetchRestaurants]);

  // Update restaurant marker visibility
  useEffect(() => {
    if (!map.current) return;

    restaurantMarkersRef.current.forEach(marker => {
      if (showRestaurants) {
        marker.addTo(map.current!);
      } else {
        map.current!.removeLayer(marker);
      }
    });
  }, [showRestaurants]);

  // Add markers when restaurants data changes
  useEffect(() => {
    if (restaurants.length > 0) {
      addRestaurantMarkers();
    }
  }, [restaurants]);

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
