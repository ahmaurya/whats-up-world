
import { useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import { mockRestaurants, Restaurant } from '@/utils/restaurantData';
import { useMap } from './MapProvider';

interface RestaurantMarkersManagerProps {
  map: React.MutableRefObject<mapboxgl.Map | null>;
  onRestaurantClick: (restaurant: Restaurant) => void;
}

const RestaurantMarkersManager: React.FC<RestaurantMarkersManagerProps> = ({ 
  map, 
  onRestaurantClick 
}) => {
  const { showRestaurants } = useMap();

  const addRestaurantMarkers = () => {
    if (!map.current) return;

    mockRestaurants.forEach((restaurant) => {
      const marker = new mapboxgl.Marker({ color: '#f59e0b' })
        .setLngLat(restaurant.coordinates)
        .addTo(map.current!);

      marker.getElement().addEventListener('click', () => {
        onRestaurantClick(restaurant);
      });

      marker.getElement().style.cursor = 'pointer';
      marker.getElement().style.display = showRestaurants ? 'block' : 'none';
    });
  };

  // Update restaurant marker visibility
  useEffect(() => {
    if (!map.current) return;

    const markers = document.querySelectorAll('.mapboxgl-marker');
    markers.forEach((marker, index) => {
      if (index < mockRestaurants.length) { // Only restaurant markers
        (marker as HTMLElement).style.display = showRestaurants ? 'block' : 'none';
      }
    });
  }, [showRestaurants]);

  useEffect(() => {
    if (map.current) {
      map.current.on('load', addRestaurantMarkers);
    }
  }, []);

  return null;
};

export default RestaurantMarkersManager;
