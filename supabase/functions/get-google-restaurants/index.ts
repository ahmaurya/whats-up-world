
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lng, radius, restaurantType } = await req.json();
    
    console.log(`Fetching ${restaurantType} restaurants from Google Places near ${lat}, ${lng} with radius ${radius}m`);

    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      throw new Error('Google Places API key not configured');
    }

    // Input validation
    if (!lat || !lng || !radius || !restaurantType) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: lat, lng, radius, restaurantType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return new Response(
        JSON.stringify({ error: 'Invalid coordinates' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (radius < 1 || radius > 50000) {
      return new Response(
        JSON.stringify({ error: 'Radius must be between 1 and 50000 meters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let allRestaurants: any[] = [];

    if (restaurantType === 'vegetarian') {
      // Multiple comprehensive searches for vegetarian restaurants
      const vegetarianQueries = [
        'vegetarian restaurant',
        'vegan restaurant', 
        'plant based restaurant',
        'organic restaurant',
        'healthy restaurant vegetarian',
        'salad restaurant',
        'juice bar restaurant',
        'raw food restaurant',
        'macrobiotic restaurant',
        'farm to table vegetarian'
      ];

      console.log(`🥬 Performing ${vegetarianQueries.length} comprehensive vegetarian searches...`);

      for (let i = 0; i < vegetarianQueries.length; i++) {
        const query = vegetarianQueries[i];
        
        try {
          console.log(`Search ${i + 1}/${vegetarianQueries.length}: "${query}"`);
          
          const placesUrl = `https://places.googleapis.com/v1/places:searchText`;
          const requestBody = {
            textQuery: query,
            locationBias: {
              circle: {
                center: {
                  latitude: lat,
                  longitude: lng
                },
                radius: radius
              }
            },
            maxResultCount: 50,
            includedType: "restaurant"
          };

          const response = await fetch(placesUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.rating,places.userRatingCount,places.primaryType,places.formattedAddress,places.types'
            },
            body: JSON.stringify(requestBody)
          });

          if (!response.ok) {
            console.error(`Search "${query}" failed: ${response.status}`);
            continue;
          }

          const data = await response.json();
          const places = data.places || [];
          
          console.log(`Found ${places.length} places for "${query}"`);
          allRestaurants.push(...places);

          // Rate limiting delay between requests
          if (i < vegetarianQueries.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }

        } catch (error) {
          console.error(`Error in search "${query}":`, error);
          continue;
        }
      }

    } else if (restaurantType === 'non-vegetarian') {
      // Enhanced non-vegetarian search
      const nonVegQueries = [
        'restaurant',
        'steakhouse',
        'seafood restaurant',
        'burger restaurant',
        'bbq restaurant',
        'grill restaurant'
      ];

      console.log(`🍖 Performing ${nonVegQueries.length} non-vegetarian searches...`);

      for (let i = 0; i < nonVegQueries.length; i++) {
        const query = nonVegQueries[i];
        
        try {
          console.log(`Search ${i + 1}/${nonVegQueries.length}: "${query}"`);
          
          const placesUrl = `https://places.googleapis.com/v1/places:searchText`;
          const requestBody = {
            textQuery: query,
            locationBias: {
              circle: {
                center: {
                  latitude: lat,
                  longitude: lng
                },
                radius: radius
              }
            },
            maxResultCount: 50,
            includedType: "restaurant"
          };

          const response = await fetch(placesUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.rating,places.userRatingCount,places.primaryType,places.formattedAddress,places.types'
            },
            body: JSON.stringify(requestBody)
          });

          if (!response.ok) {
            console.error(`Search "${query}" failed: ${response.status}`);
            continue;
          }

          const data = await response.json();
          const places = data.places || [];
          
          console.log(`Found ${places.length} places for "${query}"`);
          allRestaurants.push(...places);

          // Rate limiting delay between requests
          if (i < nonVegQueries.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }

        } catch (error) {
          console.error(`Error in search "${query}":`, error);
          continue;
        }
      }
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid restaurant type. Must be "vegetarian" or "non-vegetarian"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Remove duplicates based on place ID
    const uniqueRestaurants = allRestaurants.filter((place, index, self) => 
      index === self.findIndex(p => p.id === place.id)
    );

    console.log(`🔄 After deduplication: ${uniqueRestaurants.length} unique places`);

    // Transform places to our restaurant format
    let restaurants = uniqueRestaurants.map((place: any, index: number) => ({
      id: index + 1,
      name: place.displayName?.text || 'Unknown Restaurant',
      coordinates: [place.location?.longitude || 0, place.location?.latitude || 0],
      rating: place.rating || 0,
      reviews: place.userRatingCount || 0,
      cuisine: place.primaryType || 'restaurant',
      description: place.formattedAddress || '',
      restaurantType: restaurantType,
      types: place.types || []
    }));

    // For non-vegetarian requests, filter out vegetarian restaurants based on keywords and types
    if (restaurantType === 'non-vegetarian') {
      const vegetarianKeywords = [
        'vegetarian', 'vegan', 'plant-based', 'veggie', 'herbivore',
        'plant based', 'raw food', 'green cuisine', 'salad bar', 'juice bar'
      ];
      
      const vegetarianTypes = [
        'vegetarian_restaurant', 'vegan_restaurant', 'health_food_restaurant'
      ];
      
      restaurants = restaurants.filter((restaurant: any) => {
        const name = restaurant.name.toLowerCase();
        const description = restaurant.description.toLowerCase();
        const types = restaurant.types || [];
        
        const hasVegKeyword = vegetarianKeywords.some(keyword => 
          name.includes(keyword) || description.includes(keyword)
        );
        
        const hasVegType = types.some((type: string) => 
          vegetarianTypes.some(vegType => type.includes(vegType))
        );
        
        return !hasVegKeyword && !hasVegType;
      });
    }

    // For vegetarian requests, enhance filtering to ensure relevance
    if (restaurantType === 'vegetarian') {
      const vegetarianKeywords = [
        'vegetarian', 'vegan', 'plant-based', 'veggie', 'organic',
        'healthy', 'salad', 'juice', 'raw', 'farm to table', 'natural'
      ];
      
      // Prioritize restaurants that explicitly mention vegetarian terms
      restaurants = restaurants.map((restaurant: any) => {
        const name = restaurant.name.toLowerCase();
        const description = restaurant.description.toLowerCase();
        const types = restaurant.types || [];
        
        const hasVegKeyword = vegetarianKeywords.some(keyword => 
          name.includes(keyword) || description.includes(keyword)
        );
        
        const hasVegType = types.some((type: string) => 
          type.includes('vegetarian') || type.includes('vegan') || type.includes('health')
        );
        
        return {
          ...restaurant,
          relevanceScore: (hasVegKeyword ? 2 : 0) + (hasVegType ? 1 : 0)
        };
      }).sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    console.log(`✅ Final result: ${restaurants.length} ${restaurantType} restaurants`);

    return new Response(
      JSON.stringify({ restaurants }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
        } 
      }
    );

  } catch (error) {
    console.error('Error in get-google-restaurants function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch restaurants',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
