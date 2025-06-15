import { useState, useEffect, useCallback } from 'react';

export interface ParkingSpot {
  id: string;
  name: string;
  coordinates: [number, number]; // [lng, lat]
  type: 'street_side' | 'parking_lane' | 'layby';
  fee: 'no' | 'yes' | 'unknown';
  timeLimit?: string;
  restrictions?: string;
  surface?: string;
  capacity?: number;
  source: 'openstreetmap';
}

export interface DisabledParkingSpot {
  id: string;
  name: string;
  coordinates: [number, number]; // [lng, lat]
  type: 'disabled';
  fee: 'no' | 'yes' | 'unknown';
  timeLimit?: string;
  restrictions?: string;
  surface?: string;
  capacity?: number;
  source: 'openstreetmap';
}

export const useParking = (bounds?: L.LatLngBounds | null, enabled: boolean = false) => {
  const [parkingSpots, setParkingSpots] = useState<ParkingSpot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchParkingSpots = useCallback(async (lat: number, lng: number, radius: number = 2000) => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      console.log(`🅿️ Fetching free parking spots near ${lat}, ${lng} within ${radius}m`);

      // Overpass API query for free parking spots
      const overpassQuery = `
        [out:json][timeout:25];
        (
          way["highway"="service"]["service"="parking_aisle"](around:${radius},${lat},${lng});
          way["amenity"="parking"]["fee"~"^(no|free)$"](around:${radius},${lat},${lng});
          way["amenity"="parking"][!"fee"](around:${radius},${lat},${lng});
          way["parking"="street_side"]["fee"~"^(no|free)$"](around:${radius},${lat},${lng});
          way["parking"="street_side"][!"fee"](around:${radius},${lat},${lng});
          way["parking"="lane"]["fee"~"^(no|free)$"](around:${radius},${lat},${lng});
          way["parking"="lane"][!"fee"](around:${radius},${lat},${lng});
          way["parking"="layby"]["fee"~"^(no|free)$"](around:${radius},${lat},${lng});
          way["parking"="layby"][!"fee"](around:${radius},${lat},${lng});
        );
        out center;
      `;

      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: overpassQuery,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`🅿️ Raw parking data:`, data);

      const processedSpots: ParkingSpot[] = data.elements
        .filter((element: any) => {
          const tags = element.tags || {};
          // Only include free parking (no fee or explicitly free)
          return tags.fee === 'no' || tags.fee === 'free' || !tags.fee;
        })
        .map((element: any) => {
          const tags = element.tags || {};
          
          // Get coordinates
          let coordinates: [number, number];
          if (element.center) {
            coordinates = [element.center.lon, element.center.lat];
          } else if (element.lat && element.lon) {
            coordinates = [element.lon, element.lat];
          } else {
            coordinates = [lng, lat]; // fallback
          }

          // Determine parking type
          let type: ParkingSpot['type'] = 'street_side';
          if (tags.parking === 'lane') type = 'parking_lane';
          else if (tags.parking === 'layby') type = 'layby';
          else if (tags.amenity === 'parking') type = 'street_side';

          return {
            id: `parking_${element.id}`,
            name: tags.name || generateParkingName(tags, type),
            coordinates,
            type,
            fee: tags.fee === 'no' || tags.fee === 'free' ? 'no' : (tags.fee ? 'yes' : 'no'),
            timeLimit: tags.maxstay || tags['parking:time_limit'],
            restrictions: tags.restriction || tags['parking:restriction'],
            surface: tags.surface,
            capacity: tags.capacity ? parseInt(tags.capacity) : undefined,
            source: 'openstreetmap' as const
          };
        })
        .filter((spot: ParkingSpot) => 
          spot.coordinates[0] !== 0 && spot.coordinates[1] !== 0 && spot.fee === 'no'
        );

      // Deduplicate parking spots
      const deduplicatedSpots = deduplicateParkingSpots(processedSpots);

      console.log(`🅿️ Processed ${deduplicatedSpots.length} free parking spots (${processedSpots.length - deduplicatedSpots.length} duplicates removed)`);
      setParkingSpots(deduplicatedSpots);

    } catch (err) {
      console.error('🅿️ Error fetching parking spots:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch parking spots');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  // Fetch when bounds change and enabled
  useEffect(() => {
    if (!bounds || !enabled) return;

    const center = bounds.getCenter();
    fetchParkingSpots(center.lat, center.lng, 2000);
  }, [bounds, enabled, fetchParkingSpots]);

  return {
    parkingSpots,
    loading,
    error,
    fetchParkingSpots
  };
};

