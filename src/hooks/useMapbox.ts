
import { useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { useMap } from '@/components/MapProvider';

export const useMapbox = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const { addPoint } = useMap();

  const initializeMap = useCallback((token: string) => {
    if (!mapContainer.current || !token) return;

    mapboxgl.accessToken = token;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-98.5795, 39.8283], // Center of US
      zoom: 4,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('click', (e) => {
      const point: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      addPoint(point);
      
      // Add marker for clicked point
      new mapboxgl.Marker({ color: '#ef4444' })
        .setLngLat(point)
        .addTo(map.current!);
    });
  }, [addPoint]);

  return {
    mapContainer,
    map,
    initializeMap
  };
};
