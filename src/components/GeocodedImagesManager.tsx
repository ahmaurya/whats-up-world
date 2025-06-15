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

  // Get current map bounds for image fetching
  useEffect(() => {
    if (!map) return;

    const updateBounds = () => {
      const bounds = map.getBounds();
      const currentBounds = {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
      };
      
      // Only trigger fetch if bounds changed significantly (more than ~500m)
      if (!lastFetchBounds || shouldFetchNewImages(currentBounds, lastFetchBounds)) {
        console.log('🗺️ Map bounds changed significantly, updating image fetch bounds');
        setMapBounds(currentBounds);
        setLastFetchBounds(currentBounds);
      }
    };

    // Update bounds initially and on map move with debouncing
    updateBounds();
    
    let moveTimeout: NodeJS.Timeout;
    const debouncedUpdate = () => {
      clearTimeout(moveTimeout);
      moveTimeout = setTimeout(updateBounds, 500); // 500ms debounce
    };
    
    map.on('moveend', debouncedUpdate);

    return () => {
      map.off('moveend', debouncedUpdate);
      clearTimeout(moveTimeout);
    };
  }, [map, lastFetchBounds]);

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

  // Fetch images based on current map bounds - only when bounds change significantly
  const { images, loading, error } = useGeocodedImages(mapBounds);

  // Function to select up to 100 images with max 3 per city block
  const selectDistributedImages = (allImages: GeocodedImage[], currentViewBounds: any, maxImages: number = 100): GeocodedImage[] => {
    if (!currentViewBounds) return allImages.slice(0, maxImages);
    
    // Filter images to only those currently visible
    const visibleImages = allImages.filter(image => 
      image.latitude >= currentViewBounds.south && 
      image.latitude <= currentViewBounds.north &&
      image.longitude >= currentViewBounds.west && 
      image.longitude <= currentViewBounds.east
    );

    if (visibleImages.length === 0) return [];

    // Create city block grid - approximately 100m x 100m blocks
    const avgLat = (currentViewBounds.north + currentViewBounds.south) / 2;
    const latDegreeDistance = 111000; // meters per degree latitude
    const lngDegreeDistance = 111000 * Math.cos(avgLat * Math.PI / 180); // meters per degree longitude
    
    const blockSizeMeters = 100; // 100m city blocks
    const latBlockSize = blockSizeMeters / latDegreeDistance;
    const lngBlockSize = blockSizeMeters / lngDegreeDistance;

    // Group images by city blocks
    const cityBlocks: Map<string, GeocodedImage[]> = new Map();

    visibleImages.forEach(image => {
      const blockLat = Math.floor((image.latitude - currentViewBounds.south) / latBlockSize);
      const blockLng = Math.floor((image.longitude - currentViewBounds.west) / lngBlockSize);
      const blockKey = `${blockLat}_${blockLng}`;
      
      if (!cityBlocks.has(blockKey)) {
        cityBlocks.set(blockKey, []);
      }
      cityBlocks.get(blockKey)!.push(image);
    });

    // Select max 3 images per city block, prioritizing diversity
    const selectedImages: GeocodedImage[] = [];
    const maxImagesPerBlock = 3;

    for (const [blockKey, blockImages] of cityBlocks.entries()) {
      if (selectedImages.length >= maxImages) break;

      // Sort by source diversity first, then by some quality metric if available
      const sortedBlockImages = blockImages.sort((a, b) => {
        // Prioritize different sources for diversity
        if (a.source !== b.source) {
          const sourceOrder = { 'nasa': 0, 'mapillary': 1, 'flickr': 2 };
          return (sourceOrder[a.source] || 3) - (sourceOrder[b.source] || 3);
        }
        // Then by id for consistent ordering
        return a.id.localeCompare(b.id);
      });

      // Take up to 3 images from this block
      const imagesToAdd = sortedBlockImages.slice(0, Math.min(maxImagesPerBlock, maxImages - selectedImages.length));
      selectedImages.push(...imagesToAdd);
    }

    console.log(`🏙️ Selected ${selectedImages.length} images across ${cityBlocks.size} city blocks (max 3 per block)`);
    return selectedImages.slice(0, maxImages);
  };

  // Gradually update displayed images when new images arrive
  useEffect(() => {
    if (!map) return;

    const currentViewBounds = map.getBounds();
    const currentBounds = {
      north: currentViewBounds.getNorth(),
      south: currentViewBounds.getSouth(),
      east: currentViewBounds.getEast(),
      west: currentViewBounds.getWest()
    };

    // Select images for current view
    const newSelectedImages = selectDistributedImages(images, currentBounds, 100);
    
    // Gradually transition to new image set
    setDisplayedImages(prev => {
      // Keep existing images that are still in the new selection
      const existingImageIds = new Set(prev.map(img => img.id));
      const newImageIds = new Set(newSelectedImages.map(img => img.id));
      
      // Images to keep (intersection)
      const imagesToKeep = prev.filter(img => newImageIds.has(img.id));
      
      // New images to add
      const imagesToAdd = newSelectedImages.filter(img => !existingImageIds.has(img.id));
      
      // Combine keeping priority to existing images, then add new ones up to limit
      const combined = [...imagesToKeep, ...imagesToAdd].slice(0, 100);
      
      if (combined.length !== prev.length) {
        console.log(`🖼️ Gradually updating images: ${imagesToKeep.length} kept, ${imagesToAdd.length} added, ${combined.length} total`);
      }
      
      return combined;
    });
  }, [images, map]);

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
    if (!map || !visible) return;

    console.log('🖼️ Updating geocoded images layer...');

    // Create layer group if it doesn't exist
    if (!layerGroupRef.current) {
      layerGroupRef.current = L.layerGroup();
      map.addLayer(layerGroupRef.current);
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

    return () => {
      if (layerGroupRef.current && map && !visible) {
        map.removeLayer(layerGroupRef.current);
      }
    };
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

  if (loading) {
    console.log('🖼️ Loading geocoded images...');
  }

  if (error) {
    console.error('🖼️ Error loading geocoded images:', error);
  }

  return null;
};

export default GeocodedImagesManager;
