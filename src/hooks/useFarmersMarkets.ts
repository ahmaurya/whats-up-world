
import { useState, useEffect, useCallback } from 'react';

export interface FarmersMarket {
  id: string;
  name: string;
  coordinates: [number, number]; // [lng, lat]
  description: string;
  address: string;
  schedule: {
    day: string; // e.g., "Saturday", "Sunday"
    time: string; // e.g., "8:00 AM - 2:00 PM"
    frequency: string; // e.g., "weekly", "monthly"
  }[];
  website?: string;
  phone?: string;
  source: 'openstreetmap';
}

export const useFarmersMarkets = (bounds?: L.LatLngBounds | null, enabled: boolean = false) => {
  const [farmersMarkets, setFarmersMarkets] = useState<FarmersMarket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFarmersMarkets = useCallback(async (lat: number, lng: number, radius: number = 5000) => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      console.log(`🥕 Fetching farmer's markets near ${lat}, ${lng} within ${radius}m`);

      // Overpass API query for farmer's markets
      const overpassQuery = `
        [out:json][timeout:25];
        (
          node["amenity"="marketplace"](around:${radius},${lat},${lng});
          way["amenity"="marketplace"](around:${radius},${lat},${lng});
          relation["amenity"="marketplace"](around:${radius},${lat},${lng});
          node["shop"="farm"](around:${radius},${lat},${lng});
          way["shop"="farm"](around:${radius},${lat},${lng});
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
      console.log(`🥕 Raw farmer's market data:`, data);

      const processedMarkets: FarmersMarket[] = data.elements
        .filter((element: any) => {
          // Filter for farmer's markets or farm shops
          const tags = element.tags || {};
          return (
            tags.amenity === 'marketplace' ||
            (tags.shop === 'farm' && (tags.name || tags['shop:type']))
          );
        })
        .map((element: any) => {
          const tags = element.tags || {};
          
          // Get coordinates based on element type
          let coordinates: [number, number];
          if (element.type === 'node') {
            coordinates = [element.lon, element.lat];
          } else if (element.center) {
            coordinates = [element.center.lon, element.center.lat];
          } else {
            coordinates = [lng, lat]; // fallback
          }

          // Parse opening hours into schedule
          const schedule = parseOpeningHours(tags.opening_hours);

          return {
            id: `${element.type}_${element.id}`,
            name: tags.name || tags['shop:type'] || 'Farmer\'s Market',
            coordinates,
            description: tags.description || 
                        (tags.amenity === 'marketplace' ? 'Local farmer\'s market' : 'Farm shop'),
            address: [
              tags['addr:street'] && tags['addr:housenumber'] 
                ? `${tags['addr:housenumber']} ${tags['addr:street']}`
                : tags['addr:street'],
              tags['addr:city'],
              tags['addr:postcode']
            ].filter(Boolean).join(', ') || 'Address not available',
            schedule,
            website: tags.website || tags.url,
            phone: tags.phone,
            source: 'openstreetmap' as const
          };
        })
        .filter((market: FarmersMarket) => 
          market.coordinates[0] !== 0 && market.coordinates[1] !== 0
        );

      // Deduplicate markets
      const deduplicatedMarkets = deduplicateMarkets(processedMarkets);

      console.log(`🥕 Processed ${deduplicatedMarkets.length} farmer's markets (${processedMarkets.length - deduplicatedMarkets.length} duplicates removed)`);
      setFarmersMarkets(deduplicatedMarkets);

    } catch (err) {
      console.error('🥕 Error fetching farmer\'s markets:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch farmer\'s markets');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  // Fetch when bounds change and enabled
  useEffect(() => {
    if (!bounds || !enabled) return;

    const center = bounds.getCenter();
    fetchFarmersMarkets(center.lat, center.lng, 5000);
  }, [bounds, enabled, fetchFarmersMarkets]);

  return {
    farmersMarkets,
    loading,
    error,
    fetchFarmersMarkets
  };
};

// Deduplication function
const deduplicateMarkets = (markets: FarmersMarket[]): FarmersMarket[] => {
  const PROXIMITY_THRESHOLD = 0.001; // ~100 meters in decimal degrees
  const uniqueMarkets: FarmersMarket[] = [];
  const processedIds = new Set<string>();

  for (const market of markets) {
    if (processedIds.has(market.id)) continue;

    // Find nearby markets
    const nearbyMarkets = markets.filter(other => {
      if (other.id === market.id || processedIds.has(other.id)) return false;
      
      const distance = Math.sqrt(
        Math.pow(market.coordinates[0] - other.coordinates[0], 2) +
        Math.pow(market.coordinates[1] - other.coordinates[1], 2)
      );
      
      return distance < PROXIMITY_THRESHOLD;
    });

    if (nearbyMarkets.length === 0) {
      // No duplicates found
      uniqueMarkets.push(market);
      processedIds.add(market.id);
    } else {
      // Choose the best market from the group
      const allMarkets = [market, ...nearbyMarkets];
      const bestMarket = chooseBestMarket(allMarkets);
      
      uniqueMarkets.push(bestMarket);
      
      // Mark all markets in this group as processed
      allMarkets.forEach(m => processedIds.add(m.id));
    }
  }

  return uniqueMarkets;
};

// Choose the best market from a group of nearby markets
const chooseBestMarket = (markets: FarmersMarket[]): FarmersMarket => {
  const farmerMarketKeywords = ['farmer', 'market', 'marketplace', 'farmers'];
  
  // Score each market
  const scoredMarkets = markets.map(market => {
    let score = 0;
    const nameAndDesc = `${market.name} ${market.description}`.toLowerCase();
    
    // Bonus for containing farmer/market keywords
    const hasKeywords = farmerMarketKeywords.some(keyword => 
      nameAndDesc.includes(keyword)
    );
    if (hasKeywords) score += 10;
    
    // Bonus for having more complete information
    if (market.website) score += 2;
    if (market.phone) score += 2;
    if (market.schedule.length > 0) score += 3;
    if (market.address !== 'Address not available') score += 1;
    
    // Slight bonus for longer, more descriptive names
    score += Math.min(market.name.length / 10, 2);
    
    return { market, score };
  });
  
  // Sort by score (highest first) and return the best one
  scoredMarkets.sort((a, b) => b.score - a.score);
  
  console.log(`🥕 Choosing best market from ${markets.length} nearby markets:`, 
    scoredMarkets.map(s => `${s.market.name} (score: ${s.score})`));
  
  return scoredMarkets[0].market;
};

// Helper function to parse opening hours
const parseOpeningHours = (openingHours?: string) => {
  if (!openingHours) {
    return [{
      day: 'Saturday',
      time: '8:00 AM - 2:00 PM',
      frequency: 'weekly'
    }];
  }

  // Simple parsing for common formats
  const schedule = [];
  
  if (openingHours.toLowerCase().includes('sat')) {
    schedule.push({
      day: 'Saturday',
      time: extractTime(openingHours) || '8:00 AM - 2:00 PM',
      frequency: 'weekly'
    });
  }
  
  if (openingHours.toLowerCase().includes('sun')) {
    schedule.push({
      day: 'Sunday',
      time: extractTime(openingHours) || '9:00 AM - 1:00 PM',
      frequency: 'weekly'
    });
  }

  if (schedule.length === 0) {
    schedule.push({
      day: 'Saturday',
      time: extractTime(openingHours) || '8:00 AM - 2:00 PM',
      frequency: 'weekly'
    });
  }

  return schedule;
};

const extractTime = (openingHours: string): string | null => {
  // Try to extract time patterns like "08:00-14:00" or "8:00-14:00"
  const timeMatch = openingHours.match(/(\d{1,2}):?(\d{2})-(\d{1,2}):?(\d{2})/);
  if (timeMatch) {
    const startHour = parseInt(timeMatch[1]);
    const startMin = timeMatch[2] || '00';
    const endHour = parseInt(timeMatch[3]);
    const endMin = timeMatch[4] || '00';
    
    const formatTime = (hour: number, min: string) => {
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${displayHour}:${min} ${ampm}`;
    };
    
    return `${formatTime(startHour, startMin)} - ${formatTime(endHour, endMin)}`;
  }
  
  return null;
};
