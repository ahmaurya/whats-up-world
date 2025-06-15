
export interface MediaLink {
  type: 'youtube' | 'instagram';
  url: string;
  title: string;
  description?: string;
}

export const searchHistoricPlaceMedia = async (placeName: string): Promise<MediaLink[]> => {
  try {
    const cleanName = placeName
      .replace(/historic|building|site|place/gi, '')
      .trim();
    
    const mediaLinks: MediaLink[] = [];
    
    // Always try to find YouTube content
    const youtubeResult = await searchYouTube(cleanName);
    if (youtubeResult) {
      mediaLinks.push(youtubeResult);
    }
    
    // Always try to find Instagram content
    const instagramResult = await searchInstagram(cleanName);
    if (instagramResult) {
      mediaLinks.push(instagramResult);
    }
    
    return mediaLinks;
  } catch (error) {
    console.error('Error searching for historic place media:', error);
    return [];
  }
};

const searchYouTube = async (placeName: string): Promise<MediaLink | null> => {
  try {
    const searchQuery = `${placeName} history historical significance`;
    const encodedQuery = encodeURIComponent(searchQuery);
    
    return {
      type: 'youtube',
      url: `https://www.youtube.com/results?search_query=${encodedQuery}`,
      title: `Watch videos about "${placeName}"`,
      description: 'Historical documentaries and tours'
    };
  } catch (error) {
    console.error('Error searching YouTube:', error);
    return null;
  }
};

const searchInstagram = async (placeName: string): Promise<MediaLink | null> => {
  try {
    const hashtag = placeName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '')
      .substring(0, 30);
    
    return {
      type: 'instagram',
      url: `https://www.instagram.com/explore/tags/${hashtag}/`,
      title: `View #${hashtag} posts`,
      description: 'Photos and stories from visitors'
    };
  } catch (error) {
    console.error('Error searching Instagram:', error);
    return null;
  }
};
