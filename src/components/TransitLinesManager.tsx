
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { transitLines } from '@/utils/transitData';
import { useMap } from './MapProvider';

interface TransitLinesManagerProps {
  map: React.MutableRefRef<L.Map | null>;
}

const TransitLinesManager: React.FC<TransitLinesManagerProps> = ({ map }) => {
  const { showTransit } = useMap();
  const transitLayersRef = useRef<L.LayerGroup[]>([]);

  const createTransitLines = () => {
    if (!map.current) return;

    // Clear existing transit layers
    transitLayersRef.current.forEach(layer => {
      if (map.current!.hasLayer(layer)) {
        map.current!.removeLayer(layer);
      }
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
      });
    });
  };

  // Update transit line visibility when showTransit changes
  useEffect(() => {
    if (!map.current) return;

    if (showTransit) {
      transitLayersRef.current.forEach(layer => {
        if (!map.current!.hasLayer(layer)) {
          layer.addTo(map.current!);
        }
      });
    } else {
      transitLayersRef.current.forEach(layer => {
        if (map.current!.hasLayer(layer)) {
          map.current!.removeLayer(layer);
        }
      });
    }
  }, [showTransit]);

  // Initialize transit lines when map is ready
  useEffect(() => {
    if (map.current) {
      createTransitLines();
      
      // Add lines to map if showTransit is true
      if (showTransit) {
        transitLayersRef.current.forEach(layer => {
          layer.addTo(map.current!);
        });
      }
    }
  }, [map.current]);

  return null;
};

export default TransitLinesManager;
