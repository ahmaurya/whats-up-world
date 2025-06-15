
import React, { useEffect, useState } from 'react';
import L from 'leaflet';
import { useScenicViewpoints } from '@/hooks/useScenicViewpoints';
import { useMap } from './MapProvider';
import { createScenicViewpointMarker } from '@/utils/scenicViewpointMarkers';

interface ScenicViewpointsManagerProps {
  map: L.Map | null;
}

const ScenicViewpointsManager: React.FC<ScenicViewpointsManagerProps> = ({ map }) => {
  const { showScenicViewpoints } = useMap();
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null);
  const [markerLayer] = useState(() => L.layerGroup());

  // Get current map bounds
  useEffect(() => {
    if (!map) return;

    const updateBounds = () => {
      setBounds(map.getBounds());
    };

    // Set initial bounds
    updateBounds();

    // Update bounds when map moves
    map.on('moveend', updateBounds);
    map.on('zoomend', updateBounds);

    return () => {
      map.off('moveend', updateBounds);
      map.off('zoomend', updateBounds);
    };
  }, [map]);

  // Fetch scenic viewpoints data
  const { scenicViewpoints, loading, error } = useScenicViewpoints(bounds, showScenicViewpoints);

  // Manage marker layer
  useEffect(() => {
    if (!map) return;

    if (showScenicViewpoints) {
      map.addLayer(markerLayer);
    } else {
      map.removeLayer(markerLayer);
    }

    return () => {
      if (map.hasLayer(markerLayer)) {
        map.removeLayer(markerLayer);
      }
    };
  }, [map, showScenicViewpoints, markerLayer]);

  // Update markers when data changes
  useEffect(() => {
    markerLayer.clearLayers();

    if (showScenicViewpoints && scenicViewpoints.length > 0) {
      console.log(`🏔️ Adding ${scenicViewpoints.length} scenic viewpoint markers to map`);
      
      scenicViewpoints.forEach((viewpoint) => {
        try {
          const marker = createScenicViewpointMarker(viewpoint);
          markerLayer.addLayer(marker);
        } catch (err) {
          console.error('Error creating scenic viewpoint marker:', err);
        }
      });
    }
  }, [scenicViewpoints, showScenicViewpoints, markerLayer]);

  // Log loading and error states
  useEffect(() => {
    if (loading) {
      console.log('🏔️ Loading scenic viewpoints...');
    }
    if (error) {
      console.error('🏔️ Scenic viewpoints error:', error);
    }
  }, [loading, error]);

  return null;
};

export default ScenicViewpointsManager;
