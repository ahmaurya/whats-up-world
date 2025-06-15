
import L from 'leaflet';
import { Restaurant } from '@/hooks/useRestaurants';

export const createRestaurantMarker = (
  restaurant: Restaurant,
  onRestaurantClick: (restaurant: Restaurant) => void
): L.Marker => {
  const isVegetarian = restaurant.isVegetarian;
  const markerColor = isVegetarian ? '#22c55e' : '#ef4444';
  
  const marker = L.marker([restaurant.coordinates[1], restaurant.coordinates[0]], {
    icon: L.divIcon({
      className: 'restaurant-marker',
      html: `<div style="background-color: ${markerColor}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; cursor: pointer;"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    })
  });

  const popupContent = createPopupContent(restaurant, markerColor);
  marker.bindPopup(popupContent, {
    maxWidth: 280,
    className: 'restaurant-popup'
  });

  marker.on('click', () => {
    onRestaurantClick(restaurant);
  });

  return marker;
};

const createPopupContent = (restaurant: Restaurant, markerColor: string): string => {
  const isVegetarian = restaurant.isVegetarian;
  const sourceLabel = restaurant.source === 'google' ? 'Google Places' : 'OpenStreetMap';
  const sourceIcon = restaurant.source === 'google' ? '🔍' : '🗺️';
  
  return `
    <div style="max-width: 240px; min-height: 200px; padding: 12px; position: relative;">
      <h3 style="margin: 0 0 8px 0; font-weight: bold; font-size: 14px; padding-right: 20px;">${restaurant.name}</h3>
      ${restaurant.rating > 0 ? `
        <div style="margin-bottom: 6px;">
          <span style="color: #f59e0b; font-weight: bold;">${restaurant.rating.toFixed(1)}</span>
          <span style="color: #fbbf24;">★</span>
          <span style="color: #666; font-size: 12px; margin-left: 4px;">(${restaurant.reviews.toLocaleString()} reviews)</span>
        </div>
      ` : ''}
      <div style="margin-bottom: 6px; font-size: 12px;">
        <strong>Cuisine:</strong> ${restaurant.cuisine}
      </div>
      <div style="margin-bottom: 6px; font-size: 12px;">
        <strong>Type:</strong> <span style="color: ${markerColor}; font-weight: bold;">${isVegetarian ? 'Vegetarian/Vegan' : 'Non-Vegetarian'}</span>
      </div>
      <div style="margin-bottom: 6px; font-size: 12px;">
        <strong>Source:</strong> ${sourceIcon} ${sourceLabel}
      </div>
      <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
        ${restaurant.description}
      </div>
      ${restaurant.website ? `
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e5e5;">
          <a href="${restaurant.website}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: none; font-size: 12px; font-weight: 500;">
            🌐 Visit Website
          </a>
        </div>
      ` : ''}
    </div>
  `;
};

export const shouldShowRestaurant = (
  restaurant: Restaurant,
  showVegetarian: boolean,
  showNonVegetarian: boolean
): boolean => {
  const isVegetarian = restaurant.isVegetarian;
  return (isVegetarian && showVegetarian) || (!isVegetarian && showNonVegetarian);
};
