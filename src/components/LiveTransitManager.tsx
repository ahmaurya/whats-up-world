
import React from 'react';
import L from 'leaflet';
import { useMap } from './MapProvider';
import { useLiveTransitData } from '@/hooks/useLiveTransitData';
import LiveVehicleMarkers from './LiveVehicleMarkers';

interface LiveTransitManagerProps {
  map: L.Map | null;
}

const LiveTransitManager: React.FC<LiveTransitManagerProps> = ({ map }) => {
  const { 
    showRailTransit, 
    showTramTransit, 
    showBusTransit 
  } = useMap();
  
  const { liveData, isLoading, error } = useLiveTransitData(map);

  // Show loading indicator if needed (could be expanded)
  React.useEffect(() => {
    if (isLoading) {
      console.log('🔄 Loading live transit data...');
    }
    if (error) {
      console.error('❌ Live transit data error:', error);
    }
  }, [isLoading, error]);

  return (
    <>
      {/* Live Bus Markers */}
      <LiveVehicleMarkers
        map={map}
        vehicles={liveData.buses}
        vehicleType="bus"
        visible={showBusTransit}
      />
      
      {/* Live Rail/Subway Markers */}
      <LiveVehicleMarkers
        map={map}
        vehicles={liveData.rail}
        vehicleType="rail"
        visible={showRailTransit}
      />
      
      {/* Live Tram/Streetcar Markers */}
      <LiveVehicleMarkers
        map={map}
        vehicles={liveData.trams}
        vehicleType="tram"
        visible={showTramTransit}
      />
    </>
  );
};

export default LiveTransitManager;
