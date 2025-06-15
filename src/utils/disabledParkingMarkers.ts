
import L from 'leaflet';
import { DisabledParkingSpot } from '@/hooks/useParking';

export const createDisabledParkingMarker = (spot: DisabledParkingSpot): L.Marker => {
  // Create custom disabled parking icon
  const disabledParkingIcon = L.divIcon({
    html: `
      <div class="flex items-center justify-center w-6 h-6 bg-purple-600 rounded-full border-2 border-white shadow-lg">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 4v16h4v-6h3c3.31 0 6-2.69 6-6s-2.69-6-6-6H6zm4 4h3c1.1 0 2 .9 2 2s-.9 2-2 2h-3V8z"/>
          <path d="M20.5 6c0 2.3-1.6 4.1-3.7 4.6l3.1 3.1c.8-.8 1.6-1.9 1.6-3.2 0-2.5-2-4.5-4.5-4.5s-4.5 2-4.5 4.5c0 1.3.8 2.4 1.6 3.2l3.1-3.1C14.6 10.1 13 8.3 13 6c0-2.5 2-4.5 4.5-4.5S22 3.5 22 6z"/>
        </svg>
      </div>
    `,
    className: 'disabled-parking-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });

  // Create marker
  const marker = L.marker([spot.coordinates[1], spot.coordinates[0]], {
    icon: disabledParkingIcon
  });

  // Create popup content
  const popupContent = `
    <div class="disabled-parking-popup min-w-[200px]">
      <h3 class="font-semibold text-sm mb-2 text-purple-700">♿ ${spot.name}</h3>
      <div class="space-y-1 text-xs">
        <div class="flex justify-between">
          <span class="text-gray-600">Type:</span>
          <span class="font-medium text-purple-600">Disabled Parking</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">Fee:</span>
          <span class="font-medium text-green-600">${formatFee(spot.fee)}</span>
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
        <div class="mt-2 p-2 bg-purple-50 rounded text-xs">
          <span class="text-purple-600 font-medium">Note:</span><br>
          <span class="text-gray-700">Reserved for vehicles displaying valid disabled parking permits</span>
        </div>
      </div>
    </div>
  `;

  marker.bindPopup(popupContent, {
    maxWidth: 250,
    className: 'disabled-parking-marker-popup'
  });

  return marker;
};

const formatFee = (fee: DisabledParkingSpot['fee']): string => {
  switch (fee) {
    case 'no':
      return 'Free';
    case 'yes':
      return 'Paid';
    default:
      return 'Unknown';
  }
};
