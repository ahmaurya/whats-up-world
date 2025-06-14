
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
      console.log(`Fetching restaurants from Google Places near ${lat}, ${lng}`);
      
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

      // Debug logging for vegetarian classification
      const vegetarianCount = processedRestaurants.filter(r => r.isVegetarian).length;
      const nonVegetarianCount = processedRestaurants.filter(r => !r.isVegetarian).length;
      
      console.log(`🥬 Vegetarian restaurants found: ${vegetarianCount}`);
      console.log(`🍖 Non-vegetarian restaurants found: ${nonVegetarianCount}`);
      console.log(`📊 Total restaurants processed: ${processedRestaurants.length}`);
      
      // Log some examples of vegetarian restaurants if found
      const vegetarianExamples = processedRestaurants.filter(r => r.isVegetarian).slice(0, 3);
      if (vegetarianExamples.length > 0) {
        console.log('🥬 Vegetarian restaurant examples:', vegetarianExamples.map(r => `${r.name} (${r.cuisine})`));
      }
      
      // Log some examples of restaurants that might be misclassified
      processedRestaurants.forEach(restaurant => {
        const text = `${restaurant.name} ${restaurant.cuisine} ${restaurant.description}`.toLowerCase();
        const hasVegKeywords = ['vegan', 'vegetarian', 'plant-based', 'veggie', 'salad'].some(keyword => text.includes(keyword));
        if (hasVegKeywords) {
          console.log(`🔍 Restaurant with veg keywords: ${restaurant.name} (${restaurant.cuisine}) - Classified as: ${restaurant.isVegetarian ? 'Vegetarian' : 'Non-Vegetarian'}`);
        }
      });

      setRestaurants(processedRestaurants);
      console.log(`Loaded ${processedRestaurants.length} restaurants from Google Places`);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch restaurants';
      console.error('Error fetching restaurants from Google Places:', errorMessage);
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
  const isVeg = vegKeywords.some(keyword => text.includes(keyword));
  
  // Debug log for classification
  if (isVeg) {
    console.log(`🥬 Classified as vegetarian: ${restaurant.name} - matched keywords in: "${text}"`);
  }
  
  return isVeg;
};
