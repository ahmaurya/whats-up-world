
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

console.log("Live transit function started")

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const agency = url.searchParams.get('agency')
    
    console.log(`Fetching live transit data for agency: ${agency}`)

    let apiUrl: string
    let agencyName: string

    switch (agency) {
      case 'kcm':
        apiUrl = 'https://s3.amazonaws.com/kcm-alerts-realtime-prod/vehiclepositions.pb'
        agencyName = 'King County Metro'
        break
      case 'st':
        apiUrl = 'https://www.soundtransit.org/GTFS-rt/VehiclePositions.pb'
        agencyName = 'Sound Transit'
        break
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid agency parameter' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
    }

    console.log(`Fetching from API: ${apiUrl}`)

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/x-protobuf',
        'User-Agent': 'Seattle-Transit-Map/1.0'
      }
    })

    console.log(`API response status: ${response.status}`)

    if (!response.ok) {
      throw new Error(`${agencyName} API error: ${response.status}`)
    }

    const data = await response.arrayBuffer()
    console.log(`Received ${data.byteLength} bytes from ${agencyName}`)

    return new Response(data, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/x-protobuf',
        'Cache-Control': 'public, max-age=30'
      }
    })

  } catch (error) {
    console.error('Error fetching live transit data:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch live transit data',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
