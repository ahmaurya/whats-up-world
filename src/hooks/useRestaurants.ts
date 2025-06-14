
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
}

export const useRestaurants = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRestaurants = useCallback(async (lat: number, lng: number, radius = 5000) => {
    setLoading(true);
    setError(null);

    try {
      console.log(`Fetching restaurants near ${lat}, ${lng}`);
      
      const { data, error: functionError } = await supabase.functions.invoke('get-restaurants', {
        body: { lat, lng, radius }
      });

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setRestaurants(data.restaurants || []);
      console.log(`Loaded ${data.restaurants?.length || 0} restaurants`);
      
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
