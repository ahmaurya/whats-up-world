
import React, { useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { useLeaflet } from '@/hooks/useLeaflet';
import MapControls from './MapControls';
import DistanceDisplay from './DistanceDisplay';
import PointEntry from './PointEntry';
import RestaurantPopup from './RestaurantPopup';
import TransitLinesManager from './TransitLinesManager';
import RestaurantMarkersManager from './RestaurantMarkersManager';
import { Restaurant } from '@/hooks/useRestaurants';

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
      <PointEntry />
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
