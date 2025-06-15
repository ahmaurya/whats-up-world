
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

console.log("🚀 Live transit function started")

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log("📥 Received request:", {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries())
    });

    // Parse request body to get agency parameter
    let agency: string | null = null;
    
    try {
      const bodyText = await req.text();
      console.log("📝 Raw request body:", bodyText);
      
      if (bodyText) {
        const body = JSON.parse(bodyText);
        agency = body.agency;
        console.log(`📡 Parsed request body:`, body);
      }
    } catch (parseError) {
      console.log('📝 Failed to parse JSON body, checking URL params...', parseError);
      const url = new URL(req.url);
      agency = url.searchParams.get('agency');
      console.log('🔗 Agency from URL params:', agency);
    }
    
    console.log(`🚌 Processing request for agency: ${agency}`);

    if (!agency) {
      console.error('❌ Missing agency parameter')
      return new Response(
        JSON.stringify({ 
          error: 'Missing agency parameter', 
          message: 'Use agency=kcm or agency=st in request body or URL params',
          timestamp: new Date().toISOString()
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    let apiUrl: string
    let agencyName: string

    switch (agency.toLowerCase()) {
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
          JSON.stringify({ 
            error: `Invalid agency parameter: ${agency}`, 
            message: `Use 'kcm' or 'st', received: '${agency}'`,
            validAgencies: ['kcm', 'st'],
            timestamp: new Date().toISOString()
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
    }

    console.log(`🔗 Fetching from ${agencyName} API: ${apiUrl}`)

    // Add timeout and better error handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/x-protobuf',
          'User-Agent': 'Seattle-Transit-Map/1.0'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log(`📊 ${agencyName} API response:`, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ ${agencyName} API error:`, {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        
        return new Response(
          JSON.stringify({ 
            success: false,
            error: `${agencyName} API error`,
            status: response.status,
            statusText: response.statusText,
            details: errorText,
            agency: agencyName,
            timestamp: new Date().toISOString()
          }),
          { 
            status: 200, // Return 200 to client so we can see the actual error
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const arrayBuffer = await response.arrayBuffer()
      console.log(`✅ Successfully received ${arrayBuffer.byteLength} bytes from ${agencyName}`)

      // Convert ArrayBuffer to base64 for JSON transmission
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64String = btoa(String.fromCharCode(...uint8Array));
      
      console.log(`📦 Converted to base64 string of length: ${base64String.length}`);

      const successResponse = {
        success: true,
        agency: agencyName,
        agencyCode: agency.toLowerCase(),
        dataSize: arrayBuffer.byteLength,
        data: base64String,
        timestamp: new Date().toISOString(),
        fetchedFrom: apiUrl
      };

      console.log(`🎉 Returning success response for ${agencyName}:`, {
        ...successResponse,
        data: `[base64 data of ${base64String.length} chars]` // Don't log the full data
      });

      return new Response(JSON.stringify(successResponse), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=30'
        }
      });

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error(`❌ ${agencyName} API timeout after 30 seconds`);
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Request timeout',
            message: `${agencyName} API request timed out after 30 seconds`,
            agency: agencyName,
            timestamp: new Date().toISOString()
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      throw fetchError; // Re-throw non-timeout errors
    }

  } catch (error) {
    console.error('❌ Unexpected error in live transit function:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch live transit data',
        details: error.message,
        type: error.constructor.name,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, // Return 200 so we can see the error in client
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
