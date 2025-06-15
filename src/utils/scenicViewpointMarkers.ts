
import L from 'leaflet';
import { ScenicViewpoint } from '@/hooks/useScenicViewpoints';
import { searchUnsplashImages, generateSearchQuery } from './unsplashService';

export const createScenicViewpointMarker = (viewpoint: ScenicViewpoint): L.Marker => {
  // Create custom scenic viewpoint icon
  const viewpointIcon = L.divIcon({
    html: `
      <div class="relative flex items-center justify-center">
        <div class="bg-indigo-600 rounded-full p-1 shadow-lg border-2 border-white">
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
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

  // Enhanced image handling with Unsplash integration
  const getImageHtml = async () => {
    // First try existing image sources
    if (viewpoint.image) {
      let imageUrl = viewpoint.image;
      
      // Handle Wikimedia Commons URLs
      if (imageUrl.includes('wikimedia') || imageUrl.includes('commons')) {
        if (imageUrl.includes('File:')) {
          const fileName = imageUrl.split('File:')[1];
          const thumbnailUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${fileName}?width=200`;
          return `
            <div class="mb-3">
              <img src="${thumbnailUrl}" alt="${viewpoint.name}" 
                   class="w-full h-24 object-cover rounded-lg shadow-sm border" 
                   onerror="this.parentElement.innerHTML='<a href=\\"${imageUrl}\\" target=\\"_blank\\" class=\\"inline-block bg-indigo-600 text-white px-2 py-1 rounded text-xs hover:bg-indigo-700 transition-colors\\">📸 View Image</a>'" />
            </div>
          `;
        } else if (!imageUrl.startsWith('http')) {
          imageUrl = `https://commons.wikimedia.org/wiki/File:${imageUrl}`;
        }
        return `
          <div class="mb-3">
            <a href="${imageUrl}" target="_blank" rel="noopener noreferrer" 
               class="inline-block bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700 transition-colors">
              📸 View Image
            </a>
          </div>
        `;
      } else if (imageUrl.startsWith('http')) {
        return `
          <div class="mb-3">
            <img src="${imageUrl}" alt="${viewpoint.name}" 
                 class="w-full h-24 object-cover rounded-lg shadow-sm border" 
                 onerror="this.style.display='none'" />
          </div>
        `;
      }
    }
    
    // Try to get Unsplash image for named viewpoints
    if (viewpoint.name && 
        !viewpoint.name.includes('Viewpoint') && 
        !viewpoint.name.includes('View Point') &&
        viewpoint.name.length > 5) {
      
      try {
        const searchQuery = generateSearchQuery(viewpoint.name, viewpoint.coordinates);
        console.log(`🖼️ Searching Unsplash for: "${searchQuery}"`);
        
        const unsplashImageUrl = await searchUnsplashImages(searchQuery);
        
        if (unsplashImageUrl) {
          return `
            <div class="mb-3">
              <img src="${unsplashImageUrl}" alt="${viewpoint.name} scenic view" 
                   class="w-full h-24 object-cover rounded-lg shadow-sm border" />
              <div class="text-xs text-gray-500 mt-1 text-center">Photo from Unsplash</div>
            </div>
          `;
        }
      } catch (error) {
        console.error('🖼️ Error fetching Unsplash image:', error);
      }
    }
    
    return '';
  };

  // Create additional info sections
  const getAdditionalInfo = () => {
    const info = [];
    
    if (viewpoint.elevation) {
      info.push(`
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xs text-gray-500">🏔️ Elevation:</span>
          <span class="text-xs font-medium text-gray-700">${viewpoint.elevation}m</span>
        </div>
      `);
    }
    
    if (viewpoint.direction) {
      info.push(`
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xs text-gray-500">🧭 View:</span>
          <span class="text-xs font-medium text-gray-700">${viewpoint.direction}</span>
        </div>
      `);
    }
    
    if (viewpoint.operator) {
      info.push(`
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xs text-gray-500">🏢 Operator:</span>
          <span class="text-xs font-medium text-gray-700">${viewpoint.operator}</span>
        </div>
      `);
    }
    
    if (viewpoint.opening_hours) {
      info.push(`
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xs text-gray-500">🕒 Hours:</span>
          <span class="text-xs font-medium text-gray-700">${viewpoint.opening_hours}</span>
        </div>
      `);
    }
    
    return info.join('');
  };

  // Create external links section
  const getExternalLinks = () => {
    const links = [];
    
    if (viewpoint.wikipedia) {
      links.push(`
        <a href="https://en.wikipedia.org/wiki/${viewpoint.wikipedia}" target="_blank" rel="noopener noreferrer" 
           class="inline-block bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors mr-2 mb-1">
          📖 Wikipedia
        </a>
      `);
    }
    
    if (viewpoint.website) {
      links.push(`
        <a href="${viewpoint.website}" target="_blank" rel="noopener noreferrer" 
           class="inline-block bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors mr-2 mb-1">
          🌐 Website
        </a>
      `);
    }
    
    return links.length > 0 ? `<div class="mt-3">${links.join('')}</div>` : '';
  };

  // Create popup content with async image loading
  const createPopupContent = async () => {
    const imageHtml = await getImageHtml();
    
    return `
      <div class="scenic-viewpoint-popup p-4 min-w-[250px] max-w-[300px]">
        <h3 class="font-bold text-lg text-gray-800 mb-2 leading-tight">${viewpoint.name}</h3>
        ${imageHtml}
        <p class="text-sm text-gray-600 mb-3 leading-relaxed">${viewpoint.description}</p>
        ${getAdditionalInfo()}
        ${getExternalLinks()}
      </div>
    `;
  };

  // Set up popup with async content loading
  marker.on('click', async () => {
    const popupContent = await createPopupContent();
    marker.bindPopup(popupContent, {
      maxWidth: 320,
      className: 'scenic-viewpoint-popup-container'
    }).openPopup();
  });

  // Initial popup setup with basic content (for immediate display)
  const initialPopupContent = `
    <div class="scenic-viewpoint-popup p-4 min-w-[250px] max-w-[300px]">
      <h3 class="font-bold text-lg text-gray-800 mb-2 leading-tight">${viewpoint.name}</h3>
      <div class="mb-3 text-center text-gray-500">Loading image...</div>
      <p class="text-sm text-gray-600 mb-3 leading-relaxed">${viewpoint.description}</p>
      ${getAdditionalInfo()}
      ${getExternalLinks()}
    </div>
  `;

  marker.bindPopup(initialPopupContent, {
    maxWidth: 320,
    className: 'scenic-viewpoint-popup-container'
  });

  return marker;
};
