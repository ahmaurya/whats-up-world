
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useMap } from './MapProvider';
import { fetchTransitData } from '@/utils/overpassApi';
import { TransitData, TransitLine } from '@/types/transit';

interface TransitLinesManagerProps {
  map: React.MutableRefRef<L.Map | null>;
}

const TransitLinesManager: React.FC<TransitLinesManagerProps> = ({ map }) => {
  const { showTransit } = useMap();
  const transitLayerRef = useRef<L.LayerGroup | null>(null);
  const [transitData, setTransitData] = useState<TransitData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch transit data when map bounds change
  const fetchDataForCurrentView = async () => {
    if (!map.current || isLoading) return;

    const bounds = map.current.getBounds();
    const boundsData = {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest()
    };

    console.log('Fetching transit data for bounds:', boundsData);
    setIsLoading(true);

    try {
      const data = await fetchTransitData(boundsData);
      setTransitData(data);
      console.log('Transit data fetched:', data);
    } catch (error) {
      console.error('Failed to fetch transit data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Create transit layer from fetched data
  const createTransitLayer = (data: TransitData): L.LayerGroup => {
    const transitLayer = L.layerGroup();

    // Add all transit lines to the layer
    Object.entries(data).forEach(([type, lines]) => {
      lines.forEach((line: TransitLine) => {
        if (line.coordinates.length < 2) return;

        // Convert coordinates to Leaflet LatLng format
        const latLngs = line.coordinates.map(coord => [coord[1], coord[0]] as [number, number]);

        const polylineOptions: L.PolylineOptions = {
          color: line.color || '#666666',
          weight: type === 'subway' || type === 'rail' ? 4 : 3,
          opacity: 0.8
        };

        // Add dash pattern for buses and trams
        if (type === 'bus' || type === 'tram') {
          polylineOptions.dashArray = '5, 5';
        }

        const polyline = L.polyline(latLngs, polylineOptions);
        
        // Add tooltip with line information
        polyline.bindTooltip(`${line.name} (${type})`, {
          permanent: false,
          direction: 'top',
          className: 'transit-tooltip'
        });
        
        transitLayer.addLayer(polyline);
      });
    });

    return transitLayer;
  };

  // Update transit layer when data changes
  useEffect(() => {
    if (!map.current || !transitData) return;

    // Remove existing layer
    if (transitLayerRef.current) {
      if (map.current.hasLayer(transitLayerRef.current)) {
        map.current.removeLayer(transitLayerRef.current);
      }
    }

    // Create new layer with fetched data
    transitLayerRef.current = createTransitLayer(transitData);

    // Add layer if transit should be shown
    if (showTransit && transitLayerRef.current) {
      transitLayerRef.current.addTo(map.current);
    }
  }, [transitData, map.current]);

  // Toggle transit layer visibility when showTransit changes
  useEffect(() => {
    if (!map.current || !transitLayerRef.current) return;

    if (showTransit) {
      if (!map.current.hasLayer(transitLayerRef.current)) {
        transitLayerRef.current.addTo(map.current);
      }
    } else {
      if (map.current.hasLayer(transitLayerRef.current)) {
        map.current.removeLayer(transitLayerRef.current);
      }
    }
  }, [showTransit]);

  // Fetch data when map is ready and when view changes significantly
  useEffect(() => {
    if (!map.current) return;

    const handleMoveEnd = () => {
      const zoom = map.current?.getZoom();
      // Only fetch data at reasonable zoom levels to avoid overwhelming the API
      if (zoom && zoom >= 11) {
        fetchDataForCurrentView();
      }
    };

    // Initial data fetch
    const zoom = map.current.getZoom();
    if (zoom >= 11) {
      fetchDataForCurrentView();
    }

    // Listen for map movements
    map.current.on('moveend', handleMoveEnd);

    return () => {
      if (map.current) {
        map.current.off('moveend', handleMoveEnd);
      }
    };
  }, [map.current]);

  return null;
};

export default TransitLinesManager;
