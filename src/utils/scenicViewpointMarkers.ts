
import L from 'leaflet';
import { ScenicViewpoint } from '@/hooks/useScenicViewpoints';

export const createScenicViewpointMarker = (viewpoint: ScenicViewpoint): L.Marker => {
  // Create custom scenic viewpoint icon
  const viewpointIcon = L.divIcon({
    html: `
      <div class="relative flex items-center justify-center">
        <div class="bg-indigo-600 rounded-full p-1 shadow-lg border-2 border-white">
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </div>
      </div>
    `,
    className: 'scenic-viewpoint-marker',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    popupAnchor: [0, -12]
  });

  const marker = L.marker([viewpoint.coordinates[1], viewpoint.coordinates[0]], {
    icon: viewpointIcon
  });

  // Create popup content with image if available
  const getImageHtml = () => {
    if (viewpoint.image) {
      let imageUrl = viewpoint.image;
      
      // Handle Wikimedia Commons URLs
      if (imageUrl.includes('wikimedia') || imageUrl.includes('commons')) {
        if (!imageUrl.startsWith('http')) {
          imageUrl = `https://commons.wikimedia.org/wiki/File:${imageUrl}`;
        }
        // For Wikimedia, we'll show a placeholder since direct image embedding is complex
        return `
          <div class="mb-2">
            <a href="${imageUrl}" target="_blank" rel="noopener noreferrer" 
               class="inline-block bg-indigo-600 text-white px-2 py-1 rounded text-xs hover:bg-indigo-700 transition-colors">
              📸 View Image
            </a>
          </div>
        `;
      } else if (imageUrl.startsWith('http')) {
        return `
          <div class="mb-2">
            <img src="${imageUrl}" alt="${viewpoint.name}" 
                 class="w-full h-20 object-cover rounded" 
                 onerror="this.style.display='none'" />
          </div>
        `;
      }
    }
    return '';
  };
  
  const popupContent = `
    <div class="scenic-viewpoint-popup p-3 min-w-[200px]">
      <h3 class="font-semibold text-lg text-gray-800 mb-2">${viewpoint.name}</h3>
      ${getImageHtml()}
      <p class="text-sm text-gray-600 mb-2">${viewpoint.description}</p>
      ${viewpoint.elevation ? `
        <div class="flex items-center gap-1 mb-1">
          <span class="text-xs text-gray-500">Elevation:</span>
          <span class="text-xs font-medium">${viewpoint.elevation}m</span>
        </div>
      ` : ''}
      ${viewpoint.direction ? `
        <div class="flex items-center gap-1 mb-2">
          <span class="text-xs text-gray-500">View direction:</span>
          <span class="text-xs font-medium">${viewpoint.direction}</span>
        </div>
      ` : ''}
      ${viewpoint.wikipedia ? `
        <a href="https://en.wikipedia.org/wiki/${viewpoint.wikipedia}" target="_blank" rel="noopener noreferrer" 
           class="inline-block bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700 transition-colors mt-1">
          📖 Wikipedia
        </a>
      ` : ''}
    </div>
  `;

  marker.bindPopup(popupContent, {
    maxWidth: 300,
    className: 'scenic-viewpoint-popup-container'
  });

  return marker;
};
