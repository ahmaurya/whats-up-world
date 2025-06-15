import React, { useEffect, useState } from 'react';
import L from 'leaflet';
import { useParking } from '@/hooks/useParking';
import { useMap } from './MapProvider';
import { createParkingMarker } from '@/utils/parkingMarkers';

interface ParkingManagerProps {
  map: L.Map | null;
}

const ParkingManager: React.FC<ParkingManagerProps> = ({ map }) => {
  const { showParking } = useMap();
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

  // Listen for map ready event to trigger initial data fetch if layer is enabled
  useEffect(() => {
    const handleMapReady = (event: CustomEvent) => {
      if (showParking && event.detail.map) {
        console.log('🅿️ Map ready and parking layer enabled - triggering initial data fetch');
        const mapInstance = event.detail.map as L.Map;
        setBounds(mapInstance.getBounds());
      }
    };

    window.addEventListener('mapReady', handleMapReady as EventListener);

    return () => {
      window.removeEventListener('mapReady', handleMapReady as EventListener);
    };
  }, [showParking]);

  // Fetch parking data
  const { parkingSpots, loading, error } = useParking(bounds, showParking);

  // Manage marker layer
  useEffect(() => {
    if (!map) return;

    if (showParking) {
      map.addLayer(markerLayer);
    } else {
      map.removeLayer(markerLayer);
    }

    return () => {
      if (map.hasLayer(markerLayer)) {
        map.removeLayer(markerLayer);
      }
    };
  }, [map, showParking, markerLayer]);

  // Update markers when data changes
  useEffect(() => {
    markerLayer.clearLayers();

    if (showParking && parkingSpots.length > 0) {
      console.log(`🅿️ Adding ${parkingSpots.length} parking markers to map`);
      
      parkingSpots.forEach((spot) => {
        try {
          const marker = createParkingMarker(spot);
          markerLayer.addLayer(marker);
        } catch (err) {
          console.error('Error creating parking marker:', err);
        }
      });
    }
  }, [parkingSpots, showParking, markerLayer]);

  // Log loading and error states
  useEffect(() => {
    if (loading) {
      console.log('🅿️ Loading parking spots...');
    }
    if (error) {
      console.error('🅿️ Parking spots error:', error);
    }
  }, [loading, error]);

  return null;
};

export default ParkingManager;
