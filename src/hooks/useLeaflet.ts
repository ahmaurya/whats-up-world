
import { useRef, useCallback } from 'react';
import L from 'leaflet';
import { useMap } from '@/components/MapProvider';

export const useLeaflet = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const { addPoint } = useMap();

  const initializeMap = useCallback(() => {
    if (!mapContainer.current) return;

    map.current = L.map(mapContainer.current).setView([39.8283, -98.5795], 4);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map.current);

    map.current.on('click', (e) => {
      const point: [number, number] = [e.latlng.lng, e.latlng.lat];
      addPoint(point);
      
      // Add marker for clicked point
      L.marker([e.latlng.lat, e.latlng.lng], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: '<div style="background-color: #ef4444; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>',
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        })
      }).addTo(map.current!);
    });
  }, [addPoint]);

  return {
    mapContainer,
    map,
    initializeMap
  };
};
