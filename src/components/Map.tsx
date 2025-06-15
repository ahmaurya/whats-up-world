
import React, { useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { useLeaflet } from '@/hooks/useLeaflet';
import MapControls from './MapControls';
import RestaurantPopup from './RestaurantPopup';
import TransitLinesManager from './TransitLinesManager';
import LiveTransitManager from './LiveTransitManager';
import LiveVehicleStyles from './LiveVehicleStyles';
import RestaurantMarkersManager from './RestaurantMarkersManager';
import CafeMarkersManager from './CafeMarkersManager';
import HistoricPlacesManager from './HistoricPlacesManager';
import ScenicViewpointsManager from './ScenicViewpointsManager';
import FarmersMarketsManager from './FarmersMarketsManager';
import ParkingManager from './ParkingManager';
import DisabledParkingManager from './DisabledParkingManager';
import GeocodedImagesManager from './GeocodedImagesManager';
import { useMap } from './MapProvider';
import { Restaurant } from '@/hooks/useRestaurants';
import { Cafe } from '@/hooks/useCafes';

const Map = () => {
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null);
  const { mapContainer, map, initializeMap } = useLeaflet();
  const { showGeocodedImages } = useMap();

  React.useEffect(() => {
    initializeMap();
  }, [initializeMap]);

  const handleRestaurantClick = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setSelectedCafe(null); // Close cafe popup if open
  };

  const handleCafeClick = (cafe: Cafe) => {
    setSelectedCafe(cafe);
    setSelectedRestaurant(null); // Close restaurant popup if open
  };

  return (
    <div className="relative w-full h-full">
      <LiveVehicleStyles />
      <div ref={mapContainer} className="absolute inset-0" />
      <MapControls />
      <TransitLinesManager map={map.current} />
      <LiveTransitManager map={map.current} />
      <RestaurantMarkersManager 
        map={map.current} 
        onRestaurantClick={handleRestaurantClick} 
      />
      <CafeMarkersManager 
        map={map.current} 
        onCafeClick={handleCafeClick} 
      />
      <HistoricPlacesManager map={map.current} />
      <ScenicViewpointsManager map={map.current} />
      <FarmersMarketsManager map={map.current} />
      <ParkingManager map={map.current} />
      <DisabledParkingManager map={map.current} />
      <GeocodedImagesManager 
        map={map.current} 
        visible={showGeocodedImages} 
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
