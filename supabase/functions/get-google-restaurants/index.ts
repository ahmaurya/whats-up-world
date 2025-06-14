
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

    // Determine search query based on restaurant type
    let query = '';
    if (restaurantType === 'vegetarian') {
      query = 'vegetarian restaurant OR vegan restaurant OR plant-based restaurant';
    } else if (restaurantType === 'non-vegetarian') {
      query = 'restaurant';
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid restaurant type. Must be "vegetarian" or "non-vegetarian"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add rate limiting delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Make request to Google Places API with increased maxResults
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
      maxResultCount: 50, // Increased from default 20 to 50
      includedType: "restaurant"
    };

    console.log(`Making Google Places API request with query: "${query}" and maxResultCount: 50`);

    const response = await fetch(placesUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.rating,places.userRatingCount,places.primaryType,places.formattedAddress'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google Places API error: ${response.status} - ${errorText}`);
      throw new Error(`Google Places API error: ${response.status}`);
    }

    const data = await response.json();
    const places = data.places || [];

    // Transform places to our restaurant format
    let restaurants = places.map((place: any, index: number) => ({
      id: index + 1,
      name: place.displayName?.text || 'Unknown Restaurant',
      coordinates: [place.location?.longitude || 0, place.location?.latitude || 0],
      rating: place.rating || 0,
      reviews: place.userRatingCount || 0,
      cuisine: place.primaryType || 'restaurant',
      description: place.formattedAddress || '',
      restaurantType: restaurantType
    }));

    // For non-vegetarian requests, filter out vegetarian restaurants based on keywords
    if (restaurantType === 'non-vegetarian') {
      const vegetarianKeywords = [
        'vegetarian', 'vegan', 'plant-based', 'veggie', 'herbivore',
        'plant based', 'raw food', 'green cuisine', 'salad bar'
      ];
      
      restaurants = restaurants.filter((restaurant: any) => {
        const name = restaurant.name.toLowerCase();
        const description = restaurant.description.toLowerCase();
        const hasVegKeyword = vegetarianKeywords.some(keyword => 
          name.includes(keyword) || description.includes(keyword)
        );
        return !hasVegKeyword;
      });
    }

    console.log(`Found ${restaurants.length} ${restaurantType} restaurants from Google Places`);

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
