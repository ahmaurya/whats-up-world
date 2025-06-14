
import React, { useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { useLeaflet } from '@/hooks/useLeaflet';
import MapControls from './MapControls';
import DistanceDisplay from './DistanceDisplay';
import RestaurantPopup from './RestaurantPopup';
import TransitLinesManager from './TransitLinesManager';
import RestaurantMarkersManager from './RestaurantMarkersManager';
import { Restaurant } from '@/utils/restaurantData';

const Map = () => {
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const { mapContainer, map, initializeMap } = useLeaflet();

  React.useEffect(() => {
    initializeMap();
  }, [initializeMap]);

  const handleRestaurantClick = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
  };

  return (
    <div className="relative w-full h-screen">
      <div ref={mapContainer} className="absolute inset-0" />
      <MapControls />
      <DistanceDisplay />
      <TransitLinesManager map={map} />
      <RestaurantMarkersManager 
        map={map} 
        onRestaurantClick={handleRestaurantClick} 
      />
      {selectedRestaurant && (
        <RestaurantPopup
          restaurant={selectedRestaurant}
          onClose={() => setSelectedRestaurant(null)}
        />
      )}
    </div>
  );
};

export default Map;
