
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PlaceResult {
  place_id: string;
  name: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    }
  };
  rating?: number;
  user_ratings_total?: number;
  types: string[];
  vicinity?: string;
  price_level?: number;
}

interface GooglePlacesResponse {
  results: PlaceResult[];
  status: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lng, radius = 5000 } = await req.json();
    
    if (!lat || !lng) {
      return new Response(
        JSON.stringify({ error: 'Latitude and longitude are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      console.error('Google Places API key not found');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Use Google Places Nearby Search API
    const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=restaurant&key=${apiKey}`;
    
    console.log('Fetching restaurants from Google Places API...');
    const response = await fetch(placesUrl);
    const data: GooglePlacesResponse = await response.json();

    if (data.status !== 'OK') {
      console.error('Google Places API error:', data.status);
      return new Response(
        JSON.stringify({ error: `Google Places API error: ${data.status}` }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Transform Google Places data to match our restaurant format
    const restaurants = data.results.map((place, index) => ({
      id: index + 1,
      name: place.name,
      coordinates: [place.geometry.location.lng, place.geometry.location.lat] as [number, number],
      rating: place.rating || 0,
      reviews: place.user_ratings_total || 0,
      cuisine: place.types.find(type => 
        ['restaurant', 'food', 'meal_takeaway', 'meal_delivery'].includes(type)
      ) || 'Restaurant',
      description: place.vicinity || 'Restaurant location'
    }));

    console.log(`Found ${restaurants.length} restaurants`);

    return new Response(
      JSON.stringify({ restaurants }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error fetching restaurants:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
