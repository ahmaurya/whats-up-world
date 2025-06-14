
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Input validation utilities
const validateCoordinates = (lat: number, lng: number): void => {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    throw new Error('Coordinates must be numbers');
  }
  if (lat < -90 || lat > 90) {
    throw new Error('Latitude must be between -90 and 90');
  }
  if (lng < -180 || lng > 180) {
    throw new Error('Longitude must be between -180 and 180');
  }
};

const validateRadius = (radius: number): void => {
  if (typeof radius !== 'number') {
    throw new Error('Radius must be a number');
  }
  if (radius < 100 || radius > 50000) {
    throw new Error('Radius must be between 100 and 50000 meters');
  }
};

// Rate limiting store (in-memory for demo, use Redis in production)
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 100; // requests per hour
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

const checkRateLimit = (clientId: string): boolean => {
  const now = Date.now();
  const clientData = requestCounts.get(clientId);
  
  if (!clientData || now > clientData.resetTime) {
    requestCounts.set(clientId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (clientData.count >= RATE_LIMIT) {
    return false;
  }
  
  clientData.count++;
  return true;
};

serve(async (req) => {
  // Set security headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Security-Policy': "default-src 'self'",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const clientId = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(clientId)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse and validate request body
    let body;
    try {
      const text = await req.text();
      if (text.length > 1024) { // Limit request size
        throw new Error('Request body too large');
      }
      body = JSON.parse(text);
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { lat, lng, radius = 5000 } = body;

    // Validate input parameters
    validateCoordinates(lat, lng);
    validateRadius(radius);

    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      console.error('Google Places API key not configured');
      return new Response(
        JSON.stringify({ error: 'Service configuration error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Fetching restaurants from Google Places near ${lat}, ${lng} with radius ${radius}m`);

    // Create secure API request to Google Places
    const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
    url.searchParams.set('location', `${lat},${lng}`);
    url.searchParams.set('radius', Math.min(radius, 50000).toString()); // Google Places max radius is 50km
    url.searchParams.set('type', 'restaurant');
    url.searchParams.set('key', apiKey);

    // Make API request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Maps App/1.0'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`Google Places API error: ${response.status}`);
      return new Response(
        JSON.stringify({ error: 'External service error' }),
        { 
          status: 502, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', data.status, data.error_message);
      return new Response(
        JSON.stringify({ error: 'External service error' }),
        { 
          status: 502, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Sanitize and transform response data
    const restaurants = (data.results || []).map((place: any, index: number) => ({
      id: index + 1,
      name: String(place.name || 'Unknown Restaurant').slice(0, 100),
      coordinates: [
        Number(place.geometry?.location?.lng || 0),
        Number(place.geometry?.location?.lat || 0)
      ] as [number, number],
      rating: Number(place.rating || 0),
      reviews: Number(place.user_ratings_total || 0),
      cuisine: String((place.types?.find((type: string) => 
        !['establishment', 'point_of_interest', 'food', 'restaurant'].includes(type)
      ) || 'restaurant')).replace(/_/g, ' ').slice(0, 50),
      description: String(place.vicinity || 'No description available').slice(0, 200)
    }));

    console.log(`Found ${restaurants.length} restaurants from Google Places`);

    return new Response(
      JSON.stringify({ restaurants }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in get-yelp-restaurants function:', error);
    
    // Don't expose internal error details
    const isValidationError = error instanceof Error && error.message.includes('must be');
    const errorMessage = isValidationError ? error.message : 'Internal server error';
    const statusCode = isValidationError ? 400 : 500;

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: statusCode, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
