
import { useState, useCallback } from 'react';
import { DisabledParkingSpot } from './useParking';

export const useSeattleDisabledParking = () => {
  const [seattleParkingSpots, setSeattleParkingSpots] = useState<DisabledParkingSpot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSeattleDisabledParking = useCallback(async (lat: number, lng: number, radius: number = 2000) => {
    setLoading(true);
    setError(null);

    try {
      console.log(`🏙️ Fetching Seattle disabled parking spots near ${lat}, ${lng} within ${radius}m`);

      // Seattle's Open Data API - Disabled Parking Zones
      // Using SODA API with spatial query
      const bbox = calculateBoundingBox(lat, lng, radius);
      
      const queries = [
        // Query 1: Seattle Disabled Parking Zones dataset
        `https://data.seattle.gov/resource/qktt-2bsy.json?$where=within_box(location,${bbox.south},${bbox.west},${bbox.north},${bbox.east})&$limit=1000`,
        
        // Query 2: Seattle Parking dataset with accessibility features
        `https://data.seattle.gov/resource/7jzm-ucez.json?$where=within_box(location,${bbox.south},${bbox.west},${bbox.north},${bbox.east})&$limit=1000`,
        
        // Query 3: Street parking with accessibility info
        `https://data.seattle.gov/resource/926b-jbpn.json?$where=within_box(location,${bbox.south},${bbox.west},${bbox.north},${bbox.east})&$limit=1000`,

        // Query 4: Seattle City GIS - Curb Space Categories (DISABL spaces)
        `https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/Curb_Space_Categories/FeatureServer/0/query?where=SPACETYPE='DISABL'&geometry=${bbox.west},${bbox.south},${bbox.east},${bbox.north}&geometryType=esriGeometryEnvelope&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=true&f=json`
      ];

      let allSpots: any[] = [];

      for (let i = 0; i < queries.length; i++) {
        try {
          console.log(`🏙️ Trying Seattle API query ${i + 1} of ${queries.length}`);
          
          const response = await fetch(queries[i]);
          
          if (!response.ok) {
            console.log(`🏙️ Seattle query ${i + 1} failed with status: ${response.status}`);
            continue;
          }

          const data = await response.json();
          
          if (i === 3) {
            // Handle ArcGIS response format for curb space data
            if (data.features && Array.isArray(data.features) && data.features.length > 0) {
              console.log(`🏙️ Seattle GIS query returned ${data.features.length} curb space features`);
              console.log(`🏙️ Sample GIS features:`, data.features.slice(0, 3));
              allSpots.push(...data.features.map((feature: any) => ({
                ...feature.attributes,
                geometry: feature.geometry
              })));
            }
          } else {
            // Handle SODA API response format
            console.log(`🏙️ Seattle query ${i + 1} returned ${data?.length || 0} elements`);
            
            if (data && Array.isArray(data) && data.length > 0) {
              console.log(`🏙️ Sample elements from Seattle query ${i + 1}:`, data.slice(0, 3));
              allSpots.push(...data);
            }
          }
          
        } catch (queryError) {
          console.error(`🏙️ Seattle query ${i + 1} error:`, queryError);
        }
      }

      console.log(`🏙️ Total elements collected from Seattle APIs: ${allSpots.length}`);

      // Process Seattle parking data
      const processedSpots: DisabledParkingSpot[] = allSpots
        .filter((item: any) => {
          // Filter for disabled parking related data
          const hasDisabledFeature = 
            (item.parking_category && item.parking_category.toLowerCase().includes('disabled')) ||
            (item.parking_type && item.parking_type.toLowerCase().includes('disabled')) ||
            (item.zone_type && item.zone_type.toLowerCase().includes('disabled')) ||
            (item.sign_description && item.sign_description.toLowerCase().includes('disabled')) ||
            (item.use_type && item.use_type.toLowerCase().includes('disabled')) ||
            (item.accessibility && item.accessibility === 'yes') ||
            item.ada_accessible === 'Y' ||
            item.accessible === 'Y' ||
            item.SPACETYPE === 'DISABL'; // GIS curb space data
            
          return hasDisabledFeature;
        })
        .map((item: any) => {
          // Extract coordinates
          let coordinates: [number, number];
          
          if (item.geometry && item.geometry.paths) {
            // ArcGIS geometry format (polyline) - use first point
            const firstPath = item.geometry.paths[0];
            if (firstPath && firstPath[0]) {
              coordinates = [firstPath[0][0], firstPath[0][1]];
            } else {
              coordinates = [lng, lat]; // fallback
            }
          } else if (item.location?.coordinates) {
            coordinates = [item.location.coordinates[0], item.location.coordinates[1]];
          } else if (item.location?.longitude && item.location?.latitude) {
            coordinates = [parseFloat(item.location.longitude), parseFloat(item.location.latitude)];
          } else if (item.longitude && item.latitude) {
            coordinates = [parseFloat(item.longitude), parseFloat(item.latitude)];
          } else {
            coordinates = [lng, lat]; // fallback
          }

          // Generate name
          const name = generateSeattleParkingName(item);

          // Determine fee
          let fee: 'no' | 'yes' | 'unknown' = 'unknown';
          if (item.paid_area === 'Paid' || item.rate_range || item.cost || item.PAIDAREA === 'Paid') {
            fee = 'yes';
          } else if (item.paid_area === 'Free' || item.rate_range === '0' || item.PAIDAREA === 'Free') {
            fee = 'no';
          }

          const spot: DisabledParkingSpot = {
            id: `seattle_disabled_${item.objectid || item.OBJECTID || item.id || Math.random()}`,
            name,
            coordinates,
            type: 'disabled',
            fee,
            timeLimit: item.time_limit || item.time_restriction || item.TIMELIMIT,
            restrictions: item.restrictions || item.sign_description || item.RESTRICTION,
            surface: item.surface_type || item.SURFACE,
            capacity: item.spaces ? parseInt(item.spaces) : (item.SPACES ? parseInt(item.SPACES) : undefined),
            source: 'openstreetmap' // Keep consistent with interface
          };

          return spot;
        })
        .filter((spot) => {
          const isValid = spot.coordinates[0] !== 0 && spot.coordinates[1] !== 0 &&
                         !isNaN(spot.coordinates[0]) && !isNaN(spot.coordinates[1]);
          return isValid;
        });

      // Remove duplicates
      const uniqueSpots = deduplicateSeattleSpots(processedSpots);

      console.log(`🏙️ Processed ${uniqueSpots.length} Seattle disabled parking spots`);
      setSeattleParkingSpots(uniqueSpots);

    } catch (err) {
      console.error('🏙️ Error fetching Seattle disabled parking spots:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch Seattle parking spots');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    seattleParkingSpots,
    loading,
    error,
    fetchSeattleDisabledParking
  };
};

// Helper function to calculate bounding box
const calculateBoundingBox = (lat: number, lng: number, radiusMeters: number) => {
  const earthRadius = 6371000; // meters
  const latDelta = (radiusMeters / earthRadius) * (180 / Math.PI);
  const lngDelta = (radiusMeters / earthRadius) * (180 / Math.PI) / Math.cos(lat * Math.PI / 180);

  return {
    north: lat + latDelta,
    south: lat - latDelta,
    east: lng + lngDelta,
    west: lng - lngDelta
  };
};

// Helper function to generate parking names
const generateSeattleParkingName = (item: any): string => {
  if (item.STREETNAME) return `Disabled Parking - ${item.STREETNAME}`;
  if (item.location_description) return `Disabled Parking - ${item.location_description}`;
  if (item.street_name) return `Disabled Parking - ${item.street_name}`;
  if (item.address) return `Disabled Parking - ${item.address}`;
  if (item.block_nbr && item.street) return `Disabled Parking - ${item.block_nbr} ${item.street}`;
  if (item.UNITDESC) return `Disabled Parking - ${item.UNITDESC}`;
  return 'Disabled Parking - Seattle';
};

// Deduplication function
const deduplicateSeattleSpots = (spots: DisabledParkingSpot[]): DisabledParkingSpot[] => {
  const PROXIMITY_THRESHOLD = 0.0001; // ~10 meters
  const uniqueSpots: DisabledParkingSpot[] = [];
  const processedIds = new Set<string>();

  for (const spot of spots) {
    if (processedIds.has(spot.id)) continue;

    const nearbySpots = spots.filter(other => {
      if (other.id === spot.id || processedIds.has(other.id)) return false;
      
      const distance = Math.sqrt(
        Math.pow(spot.coordinates[0] - other.coordinates[0], 2) +
        Math.pow(spot.coordinates[1] - other.coordinates[1], 2)
      );
      
      return distance < PROXIMITY_THRESHOLD;
    });

    if (nearbySpots.length === 0) {
      uniqueSpots.push(spot);
      processedIds.add(spot.id);
    } else {
      const allSpots = [spot, ...nearbySpots];
      const bestSpot = allSpots.reduce((best, current) => {
        let bestScore = scoreParkingSpot(best);
        let currentScore = scoreParkingSpot(current);
        return currentScore > bestScore ? current : best;
      });
      
      uniqueSpots.push(bestSpot);
      allSpots.forEach(s => processedIds.add(s.id));
    }
  }

  return uniqueSpots;
};

// Simple scoring function
const scoreParkingSpot = (spot: DisabledParkingSpot): number => {
  let score = 0;
  if (spot.name && !spot.name.includes('Unknown')) score += 3;
  if (spot.capacity) score += 2;
  if (spot.timeLimit) score += 1;
  if (spot.surface) score += 1;
  return score;
};
