
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { validateRequestParams, ValidationError } from "./validation.ts"
import { 
  GooglePlacesService, 
  getVegetarianQueries, 
  getNonVegetarianQueries 
} from "./googlePlacesService.ts"
import { 
  removeDuplicatePlaces,
  transformPlacesToRestaurants,
  filterVegetarianFromNonVeg,
  type TransformedRestaurant
} from "./restaurantTransformer.ts"

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
    const requestBody = await req.json();
    const { lat, lng, radius, restaurantType } = validateRequestParams(requestBody);
    
    console.log(`Fetching ${restaurantType} restaurants from Google Places near ${lat}, ${lng} with radius ${radius}m`);

    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    const googlePlacesService = new GooglePlacesService(apiKey!);

    let allRestaurants: any[] = [];

    if (restaurantType === 'vegetarian') {
      const vegetarianQueries = getVegetarianQueries();
      console.log(`🥬 Performing ${vegetarianQueries.length} vegetarian searches...`);
      
      allRestaurants = await googlePlacesService.searchMultipleQueries(
        vegetarianQueries,
        lat,
        lng,
        radius
      );

    } else if (restaurantType === 'non-vegetarian') {
      const nonVegQueries = getNonVegetarianQueries();
      console.log(`🍖 Performing ${nonVegQueries.length} non-vegetarian searches...`);
      
      allRestaurants = await googlePlacesService.searchMultipleQueries(
        nonVegQueries,
        lat,
        lng,
        radius
      );
    }

    // Remove duplicates based on place ID
    const uniqueRestaurants = removeDuplicatePlaces(allRestaurants);
    console.log(`🔄 After deduplication: ${uniqueRestaurants.length} unique places`);

    // Transform places to our restaurant format
    let restaurants: TransformedRestaurant[] = transformPlacesToRestaurants(
      uniqueRestaurants,
      restaurantType
    );

    // Filter out vegetarian restaurants from non-vegetarian results
    if (restaurantType === 'non-vegetarian') {
      restaurants = filterVegetarianFromNonVeg(restaurants);
    }

    console.log(`✅ Final result: ${restaurants.length} ${restaurantType} restaurants`);

    return new Response(
      JSON.stringify({ restaurants }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300'
        } 
      }
    );

  } catch (error) {
    console.error('Error in get-google-restaurants function:', error);
    
    if (error instanceof ValidationError) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: error.statusCode, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

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
