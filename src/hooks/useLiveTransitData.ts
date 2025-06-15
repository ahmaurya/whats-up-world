import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { supabase } from '@/integrations/supabase/client';

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
      console.log(`🔍 Parsing GTFS-RT data for ${vehicleType} from ${operator}, buffer size: ${arrayBuffer.byteLength} bytes`);
      
      const gtfsRealtime = await import('gtfs-realtime-bindings');
      
      const feed = gtfsRealtime.transit_realtime.FeedMessage.decode(new Uint8Array(arrayBuffer));
      console.log(`📊 Decoded feed with ${feed.entity.length} entities`);
      
      const vehicles: LiveVehicle[] = [];

      feed.entity.forEach((entity, index) => {
        console.log(`🚌 Entity ${index}:`, {
          id: entity.id,
          hasVehicle: !!entity.vehicle,
          hasTripUpdate: !!entity.tripUpdate,
          hasAlert: !!entity.alert
        });
        
        if (entity.vehicle) {
          const vehicle = entity.vehicle;
          const position = vehicle.position;
          
          console.log(`📍 Vehicle ${entity.id} position:`, {
            hasPosition: !!position,
            latitude: position?.latitude,
            longitude: position?.longitude,
            bearing: position?.bearing,
            speed: position?.speed,
            trip: vehicle.trip ? {
              tripId: vehicle.trip.tripId,
              routeId: vehicle.trip.routeId,
              startTime: vehicle.trip.startTime,
              startDate: vehicle.trip.startDate
            } : null,
            timestamp: vehicle.timestamp,
            occupancyStatus: vehicle.occupancyStatus
          });
          
          if (position && position.latitude && position.longitude) {
            const speed = position.speed ? position.speed * 2.237 : undefined; // Convert m/s to mph
            
            vehicles.push({
              id: entity.id,
              routeId: vehicle.trip?.routeId || 'unknown',
              routeName: vehicle.trip?.routeId || 'Unknown Route',
              latitude: position.latitude,
              longitude: position.longitude,
              bearing: position.bearing,
              speed: speed,
              timestamp: vehicle.timestamp ? Number(vehicle.timestamp) * 1000 : Date.now(),
              vehicleType,
              operator,
              occupancyStatus: vehicle.occupancyStatus as any,
              routeProgress: 0.5 // Default value, could be calculated based on trip progress
            });
          }
        }
      });

      console.log(`✅ Parsed ${vehicles.length} valid vehicles for ${vehicleType} from ${operator}`);
      return vehicles;
    } catch (error) {
      console.error(`❌ Error parsing GTFS-RT data for ${vehicleType}:`, error);
      throw error;
    }
  };

  // Fetch King County Metro bus positions using Supabase Edge Function
  const fetchKingCountyMetroBuses = async (): Promise<LiveVehicle[]> => {
    console.log('🚌 Fetching King County Metro bus data via Supabase...');
    
    const { data, error } = await supabase.functions.invoke('get-live-transit', {
      body: { agency: 'kcm' }
    });
    
    if (error) {
      console.error('❌ Supabase function error for KCM:', error);
      throw error;
    }

    console.log(`📦 Received ${data.byteLength} bytes from King County Metro via Supabase`);
    
    return await parseGTFSRealtime(data, 'bus', 'King County Metro');
  };

  // Fetch Sound Transit light rail positions using Supabase Edge Function
  const fetchSoundTransitRail = async (): Promise<LiveVehicle[]> => {
    console.log('🚊 Fetching Sound Transit rail data via Supabase...');
    
    const { data, error } = await supabase.functions.invoke('get-live-transit', {
      body: { agency: 'st' }
    });
    
    if (error) {
      console.error('❌ Supabase function error for ST:', error);
      throw error;
    }

    console.log(`📦 Received ${data.byteLength} bytes from Sound Transit via Supabase`);
    
    return await parseGTFSRealtime(data, 'rail', 'Sound Transit');
  };

  // Fetch Seattle Streetcar positions
  const fetchSeattleStreetcars = async (): Promise<LiveVehicle[]> => {
    // Seattle Streetcar doesn't have a public real-time API
    console.log('🚋 Seattle Streetcar does not have a public real-time API available');
    return [];
  };

  // Fetch all live transit data
  const fetchLiveData = async () => {
    if (!map) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🚌 Fetching live transit data for Seattle via Supabase...');
      
      const results = await Promise.allSettled([
        fetchKingCountyMetroBuses(),
        fetchSoundTransitRail(),
        fetchSeattleStreetcars()
      ]);
      
      const buses = results[0].status === 'fulfilled' ? results[0].value : [];
      const rail = results[1].status === 'fulfilled' ? results[1].value : [];
      const trams = results[2].status === 'fulfilled' ? results[2].value : [];
      
      // Log any errors
      results.forEach((result, index) => {
        const types = ['buses', 'rail', 'trams'];
        if (result.status === 'rejected') {
          console.error(`❌ Failed to fetch ${types[index]}:`, result.reason);
        }
      });
      
      console.log(`📊 Final live transit data summary:`, {
        buses: buses.length,
        rail: rail.length,
        trams: trams.length,
        totalVehicles: buses.length + rail.length + trams.length
      });
      
      setLiveData({
        buses,
        rail,
        trams,
        lastUpdated: Date.now()
      });
    } catch (err) {
      console.error('❌ Error fetching live transit data:', err);
      setError('Failed to fetch live transit data');
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
