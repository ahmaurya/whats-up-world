
import { useState, useEffect, useCallback } from 'react';
import { imageDataService, GeocodedImage, ImageSearchParams } from '@/services/imageDataService';

export const useGeocodedImages = (bounds?: ImageSearchParams['bounds']) => {
  const [images, setImages] = useState<GeocodedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProgressiveImages = useCallback((newImages: GeocodedImage[], source: string) => {
    console.log(`🖼️ Adding ${newImages.length} images from ${source} progressively`);
    setImages(prev => {
      // Handle lite vs batched mapillary updates differently
      if (source === 'mapillary-lite') {
        // First lite batch - add immediately
        return [...prev, ...newImages];
      } else if (source.startsWith('mapillary-batch-')) {
        // Batched mapillary updates - remove lite images on first batch, then add to existing
        const batchIndex = parseInt(source.split('-')[2]);
        if (batchIndex === 0) {
          // First batch - replace lite images with first batch
          const nonMapillaryImages = prev.filter(img => img.source !== 'mapillary-lite');
          return [...nonMapillaryImages, ...newImages];
        } else {
          // Subsequent batches - add to existing mapillary images
          return [...prev, ...newImages];
        }
      } else if (source === 'mapillary') {
        // Full mapillary batch (fallback) - replace lite images with full set
        const nonMapillaryImages = prev.filter(img => img.source !== 'mapillary');
        return [...nonMapillaryImages, ...newImages];
      } else {
        // Other sources - remove existing from same source and add new
        const filteredPrev = prev.filter(img => img.source !== source);
        return [...filteredPrev, ...newImages];
      }
    });
  }, []);

  useEffect(() => {
    // Only fetch when bounds are provided (when Cityscape layer is visible)
    if (!bounds) {
      setImages([]);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchImages = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log('🖼️ Fetching images for Cityscape layer...');
        await imageDataService.fetchAllImagesProgressive(
          { bounds, limit: 200 }, // Fetch more to have options for selection
          handleProgressiveImages
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch images');
        console.error('Error in useGeocodedImages:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [bounds, handleProgressiveImages]);

  return { images, loading, error };
};
