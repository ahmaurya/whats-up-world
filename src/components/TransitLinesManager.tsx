import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { useMap } from './MapProvider';
import { fetchTransitData, clearTransitCache } from '@/utils/overpassApi';
import { TransitData, TransitLine, BoundingBox } from '@/types/transit';

interface TransitLinesManagerProps {
  map: React.MutableRefObject<L.Map | null>;
}

const TransitLinesManager: React.FC<TransitLinesManagerProps> = ({ map }) => {
  const { showTransit } = useMap();
  const transitLayerRef = useRef<L.LayerGroup | null>(null);
  const [transitData, setTransitData] = useState<TransitData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentBounds, setCurrentBounds] = useState<BoundingBox | null>(null);

  // Debounced function to fetch data
  const fetchDataForCurrentView = useCallback(async () => {
    if (!map.current || isLoading) return;

    const bounds = map.current.getBounds();
    const boundsData: BoundingBox = {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest()
    };

    // Check if bounds have changed significantly
    if (currentBounds && 
        Math.abs(currentBounds.north - boundsData.north) < 0.01 &&
        Math.abs(currentBounds.south - boundsData.south) < 0.01 &&
        Math.abs(currentBounds.east - boundsData.east) < 0.01 &&
        Math.abs(currentBounds.west - boundsData.west) < 0.01) {
      return; // Skip if bounds haven't changed significantly
    }

    console.log('Fetching transit data for bounds:', boundsData);
    setIsLoading(true);
    setCurrentBounds(boundsData);

    try {
      const data = await fetchTransitData(boundsData);
      setTransitData(data);
      console.log('Transit data fetched successfully');
    } catch (error) {
      console.error('Failed to fetch transit data:', error);
      // Don't clear existing data on error, keep showing what we have
    } finally {
      setIsLoading(false);
    }
  }, [map, isLoading, currentBounds]);

  // Create transit layer from fetched data
  const createTransitLayer = useCallback((data: TransitData): L.LayerGroup => {
    const transitLayer = L.layerGroup();

    // Process each transit type
    Object.entries(data).forEach(([type, lines]) => {
      lines.forEach((line: TransitLine) => {
        if (line.coordinates.length < 2) return;

        // Convert coordinates to Leaflet LatLng format
        const latLngs = line.coordinates.map(coord => [coord[1], coord[0]] as [number, number]);

        // Style options based on transit type
        const polylineOptions: L.PolylineOptions = {
          color: line.color || getDefaultColor(type as keyof TransitData),
          weight: getLineWeight(type as keyof TransitData),
          opacity: 0.8,
          smoothFactor: 1.0
        };

        // Add dash pattern for buses and trams
        if (type === 'bus' || type === 'tram') {
          polylineOptions.dashArray = '5, 5';
        }

        const polyline = L.polyline(latLngs, polylineOptions);
        
        // Create tooltip content
        const tooltipContent = createTooltipContent(line, type);
        polyline.bindTooltip(tooltipContent, {
          permanent: false,
          direction: 'top',
          className: 'transit-tooltip',
          opacity: 0.9
        });
        
        transitLayer.addLayer(polyline);
      });
    });

    return transitLayer;
  }, []);

  // Helper functions
  const getDefaultColor = (type: keyof TransitData): string => {
    const colors = {
      subway: '#3b82f6',
      bus: '#10b981',
      tram: '#f59e0b',
      rail: '#8b5cf6'
    };
    return colors[type];
  };

  const getLineWeight = (type: keyof TransitData): number => {
    return type === 'subway' || type === 'rail' ? 4 : 3;
  };

  const createTooltipContent = (line: TransitLine, type: string): string => {
    let content = `<strong>${line.name}</strong><br/>`;
    content += `Type: ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    if (line.operator) content += `<br/>Operator: ${line.operator}`;
    if (line.ref) content += `<br/>Reference: ${line.ref}`;
    return content;
  };

  // Update transit layer when data changes
  useEffect(() => {
    if (!map.current || !transitData) return;

    // Remove existing layer
    if (transitLayerRef.current) {
      if (map.current.hasLayer(transitLayerRef.current)) {
        map.current.removeLayer(transitLayerRef.current);
      }
      transitLayerRef.current.clearLayers();
    }

    // Create new layer with fetched data
    transitLayerRef.current = createTransitLayer(transitData);

    // Add layer if transit should be shown
    if (showTransit && transitLayerRef.current) {
      transitLayerRef.current.addTo(map.current);
    }
  }, [transitData, createTransitLayer, showTransit]);

  // Toggle transit layer visibility when showTransit changes
  useEffect(() => {
    if (!map.current || !transitLayerRef.current) return;

    if (showTransit) {
      if (!map.current.hasLayer(transitLayerRef.current)) {
        transitLayerRef.current.addTo(map.current);
        console.log('Transit layer shown');
      }
    } else {
      if (map.current.hasLayer(transitLayerRef.current)) {
        map.current.removeLayer(transitLayerRef.current);
        console.log('Transit layer hidden');
      }
    }
  }, [showTransit]);

  // Set up map event handlers
  useEffect(() => {
    if (!map.current) return;

    let debounceTimeout: NodeJS.Timeout;

    const handleMoveEnd = () => {
      const zoom = map.current?.getZoom();
      // Only fetch data at reasonable zoom levels
      if (zoom && zoom >= 11) {
        // Debounce the fetch to avoid too many requests
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(fetchDataForCurrentView, 1000);
      } else {
        // Clear data at low zoom levels to improve performance
        setTransitData(null);
        setCurrentBounds(null);
      }
    };

    // Initial data fetch
    const zoom = map.current.getZoom();
    if (zoom >= 11) {
      setTimeout(fetchDataForCurrentView, 500); // Small delay for initial load
    }

    // Listen for map movements
    map.current.on('moveend', handleMoveEnd);
    map.current.on('zoomend', handleMoveEnd);

    return () => {
      clearTimeout(debounceTimeout);
      if (map.current) {
        map.current.off('moveend', handleMoveEnd);
        map.current.off('zoomend', handleMoveEnd);
      }
    };
  }, [fetchDataForCurrentView]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (transitLayerRef.current) {
        transitLayerRef.current.clearLayers();
      }
      clearTransitCache();
    };
  }, []);

  return null;
};

export default TransitLinesManager;
