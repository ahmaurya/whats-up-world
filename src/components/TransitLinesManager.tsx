
import { useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import { transitLines } from '@/utils/transitData';
import { useMap } from './MapProvider';

interface TransitLinesManagerProps {
  map: React.MutableRefObject<mapboxgl.Map | null>;
}

const TransitLinesManager: React.FC<TransitLinesManagerProps> = ({ map }) => {
  const { showTransit } = useMap();

  const addTransitLines = () => {
    if (!map.current) return;

    Object.entries(transitLines).forEach(([city, lines]) => {
      // Add subway lines
      lines.subway.forEach((line, index) => {
        const sourceId = `${city}-subway-${index}`;
        const layerId = `${city}-subway-layer-${index}`;
        
        map.current!.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: line
            }
          }
        });
        
        map.current!.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
            'visibility': showTransit ? 'visible' : 'none'
          },
          paint: {
            'line-color': '#3b82f6', // Blue for subway
            'line-width': 4
          }
        });
      });

      // Add bus lines
      lines.bus.forEach((line, index) => {
        const sourceId = `${city}-bus-${index}`;
        const layerId = `${city}-bus-layer-${index}`;
        
        map.current!.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: line
            }
          }
        });
        
        map.current!.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
            'visibility': showTransit ? 'visible' : 'none'
          },
          paint: {
            'line-color': '#10b981', // Green for bus
            'line-width': 3,
            'line-dasharray': [2, 2] // Dashed line for buses
          }
        });
      });
    });
  };

  // Update transit line visibility
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    const visibility = showTransit ? 'visible' : 'none';
    
    Object.keys(transitLines).forEach(city => {
      try {
        map.current!.setLayoutProperty(`${city}-subway-layer-0`, 'visibility', visibility);
        map.current!.setLayoutProperty(`${city}-bus-layer-0`, 'visibility', visibility);
      } catch (error) {
        console.log('Layer not found:', error);
      }
    });
  }, [showTransit]);

  useEffect(() => {
    if (map.current) {
      map.current.on('load', addTransitLines);
    }
  }, []);

  return null;
};

export default TransitLinesManager;
