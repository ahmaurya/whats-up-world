
export interface MediaLink {
  type: 'youtube' | 'instagram';
  url: string;
  title: string;
}

export const searchHistoricPlaceMedia = async (placeName: string): Promise<MediaLink | null> => {
  try {
    // Clean up the place name for better search results
    const cleanName = placeName
      .replace(/historic|building|site|place/gi, '')
      .trim();
    
    // First try to find a YouTube video
    const youtubeResult = await searchYouTube(cleanName);
    if (youtubeResult) {
      return youtubeResult;
    }
    
    // If no YouTube video found, try Instagram
    const instagramResult = await searchInstagram(cleanName);
    if (instagramResult) {
      return instagramResult;
    }
    
    return null;
  } catch (error) {
    console.error('Error searching for historic place media:', error);
    return null;
  }
};

const searchYouTube = async (placeName: string): Promise<MediaLink | null> => {
  try {
    // Create a search query that's more likely to find historical content
    const searchQuery = `${placeName} history historical significance`;
    const encodedQuery = encodeURIComponent(searchQuery);
    
    // Use YouTube's search URL format that works without API key
    // This creates a search link that users can click to find videos
    const searchUrl = `https://www.youtube.com/results?search_query=${encodedQuery}`;
    
    return {
      type: 'youtube',
      url: searchUrl,
      title: `Search YouTube for "${placeName}" history`
    };
  } catch (error) {
    console.error('Error searching YouTube:', error);
    return null;
  }
};

const searchInstagram = async (placeName: string): Promise<MediaLink | null> => {
  try {
    // Create a hashtag-based search for Instagram
    const hashtag = placeName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '')
      .substring(0, 30); // Instagram hashtag length limit
    
    const searchUrl = `https://www.instagram.com/explore/tags/${hashtag}/`;
    
    return {
      type: 'instagram',
      url: searchUrl,
      title: `Search Instagram for #${hashtag}`
    };
  } catch (error) {
    console.error('Error searching Instagram:', error);
    return null;
  }
};
