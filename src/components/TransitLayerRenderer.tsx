
import React from 'react';
import L from 'leaflet';
import { TransitData } from '@/types/transit';
import RailTransitManager from './transit/RailTransitManager';
import BusTransitManager from './transit/BusTransitManager';

interface TransitLayerRendererProps {
  map: L.Map | null;
  transitData: TransitData | null;
  isLoading: boolean;
  showRailTransit: boolean;
  showBusTransit: boolean;
  railTransitLayer: L.LayerGroup | null;
  busTransitLayer: L.LayerGroup | null;
}

const TransitLayerRenderer: React.FC<TransitLayerRendererProps> = ({
  map,
  transitData,
  isLoading,
  showRailTransit,
  showBusTransit,
  railTransitLayer,
  busTransitLayer
}) => {
  // Helper function to get color based on transit type
  const getTransitColor = (type: string): string => {
    switch (type) {
      case 'subway':
      case 'rail':
        return '#3B82F6'; // Blue for rail/subway
      case 'tram':
        return '#F97316'; // Orange for trams/streetcar
      case 'bus':
        return '#22C55E'; // Green for buses
      default:
        return '#6B7280'; // Gray fallback
    }
  };

  return (
    <>
      <RailTransitManager
        map={map}
        transitData={transitData}
        isLoading={isLoading}
        showRailTransit={showRailTransit}
        railTransitLayer={railTransitLayer}
        getTransitColor={getTransitColor}
      />
      <BusTransitManager
        map={map}
        transitData={transitData}
        isLoading={isLoading}
        showBusTransit={showBusTransit}
        busTransitLayer={busTransitLayer}
        getTransitColor={getTransitColor}
      />
    </>
  );
};

export default TransitLayerRenderer;
