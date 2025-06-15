
import { useState, useEffect, useCallback } from 'react';
import { imageDataService, GeocodedImage, ImageSearchParams } from '@/services/imageDataService';

export const useGeocodedImages = (bounds?: ImageSearchParams['bounds']) => {
  const [images, setImages] = useState<GeocodedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProgressiveImages = useCallback((newImages: GeocodedImage[], source: string) => {
    console.log(`🖼️ Adding ${newImages.length} images from ${source} progressively`);
    setImages(prev => {
      // Remove any existing images from the same source to avoid duplicates
      const filteredPrev = prev.filter(img => img.source !== source);
      return [...filteredPrev, ...newImages];
    });
  }, []);

  useEffect(() => {
    if (!bounds) return;

    const fetchImages = async () => {
      setLoading(true);
      setError(null);
      // DON'T clear existing images - let them accumulate and be managed by the component
      
      try {
        await imageDataService.fetchAllImagesProgressive(
          { bounds, limit: 100 },
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
