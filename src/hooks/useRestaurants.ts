
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
}

export const useRestaurants = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRestaurants = useCallback(async (lat: number, lng: number, radius = 5000) => {
    setLoading(true);
    setError(null);

    try {
      console.log(`Fetching restaurants from Yelp near ${lat}, ${lng}`);
      
      const { data, error: functionError } = await supabase.functions.invoke('get-yelp-restaurants', {
        body: { lat, lng, radius }
      });

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Process restaurants and add vegetarian classification
      const processedRestaurants = (data.restaurants || []).map((restaurant: Restaurant) => ({
        ...restaurant,
        isVegetarian: isVegetarianRestaurant(restaurant)
      }));

      setRestaurants(processedRestaurants);
      console.log(`Loaded ${processedRestaurants.length} restaurants from Yelp`);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch restaurants';
      console.error('Error fetching restaurants from Yelp:', errorMessage);
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

// Helper function to determine if a restaurant is vegetarian/vegan
const isVegetarianRestaurant = (restaurant: Restaurant): boolean => {
  const vegKeywords = [
    'vegan', 'vegetarian', 'plant-based', 'veggie', 'salad', 'juice',
    'smoothie', 'health', 'organic', 'green', 'natural', 'tofu', 'quinoa'
  ];
  
  const text = `${restaurant.name} ${restaurant.cuisine} ${restaurant.description}`.toLowerCase();
  return vegKeywords.some(keyword => text.includes(keyword));
};
