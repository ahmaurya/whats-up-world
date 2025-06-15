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

  // Convert occupancy status enum to readable string
  const convertOccupancyStatus = (status: any): string => {
    console.log('🔍 Converting occupancy status:', { status, type: typeof status });
    
    if (typeof status === 'string') {
      return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    }
    
    // Handle numeric enum values from GTFS-RT
    switch (status) {
      case 0: return 'Empty';
      case 1: return 'Many Seats Available';
      case 2: return 'Few Seats Available';
      case 3: return 'Standing Room Only';
      case 4: return 'Crushed Standing Room Only';
      case 5: return 'Full';
      case 6: return 'Not Accepting Passengers';
      default: return 'Unknown';
    }
  };

  // Parse OneBusAway JSON data
  const parseOneBusAwayData = (jsonData: any, vehicleType: 'bus' | 'rail' | 'tram', operator: string): LiveVehicle[] => {
    try {
      console.log(`🔍 Starting to parse OneBusAway data for ${vehicleType} from ${operator}`);
      console.log(`📦 JSON response:`, jsonData);
      
      if (!jsonData.data || !jsonData.data.list) {
        console.log('⚠️ No vehicle list found in OneBusAway response');
        return [];
      }

      const vehicles: LiveVehicle[] = [];
      const vehicleList = jsonData.data.list;

      console.log(`📊 Found ${vehicleList.length} vehicles in OneBusAway response`);

      vehicleList.forEach((vehicle: any, index: number) => {
        console.log(`🚌 Processing OneBusAway vehicle ${index + 1}/${vehicleList.length}:`, {
          vehicleId: vehicle.vehicleId,
          tripId: vehicle.tripId,
          routeId: vehicle.routeId,
          location: vehicle.location,
          lastUpdateTime: vehicle.lastUpdateTime
        });

        if (vehicle.location && vehicle.location.lat && vehicle.location.lon) {
          const liveVehicle: LiveVehicle = {
            id: vehicle.vehicleId || `oba-${index}`,
            routeId: vehicle.routeId || 'unknown',
            routeName: vehicle.routeId || 'Unknown Route',
            latitude: vehicle.location.lat,
            longitude: vehicle.location.lon,
            bearing: vehicle.location.heading,
            speed: vehicle.location.speed ? vehicle.location.speed * 2.237 : undefined, // Convert m/s to mph if available
            timestamp: vehicle.lastUpdateTime || Date.now(),
            vehicleType,
            operator,
            occupancyStatus: undefined, // OneBusAway doesn't typically include occupancy
            routeProgress: vehicle.tripStatus?.distanceAlongTrip ? 
              vehicle.tripStatus.distanceAlongTrip / (vehicle.tripStatus.totalDistanceAlongTrip || 1) : 0.5
          };

          vehicles.push(liveVehicle);
          console.log(`✅ Added OneBusAway vehicle ${vehicle.vehicleId} to collection`);
        } else {
          console.log(`⚠️ Skipping OneBusAway vehicle ${vehicle.vehicleId} - missing location data`);
        }
      });

      console.log(`✅ Successfully parsed ${vehicles.length} valid vehicles for ${vehicleType} from ${operator}`);
      if (vehicles.length > 0) {
        console.log(`📋 Sample OneBusAway vehicle data:`, vehicles[0]);
      }
      return vehicles;
    } catch (error) {
      console.error(`❌ Error parsing OneBusAway data for ${vehicleType}:`, error);
      console.error('❌ Error stack:', error.stack);
      throw error;
    }
  };

  // Fetch King County Metro bus positions using OneBusAway API
  const fetchKingCountyMetroBuses = async (): Promise<LiveVehicle[]> => {
    console.log('🚌 Starting KCM bus data fetch via OneBusAway...');
    
    try {
      console.log('📡 Calling Supabase function for KCM data...');
      
      const { data, error } = await supabase.functions.invoke('get-live-transit', {
        body: JSON.stringify({ agency: 'kcm' }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log(`📡 KCM Supabase Response:`, { 
        hasData: !!data, 
        hasError: !!error,
        error: error
      });
      
      if (error) {
        console.error(`❌ KCM Supabase function error:`, error);
        throw new Error(`Supabase function error: ${error.message || JSON.stringify(error)}`);
      }

      if (!data || !data.success) {
        console.error(`❌ KCM function returned error:`, data);
        throw new Error(`Function Error: ${data?.error || 'Unknown error'}`);
      }

      // Parse JSON response from OneBusAway
      const jsonData = JSON.parse(data.data);
      const vehicles = parseOneBusAwayData(jsonData, 'bus', 'King County Metro');
      console.log(`🚌 KCM FINAL RESULT: ${vehicles.length} buses fetched`);
      
      return vehicles;
    } catch (error) {
      console.error('❌ Error in fetchKingCountyMetroBuses:', error);
      throw error;
    }
  };

  // Fetch Sound Transit data using OneBusAway API
  const fetchSoundTransitData = async (): Promise<LiveVehicle[]> => {
    console.log('🚊 Starting Sound Transit data fetch via OneBusAway...');
    
    try {
      console.log('📡 Calling Supabase function for Sound Transit data...');
      
      const { data, error } = await supabase.functions.invoke('get-live-transit', {
        body: JSON.stringify({ agency: 'st' }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log(`📡 Sound Transit Supabase Response:`, { 
        hasData: !!data, 
        hasError: !!error,
        error: error
      });
      
      if (error) {
        console.error(`❌ Sound Transit Supabase function error:`, error);
        throw new Error(`Supabase function error: ${error.message || JSON.stringify(error)}`);
      }

      if (!data || !data.success) {
        console.error(`❌ Sound Transit function returned error:`, data);
        throw new Error(`Function Error: ${data?.error || 'Unknown error'}`);
      }

      // Parse JSON response from OneBusAway
      const jsonData = JSON.parse(data.data);
      const vehicles = parseOneBusAwayData(jsonData, 'rail', 'Sound Transit');
      console.log(`🚊 Sound Transit FINAL RESULT: ${vehicles.length} vehicles fetched`);
      
      return vehicles;
    } catch (error) {
      console.error('❌ Error in fetchSoundTransitData:', error);
      throw error;
    }
  };

  // Fetch Seattle Streetcar positions
  const fetchSeattleStreetcars = async (): Promise<LiveVehicle[]> => {
    console.log('🚋 Seattle Streetcar does not have a public real-time API available');
    return [];
  };

  // Fetch all live transit data
  const fetchLiveData = async () => {
    if (!map) {
      console.log('🗺️ Map not available, skipping live data fetch');
      return;
    }
    
    console.log('🚀 Starting live transit data fetch...');
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🚌 Fetching live transit data via OneBusAway...');
      
      const results = await Promise.allSettled([
        fetchKingCountyMetroBuses(),
        fetchSoundTransitData(),
        fetchSeattleStreetcars()
      ]);
      
      console.log('📊 All API calls completed. Processing results...');
      
      const buses = results[0].status === 'fulfilled' ? results[0].value : [];
      const rail = results[1].status === 'fulfilled' ? results[1].value : [];
      const trams = results[2].status === 'fulfilled' ? results[2].value : [];
      
      // Log any errors
      results.forEach((result, index) => {
        const types = ['KCM buses', 'Sound Transit', 'trams'];
        if (result.status === 'rejected') {
          console.error(`❌ Failed to fetch ${types[index]}:`, result.reason);
        } else {
          console.log(`✅ Successfully fetched ${result.value.length} ${types[index]}`);
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
    
    console.log('🔄 Setting up live transit data fetching...');
    
    // Initial fetch
    fetchLiveData();
    
    // Set up interval to fetch every 30 seconds for real data
    intervalRef.current = setInterval(fetchLiveData, 30000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        console.log('🔄 Cleared live transit data fetch interval');
      }
    };
  }, [map]);

  // Clear data when map bounds change significantly
  useEffect(() => {
    if (!map) return;
    
    const handleMapMove = () => {
      // Refresh data when map moves
      console.log('🗺️ Map moved, refreshing live transit data...');
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
    refreshData: fetchLiveData,
    convertOccupancyStatus
  };
};
