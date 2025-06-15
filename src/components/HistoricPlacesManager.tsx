import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useMap } from './MapProvider';
import { useHistoricPlaces } from '@/hooks/useHistoricPlaces';
import { isZoomLevelSufficient, createDebouncer } from '@/utils/mapHelpers';

interface HistoricPlacesManagerProps {
  map: L.Map | null;
}

const HistoricPlacesManager: React.FC<HistoricPlacesManagerProps> = ({ map }) => {
  const { showHistoricPlaces } = useMap();
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const lastBoundsRef = useRef<L.LatLngBounds | null>(null);
  const [currentBounds, setCurrentBounds] = React.useState<L.LatLngBounds | null>(null);

  const shouldFetch = showHistoricPlaces && 
                     currentBounds && 
                     map && 
                     isZoomLevelSufficient(map.getZoom());

  const { historicPlaces, loading } = useHistoricPlaces(currentBounds, shouldFetch);

  // Debounced function to update bounds
  const debouncedUpdateBounds = React.useMemo(
    () => createDebouncer((bounds: L.LatLngBounds) => {
      setCurrentBounds(bounds);
      lastBoundsRef.current = bounds;
    }, 500),
    []
  );

  // Initialize markers layer
  useEffect(() => {
    if (!map) return;

    if (!markersLayerRef.current) {
      markersLayerRef.current = L.layerGroup().addTo(map);
      console.log('🏛️ Created historic places markers layer');
    }

    return () => {
      if (markersLayerRef.current) {
        console.log('🧹 Cleaning up historic places markers layer');
        markersLayerRef.current.clearLayers();
        markersLayerRef.current.remove();
        markersLayerRef.current = null;
      }
    };
  }, [map]);

  // Handle map events for bounds updates
  useEffect(() => {
    if (!map || !showHistoricPlaces) return;

    const handleMapChange = () => {
      const bounds = map.getBounds();
      const zoom = map.getZoom();
      
      if (isZoomLevelSufficient(zoom)) {
        debouncedUpdateBounds(bounds);
      } else {
        console.log('🔍 Zoom level too low for historic places, clearing markers');
        if (markersLayerRef.current) {
          markersLayerRef.current.clearLayers();
        }
        setCurrentBounds(null);
      }
    };

    // Initial bounds set
    handleMapChange();

    map.on('moveend', handleMapChange);
    map.on('zoomend', handleMapChange);

    return () => {
      map.off('moveend', handleMapChange);
      map.off('zoomend', handleMapChange);
    };
  }, [map, showHistoricPlaces, debouncedUpdateBounds]);

  // Create custom icon for historic places matching the legend
  const createHistoricPlaceIcon = () => {
    return L.divIcon({
      html: `
        <div class="relative flex items-center justify-center">
          <div class="bg-amber-600 rounded-full p-1 shadow-lg border-2 border-white">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
              <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
              <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
              <path d="M10 6h4"/>
              <path d="M10 10h4"/>
              <path d="M10 14h4"/>
              <path d="M10 18h4"/>
            </svg>
          </div>
        </div>
      `,
      className: 'historic-place-marker',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      popupAnchor: [0, -8]
    });
  };

  const createPopupContent = (place: any): string => {
    const hasValidLocation = place.county !== 'Unknown County' && place.state !== 'Unknown State';
    const hasValidDate = place.date_listed !== 'Unknown Date';

    let popupContent = `
      <div style="max-width: 320px;">
        <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">${place.name}</h3>
        <p style="margin: 0 0 4px 0; font-size: 12px;"><strong>Type:</strong> ${place.resource_type}</p>
        ${hasValidLocation ? `<p style="margin: 0 0 4px 0; font-size: 12px;"><strong>Location:</strong> ${place.county}, ${place.state}</p>` : ''}
        ${hasValidDate ? `<p style="margin: 0 0 4px 0; font-size: 12px;"><strong>Date Listed:</strong> ${place.date_listed}</p>` : ''}
        ${place.nris_reference ? `<p style="margin: 0 0 8px 0; font-size: 12px;"><strong>NRIS Ref:</strong> ${place.nris_reference}</p>` : ''}
      </div>
    `;

    return popupContent;
  };

  // Update markers when data changes
  useEffect(() => {
    if (!markersLayerRef.current || !showHistoricPlaces) return;

    // Clear existing markers
    markersLayerRef.current.clearLayers();

    if (!historicPlaces.length) return;

    console.log(`🏛️ Adding ${historicPlaces.length} historic places to map`);

    historicPlaces.forEach((place) => {
      if (!markersLayerRef.current) return;

      const marker = L.marker(
        [place.coordinates[1], place.coordinates[0]], // Leaflet uses [lat, lng]
        { icon: createHistoricPlaceIcon() }
      );

      // Create popup content without media links
      const popupContent = createPopupContent(place);
      marker.bindPopup(popupContent);
      
      markersLayerRef.current.addLayer(marker);
    });
  }, [historicPlaces, showHistoricPlaces]);

  // Clear markers when layer is hidden
  useEffect(() => {
    if (!showHistoricPlaces && markersLayerRef.current) {
      console.log('🏛️ Hiding historic places markers');
      markersLayerRef.current.clearLayers();
      setCurrentBounds(null);
    }
  }, [showHistoricPlaces]);

  return null;
};

export default HistoricPlacesManager;
