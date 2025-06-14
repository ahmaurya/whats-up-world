
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useMap } from './MapProvider';
import MapControls from './MapControls';
import DistanceDisplay from './DistanceDisplay';
import RestaurantPopup from './RestaurantPopup';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const Map = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState('');
  const [isTokenSet, setIsTokenSet] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const { selectedPoints, addPoint, showTransit, showRestaurants } = useMap();

  // Mock restaurant data (in a real app, this would come from Yelp API)
  const mockRestaurants = [
    {
      id: 1,
      name: "Tony's Little Star Pizza",
      coordinates: [-122.4194, 37.7749],
      rating: 4.5,
      reviews: 1200,
      cuisine: "Italian",
      description: "Famous for deep dish pizza in San Francisco"
    },
    {
      id: 2,
      name: "Guelaguetza",
      coordinates: [-118.2437, 34.0522],
      rating: 4.3,
      reviews: 890,
      cuisine: "Mexican",
      description: "Authentic Oaxacan cuisine in Los Angeles"
    },
    {
      id: 3,
      name: "Pike Place Chowder",
      coordinates: [-122.3321, 47.6062],
      rating: 4.6,
      reviews: 2100,
      cuisine: "Seafood",
      description: "Award-winning chowder at Pike Place Market"
    },
    {
      id: 4,
      name: "Katz's Delicatessen",
      coordinates: [-73.9857, 40.7589],
      rating: 4.4,
      reviews: 3400,
      cuisine: "Jewish Deli",
      description: "Historic NYC deli famous for pastrami sandwiches"
    }
  ];

  // Transit line data
  const transitLines = {
    sanFrancisco: {
      subway: [
        [[-122.4194, 37.7749], [-122.4094, 37.7849], [-122.3994, 37.7949]], // Mock BART line
      ],
      bus: [
        [[-122.4294, 37.7649], [-122.4194, 37.7749], [-122.4094, 37.7849]], // Mock bus line
      ]
    },
    losAngeles: {
      subway: [
        [[-118.2537, 34.0422], [-118.2437, 34.0522], [-118.2337, 34.0622]], // Mock Metro line
      ],
      bus: [
        [[-118.2637, 34.0322], [-118.2537, 34.0422], [-118.2437, 34.0522]], // Mock bus line
      ]
    },
    seattle: {
      subway: [
        [[-122.3421, 47.5962], [-122.3321, 47.6062], [-122.3221, 47.6162]], // Mock Link light rail
      ],
      bus: [
        [[-122.3521, 47.5862], [-122.3421, 47.5962], [-122.3321, 47.6062]], // Mock bus line
      ]
    },
    newYork: {
      subway: [
        [[-73.9957, 40.7489], [-73.9857, 40.7589], [-73.9757, 40.7689]], // Mock subway line
      ],
      bus: [
        [[-74.0057, 40.7389], [-73.9957, 40.7489], [-73.9857, 40.7589]], // Mock bus line
      ]
    }
  };

  const handleTokenSubmit = () => {
    if (mapboxToken.trim()) {
      setIsTokenSet(true);
      initializeMap();
    }
  };

  const initializeMap = () => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-98.5795, 39.8283], // Center of US
      zoom: 4,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      if (!map.current) return;
      
      // Add transit lines
      addTransitLines();
      
      // Add restaurant markers
      addRestaurantMarkers();
      
      // Add click handler for distance measurement
      map.current.on('click', (e) => {
        const point: [number, number] = [e.lngLat.lng, e.lngLat.lat];
        addPoint(point);
        
        // Add marker for clicked point
        new mapboxgl.Marker({ color: '#ef4444' })
          .setLngLat(point)
          .addTo(map.current!);
      });
    });
  };

  const addTransitLines = () => {
    if (!map.current) return;

    Object.entries(transitLines).forEach(([city, lines]) => {
      // Add subway lines
      lines.subway.forEach((line, index) => {
        const sourceId = `${city}-subway-${index}`;
        const layerId = `${city}-subway-layer-${index}`;
        
        map.current!.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: line
            }
          }
        });
        
        map.current!.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
            'visibility': showTransit ? 'visible' : 'none'
          },
          paint: {
            'line-color': '#3b82f6', // Blue for subway
            'line-width': 4
          }
        });
      });

      // Add bus lines
      lines.bus.forEach((line, index) => {
        const sourceId = `${city}-bus-${index}`;
        const layerId = `${city}-bus-layer-${index}`;
        
        map.current!.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: line
            }
          }
        });
        
        map.current!.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
            'visibility': showTransit ? 'visible' : 'none'
          },
          paint: {
            'line-color': '#10b981', // Green for bus
            'line-width': 3,
            'line-dasharray': [2, 2] // Dashed line for buses
          }
        });
      });
    });
  };

  const addRestaurantMarkers = () => {
    if (!map.current) return;

    mockRestaurants.forEach((restaurant) => {
      const marker = new mapboxgl.Marker({ color: '#f59e0b' })
        .setLngLat(restaurant.coordinates as [number, number])
        .addTo(map.current!);

      marker.getElement().addEventListener('click', () => {
        setSelectedRestaurant(restaurant);
      });

      marker.getElement().style.cursor = 'pointer';
      marker.getElement().style.display = showRestaurants ? 'block' : 'none';
    });
  };

  // Update transit line visibility
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    const visibility = showTransit ? 'visible' : 'none';
    
    Object.keys(transitLines).forEach(city => {
      try {
        map.current!.setLayoutProperty(`${city}-subway-layer-0`, 'visibility', visibility);
        map.current!.setLayoutProperty(`${city}-bus-layer-0`, 'visibility', visibility);
      } catch (error) {
        console.log('Layer not found:', error);
      }
    });
  }, [showTransit]);

  // Update restaurant marker visibility
  useEffect(() => {
    if (!map.current) return;

    const markers = document.querySelectorAll('.mapboxgl-marker');
    markers.forEach((marker, index) => {
      if (index < mockRestaurants.length) { // Only restaurant markers
        (marker as HTMLElement).style.display = showRestaurants ? 'block' : 'none';
      }
    });
  }, [showRestaurants]);

  if (!isTokenSet) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <Card className="p-8 max-w-md w-full mx-4">
          <h2 className="text-2xl font-bold mb-4 text-center">Enter Mapbox Token</h2>
          <p className="text-gray-600 mb-6 text-center">
            Please enter your Mapbox public token to use the map. Get one at{' '}
            <a href="https://mapbox.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              mapbox.com
            </a>
          </p>
          <div className="space-y-4">
            <Input
              type="text"
              placeholder="pk.eyJ1IjoieW91cnVzZXJuYW1lIiwi..."
              value={mapboxToken}
              onChange={(e) => setMapboxToken(e.target.value)}
              className="w-full"
            />
            <Button onClick={handleTokenSubmit} className="w-full">
              Initialize Map
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen">
      <div ref={mapContainer} className="absolute inset-0" />
      <MapControls />
      <DistanceDisplay />
      {selectedRestaurant && (
        <RestaurantPopup
          restaurant={selectedRestaurant}
          onClose={() => setSelectedRestaurant(null)}
        />
      )}
    </div>
  );
};

export default Map;
