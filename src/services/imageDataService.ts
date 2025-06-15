export interface GeocodedImage {
  id: string;
  latitude: number;
  longitude: number;
  thumbnailUrl: string;
  fullImageUrl: string;
  title: string;
  description?: string;
  source: 'flickr' | 'mapillary' | 'nasa';
  author?: string;
  tags?: string[];
}

export interface ImageSearchParams {
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  limit?: number;
}

class ImageDataService {
  private flickrApiKey = 'YOUR_FLICKR_API_KEY'; // Still needs to be configured
  private mapillaryApiKey = 'MLY|30022086214104471|f378eb64d5d05179d363d31c87c41a8f';
  private nasaApiKey = 'Vtvhfp4Wn05UqQ6AsD2Pj7QhCa1yNNSPicpBhAqQ';

  async fetchFlickrImages(params: ImageSearchParams): Promise<GeocodedImage[]> {
    try {
      const { bounds, limit = 50 } = params;
      
      // Flickr API endpoint for geo-tagged photos
      const flickrUrl = new URL('https://api.flickr.com/services/rest/');
      flickrUrl.searchParams.append('method', 'flickr.photos.search');
      flickrUrl.searchParams.append('api_key', this.flickrApiKey);
      flickrUrl.searchParams.append('format', 'json');
      flickrUrl.searchParams.append('nojsoncallback', '1');
      flickrUrl.searchParams.append('has_geo', '1');
      flickrUrl.searchParams.append('bbox', `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`);
      flickrUrl.searchParams.append('per_page', limit.toString());
      flickrUrl.searchParams.append('extras', 'geo,url_t,url_m,description,tags,owner_name');
      flickrUrl.searchParams.append('sort', 'interestingness-desc');

      console.log('🖼️ Fetching Flickr images for bounds:', bounds);
      
      const response = await fetch(flickrUrl.toString());
      const data = await response.json();

      if (data.stat !== 'ok') {
        console.error('Flickr API error:', data.message);
        return [];
      }

      return data.photos.photo.map((photo: any): GeocodedImage => ({
        id: `flickr_${photo.id}`,
        latitude: parseFloat(photo.latitude),
        longitude: parseFloat(photo.longitude),
        thumbnailUrl: photo.url_t || `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_t.jpg`,
        fullImageUrl: photo.url_m || `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_m.jpg`,
        title: photo.title,
        description: photo.description?._content,
        source: 'flickr',
        author: photo.ownername,
        tags: photo.tags?.split(' ').filter(Boolean)
      }));
    } catch (error) {
      console.error('Error fetching Flickr images:', error);
      return [];
    }
  }

  async fetchMapillaryImages(params: ImageSearchParams): Promise<GeocodedImage[]> {
    try {
      const { bounds, limit = 50 } = params;
      
      // Mapillary API endpoint for images
      const mapillaryUrl = new URL('https://graph.mapillary.com/images');
      mapillaryUrl.searchParams.append('access_token', this.mapillaryApiKey);
      mapillaryUrl.searchParams.append('bbox', `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`);
      mapillaryUrl.searchParams.append('limit', limit.toString());
      mapillaryUrl.searchParams.append('fields', 'id,geometry,thumb_1024_url,thumb_256_url');

      console.log('🗺️ Fetching Mapillary images for bounds:', bounds);
      
      const response = await fetch(mapillaryUrl.toString());
      const data = await response.json();

      if (!data.data) {
        console.error('Mapillary API error:', data);
        return [];
      }

      return data.data.map((image: any): GeocodedImage => ({
        id: `mapillary_${image.id}`,
        latitude: image.geometry.coordinates[1],
        longitude: image.geometry.coordinates[0],
        thumbnailUrl: image.thumb_256_url,
        fullImageUrl: image.thumb_1024_url,
        title: 'Street View',
        description: 'Street-level imagery from Mapillary',
        source: 'mapillary'
      }));
    } catch (error) {
      console.error('Error fetching Mapillary images:', error);
      return [];
    }
  }

  async fetchNASAImages(params: ImageSearchParams): Promise<GeocodedImage[]> {
    try {
      const { bounds } = params;
      
      // NASA Earth Imagery API
      const centerLat = (bounds.north + bounds.south) / 2;
      const centerLon = (bounds.east + bounds.west) / 2;
      
      const nasaUrl = new URL('https://api.nasa.gov/planetary/earth/imagery');
      nasaUrl.searchParams.append('lon', centerLon.toString());
      nasaUrl.searchParams.append('lat', centerLat.toString());
      nasaUrl.searchParams.append('dim', '0.5');
      nasaUrl.searchParams.append('api_key', this.nasaApiKey);

      console.log('🛰️ Fetching NASA imagery for center point:', { centerLat, centerLon });
      
      const response = await fetch(nasaUrl.toString());
      
      if (response.ok) {
        const imageBlob = await response.blob();
        const imageUrl = URL.createObjectURL(imageBlob);
        
        return [{
          id: `nasa_${centerLat}_${centerLon}`,
          latitude: centerLat,
          longitude: centerLon,
          thumbnailUrl: imageUrl,
          fullImageUrl: imageUrl,
          title: 'NASA Earth Imagery',
          description: `Satellite view of ${centerLat.toFixed(4)}, ${centerLon.toFixed(4)}`,
          source: 'nasa'
        }];
      }

      return [];
    } catch (error) {
      console.error('Error fetching NASA images:', error);
      return [];
    }
  }

  async fetchAllImages(params: ImageSearchParams): Promise<GeocodedImage[]> {
    console.log('🖼️ Fetching images from all sources...');
    
    const promises = [
      // Mapillary and NASA are now enabled with your API keys
      this.fetchMapillaryImages(params),
      this.fetchNASAImages(params),
      // Flickr still needs API key configuration
      // this.fetchFlickrImages(params),
    ];

    try {
      const results = await Promise.allSettled(promises);
      const allImages = results
        .filter((result): result is PromiseFulfilledResult<GeocodedImage[]> => 
          result.status === 'fulfilled')
        .flatMap(result => result.value);

      console.log(`🖼️ Successfully fetched ${allImages.length} images from all sources`);
      return allImages;
    } catch (error) {
      console.error('Error fetching images from all sources:', error);
      return [];
    }
  }
}

export const imageDataService = new ImageDataService();
