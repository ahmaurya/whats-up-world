
import { useRef, useCallback, useEffect } from 'react';
import L from 'leaflet';
import { useMap } from '@/components/MapProvider';

export const useLeaflet = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const { addPoint } = useMap();

  const initializeMap = useCallback(() => {
    if (!mapContainer.current) return;
    
    // If map already exists, don't reinitialize
    if (map.current) return;

    // Clear any existing content in the container
    mapContainer.current.innerHTML = '';

    map.current = L.map(mapContainer.current).setView([39.8283, -98.5795], 4);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map.current);

    map.current.on('click', (e) => {
      const point: [number, number] = [e.latlng.lng, e.latlng.lat];
      addPoint(point);
      
      // Removed the red dot marker creation code
    });
  }, [addPoint]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (map.current) {
      map.current.remove();
      map.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    mapContainer,
    map,
    initializeMap,
    cleanup
  };
};
