
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { transitLines } from '@/utils/transitData';
import { useMap } from './MapProvider';

interface TransitLinesManagerProps {
  map: React.MutableRefObject<L.Map | null>;
}

const TransitLinesManager: React.FC<TransitLinesManagerProps> = ({ map }) => {
  const { showTransit } = useMap();
  const transitLayerRef = useRef<L.LayerGroup | null>(null);

  const createTransitLayer = () => {
    if (!map.current) return;

    // Create a single layer group for all transit lines
    const transitLayer = L.layerGroup();

    Object.entries(transitLines).forEach(([city, lines]) => {
      // Add subway lines
      lines.subway.forEach((line, index) => {
        const subwayLine = L.polyline(line.map(coord => [coord[1], coord[0]]), {
          color: '#3b82f6',
          weight: 4,
          opacity: 0.8
        });
        
        // Add hover tooltip
        subwayLine.bindTooltip(`${city.charAt(0).toUpperCase() + city.slice(1)} Subway Line ${index + 1}`, {
          permanent: false,
          direction: 'top',
          className: 'transit-tooltip'
        });
        
        transitLayer.addLayer(subwayLine);
      });

      // Add bus lines
      lines.bus.forEach((line, index) => {
        const busLine = L.polyline(line.map(coord => [coord[1], coord[0]]), {
          color: '#10b981',
          weight: 3,
          opacity: 0.8,
          dashArray: '5, 5'
        });
        
        // Add hover tooltip
        busLine.bindTooltip(`${city.charAt(0).toUpperCase() + city.slice(1)} Bus Route ${index + 1}`, {
          permanent: false,
          direction: 'top',
          className: 'transit-tooltip'
        });
        
        transitLayer.addLayer(busLine);
      });
    });

    return transitLayer;
  };

  // Initialize transit layer when map is ready
  useEffect(() => {
    if (map.current && !transitLayerRef.current) {
      transitLayerRef.current = createTransitLayer();
    }
  }, [map.current]);

  // Toggle transit layer visibility when showTransit changes
  useEffect(() => {
    if (!map.current || !transitLayerRef.current) return;

    if (showTransit) {
      // Add the layer to the map if it's not already there
      if (!map.current.hasLayer(transitLayerRef.current)) {
        transitLayerRef.current.addTo(map.current);
      }
    } else {
      // Remove the layer from the map if it's there
      if (map.current.hasLayer(transitLayerRef.current)) {
        map.current.removeLayer(transitLayerRef.current);
      }
    }
  }, [showTransit]);

  return null;
};

export default TransitLinesManager;