export const useDisabledParking = (bounds?: L.LatLngBounds | null, enabled: boolean = false) => {
  const [disabledParkingSpots, setDisabledParkingSpots] = useState<DisabledParkingSpot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDisabledParkingSpots = useCallback(async (lat: number, lng: number, radius: number = 2000) => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      console.log(`♿ Fetching disabled parking spots near ${lat}, ${lng} within ${radius}m`);

      // Overpass API query for disabled parking spots
      const overpassQuery = `
        [out:json][timeout:25];
        (
          way["amenity"="parking"]["disabled"="yes"](around:${radius},${lat},${lng});
          way["amenity"="parking"]["disabled"="designated"](around:${radius},${lat},${lng});
          way["parking"="disabled"](around:${radius},${lat},${lng});
          way["parking:disabled"="yes"](around:${radius},${lat},${lng});
          way["parking:disabled"="designated"](around:${radius},${lat},${lng});
          node["amenity"="parking"]["disabled"="yes"](around:${radius},${lat},${lng});
          node["amenity"="parking"]["disabled"="designated"](around:${radius},${lat},${lng});
          node["parking"="disabled"](around:${radius},${lat},${lng});
          node["parking:disabled"="yes"](around:${radius},${lat},${lng});
          node["parking:disabled"="designated"](around:${radius},${lat},${lng});
        );
        out center;
      `;

      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: overpassQuery,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`♿ Raw disabled parking data:`, data);

      const processedSpots: DisabledParkingSpot[] = data.elements
        .map((element: any) => {
          const tags = element.tags || {};
          
          // Get coordinates
          let coordinates: [number, number];
          if (element.center) {
            coordinates = [element.center.lon, element.center.lat];
          } else if (element.lat && element.lon) {
            coordinates = [element.lon, element.lat];
          } else {
            coordinates = [lng, lat]; // fallback
          }

          return {
            id: `disabled_parking_${element.id}`,
            name: tags.name || generateDisabledParkingName(tags),
            coordinates,
            type: 'disabled' as const,
            fee: tags.fee === 'no' || tags.fee === 'free' ? 'no' : (tags.fee ? 'yes' : 'unknown'),
            timeLimit: tags.maxstay || tags['parking:time_limit'],
            restrictions: tags.restriction || tags['parking:restriction'],
            surface: tags.surface,
            capacity: tags.capacity ? parseInt(tags.capacity) : undefined,
            source: 'openstreetmap' as const
          };
        })
        .filter((spot: DisabledParkingSpot) => 
          spot.coordinates[0] !== 0 && spot.coordinates[1] !== 0
        );

      // Deduplicate disabled parking spots
      const deduplicatedSpots = deduplicateDisabledParkingSpots(processedSpots);

      console.log(`♿ Processed ${deduplicatedSpots.length} disabled parking spots (${processedSpots.length - deduplicatedSpots.length} duplicates removed)`);
      setDisabledParkingSpots(deduplicatedSpots);

    } catch (err) {
      console.error('♿ Error fetching disabled parking spots:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch disabled parking spots');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  // Fetch when bounds change and enabled
  useEffect(() => {
    if (!bounds || !enabled) return;

    const center = bounds.getCenter();
    fetchDisabledParkingSpots(center.lat, center.lng, 2000);
  }, [bounds, enabled, fetchDisabledParkingSpots]);

  return {
    disabledParkingSpots,
    loading,
    error,
    fetchDisabledParkingSpots
  };
};

// Helper function to generate parking spot names
const generateParkingName = (tags: any, type: ParkingSpot['type']): string => {
  if (tags.name) return tags.name;
  
  const streetName = tags['addr:street'] || 'Unknown Street';
  
  switch (type) {
    case 'parking_lane':
      return `Parking Lane - ${streetName}`;
    case 'layby':
      return `Layby Parking - ${streetName}`;
    default:
      return `Street Parking - ${streetName}`;
  }
};

