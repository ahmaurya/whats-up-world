
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
  const lastImagesRef = useRef<Map<string, GeocodedImage>>(new Map());

  // Get current map bounds for image fetching
  useEffect(() => {
    if (!map) return;

    const updateBounds = () => {
      const bounds = map.getBounds();
      setMapBounds({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
      });
    };

    // Update bounds initially and on map move
    updateBounds();
    map.on('moveend', updateBounds);

    return () => {
      map.off('moveend', updateBounds);
    };
  }, [map]);

  // Fetch images based on current map bounds
  const { images, loading, error } = useGeocodedImages(mapBounds);

  // Function to select up to 100 images spread evenly across the map
  const selectDistributedImages = (allImages: GeocodedImage[], maxImages: number = 100): GeocodedImage[] => {
    if (allImages.length <= maxImages) {
      return allImages;
    }

    if (!mapBounds) return allImages.slice(0, maxImages);

    // Create a grid to distribute images evenly
    const gridSize = Math.ceil(Math.sqrt(maxImages)); // e.g., 10x10 grid for 100 images
    const latStep = (mapBounds.north - mapBounds.south) / gridSize;
    const lngStep = (mapBounds.east - mapBounds.west) / gridSize;

    const grid: Map<string, GeocodedImage[]> = new Map();

    // Group images by grid cells
    allImages.forEach(image => {
      const latIndex = Math.floor((image.latitude - mapBounds.south) / latStep);
      const lngIndex = Math.floor((image.longitude - mapBounds.west) / lngStep);
      const gridKey = `${Math.max(0, Math.min(gridSize - 1, latIndex))}_${Math.max(0, Math.min(gridSize - 1, lngIndex))}`;
      
      if (!grid.has(gridKey)) {
        grid.set(gridKey, []);
      }
      grid.get(gridKey)!.push(image);
    });

    // Select one image from each grid cell, prioritizing cells with fewer images
    const selectedImages: GeocodedImage[] = [];
    const gridCells = Array.from(grid.entries()).sort((a, b) => a[1].length - b[1].length);

    for (const [_, cellImages] of gridCells) {
      if (selectedImages.length >= maxImages) break;
      
      // Select the first image from this cell (could be randomized)
      selectedImages.push(cellImages[0]);
    }

    console.log(`🖼️ Selected ${selectedImages.length} images from ${allImages.length} total for even distribution`);
    return selectedImages;
  };

  const createImageMarker = (image: GeocodedImage): L.Marker => {
    // Create custom icon for the thumbnail with source-specific styling
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

  useEffect(() => {
    if (!map || !visible) return;

    console.log('🖼️ Updating geocoded images layer...');

    // Create layer group if it doesn't exist
    if (!layerGroupRef.current) {
      layerGroupRef.current = L.layerGroup();
      map.addLayer(layerGroupRef.current);
    }

    // Select up to 100 distributed images
    const displayImages = selectDistributedImages(images, 100);

    // Create a map of current images for easy lookup
    const currentImagesMap = new Map<string, GeocodedImage>();
    displayImages.forEach(image => {
      currentImagesMap.set(image.id, image);
    });

    // Remove markers that are no longer in the current image set
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
    displayImages.forEach(image => {
      if (!markersRef.current.has(image.id)) {
        const marker = createImageMarker(image);
        markersRef.current.set(image.id, marker);
        
        if (layerGroupRef.current) {
          layerGroupRef.current.addLayer(marker);
        }
        newMarkersCount++;
      }
    });

    // Update the reference to current images
    lastImagesRef.current = currentImagesMap;

    console.log(`🖼️ Updated geocoded images: ${newMarkersCount} new, ${markersToRemove.length} removed, ${displayImages.length} displayed (${images.length} total cached)`);

    return () => {
      if (layerGroupRef.current && map && !visible) {
        map.removeLayer(layerGroupRef.current);
      }
    };
  }, [map, visible, images, mapBounds]);

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
