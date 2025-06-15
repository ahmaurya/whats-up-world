
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useGeocodedImages } from '@/hooks/useGeocodedImages';
import { GeocodedImage } from '@/services/imageDataService';

interface GeocodedImagesManagerProps {
  map: L.Map | null;
  visible?: boolean;
}

const GeocodedImagesManager: React.FC<GeocodedImagesManagerProps> = ({ 
  map, 
  visible = true 
}) => {
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const [mapBounds, setMapBounds] = useState<any>(null);
  const [lastFetchBounds, setLastFetchBounds] = useState<any>(null);
  const [displayedImages, setDisplayedImages] = useState<GeocodedImage[]>([]);

  // Get current map bounds for image fetching - only when visible
  useEffect(() => {
    if (!map || !visible) return;

    const updateBounds = () => {
      const bounds = map.getBounds();
      const currentBounds = {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
      };
      
      // Only trigger fetch if bounds changed significantly (more than ~500m) or first time
      if (!lastFetchBounds || shouldFetchNewImages(currentBounds, lastFetchBounds)) {
        console.log('🗺️ Cityscape layer active - fetching images for new bounds');
        setMapBounds(currentBounds);
        setLastFetchBounds(currentBounds);
      }
    };

    // Update bounds initially when layer becomes visible
    updateBounds();
    
    let moveTimeout: NodeJS.Timeout;
    const debouncedUpdate = () => {
      clearTimeout(moveTimeout);
      moveTimeout = setTimeout(updateBounds, 500); // 500ms debounce
    };
    
    map.on('moveend', debouncedUpdate);
    map.on('zoomend', debouncedUpdate);

    return () => {
      map.off('moveend', debouncedUpdate);
      map.off('zoomend', debouncedUpdate);
      clearTimeout(moveTimeout);
    };
  }, [map, visible, lastFetchBounds]);

  // Clear bounds when layer becomes invisible to stop fetching
  useEffect(() => {
    if (!visible) {
      setMapBounds(null);
      setDisplayedImages([]);
    }
  }, [visible]);

  // Check if we should fetch new images based on bounds change
  const shouldFetchNewImages = (currentBounds: any, lastBounds: any): boolean => {
    if (!lastBounds) return true;
    
    const currentCenter = {
      lat: (currentBounds.north + currentBounds.south) / 2,
      lng: (currentBounds.east + currentBounds.west) / 2
    };
    
    const lastCenter = {
      lat: (lastBounds.north + lastBounds.south) / 2,
      lng: (lastBounds.west + lastBounds.east) / 2
    };
    
    // Calculate distance moved (rough approximation)
    const latDiff = Math.abs(currentCenter.lat - lastCenter.lat);
    const lngDiff = Math.abs(currentCenter.lng - lastCenter.lng);
    const threshold = 0.005; // Roughly 500m
    
    return latDiff > threshold || lngDiff > threshold;
  };

  // Fetch images based on current map bounds - only when visible and bounds change
  const { images, loading, error } = useGeocodedImages(visible ? mapBounds : null);

  // Function to select up to 100 non-overlapping images spread across the visible map
  // NASA images are always included regardless of the limit
  const selectNonOverlappingImages = (allImages: GeocodedImage[], currentViewBounds: any, maxImages: number = 100): GeocodedImage[] => {
    if (!currentViewBounds || !map) return [];
    
    // Filter images to only those currently visible
    const visibleImages = allImages.filter(image => 
      image.latitude >= currentViewBounds.south && 
      image.latitude <= currentViewBounds.north &&
      image.longitude >= currentViewBounds.west && 
      image.longitude <= currentViewBounds.east
    );

    if (visibleImages.length === 0) return [];

    // Separate NASA images from others - NASA images are always included
    const nasaImages = visibleImages.filter(image => image.source === 'nasa');
    const otherImages = visibleImages.filter(image => image.source !== 'nasa');

    // Sort other images by source diversity and quality
    const sortedOtherImages = otherImages.sort((a, b) => {
      const sourceOrder = { 'mapillary': 0, 'flickr': 1 };
      if (a.source !== b.source) {
        return (sourceOrder[a.source] || 2) - (sourceOrder[b.source] || 2);
      }
      return a.id.localeCompare(b.id);
    });

    const selectedImages: GeocodedImage[] = [];
    const minDistancePixels = 80; // Minimum distance between images in pixels

    // First, add all NASA images (they're always included)
    for (const nasaImage of nasaImages) {
      const imagePoint = map.latLngToLayerPoint([nasaImage.latitude, nasaImage.longitude]);
      
      // Check if this NASA image overlaps with any already selected images
      let overlaps = false;
      for (const selectedImage of selectedImages) {
        const selectedPoint = map.latLngToLayerPoint([selectedImage.latitude, selectedImage.longitude]);
        const distance = imagePoint.distanceTo(selectedPoint);
        
        if (distance < minDistancePixels) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        selectedImages.push(nasaImage);
      }
    }

    // Then add other images up to the limit
    for (const image of sortedOtherImages) {
      if (selectedImages.length >= maxImages) break;

      // Convert lat/lng to pixel coordinates
      const imagePoint = map.latLngToLayerPoint([image.latitude, image.longitude]);
      
      // Check if this image overlaps with any already selected images
      let overlaps = false;
      for (const selectedImage of selectedImages) {
        const selectedPoint = map.latLngToLayerPoint([selectedImage.latitude, selectedImage.longitude]);
        const distance = imagePoint.distanceTo(selectedPoint);
        
        if (distance < minDistancePixels) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        selectedImages.push(image);
      }
    }

    const nasaCount = selectedImages.filter(img => img.source === 'nasa').length;
    const otherCount = selectedImages.length - nasaCount;
    console.log(`🖼️ Selected ${selectedImages.length} non-overlapping images (${nasaCount} NASA, ${otherCount} others) from ${visibleImages.length} visible images`);
    return selectedImages;
  };

  // Update displayed images when new images arrive or map bounds change
  useEffect(() => {
    if (!map || !visible) {
      setDisplayedImages([]);
      return;
    }

    const currentViewBounds = map.getBounds();
    const currentBounds = {
      north: currentViewBounds.getNorth(),
      south: currentViewBounds.getSouth(),
      east: currentViewBounds.getEast(),
      west: currentViewBounds.getWest()
    };

    // Select non-overlapping images for current view
    const newSelectedImages = selectNonOverlappingImages(images, currentBounds, 100);
    
    setDisplayedImages(newSelectedImages);

    if (newSelectedImages.length > 0) {
      console.log(`🖼️ Updated displayed images: ${newSelectedImages.length} images`);
    }
  }, [images, map, visible]);

  const createImageMarker = (image: GeocodedImage): L.Marker => {
    const sourceColors = {
      flickr: 'border-pink-500',
      mapillary: 'border-green-500', 
      nasa: 'border-blue-500',
      sample: 'border-gray-500'
    };

    const thumbnailIcon = L.divIcon({
      className: 'geocoded-image-marker',
      html: `
        <div class="thumbnail-container ${sourceColors[image.source]}" data-image-id="${image.id}">
          <img src="${image.thumbnailUrl}" alt="${image.title}" class="thumbnail-image" />
          <div class="thumbnail-overlay"></div>
          <div class="source-badge">${image.source}</div>
        </div>
      `,
      iconSize: [60, 60],
      iconAnchor: [30, 30]
    });

    const marker = L.marker([image.latitude, image.longitude], {
      icon: thumbnailIcon
    });

    // Add click handler for popup
    marker.on('click', () => {
      const popupContent = `
        <div class="image-popup">
          <img src="${image.fullImageUrl}" alt="${image.title}" class="popup-image" />
          <div class="image-info">
            <h3 class="image-title">${image.title}</h3>
            ${image.description ? `<p class="image-description">${image.description}</p>` : ''}
            <div class="image-meta">
              <span class="source-label">Source: ${image.source}</span>
              ${image.author ? `<span class="author-label">By: ${image.author}</span>` : ''}
            </div>
            ${image.tags && image.tags.length > 0 ? 
              `<div class="image-tags">${image.tags.slice(0, 5).map(tag => `<span class="tag">${tag}</span>`).join('')}</div>` 
              : ''}
          </div>
        </div>
      `;
      
      marker.bindPopup(popupContent, {
        maxWidth: 420,
        className: 'geocoded-image-popup'
      }).openPopup();
    });

    return marker;
  };

  // Update markers based on displayed images
  useEffect(() => {
    if (!map) return;

    console.log('🖼️ Updating geocoded images layer...');

    // Create layer group if it doesn't exist
    if (!layerGroupRef.current) {
      layerGroupRef.current = L.layerGroup();
      if (visible) {
        map.addLayer(layerGroupRef.current);
      }
    }

    // Clear all existing markers when not visible
    if (!visible) {
      if (layerGroupRef.current) {
        layerGroupRef.current.clearLayers();
        markersRef.current.clear();
      }
      return;
    }

    // Create a map of current displayed images
    const currentImagesMap = new Map<string, GeocodedImage>();
    displayedImages.forEach(image => {
      currentImagesMap.set(image.id, image);
    });

    // Remove markers that are no longer in the displayed image set
    const markersToRemove: string[] = [];
    markersRef.current.forEach((marker, imageId) => {
      if (!currentImagesMap.has(imageId)) {
        if (layerGroupRef.current) {
          layerGroupRef.current.removeLayer(marker);
        }
        markersToRemove.push(imageId);
      }
    });
    markersToRemove.forEach(id => markersRef.current.delete(id));

    // Add new markers for images that aren't already displayed
    let newMarkersCount = 0;
    displayedImages.forEach(image => {
      if (!markersRef.current.has(image.id)) {
        const marker = createImageMarker(image);
        markersRef.current.set(image.id, marker);
        
        if (layerGroupRef.current) {
          layerGroupRef.current.addLayer(marker);
        }
        newMarkersCount++;
      }
    });

    if (newMarkersCount > 0 || markersToRemove.length > 0) {
      console.log(`🖼️ Updated geocoded images: ${newMarkersCount} new, ${markersToRemove.length} removed, ${displayedImages.length} displayed`);
    }
  }, [map, visible, displayedImages]);

  // Handle visibility changes
  useEffect(() => {
    if (!map || !layerGroupRef.current) return;

    if (visible) {
      map.addLayer(layerGroupRef.current);
    } else {
      map.removeLayer(layerGroupRef.current);
    }
  }, [map, visible]);

  if (loading && visible) {
    console.log('🖼️ Loading geocoded images...');
  }

  if (error && visible) {
    console.error('🖼️ Error loading geocoded images:', error);
  }

  return null;
};

export default GeocodedImagesManager;
