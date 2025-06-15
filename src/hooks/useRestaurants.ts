
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Restaurant {
  id: number;
  name: string;
  coordinates: [number, number];
  rating: number;
  reviews: number;
  cuisine: string;
  description: string;
  isVegetarian?: boolean;
  website?: string;
  source?: 'google' | 'osm';
}

export const useRestaurants = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOSMRestaurants = async (
    lat: number,
    lng: number,
    radius: number,
    showVegetarian: boolean,
    showNonVegetarian: boolean
  ): Promise<Restaurant[]> => {
    const boundingBox = {
      south: lat - (radius / 111000), // Approximate conversion from meters to degrees
      north: lat + (radius / 111000),
      west: lng - (radius / (111000 * Math.cos(lat * Math.PI / 180))),
      east: lng + (radius / (111000 * Math.cos(lat * Math.PI / 180)))
    };

    let osmQuery = '';
    
    if (showVegetarian) {
      osmQuery += `
        node["amenity"="restaurant"]["diet:vegetarian"="yes"](${boundingBox.south},${boundingBox.west},${boundingBox.north},${boundingBox.east});
        node["amenity"="restaurant"]["diet:vegan"="yes"](${boundingBox.south},${boundingBox.west},${boundingBox.north},${boundingBox.east});
        node["amenity"="restaurant"]["cuisine"~"vegetarian|vegan"](${boundingBox.south},${boundingBox.west},${boundingBox.north},${boundingBox.east});
      `;
    }
    
    if (showNonVegetarian) {
      osmQuery += `
        node["amenity"="restaurant"]["diet:vegetarian"!="yes"]["diet:vegan"!="yes"]["cuisine"!~"vegetarian|vegan"](${boundingBox.south},${boundingBox.west},${boundingBox.north},${boundingBox.east});
        node["amenity"="fast_food"]["diet:vegetarian"!="yes"]["diet:vegan"!="yes"](${boundingBox.south},${boundingBox.west},${boundingBox.north},${boundingBox.east});
      `;
    }

    const overpassQuery = `
      [out:json][timeout:25];
      (
        ${osmQuery}
      );
      out;
    `;

    try {
      console.log('🗺️ Querying OpenStreetMap for restaurants...');
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: overpassQuery
      });

      if (!response.ok) {
        throw new Error(`OSM query failed: ${response.status}`);
      }

      const data = await response.json();
      console.log(`🗺️ OSM returned ${data.elements?.length || 0} restaurant elements`);

      return (data.elements || [])
        .filter((element: any) => element.tags?.name)
        .map((element: any, index: number) => {
          const isVeg = element.tags?.['diet:vegetarian'] === 'yes' || 
                      element.tags?.['diet:vegan'] === 'yes' || 
                      element.tags?.cuisine?.includes('vegetarian') || 
                      element.tags?.cuisine?.includes('vegan');

          return {
            id: 50000 + index, // Offset to avoid conflicts with Google Places
            name: element.tags.name,
            coordinates: [element.lon, element.lat],
            rating: 0, // OSM doesn't provide ratings
            reviews: 0,
            cuisine: element.tags.cuisine || 'Restaurant',
            description: element.tags.description || 'OpenStreetMap restaurant',
            isVegetarian: isVeg,
            website: element.tags.website,
            source: 'osm' as const
          };
        });
    } catch (error) {
      console.error('🗺️ OSM restaurant query failed:', error);
      return [];
    }
  };

  const fetchRestaurants = useCallback(async (
    lat: number, 
    lng: number, 
    radius = 5000,
    showVegetarian = true,
    showNonVegetarian = true
  ) => {
    setLoading(true);
    setError(null);

    try {
      console.log(`Fetching restaurants near ${lat}, ${lng} - Vegetarian: ${showVegetarian}, Non-Vegetarian: ${showNonVegetarian}`);
      
      const allRestaurants: Restaurant[] = [];

      // Fetch from Google Places API
      if (showVegetarian) {
        console.log('🥬 Fetching vegetarian restaurants from Google Places...');
        const { data: vegData, error: vegError } = await supabase.functions.invoke('get-google-restaurants', {
          body: { lat, lng, radius, restaurantType: 'vegetarian' }
        });

        if (vegError) {
          console.error('Error fetching vegetarian restaurants:', vegError);
        } else if (vegData?.restaurants) {
          const vegRestaurants = vegData.restaurants.map((restaurant: Restaurant) => ({
            ...restaurant,
            isVegetarian: true,
            id: restaurant.id + 10000, // Offset IDs to avoid conflicts
            source: 'google' as const
          }));
          allRestaurants.push(...vegRestaurants);
          console.log(`🥬 Found ${vegRestaurants.length} vegetarian restaurants from Google`);
        }
      }

      if (showNonVegetarian) {
        console.log('🍖 Fetching non-vegetarian restaurants from Google Places...');
        const { data: nonVegData, error: nonVegError } = await supabase.functions.invoke('get-google-restaurants', {
          body: { lat, lng, radius, restaurantType: 'non-vegetarian' }
        });

        if (nonVegError) {
          console.error('Error fetching non-vegetarian restaurants:', nonVegError);
        } else if (nonVegData?.restaurants) {
          const nonVegRestaurants = nonVegData.restaurants.map((restaurant: Restaurant) => ({
            ...restaurant,
            isVegetarian: false,
            id: restaurant.id + 20000, // Offset IDs to avoid conflicts
            source: 'google' as const
          }));
          allRestaurants.push(...nonVegRestaurants);
          console.log(`🍖 Found ${nonVegRestaurants.length} non-vegetarian restaurants from Google`);
        }
      }

      // Fetch from OpenStreetMap
      const osmRestaurants = await fetchOSMRestaurants(lat, lng, radius, showVegetarian, showNonVegetarian);
      allRestaurants.push(...osmRestaurants);
      console.log(`🗺️ Found ${osmRestaurants.length} restaurants from OpenStreetMap`);

      // Remove duplicates based on name and approximate location
      const uniqueRestaurants = allRestaurants.filter((restaurant, index, self) => {
        return index === self.findIndex((r) => {
          const nameSimilar = r.name.toLowerCase() === restaurant.name.toLowerCase();
          const locationSimilar = Math.abs(r.coordinates[0] - restaurant.coordinates[0]) < 0.001 &&
                                Math.abs(r.coordinates[1] - restaurant.coordinates[1]) < 0.001;
          return nameSimilar && locationSimilar;
        });
      });

      // Debug logging
      const vegetarianCount = uniqueRestaurants.filter(r => r.isVegetarian).length;
      const nonVegetarianCount = uniqueRestaurants.filter(r => !r.isVegetarian).length;
      const googleCount = uniqueRestaurants.filter(r => r.source === 'google').length;
      const osmCount = uniqueRestaurants.filter(r => r.source === 'osm').length;
      
      console.log(`📊 Total unique restaurants: ${uniqueRestaurants.length}`);
      console.log(`   🥬 ${vegetarianCount} vegetarian, 🍖 ${nonVegetarianCount} non-vegetarian`);
      console.log(`   🔍 ${googleCount} from Google Places, 🗺️ ${osmCount} from OpenStreetMap`);

      setRestaurants(uniqueRestaurants);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch restaurants';
      console.error('Error fetching restaurants:', errorMessage);
      setError(errorMessage);
      setRestaurants([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    restaurants,
    loading,
    error,
    fetchRestaurants
  };
};
