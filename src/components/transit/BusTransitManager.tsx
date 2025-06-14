
import React from 'react';
import L from 'leaflet';
import { TransitData } from '@/types/transit';
import TransitLineRenderer from './TransitLineRenderer';

interface BusTransitManagerProps {
  map: L.Map | null;
  transitData: TransitData | null;
  isLoading: boolean;
  showBusTransit: boolean;
  busTransitLayer: L.LayerGroup | null;
  getTransitColor: (type: string) => string;
}

const BusTransitManager: React.FC<BusTransitManagerProps> = ({
  map,
  transitData,
  isLoading,
  showBusTransit,
  busTransitLayer,
  getTransitColor
}) => {
  // Handle bus transit visibility toggle and layer management
  React.useEffect(() => {
    if (!map || !busTransitLayer) {
      console.log('🗺️ Map or bus layer not available for bus transit layer management');
      return;
    }

    console.log(`🔄 Bus transit visibility toggle: ${showBusTransit ? 'SHOWING' : 'HIDING'} bus transit lines`);

    if (!showBusTransit) {
      console.log('🚌 Hiding all bus transit lines from map');
      busTransitLayer.clearLayers();
    }
  }, [map, showBusTransit, transitData, isLoading, busTransitLayer, getTransitColor]);

  if (!showBusTransit || !transitData || isLoading || !busTransitLayer) {
    return null;
  }

  const busLines = transitData.bus;

  return (
    <TransitLineRenderer
      lines={busLines}
      layerGroup={busTransitLayer}
      getTransitColor={getTransitColor}
      lineType="bus"
    />
  );
};

export default BusTransitManager;
