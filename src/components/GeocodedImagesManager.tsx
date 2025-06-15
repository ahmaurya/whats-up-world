
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
      iconSize: [40, 40],
      iconAnchor: [20, 20]
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

    console.log('🖼️ Setting up geocoded images layer...');

    // Create layer group if it doesn't exist
    if (!layerGroupRef.current) {
      layerGroupRef.current = L.layerGroup();
    }

    // Clear existing markers
    markersRef.current.forEach(marker => {
      if (layerGroupRef.current) {
        layerGroupRef.current.removeLayer(marker);
      }
    });
    markersRef.current.clear();

    // Add image markers
    images.forEach(image => {
      const marker = createImageMarker(image);
      markersRef.current.set(image.id, marker);
      
      if (layerGroupRef.current) {
        layerGroupRef.current.addLayer(marker);
      }
    });

    // Add layer to map
    if (layerGroupRef.current) {
      map.addLayer(layerGroupRef.current);
    }

    console.log(`🖼️ Added ${images.length} geocoded image markers`);

    return () => {
      if (layerGroupRef.current && map) {
        map.removeLayer(layerGroupRef.current);
      }
    };
  }, [map, visible, images]);

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
