interface UnsplashImage {
  id: string;
  urls: {
    small: string;
    regular: string;
    thumb: string;
  };
  alt_description: string | null;
  description: string | null;
}

interface UnsplashResponse {
  results: UnsplashImage[];
  total: number;
}

const UNSPLASH_ACCESS_KEY = 'q-f9Tu0FXaoZIz8ykFkP_NBISNztfmo7dE-FmmRQ6kQ';

export const searchUnsplashImages = async (query: string): Promise<string | null> => {
  try {
    const searchQuery = encodeURIComponent(query);
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${searchQuery}&per_page=1&orientation=landscape&content_filter=high`,
      {
        headers: {
          'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        },
      }
    );

    if (!response.ok) {
      console.error('🖼️ Unsplash API error:', response.status);
      return null;
    }

    const data: UnsplashResponse = await response.json();
    
    if (data.results && data.results.length > 0) {
      const image = data.results[0];
      console.log(`🖼️ Found Unsplash image for "${query}":`, image.urls.small);
      return image.urls.small;
    }

    return null;
  } catch (error) {
    console.error('🖼️ Error searching Unsplash:', error);
    return null;
  }
};

export const generateSearchQuery = (viewpointName: string, coordinates: [number, number]): string => {
  // Create search terms based on viewpoint name and general location
  const locationTerms = [];
  
  // Add viewpoint name (cleaned up)
  const cleanName = viewpointName
    .replace(/viewpoint/gi, '')
    .replace(/overlook/gi, '')
    .replace(/lookout/gi, '')
    .trim();
  
  if (cleanName) {
    locationTerms.push(cleanName);
  }

  // Add generic scenic terms
  locationTerms.push('scenic view');
  locationTerms.push('landscape');
  
  // Determine general region based on coordinates (rough approximation for Seattle area)
  const [lon, lat] = coordinates;
  
  if (lat > 47.6 && lat < 47.8 && lon > -122.5 && lon < -122.2) {
    locationTerms.push('Seattle');
  } else if (lat > 47.4 && lat < 47.9 && lon > -122.8 && lon < -121.8) {
    locationTerms.push('Washington State');
    locationTerms.push('Pacific Northwest');
  }
  
  return locationTerms.join(' ');
};
