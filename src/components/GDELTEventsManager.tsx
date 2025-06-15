
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useMap } from './MapProvider';
import { useGDELTEvents } from '@/hooks/useGDELTEvents';
import { isZoomLevelSufficient, createDebouncer } from '@/utils/mapHelpers';

interface GDELTEventsManagerProps {
  map: L.Map | null;
}

const GDELTEventsManager: React.FC<GDELTEventsManagerProps> = ({ map }) => {
  const { showGDELTEvents } = useMap();
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const lastBoundsRef = useRef<L.LatLngBounds | null>(null);
  const [currentBounds, setCurrentBounds] = React.useState<L.LatLngBounds | null>(null);

  const shouldFetch = showGDELTEvents && 
                     currentBounds && 
                     map && 
                     isZoomLevelSufficient(map.getZoom());

  const { events, loading } = useGDELTEvents(currentBounds, shouldFetch);

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
      console.log('🌍 Created GDELT events markers layer');
    }

    return () => {
      if (markersLayerRef.current) {
        console.log('🧹 Cleaning up GDELT events markers layer');
        markersLayerRef.current.clearLayers();
        markersLayerRef.current.remove();
        markersLayerRef.current = null;
      }
    };
  }, [map]);

  // Handle map events for bounds updates
  useEffect(() => {
    if (!map || !showGDELTEvents) return;

    const handleMapChange = () => {
      const bounds = map.getBounds();
      const zoom = map.getZoom();
      
      if (isZoomLevelSufficient(zoom)) {
        debouncedUpdateBounds(bounds);
      } else {
        console.log('🔍 Zoom level too low for GDELT events, clearing markers');
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
  }, [map, showGDELTEvents, debouncedUpdateBounds]);

  // Create custom icon for GDELT events
  const createEventIcon = () => {
    return L.divIcon({
      html: `
        <div style="
          background-color: #ef4444;
          border: 2px solid white;
          border-radius: 50%;
          width: 10px;
          height: 10px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          animation: pulse 2s infinite;
        "></div>
        <style>
          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.7; }
            100% { transform: scale(1); opacity: 1; }
          }
        </style>
      `,
      className: 'gdelt-event-marker',
      iconSize: [10, 10],
      iconAnchor: [5, 5]
    });
  };

  const createPopupContent = (event: any): string => {
    const eventDate = new Date(event.eventDate).toLocaleDateString();

    let popupContent = `
      <div style="max-width: 320px;">
        <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">${event.eventDescription}</h3>
        <p style="margin: 0 0 4px 0; font-size: 12px;"><strong>Source:</strong> ${event.actor1Name}</p>
        <p style="margin: 0 0 4px 0; font-size: 12px;"><strong>Date:</strong> ${eventDate}</p>
        <p style="margin: 0 0 8px 0; font-size: 12px;"><strong>Country:</strong> ${event.countryCode}</p>
        ${event.sourceUrl ? `<a href="${event.sourceUrl}" target="_blank" style="font-size: 12px; color: #2563eb;">Read more →</a>` : ''}
      </div>
    `;

    return popupContent;
  };

  // Update markers when data changes
  useEffect(() => {
    if (!markersLayerRef.current || !showGDELTEvents) return;

    // Clear existing markers
    markersLayerRef.current.clearLayers();

    if (!events.length) return;

    console.log(`🌍 Adding ${events.length} GDELT events to map`);

    events.forEach((event) => {
      if (!markersLayerRef.current) return;

      const marker = L.marker(
        [event.coordinates[1], event.coordinates[0]], // Leaflet uses [lat, lng]
        { icon: createEventIcon() }
      );

      const popupContent = createPopupContent(event);
      marker.bindPopup(popupContent);
      
      markersLayerRef.current.addLayer(marker);
    });
  }, [events, showGDELTEvents]);

  // Clear markers when layer is hidden
  useEffect(() => {
    if (!showGDELTEvents && markersLayerRef.current) {
      console.log('🌍 Hiding GDELT events markers');
      markersLayerRef.current.clearLayers();
      setCurrentBounds(null);
    }
  }, [showGDELTEvents]);

  return null;
};

export default GDELTEventsManager;
