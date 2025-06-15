import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useMap } from './MapProvider';
import { useHistoricPlaces } from '@/hooks/useHistoricPlaces';
import { isZoomLevelSufficient, createDebouncer } from '@/utils/mapHelpers';
import { searchHistoricPlaceMedia, MediaLink } from '@/utils/historicPlaceMedia';

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

  // Create custom icon for historic places
  const createHistoricPlaceIcon = () => {
    return L.divIcon({
      html: `
        <div style="
          background-color: #d97706;
          border: 2px solid white;
          border-radius: 50%;
          width: 12px;
          height: 12px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        "></div>
      `,
      className: 'historic-place-marker',
      iconSize: [12, 12],
      iconAnchor: [6, 6]
    });
  };

  const createPopupContent = async (place: any): Promise<string> => {
    const hasValidLocation = place.county !== 'Unknown County' && place.state !== 'Unknown State';
    const hasValidDate = place.date_listed !== 'Unknown Date';

    // Extract city name from the place data for better search results
    const cityName = place.county !== 'Unknown County' ? place.county : undefined;
    const mediaLinks = await searchHistoricPlaceMedia(place.name, cityName);

    let popupContent = `
      <div style="max-width: 320px;">
        <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">${place.name}</h3>
        <p style="margin: 0 0 4px 0; font-size: 12px;"><strong>Type:</strong> ${place.resource_type}</p>
        ${hasValidLocation ? `<p style="margin: 0 0 4px 0; font-size: 12px;"><strong>Location:</strong> ${place.county}, ${place.state}</p>` : ''}
        ${hasValidDate ? `<p style="margin: 0 0 4px 0; font-size: 12px;"><strong>Date Listed:</strong> ${place.date_listed}</p>` : ''}
        ${place.nris_reference ? `<p style="margin: 0 0 8px 0; font-size: 12px;"><strong>NRIS Ref:</strong> ${place.nris_reference}</p>` : ''}
    `;

    if (mediaLinks.length > 0) {
      popupContent += `
        <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #e5e5e5;">
          <h4 style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold; color: #666;">📺 Historical Videos:</h4>
      `;

      mediaLinks.forEach(link => {
        if (link.thumbnailUrl && link.videoId) {
          // Show actual video thumbnail and embed for real API results
          popupContent += `
            <div style="margin-bottom: 12px; border: 1px solid #ddd; border-radius: 6px; overflow: hidden;">
              <img src="${link.thumbnailUrl}" style="width: 100%; height: auto; display: block;" alt="Video thumbnail">
              <div style="padding: 8px;">
                <a href="${link.url}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: none; font-size: 12px; font-weight: 500; display: block; margin-bottom: 4px;">
                  ${link.title}
                </a>
                ${link.description ? `<p style="margin: 0; font-size: 11px; color: #666;">${link.description}</p>` : ''}
              </div>
            </div>
          `;
        } else {
          // Fallback for search links
          popupContent += `
            <div style="margin-bottom: 8px;">
              <a href="${link.url}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: none; font-size: 12px; font-weight: 500; display: block;">
                📺 ${link.title}
              </a>
              ${link.description ? `<p style="margin: 2px 0 0 0; font-size: 11px; color: #666; padding-left: 16px;">${link.description}</p>` : ''}
            </div>
          `;
        }
      });

      popupContent += `</div>`;
    }

    popupContent += `</div>`;
    return popupContent;
  };

  // Update markers when data changes
  useEffect(() => {
    if (!markersLayerRef.current || !showHistoricPlaces) return;

    // Clear existing markers
    markersLayerRef.current.clearLayers();

    if (!historicPlaces.length) return;

    console.log(`🏛️ Adding ${historicPlaces.length} historic places to map`);

    historicPlaces.forEach(async (place) => {
      if (!markersLayerRef.current) return;

      const marker = L.marker(
        [place.coordinates[1], place.coordinates[0]], // Leaflet uses [lat, lng]
        { icon: createHistoricPlaceIcon() }
      );

      // Create popup content with media links
      const popupContent = await createPopupContent(place);
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
