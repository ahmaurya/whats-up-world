
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

interface GeocodedImage {
  id: string;
  latitude: number;
  longitude: number;
  thumbnailUrl: string;
  fullImageUrl: string;
  title: string;
  description?: string;
}

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

  // Sample geocoded images data - replace with your actual data source
  const sampleImages: GeocodedImage[] = [
    {
      id: '1',
      latitude: 47.6062,
      longitude: -122.3321,
      thumbnailUrl: 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=50&h=50&fit=crop',
      fullImageUrl: 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=400&h=300&fit=crop',
      title: 'Seattle Cityscape',
      description: 'Beautiful view of downtown Seattle'
    },
    {
      id: '2', 
      latitude: 47.6205,
      longitude: -122.3493,
      thumbnailUrl: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=50&h=50&fit=crop',
      fullImageUrl: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=400&h=300&fit=crop',
      title: 'Tech Hub',
      description: 'Technology workspace in Seattle'
    },
    {
      id: '3',
      latitude: 47.6097,
      longitude: -122.3331,
      thumbnailUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=50&h=50&fit=crop',
      fullImageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=300&fit=crop',
      title: 'Circuit Board',
      description: 'Close-up of electronic components'
    },
    {
      id: '4',
      latitude: 47.6153,
      longitude: -122.3238,
      thumbnailUrl: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=50&h=50&fit=crop',
      fullImageUrl: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=300&fit=crop',
      title: 'Java Programming',
      description: 'Monitor showing Java code'
    },
    {
      id: '5',
      latitude: 47.6089,
      longitude: -122.3356,
      thumbnailUrl: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=50&h=50&fit=crop',
      fullImageUrl: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=400&h=300&fit=crop',
      title: 'MacBook Pro',
      description: 'Person using MacBook Pro'
    }
  ];

  const createImageMarker = (image: GeocodedImage): L.Marker => {
    // Create custom icon for the thumbnail
    const thumbnailIcon = L.divIcon({
      className: 'geocoded-image-marker',
      html: `
        <div class="thumbnail-container" data-image-id="${image.id}">
          <img src="${image.thumbnailUrl}" alt="${image.title}" class="thumbnail-image" />
          <div class="thumbnail-overlay"></div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    const marker = L.marker([image.latitude, image.longitude], {
      icon: thumbnailIcon
    });

    // Add click handler that will trigger the hover card
    marker.on('click', () => {
      // Create and show a custom popup with the full image
      const popupContent = `
        <div class="image-popup">
          <img src="${image.fullImageUrl}" alt="${image.title}" class="popup-image" />
          <div class="image-info">
            <h3 class="image-title">${image.title}</h3>
            ${image.description ? `<p class="image-description">${image.description}</p>` : ''}
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
    if (!map) return;

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
    sampleImages.forEach(image => {
      const marker = createImageMarker(image);
      markersRef.current.set(image.id, marker);
      
      if (layerGroupRef.current) {
        layerGroupRef.current.addLayer(marker);
      }
    });

    // Add layer to map if visible
    if (visible && layerGroupRef.current) {
      map.addLayer(layerGroupRef.current);
    }

    console.log(`🖼️ Added ${sampleImages.length} geocoded image markers`);

    return () => {
      if (layerGroupRef.current && map) {
        map.removeLayer(layerGroupRef.current);
      }
    };
  }, [map, visible]);

  // Handle visibility changes
  useEffect(() => {
    if (!map || !layerGroupRef.current) return;

    if (visible) {
      map.addLayer(layerGroupRef.current);
    } else {
      map.removeLayer(layerGroupRef.current);
    }
  }, [map, visible]);

  return null;
};

export default GeocodedImagesManager;
