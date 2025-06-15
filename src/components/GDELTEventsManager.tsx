
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useMap } from './MapProvider';
import { useGDELTEvents } from '@/hooks/useGDELTEvents';
import { createDebouncer } from '@/utils/mapHelpers';

interface GDELTEventsManagerProps {
  map: L.Map | null;
}

const GDELTEventsManager: React.FC<GDELTEventsManagerProps> = ({ map }) => {
  const { showGDELTEvents } = useMap();
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const lastBoundsRef = useRef<L.LatLngBounds | null>(null);
  const [currentBounds, setCurrentBounds] = React.useState<L.LatLngBounds | null>(null);

  // Fixed the boolean check
  const shouldFetch = showGDELTEvents && currentBounds !== null && map !== null;

  const { events, loading, error } = useGDELTEvents(currentBounds, shouldFetch);

  console.log('🌍 GDELTEventsManager state:', {
    showGDELTEvents,
    currentBounds: !!currentBounds,
    mapExists: !!map,
    shouldFetch,
    eventsCount: events.length,
    loading,
    error
  });

  // Debounced function to update bounds
  const debouncedUpdateBounds = React.useMemo(
    () => createDebouncer((bounds: L.LatLngBounds) => {
      console.log('🌍 GDELTEventsManager: Updating bounds', bounds.toBBoxString());
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
      
      console.log('🌍 GDELTEventsManager: Map changed', { zoom, bounds: bounds.toBBoxString() });
      
      // Always update bounds regardless of zoom level
      debouncedUpdateBounds(bounds);
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

  const createGoogleSearchUrl = (event: any): string => {
    // Build more specific search query with event details and date
    const eventDate = new Date(event.eventDate).toLocaleDateString();
    const searchTerms = [
      `"${event.eventDescription}"`,
      event.actor1Name,
      event.actor2Name,
      event.countryCode,
      eventDate,
      'news'
    ].filter(term => term && term !== 'Unknown Actor' && term !== '').join(' ');

    // Encode the search query for URL
    const encodedQuery = encodeURIComponent(searchTerms);
    
    return `https://www.google.com/search?q=${encodedQuery}&tbm=nws`;
  };

  const createGDELTMonitorUrl = (event: any): string => {
    // Create GDELT Global Event Monitor URL for the event location and timeframe
    const lat = event.coordinates[1];
    const lng = event.coordinates[0];
    const eventDate = new Date(event.eventDate);
    const dateStr = eventDate.toISOString().split('T')[0].replace(/-/g, '');
    
    return `https://blog.gdeltproject.org/gdelt-geo-2-0-api-debuts/`;
  };

  const createPopupContent = (event: any): string => {
    const eventDate = new Date(event.eventDate).toLocaleDateString();
    const googleSearchUrl = createGoogleSearchUrl(event);
    const gdeltMonitorUrl = createGDELTMonitorUrl(event);

    let popupContent = `
      <div style="max-width: 320px;">
        <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">${event.eventDescription}</h3>
        <p style="margin: 0 0 4px 0; font-size: 12px;"><strong>Source:</strong> ${event.actor1Name}</p>
        <p style="margin: 0 0 4px 0; font-size: 12px;"><strong>Date:</strong> ${eventDate}</p>
        <p style="margin: 0 0 8px 0; font-size: 12px;"><strong>Country:</strong> ${event.countryCode}</p>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <a href="${googleSearchUrl}" target="_blank" style="font-size: 12px; color: #2563eb; text-decoration: none;">🔍 Search news articles →</a>
          <a href="${gdeltMonitorUrl}" target="_blank" style="font-size: 12px; color: #059669; text-decoration: none;">📊 View GDELT Monitor →</a>
        </div>
      </div>
    `;

    return popupContent;
  };

  // Update markers when data changes
  useEffect(() => {
    if (!markersLayerRef.current || !showGDELTEvents) return;

    // Clear existing markers
    markersLayerRef.current.clearLayers();

    if (!events.length) {
      console.log('🌍 GDELTEventsManager: No events to display');
      return;
    }

    console.log(`🌍 Adding ${events.length} GDELT events to map`);

    events.forEach((event, index) => {
      if (!markersLayerRef.current) return;

      console.log(`🌍 Adding event ${index}:`, event);

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

  // Log loading and error states
  useEffect(() => {
    if (loading) {
      console.log('🌍 GDELT events loading...');
    }
    if (error) {
      console.error('🌍 GDELT events error:', error);
    }
  }, [loading, error]);

  return null;
};

export default GDELTEventsManager;
