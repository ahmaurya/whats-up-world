
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { transitLines } from '@/utils/transitData';
import { useMap } from './MapProvider';

interface TransitLinesManagerProps {
  map: React.MutableRefObject<L.Map | null>;
}

const TransitLinesManager: React.FC<TransitLinesManagerProps> = ({ map }) => {
  const { showTransit } = useMap();
  const transitLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const createTransitLines = () => {
    if (!map.current) return;

    // Clear existing transit layer group
    if (transitLayerGroupRef.current) {
      if (map.current.hasLayer(transitLayerGroupRef.current)) {
        map.current.removeLayer(transitLayerGroupRef.current);
      }
    }

    // Create new layer group for all transit lines
    transitLayerGroupRef.current = L.layerGroup();

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
        
        transitLayerGroupRef.current!.addLayer(subwayLine);
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
        
        transitLayerGroupRef.current!.addLayer(busLine);
      });
    });
  };

  // Initialize transit lines when map is ready
  useEffect(() => {
    if (map.current && !transitLayerGroupRef.current) {
      createTransitLines();
    }
  }, [map.current]);

  // Update transit line visibility when showTransit changes
  useEffect(() => {
    if (!map.current || !transitLayerGroupRef.current) return;

    if (showTransit) {
      if (!map.current.hasLayer(transitLayerGroupRef.current)) {
        transitLayerGroupRef.current.addTo(map.current);
      }
    } else {
      if (map.current.hasLayer(transitLayerGroupRef.current)) {
        map.current.removeLayer(transitLayerGroupRef.current);
      }
    }
  }, [showTransit, map.current]);

  return null;
};

export default TransitLinesManager;
