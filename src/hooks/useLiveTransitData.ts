
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

  // Parse GTFS-RT protobuf data
  const parseGTFSRealtime = async (arrayBuffer: ArrayBuffer, vehicleType: 'bus' | 'rail' | 'tram', operator: string): Promise<LiveVehicle[]> => {
    try {
      console.log(`🔍 Starting to parse GTFS-RT data for ${vehicleType} from ${operator}`);
      console.log(`📦 ArrayBuffer size: ${arrayBuffer.byteLength} bytes`);
      
      const gtfsRealtime = await import('gtfs-realtime-bindings');
      console.log('📚 GTFS Realtime bindings loaded successfully');
      
      const feed = gtfsRealtime.transit_realtime.FeedMessage.decode(new Uint8Array(arrayBuffer));
      console.log(`📊 Decoded feed with ${feed.entity.length} entities`);
      console.log('📋 Feed header:', feed.header);
      
      const vehicles: LiveVehicle[] = [];

      feed.entity.forEach((entity, index) => {
        console.log(`🚌 Processing entity ${index + 1}/${feed.entity.length}:`, {
          id: entity.id,
          hasVehicle: !!entity.vehicle,
          hasTripUpdate: !!entity.tripUpdate,
          hasAlert: !!entity.alert
        });
        
        if (entity.vehicle) {
          const vehicle = entity.vehicle;
          const position = vehicle.position;
          
          console.log(`📍 Vehicle ${entity.id} details:`, {
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
            occupancyStatus: vehicle.occupancyStatus,
            occupancyStatusType: typeof vehicle.occupancyStatus,
            vehicleDescriptor: vehicle.vehicle ? {
              id: vehicle.vehicle.id,
              label: vehicle.vehicle.label,
              licensePlate: vehicle.vehicle.licensePlate
            } : null
          });
          
          if (position && position.latitude && position.longitude) {
            const speed = position.speed ? position.speed * 2.237 : undefined; // Convert m/s to mph
            
            const liveVehicle: LiveVehicle = {
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
            };
            
            vehicles.push(liveVehicle);
            console.log(`✅ Added vehicle ${entity.id} to collection`);
          } else {
            console.log(`⚠️ Skipping vehicle ${entity.id} - missing position data`);
          }
        }
      });

      console.log(`✅ Successfully parsed ${vehicles.length} valid vehicles for ${vehicleType} from ${operator}`);
      if (vehicles.length > 0) {
        console.log(`📋 Sample vehicle data:`, vehicles[0]);
        console.log(`📋 ALL VEHICLES for ${vehicleType}:`, vehicles);
      }
      return vehicles;
    } catch (error) {
      console.error(`❌ Error parsing GTFS-RT data for ${vehicleType}:`, error);
      console.error('❌ Error stack:', error.stack);
      throw error;
    }
  };

  // Fetch King County Metro bus positions using Supabase Edge Function
  const fetchKingCountyMetroBuses = async (): Promise<LiveVehicle[]> => {
    console.log('🚌 Starting KCM bus data fetch...');
    
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
        data: data,
        error: error
      });
      
      if (error) {
        console.error(`❌ KCM Supabase function error:`, error);
        throw new Error(`Supabase function error: ${error.message || JSON.stringify(error)}`);
      }

      if (!data) {
        console.error(`❌ No data received from KCM function`);
        throw new Error('No data received from KCM function');
      }

      console.log('📦 Complete KCM response data:', data);

      // Check if there's an error in the response
      if (!data.success || data.error) {
        console.error(`❌ KCM function returned error:`, data);
        throw new Error(`Function Error: ${data.error || 'Unknown error'} - ${data.message || data.details || ''}`);
      }

      if (!data.data) {
        console.error(`❌ Invalid KCM response format - missing data:`, data);
        throw new Error(`Invalid response format from KCM function - no data field`);
      }

      // Convert base64 back to ArrayBuffer
      console.log(`🔄 Converting base64 data (length: ${data.data.length}) back to ArrayBuffer...`);
      const binaryString = atob(data.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const arrayBuffer = bytes.buffer;
      
      console.log(`📦 Converted to ArrayBuffer of ${arrayBuffer.byteLength} bytes`);
      
      const vehicles = await parseGTFSRealtime(arrayBuffer, 'bus', 'King County Metro');
      console.log(`🚌 KCM FINAL RESULT: ${vehicles.length} buses fetched`);
      console.log(`🚌 KCM ALL VEHICLES DUMP:`, vehicles);
      
      return vehicles;
    } catch (error) {
      console.error('❌ Error in fetchKingCountyMetroBuses:', error);
      console.error('❌ Error stack:', error.stack);
      throw error;
    }
  };

  // Fetch Sound Transit light rail positions using Supabase Edge Function
  const fetchSoundTransitRail = async (): Promise<LiveVehicle[]> => {
    console.log('🚊 Starting Sound Transit rail data fetch...');
    
    try {
      console.log('📡 Calling Supabase function for ST data...');
      
      const { data, error } = await supabase.functions.invoke('get-live-transit', {
        body: JSON.stringify({ agency: 'st' }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log(`📡 ST Supabase Response:`, { 
        hasData: !!data, 
        hasError: !!error,
        data: data,
        error: error
      });
      
      if (error) {
        console.error(`❌ ST Supabase function error:`, error);
        throw new Error(`Supabase function error: ${error.message || JSON.stringify(error)}`);
      }

      if (!data) {
        console.error(`❌ No data received from ST function`);
        throw new Error('No data received from ST function');
      }

      console.log('📦 Complete ST response data:', data);

      // Check if there's an error in the response
      if (!data.success || data.error) {
        console.error(`❌ ST function returned error:`, data);
        throw new Error(`Function Error: ${data.error || 'Unknown error'} - ${data.message || data.details || ''}`);
      }

      if (!data.data) {
        console.error(`❌ Invalid ST response format - missing data:`, data);
        throw new Error(`Invalid response format from ST function - no data field`);
      }

      // Convert base64 back to ArrayBuffer
      console.log(`🔄 Converting base64 data (length: ${data.data.length}) back to ArrayBuffer...`);
      const binaryString = atob(data.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const arrayBuffer = bytes.buffer;
      
      console.log(`📦 Converted to ArrayBuffer of ${arrayBuffer.byteLength} bytes`);
      
      const vehicles = await parseGTFSRealtime(arrayBuffer, 'rail', 'Sound Transit');
      console.log(`🚊 ST FINAL RESULT: ${vehicles.length} trains fetched`);
      console.log(`🚊 ST ALL VEHICLES DUMP:`, vehicles);
      
      return vehicles;
    } catch (error) {
      console.error('❌ Error in fetchSoundTransitRail:', error);
      console.error('❌ Error stack:', error.stack);
      throw error;
    }
  };

  // Fetch Seattle Streetcar positions
  const fetchSeattleStreetcars = async (): Promise<LiveVehicle[]> => {
    // Seattle Streetcar doesn't have a public real-time API
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
      console.log('🚌 Fetching live transit data for Seattle via Supabase...');
      
      const results = await Promise.allSettled([
        fetchKingCountyMetroBuses(),
        fetchSoundTransitRail(),
        fetchSeattleStreetcars()
      ]);
      
      console.log('📊 All API calls completed. Processing results...');
      console.log('📊 Raw Promise.allSettled results:', results);
      
      const buses = results[0].status === 'fulfilled' ? results[0].value : [];
      const rail = results[1].status === 'fulfilled' ? results[1].value : [];
      const trams = results[2].status === 'fulfilled' ? results[2].value : [];
      
      // Log any errors
      results.forEach((result, index) => {
        const types = ['buses', 'rail', 'trams'];
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
      
      // Log detailed sample data
      if (buses.length > 0) {
        console.log(`🚌 Sample bus data (first 3):`, buses.slice(0, 3));
      }
      if (rail.length > 0) {
        console.log(`🚊 Sample rail data (first 3):`, rail.slice(0, 3));
      }
      
      console.log('📊 COMPLETE LIVE TRANSIT DATA DUMP:');
      console.log('🚌 ALL BUSES:', buses);
      console.log('🚊 ALL RAIL:', rail);
      console.log('🚋 ALL TRAMS:', trams);
      
      setLiveData({
        buses,
        rail,
        trams,
        lastUpdated: Date.now()
      });
    } catch (err) {
      console.error('❌ Error fetching live transit data:', err);
      console.error('❌ Error stack:', err.stack);
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
