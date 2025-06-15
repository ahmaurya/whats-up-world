
import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';

export interface LiveVehicle {
  id: string;
  routeId: string;
  routeName: string;
  latitude: number;
  longitude: number;
  bearing?: number;
  speed?: number;
  timestamp: number;
  vehicleType: 'bus' | 'rail' | 'tram';
  operator: string;
  occupancyStatus?: 'EMPTY' | 'MANY_SEATS_AVAILABLE' | 'FEW_SEATS_AVAILABLE' | 'STANDING_ROOM_ONLY' | 'CRUSHED_STANDING_ROOM_ONLY' | 'FULL';
  routeProgress?: number;
}

export interface LiveTransitData {
  buses: LiveVehicle[];
  rail: LiveVehicle[];
  trams: LiveVehicle[];
  lastUpdated: number;
}

export const useLiveTransitData = (map: L.Map | null) => {
  const [liveData, setLiveData] = useState<LiveTransitData>({
    buses: [],
    rail: [],
    trams: [],
    lastUpdated: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Parse GTFS-RT protobuf data
  const parseGTFSRealtime = async (arrayBuffer: ArrayBuffer, vehicleType: 'bus' | 'rail' | 'tram', operator: string): Promise<LiveVehicle[]> => {
    try {
      // Correct import for gtfs-realtime-bindings
      const gtfsRealtime = await import('gtfs-realtime-bindings');
      
      const feed = gtfsRealtime.transit_realtime.FeedMessage.decode(new Uint8Array(arrayBuffer));
      const vehicles: LiveVehicle[] = [];

      feed.entity.forEach((entity) => {
        if (entity.vehicle) {
          const vehicle = entity.vehicle;
          const position = vehicle.position;
          
          if (position && position.latitude && position.longitude) {
            vehicles.push({
              id: entity.id,
              routeId: vehicle.trip?.routeId || 'unknown',
              routeName: vehicle.trip?.routeId || 'Unknown Route',
              latitude: position.latitude,
              longitude: position.longitude,
              bearing: position.bearing,
              speed: position.speed ? position.speed * 2.237 : undefined, // Convert m/s to mph
              timestamp: vehicle.timestamp ? vehicle.timestamp * 1000 : Date.now(),
              vehicleType,
              operator,
              occupancyStatus: vehicle.occupancyStatus as any,
              routeProgress: 0.5 // Default value, could be calculated based on trip progress
            });
          }
        }
      });

      return vehicles;
    } catch (error) {
      console.error('Error parsing GTFS-RT data:', error);
      throw error;
    }
  };

  // Fetch King County Metro bus positions using real GTFS-RT data
  const fetchKingCountyMetroBuses = async (): Promise<LiveVehicle[]> => {
    // King County Metro GTFS-RT feed
    const response = await fetch('https://s3.amazonaws.com/kcm-alerts-realtime-prod/vehiclepositions.pb', {
      method: 'GET',
      headers: {
        'Accept': 'application/x-protobuf'
      }
    });
    
    if (!response.ok) {
      throw new Error(`King County Metro API error: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return await parseGTFSRealtime(arrayBuffer, 'bus', 'King County Metro');
  };

  // Fetch Sound Transit light rail positions using real GTFS-RT data
  const fetchSoundTransitRail = async (): Promise<LiveVehicle[]> => {
    // Sound Transit GTFS-RT feed
    const response = await fetch('https://www.soundtransit.org/GTFS-rt/VehiclePositions.pb', {
      method: 'GET',
      headers: {
        'Accept': 'application/x-protobuf'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Sound Transit API error: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return await parseGTFSRealtime(arrayBuffer, 'rail', 'Sound Transit');
  };

  // Fetch Seattle Streetcar positions
  const fetchSeattleStreetcars = async (): Promise<LiveVehicle[]> => {
    // Seattle Streetcar doesn't have a public real-time API
    // Return empty array for now
    console.log('Seattle Streetcar does not have a public real-time API available');
    return [];
  };

  // Fetch all live transit data
  const fetchLiveData = async () => {
    if (!map) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🚌 Fetching live transit data for Seattle...');
      
      const [buses, rail, trams] = await Promise.all([
        fetchKingCountyMetroBuses(),
        fetchSoundTransitRail(),
        fetchSeattleStreetcars()
      ]);
      
      console.log(`📊 Live transit data fetched: ${buses.length} buses, ${rail.length} trains, ${trams.length} streetcars`);
      
      setLiveData({
        buses,
        rail,
        trams,
        lastUpdated: Date.now()
      });
    } catch (err) {
      console.error('❌ Error fetching live transit data:', err);
      setError('Failed to fetch live transit data');
      // Set empty data on error instead of fallback
      setLiveData({
        buses: [],
        rail: [],
        trams: [],
        lastUpdated: Date.now()
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Set up periodic data fetching
  useEffect(() => {
    if (!map) return;
    
    // Initial fetch
    fetchLiveData();
    
    // Set up interval to fetch every 30 seconds for real data
    intervalRef.current = setInterval(fetchLiveData, 30000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [map]);

  // Clear data when map bounds change significantly
  useEffect(() => {
    if (!map) return;
    
    const handleMapMove = () => {
      // Refresh data when map moves
      fetchLiveData();
    };
    
    map.on('moveend', handleMapMove);
    
    return () => {
      map.off('moveend', handleMapMove);
    };
  }, [map]);

  return {
    liveData,
    isLoading,
    error,
    refreshData: fetchLiveData
  };
};
