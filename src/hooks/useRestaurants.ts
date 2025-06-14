
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
}

export const useRestaurants = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      // Fetch vegetarian restaurants if toggle is on
      if (showVegetarian) {
        console.log('🥬 Fetching vegetarian restaurants...');
        const { data: vegData, error: vegError } = await supabase.functions.invoke('get-google-restaurants', {
          body: { lat, lng, radius, restaurantType: 'vegetarian' }
        });

        if (vegError) {
          console.error('Error fetching vegetarian restaurants:', vegError);
        } else if (vegData?.restaurants) {
          const vegRestaurants = vegData.restaurants.map((restaurant: Restaurant) => ({
            ...restaurant,
            isVegetarian: true,
            id: restaurant.id + 10000 // Offset IDs to avoid conflicts
          }));
          allRestaurants.push(...vegRestaurants);
          console.log(`🥬 Found ${vegRestaurants.length} vegetarian restaurants`);
        }
      }

      // Fetch non-vegetarian restaurants if toggle is on
      if (showNonVegetarian) {
        console.log('🍖 Fetching non-vegetarian restaurants...');
        const { data: nonVegData, error: nonVegError } = await supabase.functions.invoke('get-google-restaurants', {
          body: { lat, lng, radius, restaurantType: 'non-vegetarian' }
        });

        if (nonVegError) {
          console.error('Error fetching non-vegetarian restaurants:', nonVegError);
        } else if (nonVegData?.restaurants) {
          const nonVegRestaurants = nonVegData.restaurants.map((restaurant: Restaurant) => ({
            ...restaurant,
            isVegetarian: false,
            id: restaurant.id + 20000 // Offset IDs to avoid conflicts
          }));
          allRestaurants.push(...nonVegRestaurants);
          console.log(`🍖 Found ${nonVegRestaurants.length} non-vegetarian restaurants`);
        }
      }

      // Debug logging
      const vegetarianCount = allRestaurants.filter(r => r.isVegetarian).length;
      const nonVegetarianCount = allRestaurants.filter(r => !r.isVegetarian).length;
      
      console.log(`📊 Total restaurants: ${allRestaurants.length} (🥬 ${vegetarianCount} vegetarian, 🍖 ${nonVegetarianCount} non-vegetarian)`);

      setRestaurants(allRestaurants);
      
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
