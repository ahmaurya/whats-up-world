
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

console.log("Live transit function started")

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body to get agency parameter
    let agency: string | null = null;
    
    try {
      const body = await req.json();
      agency = body.agency;
      console.log(`📡 Received request body:`, body);
    } catch (e) {
      console.log('📝 No valid JSON body, checking URL params...');
      const url = new URL(req.url);
      agency = url.searchParams.get('agency');
    }
    
    console.log(`🚌 Fetching live transit data for agency: ${agency}`);

    if (!agency) {
      console.error('❌ Missing agency parameter')
      return new Response(
        JSON.stringify({ error: 'Missing agency parameter. Use agency=kcm or agency=st in request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

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
        console.error(`❌ Invalid agency parameter: ${agency}`)
        return new Response(
          JSON.stringify({ error: `Invalid agency parameter: ${agency}. Use 'kcm' or 'st'` }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
    }

    console.log(`🔗 Fetching from ${agencyName} API: ${apiUrl}`)

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/x-protobuf',
        'User-Agent': 'Seattle-Transit-Map/1.0'
      }
    })

    console.log(`📊 ${agencyName} API response status: ${response.status}`)
    console.log(`📊 ${agencyName} API response headers:`, Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      console.error(`❌ ${agencyName} API error: ${response.status} ${response.statusText}`)
      const errorText = await response.text();
      console.error(`❌ Error response body: ${errorText}`);
      
      return new Response(
        JSON.stringify({ 
          error: `${agencyName} API error: ${response.status}`,
          details: errorText
        }),
        { 
          status: 502, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const data = await response.arrayBuffer()
    console.log(`✅ Successfully received ${data.byteLength} bytes from ${agencyName}`)

    return new Response(data, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/x-protobuf',
        'Cache-Control': 'public, max-age=30'
      }
    })

  } catch (error) {
    console.error('❌ Error in live transit function:', error)
    console.error('❌ Error stack:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch live transit data',
        details: error.message,
        type: error.constructor.name
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
