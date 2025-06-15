import { imageCacheService } from './imageCacheService';

export interface GeocodedImage {
  id: string;
  latitude: number;
  longitude: number;
  thumbnailUrl: string;
  fullImageUrl: string;
  title: string;
  description?: string;
  source: 'flickr' | 'mapillary' | 'nasa' | 'mapillary-lite';
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
    // Check cache first
    const cachedData = imageCacheService.get('flickr', params.bounds);
    if (cachedData) {
      return cachedData;
    }

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

      const results = data.photos.photo.map((photo: any): GeocodedImage => ({
        id: `flickr_${photo.id}`,
        latitude: parseFloat(photo.latitude),
        longitude: parseFloat(photo.longitude),
        thumbnailUrl: photo.url_t || `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_t.jpg`,
        fullImageUrl: photo.url_m || `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_m.jpg`,
        title: photo.title,
        description: photo.description?._content,
        source: 'flickr' as const,
        author: photo.ownername,
        tags: photo.tags?.split(' ').filter(Boolean)
      }));

      // Cache the results
      imageCacheService.set('flickr', params.bounds, results);
      return results;
    } catch (error) {
      console.error('Error fetching Flickr images:', error);
      return [];
    }
  }

  async fetchMapillaryImages(params: ImageSearchParams): Promise<GeocodedImage[]> {
    // Check cache first
    const cachedData = imageCacheService.get('mapillary', params.bounds);
    if (cachedData) {
      return cachedData;
    }

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

      const results = data.data.map((image: any): GeocodedImage => ({
        id: `mapillary_${image.id}`,
        latitude: image.geometry.coordinates[1],
        longitude: image.geometry.coordinates[0],
        thumbnailUrl: image.thumb_256_url,
        fullImageUrl: image.thumb_1024_url,
        title: 'Street View',
        description: 'Street-level imagery from Mapillary',
        source: 'mapillary' as const
      }));

      // Cache the results
      imageCacheService.set('mapillary', params.bounds, results);
      return results;
    } catch (error) {
      console.error('Error fetching Mapillary images:', error);
      return [];
    }
  }

  // New method for batch fetching Mapillary images
  async fetchMapillaryImagesBatched(
    params: ImageSearchParams, 
    onBatchReceived: (images: GeocodedImage[], batchIndex: number) => void
  ): Promise<GeocodedImage[]> {
    try {
      const { bounds, limit = 50 } = params;
      const batchSize = 10;
      const totalBatches = Math.ceil(limit / batchSize);
      const allImages: GeocodedImage[] = [];

      console.log(`🗺️ Fetching Mapillary images in ${totalBatches} batches of ${batchSize} each`);

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const offset = batchIndex * batchSize;
        const currentBatchSize = Math.min(batchSize, limit - offset);

        // Mapillary API endpoint for images
        const mapillaryUrl = new URL('https://graph.mapillary.com/images');
        mapillaryUrl.searchParams.append('access_token', this.mapillaryApiKey);
        mapillaryUrl.searchParams.append('bbox', `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`);
        mapillaryUrl.searchParams.append('limit', currentBatchSize.toString());
        mapillaryUrl.searchParams.append('start', offset.toString());
        mapillaryUrl.searchParams.append('fields', 'id,geometry,thumb_1024_url,thumb_256_url');

        console.log(`🗺️ Fetching Mapillary batch ${batchIndex + 1}/${totalBatches} (${currentBatchSize} images)`);
        
        const response = await fetch(mapillaryUrl.toString());
        const data = await response.json();

        if (!data.data) {
          console.error('Mapillary API error:', data);
          continue;
        }

        const batchResults = data.data.map((image: any): GeocodedImage => ({
          id: `mapillary_${image.id}`,
          latitude: image.geometry.coordinates[1],
          longitude: image.geometry.coordinates[0],
          thumbnailUrl: image.thumb_256_url,
          fullImageUrl: image.thumb_1024_url,
          title: 'Street View',
          description: 'Street-level imagery from Mapillary',
          source: 'mapillary' as const
        }));

        if (batchResults.length > 0) {
          allImages.push(...batchResults);
          onBatchReceived(batchResults, batchIndex);
          console.log(`🗺️ Delivered Mapillary batch ${batchIndex + 1}: ${batchResults.length} images`);
        }

        // Small delay between batches to avoid overwhelming the API
        if (batchIndex < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Cache the complete results
      imageCacheService.set('mapillary', params.bounds, allImages);
      return allImages;
    } catch (error) {
      console.error('Error fetching Mapillary images in batches:', error);
      return [];
    }
  }

  // New method for quick lite Mapillary fetch
  async fetchMapillaryImagesLite(params: ImageSearchParams): Promise<GeocodedImage[]> {
    try {
      const { bounds } = params;
      
      // Mapillary API endpoint for images with small limit for quick response
      const mapillaryUrl = new URL('https://graph.mapillary.com/images');
      mapillaryUrl.searchParams.append('access_token', this.mapillaryApiKey);
      mapillaryUrl.searchParams.append('bbox', `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`);
      mapillaryUrl.searchParams.append('limit', '8'); // Small number for quick response
      mapillaryUrl.searchParams.append('fields', 'id,geometry,thumb_1024_url,thumb_256_url');

      console.log('🗺️ Fetching Mapillary images (lite) for bounds:', bounds);
      
      const response = await fetch(mapillaryUrl.toString());
      const data = await response.json();

      if (!data.data) {
        console.error('Mapillary API error:', data);
        return [];
      }

      const results = data.data.map((image: any): GeocodedImage => ({
        id: `mapillary_${image.id}`,
        latitude: image.geometry.coordinates[1],
        longitude: image.geometry.coordinates[0],
        thumbnailUrl: image.thumb_256_url,
        fullImageUrl: image.thumb_1024_url,
        title: 'Street View',
        description: 'Street-level imagery from Mapillary',
        source: 'mapillary-lite' as const
      }));

      return results;
    } catch (error) {
      console.error('Error fetching Mapillary images (lite):', error);
      return [];
    }
  }

  async fetchNASAImages(params: ImageSearchParams): Promise<GeocodedImage[]> {
    // Check cache first
    const cachedData = imageCacheService.get('nasa', params.bounds);
    if (cachedData) {
      return cachedData;
    }

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
        
        const results: GeocodedImage[] = [{
          id: `nasa_${centerLat}_${centerLon}`,
          latitude: centerLat,
          longitude: centerLon,
          thumbnailUrl: imageUrl,
          fullImageUrl: imageUrl,
          title: 'NASA Earth Imagery',
          description: `Satellite view of ${centerLat.toFixed(4)}, ${centerLon.toFixed(4)}`,
          source: 'nasa' as const
        }];

        // Cache the results
        imageCacheService.set('nasa', params.bounds, results);
        return results;
      }

      return [];
    } catch (error) {
      console.error('Error fetching NASA images:', error);
      return [];
    }
  }

  // Updated method to fetch images progressively with batched Mapillary
  async fetchAllImagesProgressive(
    params: ImageSearchParams, 
    onImagesReceived: (images: GeocodedImage[], source: string) => void
  ): Promise<GeocodedImage[]> {
    console.log('🖼️ Fetching images progressively from all sources...');
    
    const allImages: GeocodedImage[] = [];
    
    // First: Quick lite fetch from Mapillary for immediate display
    try {
      const liteImages = await this.fetchMapillaryImagesLite(params);
      if (liteImages.length > 0) {
        console.log(`🖼️ Received ${liteImages.length} lite images from mapillary`);
        onImagesReceived(liteImages, 'mapillary-lite');
        allImages.push(...liteImages);
      }
    } catch (error) {
      console.error('Error fetching lite images from mapillary:', error);
    }

    // Then: Batched fetch from Mapillary and other sources
    const promises = [
      // Batched Mapillary fetch
      this.fetchMapillaryImagesBatched(params, (batchImages, batchIndex) => {
        console.log(`🖼️ Received Mapillary batch ${batchIndex + 1}: ${batchImages.length} images`);
        onImagesReceived(batchImages, `mapillary-batch-${batchIndex}`);
      }),
      // NASA fetch
      this.fetchNASAImages(params).then(images => {
        if (images.length > 0) {
          console.log(`🖼️ Received ${images.length} images from nasa`);
          onImagesReceived(images, 'nasa');
        }
        return images;
      }),
      // Flickr still needs API key configuration
      // this.fetchFlickrImages(params),
    ];

    // Wait for all sources to complete
    const results = await Promise.allSettled(promises);
    
    // Add all results to allImages (avoiding duplicates for mapillary)
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        if (index === 0) { // Mapillary batched results
          // Filter out lite images to avoid duplicates
          const liteImageIds = new Set(allImages.filter(img => img.source === 'mapillary-lite').map(img => img.id));
          const newImages = result.value.filter(img => !liteImageIds.has(img.id));
          allImages.push(...newImages);
        } else {
          allImages.push(...result.value);
        }
      }
    });
    
    console.log(`🖼️ Completed fetching ${allImages.length} images from all sources`);
    return allImages;
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