// Deduplication function
const deduplicateParkingSpots = (spots: ParkingSpot[]): ParkingSpot[] => {
  const PROXIMITY_THRESHOLD = 0.0005; // ~50 meters in decimal degrees
  const uniqueSpots: ParkingSpot[] = [];
  const processedIds = new Set<string>();

  for (const spot of spots) {
    if (processedIds.has(spot.id)) continue;

    // Find nearby spots
    const nearbySpots = spots.filter(other => {
      if (other.id === spot.id || processedIds.has(other.id)) return false;
      
      const distance = Math.sqrt(
        Math.pow(spot.coordinates[0] - other.coordinates[0], 2) +
        Math.pow(spot.coordinates[1] - other.coordinates[1], 2)
      );
      
      return distance < PROXIMITY_THRESHOLD;
    });

    if (nearbySpots.length === 0) {
      // No duplicates found
      uniqueSpots.push(spot);
      processedIds.add(spot.id);
    } else {
      // Choose the best spot from the group
      const allSpots = [spot, ...nearbySpots];
      const bestSpot = chooseBestParkingSpot(allSpots);
      
      uniqueSpots.push(bestSpot);
      
      // Mark all spots in this group as processed
      allSpots.forEach(s => processedIds.add(s.id));
    }
  }

  return uniqueSpots;
};

// Choose the best parking spot from a group of nearby spots
const chooseBestParkingSpot = (spots: ParkingSpot[]): ParkingSpot => {
  // Score each spot
  const scoredSpots = spots.map(spot => {
    let score = 0;
    
    // Bonus for having a proper name
    if (spot.name && !spot.name.includes('Unknown')) score += 3;
    
    // Bonus for having capacity information
    if (spot.capacity) score += 2;
    
    // Bonus for having time limit info
    if (spot.timeLimit) score += 1;
    
    // Bonus for having surface info
    if (spot.surface) score += 1;
    
    // Prefer street_side parking over lanes
    if (spot.type === 'street_side') score += 2;
    
    return { spot, score };
  });
  
  // Sort by score (highest first) and return the best one
  scoredSpots.sort((a, b) => b.score - a.score);
  
  console.log(`🅿️ Choosing best parking spot from ${spots.length} nearby spots:`, 
    scoredSpots.map(s => `${s.spot.name} (score: ${s.score})`));
  
  return scoredSpots[0].spot;
};

// Helper function to generate disabled parking spot names
const generateDisabledParkingName = (tags: any): string => {
  if (tags.name) return tags.name;
  
  const streetName = tags['addr:street'] || 'Unknown Street';
  return `Disabled Parking - ${streetName}`;
};

// Deduplication function for disabled parking
const deduplicateDisabledParkingSpots = (spots: DisabledParkingSpot[]): DisabledParkingSpot[] => {
  const PROXIMITY_THRESHOLD = 0.0005; // ~50 meters in decimal degrees
  const uniqueSpots: DisabledParkingSpot[] = [];
  const processedIds = new Set<string>();

  for (const spot of spots) {
    if (processedIds.has(spot.id)) continue;

    // Find nearby spots
    const nearbySpots = spots.filter(other => {
      if (other.id === spot.id || processedIds.has(other.id)) return false;
      
      const distance = Math.sqrt(
        Math.pow(spot.coordinates[0] - other.coordinates[0], 2) +
        Math.pow(spot.coordinates[1] - other.coordinates[1], 2)
      );
      
      return distance < PROXIMITY_THRESHOLD;
    });

    if (nearbySpots.length === 0) {
      // No duplicates found
      uniqueSpots.push(spot);
      processedIds.add(spot.id);
    } else {
      // Choose the best spot from the group
      const allSpots = [spot, ...nearbySpots];
      const bestSpot = chooseBestDisabledParkingSpot(allSpots);
      
      uniqueSpots.push(bestSpot);
      
      // Mark all spots in this group as processed
      allSpots.forEach(s => processedIds.add(s.id));
    }
  }

  return uniqueSpots;
};

// Choose the best disabled parking spot from a group of nearby spots
const chooseBestDisabledParkingSpot = (spots: DisabledParkingSpot[]): DisabledParkingSpot => {
  // Score each spot
  const scoredSpots = spots.map(spot => {
    let score = 0;
    
    // Bonus for having a proper name
    if (spot.name && !spot.name.includes('Unknown')) score += 3;
    
    // Bonus for having capacity information
    if (spot.capacity) score += 2;
    
    // Bonus for having time limit info
    if (spot.timeLimit) score += 1;
    
    // Bonus for having surface info
    if (spot.surface) score += 1;
    
    return { spot, score };
  });
  
  // Sort by score (highest first) and return the best one
  scoredSpots.sort((a, b) => b.score - a.score);
  
  console.log(`♿ Choosing best disabled parking spot from ${spots.length} nearby spots:`, 
    scoredSpots.map(s => `${s.spot.name} (score: ${s.score})`));
  
  return scoredSpots[0].spot;
};
