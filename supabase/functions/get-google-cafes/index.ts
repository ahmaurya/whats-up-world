
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { GooglePlacesService, getCafeQueries } from './googlePlacesService.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  lat: number;
  lng: number;
  radius?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY')
    if (!apiKey) {
      console.error('GOOGLE_PLACES_API_KEY not found in environment variables')
      return new Response(
        JSON.stringify({ error: 'Google Places API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { lat, lng, radius = 5000 }: RequestBody = await req.json()
    
    console.log(`Searching for cafes near ${lat}, ${lng} within ${radius}m`)

    const placesService = new GooglePlacesService(apiKey)
    const queries = getCafeQueries()
    
    const allPlaces = await placesService.searchMultipleQueries(queries, lat, lng, radius)
    
    // Remove duplicates and transform to our cafe format
    const uniquePlaces = new Map()
    
    allPlaces.forEach(place => {
      const key = `${place.displayName?.text || place.name}_${place.location?.latitude}_${place.location?.longitude}`
      if (!uniquePlaces.has(key)) {
        uniquePlaces.set(key, place)
      }
    })

    const cafes = Array.from(uniquePlaces.values()).map((place, index) => ({
      id: index + 1,
      name: place.displayName?.text || place.name || 'Unknown Cafe',
      coordinates: [place.location?.longitude || 0, place.location?.latitude || 0],
      rating: place.rating || 0,
      reviews: place.userRatingCount || 0,
      description: place.formattedAddress || 'Cafe',
      website: place.websiteUri
    }))

    console.log(`Returning ${cafes.length} unique cafes`)

    return new Response(
      JSON.stringify({ cafes }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in get-google-cafes function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
