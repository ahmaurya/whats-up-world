
import { supabase } from '@/integrations/supabase/client';

export interface MediaLink {
  type: 'youtube';
  url: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  videoId?: string;
}

export const searchHistoricPlaceMedia = async (placeName: string, cityName?: string): Promise<MediaLink[]> => {
  try {
    console.log(`Searching for media for: ${placeName}${cityName ? ` in ${cityName}` : ''}`);
    
    // Call the secure Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('search-youtube-videos', {
      body: {
        placeName,
        cityName
      }
    });

    if (error) {
      console.error('Error calling search-youtube-videos function:', error);
      // Fallback to search URL if API fails
      return getFallbackSearchLinks(placeName, cityName);
    }

    if (data?.mediaLinks && data.mediaLinks.length > 0) {
      console.log(`Found ${data.mediaLinks.length} YouTube videos via API`);
      return data.mediaLinks;
    }

    // Fallback if no results from API
    console.log('No results from YouTube API, using fallback search');
    return getFallbackSearchLinks(placeName, cityName);
    
  } catch (error) {
    console.error('Error searching for historic place media:', error);
    return getFallbackSearchLinks(placeName, cityName);
  }
};

// Fallback function that creates search URLs when API is unavailable
const getFallbackSearchLinks = (placeName: string, cityName?: string): MediaLink[] => {
  const cleanName = placeName.replace(/historic|building|site|place/gi, '').trim();
  const cityPart = cityName ? ` ${cityName}` : '';
  const searchQuery = `${cleanName}${cityPart} history historical significance documentary`;
  const encodedQuery = encodeURIComponent(searchQuery);
  
  return [{
    type: 'youtube',
    url: `https://www.youtube.com/results?search_query=${encodedQuery}`,
    title: `Search for "${cleanName}${cityPart}" historical videos`,
    description: 'Click to search for historical documentaries and educational content on YouTube'
  }];
};
