
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
    const cleanName = placeName
      .replace(/historic|building|site|place/gi, '')
      .trim();
    
    const mediaLinks: MediaLink[] = [];
    
    // Search for YouTube content using YouTube API with city name
    const youtubeResults = await searchYouTube(cleanName, cityName);
    mediaLinks.push(...youtubeResults);
    
    return mediaLinks;
  } catch (error) {
    console.error('Error searching for historic place media:', error);
    return [];
  }
};

const searchYouTube = async (placeName: string, cityName?: string): Promise<MediaLink[]> => {
  try {
    // Include city name in search query for better results
    const cityPart = cityName ? ` ${cityName}` : '';
    const searchQuery = `${placeName}${cityPart} history historical significance documentary`;
    const encodedQuery = encodeURIComponent(searchQuery);
    
    // This is a placeholder implementation
    // To use the actual YouTube API, you would need:
    // 1. YouTube Data API v3 key
    // 2. Make a request to: https://www.googleapis.com/youtube/v3/search
    
    // For demonstration, return a search link that will show relevant videos
    return [{
      type: 'youtube',
      url: `https://www.youtube.com/results?search_query=${encodedQuery}`,
      title: `Watch "${placeName}${cityPart}" historical videos`,
      description: 'Historical documentaries and educational content'
    }];
  } catch (error) {
    console.error('Error searching YouTube:', error);
    return [];
  }
};

// Function to get YouTube API integration (placeholder for actual API implementation)
export const getYouTubeVideos = async (placeName: string, cityName?: string, apiKey?: string): Promise<MediaLink[]> => {
  if (!apiKey) {
    console.log('YouTube API key not provided, using fallback search');
    return searchYouTube(placeName, cityName);
  }

  try {
    const cityPart = cityName ? ` ${cityName}` : '';
    const searchQuery = `${placeName}${cityPart} history historical significance`;
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=2&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error('YouTube API request failed');
    }

    const data = await response.json();
    
    return data.items?.map((item: any) => ({
      type: 'youtube' as const,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      title: item.snippet.title,
      description: item.snippet.description?.substring(0, 100) + '...',
      thumbnailUrl: item.snippet.thumbnails?.medium?.url,
      videoId: item.id.videoId
    })) || [];
  } catch (error) {
    console.error('Error fetching from YouTube API:', error);
    return searchYouTube(placeName, cityName);
  }
};
