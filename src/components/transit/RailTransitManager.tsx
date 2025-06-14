
import React from 'react';
import L from 'leaflet';
import { TransitData } from '@/types/transit';
import TransitLineRenderer from './TransitLineRenderer';

interface RailTransitManagerProps {
  map: L.Map | null;
  transitData: TransitData | null;
  isLoading: boolean;
  showRailTransit: boolean;
  railTransitLayer: L.LayerGroup | null;
  getTransitColor: (type: string) => string;
}

const RailTransitManager: React.FC<RailTransitManagerProps> = ({
  map,
  transitData,
  isLoading,
  showRailTransit,
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

    if (showRailTransit && transitData && !isLoading) {
      console.log('🚇 Adding rail/subway/tram transit lines to map...');
      
      // Combine rail transit lines (subway, tram, rail)
      const railLines = [
        ...transitData.subway,
        ...transitData.tram,
        ...transitData.rail
      ];
      
      return;
    } else if (!showRailTransit) {
      console.log('🚇 Hiding all rail transit lines from map');
      railTransitLayer.clearLayers();
    }
  }, [map, showRailTransit, transitData, isLoading, railTransitLayer, getTransitColor]);

  if (!showRailTransit || !transitData || isLoading || !railTransitLayer) {
    return null;
  }

  // Combine rail transit lines (subway, tram, rail)
  const railLines = [
    ...transitData.subway,
    ...transitData.tram,
    ...transitData.rail
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
