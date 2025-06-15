
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface YouTubeSearchRequest {
  placeName: string;
  cityName?: string;
}

interface YouTubeVideoItem {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      medium?: {
        url: string;
      };
    };
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY');
    
    if (!youtubeApiKey) {
      console.error('YouTube API key not found in environment variables');
      return new Response(
        JSON.stringify({ error: 'YouTube API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { placeName, cityName }: YouTubeSearchRequest = await req.json();
    
    if (!placeName) {
      return new Response(
        JSON.stringify({ error: 'Place name is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Clean the place name and create search query
    const cleanName = placeName.replace(/historic|building|site|place/gi, '').trim();
    const cityPart = cityName ? ` ${cityName}` : '';
    const searchQuery = `${cleanName}${cityPart} history historical significance documentary`;
    
    console.log(`Searching YouTube for: "${searchQuery}"`);

    // Make request to YouTube Data API v3
    const youtubeUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=2&key=${youtubeApiKey}`;
    
    const response = await fetch(youtubeUrl);
    
    if (!response.ok) {
      console.error(`YouTube API error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('YouTube API error details:', errorText);
      
      return new Response(
        JSON.stringify({ error: 'Failed to fetch from YouTube API' }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const data = await response.json();
    console.log(`Found ${data.items?.length || 0} YouTube videos`);

    // Transform YouTube API response to our MediaLink format
    const mediaLinks = data.items?.map((item: YouTubeVideoItem) => ({
      type: 'youtube' as const,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      title: item.snippet.title,
      description: item.snippet.description?.substring(0, 100) + '...',
      thumbnailUrl: item.snippet.thumbnails?.medium?.url,
      videoId: item.id.videoId
    })) || [];

    return new Response(
      JSON.stringify({ mediaLinks }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in search-youtube-videos function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
