
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { transitLines } from '@/utils/transitData';
import { useMap } from './MapProvider';

interface TransitLinesManagerProps {
  map: React.MutableRefObject<L.Map | null>;
}

const TransitLinesManager: React.FC<TransitLinesManagerProps> = ({ map }) => {
  const { showTransit } = useMap();
  const transitLayersRef = useRef<L.LayerGroup[]>([]);

  const addTransitLines = () => {
    if (!map.current) return;

    // Clear existing transit layers
    transitLayersRef.current.forEach(layer => {
      map.current!.removeLayer(layer);
    });
    transitLayersRef.current = [];

    Object.entries(transitLines).forEach(([city, lines]) => {
      // Add subway lines
      lines.subway.forEach((line) => {
        const subwayLine = L.polyline(line.map(coord => [coord[1], coord[0]]), {
          color: '#3b82f6',
          weight: 4,
          opacity: 0.8
        });
        
        const layerGroup = L.layerGroup([subwayLine]);
        transitLayersRef.current.push(layerGroup);
        
        if (showTransit) {
          layerGroup.addTo(map.current!);
        }
      });

      // Add bus lines
      lines.bus.forEach((line) => {
        const busLine = L.polyline(line.map(coord => [coord[1], coord[0]]), {
          color: '#10b981',
          weight: 3,
          opacity: 0.8,
          dashArray: '5, 5'
        });
        
        const layerGroup = L.layerGroup([busLine]);
        transitLayersRef.current.push(layerGroup);
        
        if (showTransit) {
          layerGroup.addTo(map.current!);
        }
      });
    });
  };

  // Update transit line visibility
  useEffect(() => {
    if (!map.current) return;

    transitLayersRef.current.forEach(layer => {
      if (showTransit) {
        layer.addTo(map.current!);
      } else {
        map.current!.removeLayer(layer);
      }
    });
  }, [showTransit]);

  useEffect(() => {
    if (map.current) {
      addTransitLines();
    }
  }, []);

  return null;
};

export default TransitLinesManager;
