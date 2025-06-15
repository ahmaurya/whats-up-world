
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Cafe {
  id: number;
  name: string;
  coordinates: [number, number];
  rating: number;
  reviews: number;
  description: string;
  website?: string;
  source?: 'google' | 'osm';
}

export const useCafes = () => {
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOSMCafes = async (
    lat: number,
    lng: number,
    radius: number
  ): Promise<Cafe[]> => {
    const boundingBox = {
      south: lat - (radius / 111000),
      north: lat + (radius / 111000),
      west: lng - (radius / (111000 * Math.cos(lat * Math.PI / 180))),
      east: lng + (radius / (111000 * Math.cos(lat * Math.PI / 180)))
    };

    const osmQuery = `
      node["amenity"="cafe"](${boundingBox.south},${boundingBox.west},${boundingBox.north},${boundingBox.east});
    `;

    const overpassQuery = `
      [out:json][timeout:25];
      (
        ${osmQuery}
      );
      out;
    `;

    try {
      console.log('☕ Querying OpenStreetMap for cafes...');
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: overpassQuery
      });

      if (!response.ok) {
        throw new Error(`OSM query failed: ${response.status}`);
      }

      const data = await response.json();
      console.log(`☕ OSM returned ${data.elements?.length || 0} cafe elements`);

      return (data.elements || [])
        .filter((element: any) => element.tags?.name)
        .map((element: any, index: number) => ({
          id: 60000 + index,
          name: element.tags.name,
          coordinates: [element.lon, element.lat],
          rating: 0,
          reviews: 0,
          description: element.tags.description || 'OpenStreetMap cafe',
          website: element.tags.website,
          source: 'osm' as const
        }));
    } catch (error) {
      console.error('☕ OSM cafe query failed:', error);
      return [];
    }
  };

  const fetchCafes = useCallback(async (
    lat: number, 
    lng: number, 
    radius = 5000
  ) => {
    setLoading(true);
    setError(null);

    try {
      console.log(`Fetching cafes near ${lat}, ${lng}`);
      
      const allCafes: Cafe[] = [];

      // Fetch from Google Places API
      console.log('☕ Fetching cafes from Google Places...');
      const { data: googleData, error: googleError } = await supabase.functions.invoke('get-google-cafes', {
        body: { lat, lng, radius }
      });

      if (googleError) {
        console.error('Error fetching cafes from Google:', googleError);
      } else if (googleData?.cafes) {
        const googleCafes = googleData.cafes.map((cafe: Cafe) => ({
          ...cafe,
          id: cafe.id + 30000,
          source: 'google' as const
        }));
        allCafes.push(...googleCafes);
        console.log(`☕ Found ${googleCafes.length} cafes from Google`);
      }

      // Fetch from OpenStreetMap
      const osmCafes = await fetchOSMCafes(lat, lng, radius);
      allCafes.push(...osmCafes);
      console.log(`☕ Found ${osmCafes.length} cafes from OpenStreetMap`);

      // Remove duplicates, prioritizing Google Places over OpenStreetMap
      const uniqueCafes = allCafes.reduce((acc: Cafe[], cafe) => {
        const existingIndex = acc.findIndex((c) => {
          const nameSimilar = c.name.toLowerCase() === cafe.name.toLowerCase();
          const locationSimilar = Math.abs(c.coordinates[0] - cafe.coordinates[0]) < 0.001 &&
                                Math.abs(c.coordinates[1] - cafe.coordinates[1]) < 0.001;
          return nameSimilar && locationSimilar;
        });

        if (existingIndex === -1) {
          acc.push(cafe);
        } else {
          const existing = acc[existingIndex];
          if (cafe.source === 'google' && existing.source === 'osm') {
            acc[existingIndex] = cafe;
            console.log(`🔄 Replaced OSM data with Google Places data for: ${cafe.name}`);
          }
        }

        return acc;
      }, []);

      const googleCount = uniqueCafes.filter(c => c.source === 'google').length;
      const osmCount = uniqueCafes.filter(c => c.source === 'osm').length;
      
      console.log(`📊 Total unique cafes: ${uniqueCafes.length}`);
      console.log(`   🔍 ${googleCount} from Google Places, ☕ ${osmCount} from OpenStreetMap`);

      setCafes(uniqueCafes);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch cafes';
      console.error('Error fetching cafes:', errorMessage);
      setError(errorMessage);
      setCafes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    cafes,
    loading,
    error,
    fetchCafes
  };
};
