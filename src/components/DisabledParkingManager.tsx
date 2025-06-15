
import React, { useEffect, useState } from 'react';
import L from 'leaflet';
import { useDisabledParking } from '@/hooks/useParking';
import { useSeattleDisabledParking } from '@/hooks/useSeattleParking';
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

  // Fetch disabled parking data from both sources
  const { disabledParkingSpots: osmSpots, loading: osmLoading, error: osmError } = useDisabledParking(bounds, showDisabledParking);
  const { seattleParkingSpots, loading: seattleLoading, error: seattleError, fetchSeattleDisabledParking } = useSeattleDisabledParking();

  // Fetch Seattle data when bounds change
  useEffect(() => {
    if (!bounds || !showDisabledParking) return;

    const center = bounds.getCenter();
    // Only fetch Seattle data if we're in the Seattle area (rough bounds check)
    if (center.lat >= 47.4 && center.lat <= 47.8 && center.lng >= -122.5 && center.lng <= -122.0) {
      fetchSeattleDisabledParking(center.lat, center.lng, 2000);
    }
  }, [bounds, showDisabledParking, fetchSeattleDisabledParking]);

  // Combine and deduplicate spots from both sources
  const allDisabledSpots = React.useMemo(() => {
    const combined = [...osmSpots, ...seattleParkingSpots];
    
    // Simple deduplication by distance
    const PROXIMITY_THRESHOLD = 0.0001; // ~10 meters
    const uniqueSpots = [];
    const processedIds = new Set();

    for (const spot of combined) {
      if (processedIds.has(spot.id)) continue;

      const hasNearbySpot = combined.some(other => {
        if (other.id === spot.id || processedIds.has(other.id)) return false;
        
        const distance = Math.sqrt(
          Math.pow(spot.coordinates[0] - other.coordinates[0], 2) +
          Math.pow(spot.coordinates[1] - other.coordinates[1], 2)
        );
        
        return distance < PROXIMITY_THRESHOLD;
      });

      if (!hasNearbySpot) {
        uniqueSpots.push(spot);
        processedIds.add(spot.id);
      }
    }

    return uniqueSpots;
  }, [osmSpots, seattleParkingSpots]);

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

    if (showDisabledParking && allDisabledSpots.length > 0) {
      console.log(`♿ Adding ${allDisabledSpots.length} disabled parking markers to map (OSM: ${osmSpots.length}, Seattle: ${seattleParkingSpots.length})`);
      
      allDisabledSpots.forEach((spot) => {
        try {
          const marker = createDisabledParkingMarker(spot);
          markerLayer.addLayer(marker);
        } catch (err) {
          console.error('Error creating disabled parking marker:', err);
        }
      });
    }
  }, [allDisabledSpots, showDisabledParking, markerLayer, osmSpots.length, seattleParkingSpots.length]);

  // Log loading and error states
  useEffect(() => {
    if (osmLoading || seattleLoading) {
      console.log('♿ Loading disabled parking spots...');
    }
    if (osmError || seattleError) {
      console.error('♿ Disabled parking spots error:', osmError || seattleError);
    }
  }, [osmLoading, seattleLoading, osmError, seattleError]);

  return null;
};

export default DisabledParkingManager;
