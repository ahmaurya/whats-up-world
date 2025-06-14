
import React from 'react';
import L from 'leaflet';
import { useMap } from './MapProvider';
import { useTransitData } from '@/hooks/useTransitData';
import { useTransitLayers } from '@/hooks/useTransitLayers';
import TransitLayerRenderer from './TransitLayerRenderer';

interface TransitLinesManagerProps {
  map: L.Map | null;
}

const TransitLinesManager: React.FC<TransitLinesManagerProps> = ({ map }) => {
  const { showRailTransit, showBusTransit } = useMap();
  const { transitData, isLoading } = useTransitData(map);
  const { railTransitLayer, busTransitLayer } = useTransitLayers(map);

  return (
    <TransitLayerRenderer
      map={map}
      transitData={transitData}
      isLoading={isLoading}
      showRailTransit={showRailTransit}
      showBusTransit={showBusTransit}
      railTransitLayer={railTransitLayer}
      busTransitLayer={busTransitLayer}
    />
  );
};

export default TransitLinesManager;
