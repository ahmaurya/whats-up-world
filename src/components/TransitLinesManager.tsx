
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

  // Debug logging for showTransit changes
  useEffect(() => {
    console.log('TransitLinesManager: showTransit changed to:', showTransit);
    console.log('TransitLinesManager: transitLayerRef.current exists:', !!transitLayerRef.current);
    console.log('TransitLinesManager: map.current exists:', !!map.current);
  }, [showTransit]);

  // Function to check if bounds have changed significantly
  const boundsChanged = useCallback((newBounds: BoundingBox, oldBounds: BoundingBox | null): boolean => {
    if (!oldBounds) return true;
    
    const threshold = 0.01; // Roughly 1km
    return (
      Math.abs(newBounds.north - oldBounds.north) > threshold ||
      Math.abs(newBounds.south - oldBounds.south) > threshold ||
      Math.abs(newBounds.east - oldBounds.east) > threshold ||
      Math.abs(newBounds.west - oldBounds.west) > threshold
    );
  }, []);

  // Debounced function to fetch data
  const fetchDataForCurrentView = useCallback(async () => {
    if (!map.current || isLoading) {
      console.log('Skipping fetch: map missing or loading in progress');
      return;
    }

    const bounds = map.current.getBounds();
    const boundsData: BoundingBox = {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest()
    };

    // Check if bounds have changed significantly
    if (!boundsChanged(boundsData, currentBounds)) {
      console.log('Bounds have not changed significantly, skipping fetch');
      return;
    }

    console.log('Fetching transit data for bounds:', boundsData);
    setIsLoading(true);
    setCurrentBounds(boundsData);

    try {
      const data = await fetchTransitData(boundsData);
      console.log('Transit data fetched successfully:', data);
      
      // Check if we actually got data
      const totalLines = Object.values(data).reduce((sum, lines) => sum + lines.length, 0);
      console.log('Total transit lines received:', totalLines);
      
      setTransitData(data);
    } catch (error) {
      console.error('Failed to fetch transit data:', error);
      // Don't clear existing data on error, keep showing what we have
    } finally {
      setIsLoading(false);
    }
  }, [map, isLoading, currentBounds, boundsChanged]);

  // Helper functions for styling
  const getDefaultColor = (type: keyof TransitData): string => {
    const colors = {
      subway: '#0066CC',     // Seattle Link Light Rail blue
      bus: '#00AA44',        // King County Metro green
      tram: '#FF6600',       // Streetcar orange
      rail: '#8B5CF6'        // Purple for other rail
    };
    return colors[type];
  };

  const getLineWeight = (type: keyof TransitData): number => {
    return type === 'subway' || type === 'rail' ? 5 : 3;
  };

  const createTooltipContent = (line: TransitLine, type: string): string => {
    let content = `<div style="font-size: 14px;">`;
    content += `<strong>${line.name}</strong><br/>`;
    content += `<span style="color: #666;">Type: ${type.charAt(0).toUpperCase() + type.slice(1)}</span>`;
    if (line.operator) content += `<br/><span style="color: #666;">Operator: ${line.operator}</span>`;
    if (line.ref) content += `<br/><span style="color: #666;">Route: ${line.ref}</span>`;
    content += `</div>`;
    return content;
  };

  // Create transit layer from fetched data
  const createTransitLayer = useCallback((data: TransitData): L.LayerGroup => {
    console.log('Creating transit layer with data:', data);
    const transitLayer = L.layerGroup();
    let totalLinesAdded = 0;

    // Process each transit type
    Object.entries(data).forEach(([type, lines]) => {
      console.log(`Processing ${type} lines:`, lines.length);
      lines.forEach((line: TransitLine) => {
        if (line.coordinates.length < 2) {
          console.log(`Skipping line ${line.name} - insufficient coordinates`);
          return;
        }

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
          polylineOptions.dashArray = '8, 4';
        }

        const polyline = L.polyline(latLngs, polylineOptions);
        
        // Create tooltip content
        const tooltipContent = createTooltipContent(line, type);
        polyline.bindTooltip(tooltipContent, {
          permanent: false,
          direction: 'top',
          className: 'transit-tooltip',
          opacity: 0.9,
          offset: [0, -10]
        });
        
        transitLayer.addLayer(polyline);
        totalLinesAdded++;
        console.log(`Added ${type} line: ${line.name}`);
      });
    });

    console.log('Transit layer created with', totalLinesAdded, 'lines');
    return transitLayer;
  }, []);

  // Update transit layer when data changes
  useEffect(() => {
    console.log('Transit data or showTransit changed');
    console.log('- transitData exists:', !!transitData);
    console.log('- showTransit:', showTransit);
    console.log('- map.current exists:', !!map.current);

    if (!map.current) return;

    // Remove existing layer
    if (transitLayerRef.current) {
      if (map.current.hasLayer(transitLayerRef.current)) {
        console.log('Removing existing transit layer from map');
        map.current.removeLayer(transitLayerRef.current);
      }
      transitLayerRef.current.clearLayers();
      transitLayerRef.current = null;
    }

    // Create new layer if we have data
    if (transitData) {
      const totalLines = Object.values(transitData).reduce((sum, lines) => sum + lines.length, 0);
      console.log('Creating new transit layer with', totalLines, 'total lines');
      
      if (totalLines > 0) {
        transitLayerRef.current = createTransitLayer(transitData);
        console.log('New transit layer created');

        // Add layer if transit should be shown
        if (showTransit && transitLayerRef.current) {
          console.log('Adding transit layer to map');
          transitLayerRef.current.addTo(map.current);
        }
      } else {
        console.log('No transit lines to display');
      }
    }
  }, [transitData, createTransitLayer, showTransit, map]);

  // Toggle transit layer visibility when showTransit changes
  useEffect(() => {
    console.log('showTransit toggle effect triggered');
    console.log('- showTransit:', showTransit);
    console.log('- map.current exists:', !!map.current);
    console.log('- transitLayerRef.current exists:', !!transitLayerRef.current);

    if (!map.current || !transitLayerRef.current) {
      console.log('Early return: missing map or transit layer');
      return;
    }

    if (showTransit) {
      if (!map.current.hasLayer(transitLayerRef.current)) {
        console.log('Adding transit layer to map (toggle on)');
        transitLayerRef.current.addTo(map.current);
      } else {
        console.log('Transit layer already on map');
      }
    } else {
      if (map.current.hasLayer(transitLayerRef.current)) {
        console.log('Removing transit layer from map (toggle off)');
        map.current.removeLayer(transitLayerRef.current);
      } else {
        console.log('Transit layer not on map');
      }
    }
  }, [showTransit]);

  // Set up map event handlers
  useEffect(() => {
    if (!map.current) return;

    let debounceTimeout: NodeJS.Timeout;

    const handleMoveEnd = () => {
      const zoom = map.current?.getZoom();
      console.log('Map moved, zoom level:', zoom);
      
      // Fetch data at zoom levels 11 and higher for Seattle area
      if (zoom && zoom >= 11) {
        // Debounce the fetch to avoid too many requests
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(fetchDataForCurrentView, 1000);
      } else {
        // Clear data at low zoom levels to improve performance
        console.log('Zoom too low, clearing transit data');
        setTransitData(null);
        setCurrentBounds(null);
      }
    };

    // Initial data fetch
    const zoom = map.current.getZoom();
    console.log('Initial zoom level:', zoom);
    if (zoom >= 11) {
      // Immediate fetch for initial load
      setTimeout(fetchDataForCurrentView, 500);
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
