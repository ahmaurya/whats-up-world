
import L from 'leaflet';
import { Coffee } from 'lucide-react';
import { Cafe } from '@/hooks/useCafes';

export const createCafeMarker = (cafe: Cafe, onCafeClick: (cafe: Cafe) => void): L.Marker => {
  // Create custom cafe icon
  const cafeIcon = L.divIcon({
    html: `
      <div class="relative flex items-center justify-center">
        <div class="bg-amber-600 rounded-full p-2 shadow-lg border-2 border-white">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 2v2a6 6 0 1 0 12 0V2a6 6 0 1 0-12 0Z"/>
            <path d="M8.5 8.5h7"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
        </div>
      </div>
    `,
    className: 'cafe-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });

  const marker = L.marker([cafe.coordinates[1], cafe.coordinates[0]], {
    icon: cafeIcon
  });

  // Create popup content
  const ratingStars = '★'.repeat(Math.floor(cafe.rating)) + '☆'.repeat(5 - Math.floor(cafe.rating));
  const sourceIcon = cafe.source === 'google' ? '🔍' : '🗺️';
  
  const popupContent = `
    <div class="cafe-popup p-3 min-w-[200px]">
      <div class="flex items-center gap-2 mb-2">
        <h3 class="font-semibold text-lg text-gray-800">${cafe.name}</h3>
        <span class="text-xs">${sourceIcon}</span>
      </div>
      ${cafe.rating > 0 ? `
        <div class="flex items-center gap-2 mb-2">
          <span class="text-yellow-500">${ratingStars}</span>
          <span class="text-sm text-gray-600">${cafe.rating}/5 (${cafe.reviews} reviews)</span>
        </div>
      ` : ''}
      <p class="text-sm text-gray-600 mb-3">${cafe.description}</p>
      ${cafe.website ? `
        <a href="${cafe.website}" target="_blank" rel="noopener noreferrer" 
           class="inline-block bg-amber-600 text-white px-3 py-1 rounded text-sm hover:bg-amber-700 transition-colors">
          Visit Website
        </a>
      ` : ''}
    </div>
  `;

  marker.bindPopup(popupContent, {
    maxWidth: 300,
    className: 'cafe-popup-container'
  });

  marker.on('click', () => {
    onCafeClick(cafe);
  });

  return marker;
};
