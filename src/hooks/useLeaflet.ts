import { useRef, useCallback, useEffect } from 'react';
import L from 'leaflet';
import { useMap } from '@/components/MapProvider';

export const useLeaflet = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  
  // Add safety check for MapProvider context
  let addPoint: ((point: [number, number]) => void) | null = null;
  
  try {
    const mapContext = useMap();
    addPoint = mapContext.addPoint;
  } catch (error) {
    console.warn('MapProvider context not available yet:', error);
    addPoint = () => {}; // Fallback function
  }

  const initializeMap = useCallback(() => {
    if (!mapContainer.current) return;
    
    // If map already exists, don't reinitialize
    if (map.current) return;

    // Clear any existing content in the container
    mapContainer.current.innerHTML = '';

    // Try to get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log(`User location: ${latitude}, ${longitude}`);
          
          // Initialize map centered on user's location with zoom level 14
          map.current = L.map(mapContainer.current!).setView([latitude, longitude], 14);
          
          // Add OpenStreetMap tiles
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(map.current);

          // Add click handler only if addPoint is available
          if (addPoint) {
            map.current.on('click', (e) => {
              const point: [number, number] = [e.latlng.lng, e.latlng.lat];
              addPoint(point);
            });
          }

          // Set up city selection listener
          setupCitySelectionListener();

          // Trigger map ready event for layer managers
          triggerMapReadyEvent();
        },
        (error) => {
          console.warn('Geolocation failed, using default location:', error);
          // Fall back to default location with zoom level 14
          map.current = L.map(mapContainer.current!).setView([39.8283, -98.5795], 14);
          
          // Add OpenStreetMap tiles
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(map.current);

          // Add click handler only if addPoint is available
          if (addPoint) {
            map.current.on('click', (e) => {
              const point: [number, number] = [e.latlng.lng, e.latlng.lat];
              addPoint(point);
            });
          }

          // Set up city selection listener
          setupCitySelectionListener();

          // Trigger map ready event for layer managers
          triggerMapReadyEvent();
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    } else {
      console.warn('Geolocation not supported, using default location');
      // Fall back to default location with zoom level 14
      map.current = L.map(mapContainer.current!).setView([39.8283, -98.5795], 14);
      
      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map.current);

      // Add click handler only if addPoint is available
      if (addPoint) {
        map.current.on('click', (e) => {
          const point: [number, number] = [e.latlng.lng, e.latlng.lat];
          addPoint(point);
        });
      }

      // Set up city selection listener
      setupCitySelectionListener();

      // Trigger map ready event for layer managers
      triggerMapReadyEvent();
    }
  }, [addPoint]);

  const triggerMapReadyEvent = useCallback(() => {
    // Wait a bit for the map to fully initialize before triggering the event
    setTimeout(() => {
      console.log('🗺️ Map ready - triggering mapReady event for layer managers');
      const mapReadyEvent = new CustomEvent('mapReady', {
        detail: { map: map.current }
      });
      window.dispatchEvent(mapReadyEvent);
    }, 100);
  }, []);

  const setupCitySelectionListener = useCallback(() => {
    const handleCitySelection = (event: CustomEvent) => {
      if (map.current && event.detail) {
        const { coordinates, name, country } = event.detail;
        console.log(`Zooming to ${name}, ${country} at coordinates:`, coordinates);
        
        // Zoom to the selected city with a nice animation
        map.current.setView([coordinates[1], coordinates[0]], 12, {
          animate: true,
          duration: 1.5
        });
      }
    };

    // Add event listener for city selection
    window.addEventListener('citySelected', handleCitySelection as EventListener);

    // Return cleanup function
    return () => {
      window.removeEventListener('citySelected', handleCitySelection as EventListener);
    };
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (map.current) {
      map.current.remove();
      map.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    mapContainer,
    map,
    initializeMap,
    cleanup
  };
};
