
import { useState, useEffect } from 'react';
import { imageDataService, GeocodedImage, ImageSearchParams } from '@/services/imageDataService';

export const useGeocodedImages = (bounds?: ImageSearchParams['bounds']) => {
  const [images, setImages] = useState<GeocodedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bounds) return;

    const fetchImages = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const fetchedImages = await imageDataService.fetchAllImages({
          bounds,
          limit: 100
        });
        setImages(fetchedImages);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch images');
        console.error('Error in useGeocodedImages:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [bounds]);

  return { images, loading, error };
};
