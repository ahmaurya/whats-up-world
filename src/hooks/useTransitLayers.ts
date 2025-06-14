
import { useRef, useEffect } from 'react';
import L from 'leaflet';

export const useTransitLayers = (map: L.Map | null) => {
  const railTransitLayerRef = useRef<L.LayerGroup | null>(null);
  const busTransitLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize layers
  useEffect(() => {
    if (!map) {
      console.log('🗺️ Map not available for layer initialization');
      return;
    }

    // Initialize rail transit layer if not exists
    if (!railTransitLayerRef.current) {
      railTransitLayerRef.current = L.layerGroup().addTo(map);
      console.log('🗺️ Created new rail transit layer group');
    }

    // Initialize bus transit layer if not exists
    if (!busTransitLayerRef.current) {
      busTransitLayerRef.current = L.layerGroup().addTo(map);
      console.log('🗺️ Created new bus transit layer group');
    }
  }, [map]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (railTransitLayerRef.current) {
        console.log('🧹 Cleaning up rail transit layer on component unmount');
        railTransitLayerRef.current.clearLayers();
        railTransitLayerRef.current.remove();
        railTransitLayerRef.current = null;
      }
      if (busTransitLayerRef.current) {
        console.log('🧹 Cleaning up bus transit layer on component unmount');
        busTransitLayerRef.current.clearLayers();
        busTransitLayerRef.current.remove();
        busTransitLayerRef.current = null;
      }
    };
  }, []);

  return {
    railTransitLayer: railTransitLayerRef.current,
    busTransitLayer: busTransitLayerRef.current
  };
};
