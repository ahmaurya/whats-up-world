
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { mockRestaurants, Restaurant } from '@/utils/restaurantData';
import { useMap } from './MapProvider';

interface RestaurantMarkersManagerProps {
  map: React.MutableRefObject<L.Map | null>;
  onRestaurantClick: (restaurant: Restaurant) => void;
}

const RestaurantMarkersManager: React.FC<RestaurantMarkersManagerProps> = ({ 
  map, 
  onRestaurantClick 
}) => {
  const { showRestaurants } = useMap();
  const restaurantMarkersRef = useRef<L.Marker[]>([]);

  const addRestaurantMarkers = () => {
    if (!map.current) return;

    // Clear existing markers
    restaurantMarkersRef.current.forEach(marker => {
      map.current!.removeLayer(marker);
    });
    restaurantMarkersRef.current = [];

    mockRestaurants.forEach((restaurant) => {
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

  useEffect(() => {
    if (map.current) {
      addRestaurantMarkers();
    }
  }, []);

  return null;
};

export default RestaurantMarkersManager;
