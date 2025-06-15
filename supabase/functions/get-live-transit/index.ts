
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
          message: 'Use agency=kcm, agency=st, or agency=oba in request body or URL params',
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
    let agencyId: string

    // Use OneBusAway for all agencies since KCM direct API is no longer accessible
    switch (agency.toLowerCase()) {
      case 'kcm':
        // King County Metro via OneBusAway (agency ID 1)
        apiUrl = 'http://api.pugetsound.onebusaway.org/api/where/vehicles-for-agency/1.json?key=TEST'
        agencyName = 'King County Metro (via OneBusAway)'
        agencyId = '1'
        break
      case 'st':
        // Sound Transit via OneBusAway (agency ID 40) 
        apiUrl = 'http://api.pugetsound.onebusaway.org/api/where/vehicles-for-agency/40.json?key=TEST'
        agencyName = 'Sound Transit (via OneBusAway)'
        agencyId = '40'
        break
      case 'oba':
        // All agencies via OneBusAway
        apiUrl = 'http://api.pugetsound.onebusaway.org/api/where/vehicles-for-agency/40.json?key=TEST'
        agencyName = 'OneBusAway (Puget Sound)'
        agencyId = '40'
        break
      default:
        console.error(`❌ Invalid agency parameter: ${agency}`)
        return new Response(
          JSON.stringify({ 
            error: `Invalid agency parameter: ${agency}`, 
            message: `Use 'kcm', 'st', or 'oba', received: '${agency}'`,
            validAgencies: ['kcm', 'st', 'oba'],
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
      const headers: Record<string, string> = {
        'User-Agent': 'Seattle-Transit-Map/1.0',
        'Accept': 'application/json'
      };

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers,
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

      // Handle JSON response from OneBusAway
      const jsonData = await response.json();
      console.log(`✅ Successfully received OneBusAway JSON data:`, {
        code: jsonData.code,
        version: jsonData.version,
        vehicleCount: jsonData.data?.list?.length || 0
      });

      // Convert JSON to string for consistent handling
      const responseData = JSON.stringify(jsonData);
      const dataSize = responseData.length;
      
      console.log(`📦 Converted to response data of size: ${dataSize}`);

      const successResponse = {
        success: true,
        agency: agencyName,
        agencyCode: agency.toLowerCase(),
        agencyId: agencyId,
        dataSize: dataSize,
        data: responseData,
        apiType: 'onebusaway',
        timestamp: new Date().toISOString(),
        fetchedFrom: apiUrl
      };

      console.log(`🎉 Returning success response for ${agencyName}:`, {
        ...successResponse,
        data: `[onebusaway data of ${dataSize} chars]` // Don't log the full data
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
