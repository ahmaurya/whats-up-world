
import React, { useState } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useMapbox } from '@/hooks/useMapbox';
import MapControls from './MapControls';
import DistanceDisplay from './DistanceDisplay';
import RestaurantPopup from './RestaurantPopup';
import MapTokenInput from './MapTokenInput';
import TransitLinesManager from './TransitLinesManager';
import RestaurantMarkersManager from './RestaurantMarkersManager';
import { Restaurant } from '@/utils/restaurantData';

const Map = () => {
  const [isTokenSet, setIsTokenSet] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const { mapContainer, map, initializeMap } = useMapbox();

  const handleTokenSubmit = (token: string) => {
    setIsTokenSet(true);
    initializeMap(token);
  };

  const handleRestaurantClick = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
  };

  if (!isTokenSet) {
    return <MapTokenInput onTokenSubmit={handleTokenSubmit} />;
  }

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
