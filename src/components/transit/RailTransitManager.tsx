
import React from 'react';
import L from 'leaflet';
import { TransitData } from '@/types/transit';
import TransitLineRenderer from './TransitLineRenderer';

interface RailTransitManagerProps {
  map: L.Map | null;
  transitData: TransitData | null;
  isLoading: boolean;
  showRailTransit: boolean;
  showTramTransit: boolean;
  railTransitLayer: L.LayerGroup | null;
  getTransitColor: (type: string) => string;
}

const RailTransitManager: React.FC<RailTransitManagerProps> = ({
  map,
  transitData,
  isLoading,
  showRailTransit,
  showTramTransit,
  railTransitLayer,
  getTransitColor
}) => {
  // Handle rail transit visibility toggle and layer management
  React.useEffect(() => {
    if (!map || !railTransitLayer) {
      console.log('🗺️ Map or rail layer not available for rail transit layer management');
      return;
    }

    console.log(`🔄 Rail transit visibility toggle: ${showRailTransit ? 'SHOWING' : 'HIDING'} rail transit lines`);
    console.log(`🔄 Tram transit visibility toggle: ${showTramTransit ? 'SHOWING' : 'HIDING'} tram transit lines`);

    if ((!showRailTransit && !showTramTransit) || !transitData || isLoading) {
      console.log('🚇 Hiding all rail/tram transit lines from map');
      railTransitLayer.clearLayers();
    }
  }, [map, showRailTransit, showTramTransit, transitData, isLoading, railTransitLayer, getTransitColor]);

  if ((!showRailTransit && !showTramTransit) || !transitData || isLoading || !railTransitLayer) {
    return null;
  }

  // Combine only the enabled transit lines
  const railLines = [
    ...(showRailTransit ? [...transitData.subway, ...transitData.rail] : []),
    ...(showTramTransit ? transitData.tram : [])
  ];

  return (
    <TransitLineRenderer
      lines={railLines}
      layerGroup={railTransitLayer}
      getTransitColor={getTransitColor}
      lineType="rail"
    />
  );
};

export default RailTransitManager;
