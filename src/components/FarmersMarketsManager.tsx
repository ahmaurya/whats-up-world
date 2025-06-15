
import React, { useEffect, useState } from 'react';
import L from 'leaflet';
import { useFarmersMarkets } from '@/hooks/useFarmersMarkets';
import { useMap } from './MapProvider';
import { createFarmersMarketMarker } from '@/utils/farmersMarketMarkers';

interface FarmersMarketsManagerProps {
  map: L.Map | null;
}

const FarmersMarketsManager: React.FC<FarmersMarketsManagerProps> = ({ map }) => {
  const { showFarmersMarkets } = useMap();
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

  // Fetch farmer's markets data
  const { farmersMarkets, loading, error } = useFarmersMarkets(bounds, showFarmersMarkets);

  // Manage marker layer
  useEffect(() => {
    if (!map) return;

    if (showFarmersMarkets) {
      map.addLayer(markerLayer);
    } else {
      map.removeLayer(markerLayer);
    }

    return () => {
      if (map.hasLayer(markerLayer)) {
        map.removeLayer(markerLayer);
      }
    };
  }, [map, showFarmersMarkets, markerLayer]);

  // Update markers when data changes
  useEffect(() => {
    markerLayer.clearLayers();

    if (showFarmersMarkets && farmersMarkets.length > 0) {
      console.log(`🥕 Adding ${farmersMarkets.length} farmer's market markers to map`);
      
      farmersMarkets.forEach((market) => {
        try {
          const marker = createFarmersMarketMarker(market);
          markerLayer.addLayer(marker);
        } catch (err) {
          console.error('Error creating farmer\'s market marker:', err);
        }
      });
    }
  }, [farmersMarkets, showFarmersMarkets, markerLayer]);

  // Log loading and error states
  useEffect(() => {
    if (loading) {
      console.log('🥕 Loading farmer\'s markets...');
    }
    if (error) {
      console.error('🥕 Farmer\'s markets error:', error);
    }
  }, [loading, error]);

  return null;
};

export default FarmersMarketsManager;
