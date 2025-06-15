
import L from 'leaflet';
import { ParkingSpot } from '@/hooks/useParking';

export const createParkingMarker = (spot: ParkingSpot): L.Marker => {
  // Create custom parking icon
  const parkingIcon = L.divIcon({
    html: `
      <div class="flex items-center justify-center w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow-lg">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 4v16h4v-6h3c3.31 0 6-2.69 6-6s-2.69-6-6-6H6zm4 4h3c1.1 0 2 .9 2 2s-.9 2-2 2h-3V8z"/>
        </svg>
      </div>
    `,
    className: 'parking-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });

  // Create marker
  const marker = L.marker([spot.coordinates[1], spot.coordinates[0]], {
    icon: parkingIcon
  });

  // Create popup content
  const popupContent = `
    <div class="parking-popup min-w-[200px]">
      <h3 class="font-semibold text-sm mb-2 text-blue-700">${spot.name}</h3>
      <div class="space-y-1 text-xs">
        <div class="flex justify-between">
          <span class="text-gray-600">Type:</span>
          <span class="font-medium">${formatParkingType(spot.type)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">Fee:</span>
          <span class="font-medium text-green-600">Free</span>
        </div>
        ${spot.timeLimit ? `
          <div class="flex justify-between">
            <span class="text-gray-600">Time Limit:</span>
            <span class="font-medium">${spot.timeLimit}</span>
          </div>
        ` : ''}
        ${spot.capacity ? `
          <div class="flex justify-between">
            <span class="text-gray-600">Capacity:</span>
            <span class="font-medium">${spot.capacity} spots</span>
          </div>
        ` : ''}
        ${spot.surface ? `
          <div class="flex justify-between">
            <span class="text-gray-600">Surface:</span>
            <span class="font-medium">${spot.surface}</span>
          </div>
        ` : ''}
        ${spot.restrictions ? `
          <div class="mt-2 p-2 bg-yellow-50 rounded text-xs">
            <span class="text-orange-600 font-medium">Restrictions:</span><br>
            <span class="text-gray-700">${spot.restrictions}</span>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  marker.bindPopup(popupContent, {
    maxWidth: 250,
    className: 'parking-marker-popup'
  });

  return marker;
};

const formatParkingType = (type: ParkingSpot['type']): string => {
  switch (type) {
    case 'street_side':
      return 'Street Side';
    case 'parking_lane':
      return 'Parking Lane';
    case 'layby':
      return 'Layby';
    default:
      return 'Street Parking';
  }
};
