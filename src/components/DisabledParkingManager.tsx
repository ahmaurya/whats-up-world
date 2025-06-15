
import React, { useEffect, useState } from 'react';
import L from 'leaflet';
import { useDisabledParking } from '@/hooks/useParking';
import { useMap } from './MapProvider';
import { createDisabledParkingMarker } from '@/utils/disabledParkingMarkers';

interface DisabledParkingManagerProps {
  map: L.Map | null;
}

const DisabledParkingManager: React.FC<DisabledParkingManagerProps> = ({ map }) => {
  const { showDisabledParking } = useMap();
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

  // Fetch disabled parking data
  const { disabledParkingSpots, loading, error } = useDisabledParking(bounds, showDisabledParking);

  // Manage marker layer
  useEffect(() => {
    if (!map) return;

    if (showDisabledParking) {
      map.addLayer(markerLayer);
    } else {
      map.removeLayer(markerLayer);
    }

    return () => {
      if (map.hasLayer(markerLayer)) {
        map.removeLayer(markerLayer);
      }
    };
  }, [map, showDisabledParking, markerLayer]);

  // Update markers when data changes
  useEffect(() => {
    markerLayer.clearLayers();

    if (showDisabledParking && disabledParkingSpots.length > 0) {
      console.log(`♿ Adding ${disabledParkingSpots.length} disabled parking markers to map`);
      
      disabledParkingSpots.forEach((spot) => {
        try {
          const marker = createDisabledParkingMarker(spot);
          markerLayer.addLayer(marker);
        } catch (err) {
          console.error('Error creating disabled parking marker:', err);
        }
      });
    }
  }, [disabledParkingSpots, showDisabledParking, markerLayer]);

  // Log loading and error states
  useEffect(() => {
    if (loading) {
      console.log('♿ Loading disabled parking spots...');
    }
    if (error) {
      console.error('♿ Disabled parking spots error:', error);
    }
  }, [loading, error]);

  return null;
};

export default DisabledParkingManager;
