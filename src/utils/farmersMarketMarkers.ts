
import L from 'leaflet';
import { FarmersMarket } from '@/hooks/useFarmersMarkets';

export const createFarmersMarketMarker = (market: FarmersMarket): L.Marker => {
  // Create custom farmer's market icon matching the legend
  const marketIcon = L.divIcon({
    html: `
      <div class="relative flex items-center justify-center">
        <div class="bg-green-600 rounded-full p-1 shadow-lg border-2 border-white">
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/>
            <path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"/>
            <path d="M12 3v6"/>
          </svg>
        </div>
      </div>
    `,
    className: 'farmers-market-marker',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8]
  });

  const marker = L.marker([market.coordinates[1], market.coordinates[0]], {
    icon: marketIcon
  });

  // Create popup content
  const nextMarketInfo = getNextMarketDate(market.schedule);
  
  const popupContent = `
    <div class="farmers-market-popup p-3 min-w-[200px]">
      <div class="flex items-center gap-2 mb-2">
        <h3 class="font-semibold text-lg text-gray-800">${market.name}</h3>
        <span class="text-xs">🗺️</span>
      </div>
      
      ${nextMarketInfo ? `
        <div class="bg-green-50 border border-green-200 rounded-lg p-2 mb-3">
          <div class="flex items-center gap-1 mb-1">
            <span class="text-green-600 font-medium text-sm">📅 Next Market:</span>
          </div>
          <div class="text-sm text-green-800 font-medium">${nextMarketInfo}</div>
        </div>
      ` : ''}
      
      <p class="text-sm text-gray-600 mb-2">${market.description}</p>
      
      <div class="text-xs text-gray-500 mb-2">
        <strong>📍 Address:</strong> ${market.address}
      </div>
      
      ${market.schedule.length > 0 ? `
        <div class="text-xs text-gray-500 mb-3">
          <strong>🕒 Schedule:</strong><br>
          ${market.schedule.map(s => `${s.day}: ${s.time}`).join('<br>')}
        </div>
      ` : ''}
      
      <div class="flex gap-2">
        ${market.website ? `
          <a href="${market.website}" target="_blank" rel="noopener noreferrer" 
             class="inline-block bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors">
            🌐 Website
          </a>
        ` : ''}
        ${market.phone ? `
          <a href="tel:${market.phone}" 
             class="inline-block bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors">
            📞 Call
          </a>
        ` : ''}
      </div>
    </div>
  `;

  marker.bindPopup(popupContent, {
    maxWidth: 300,
    className: 'farmers-market-popup-container'
  });

  // Add tooltip with next market date for hover
  if (nextMarketInfo) {
    marker.bindTooltip(`Next: ${nextMarketInfo}`, {
      direction: 'top',
      offset: [0, -10],
      className: 'farmers-market-tooltip'
    });
  }

  return marker;
};

// Helper function to calculate next market date
const getNextMarketDate = (schedule: FarmersMarket['schedule']): string | null => {
  if (!schedule || schedule.length === 0) return null;

  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  let nextDate: Date | null = null;
  let nextSchedule: FarmersMarket['schedule'][0] | null = null;

  for (const marketDay of schedule) {
    const marketDayIndex = dayNames.indexOf(marketDay.day);
    if (marketDayIndex === -1) continue;

    // Calculate days until this market day
    let daysUntil = marketDayIndex - currentDay;
    if (daysUntil < 0) {
      daysUntil += 7; // Next week
    } else if (daysUntil === 0) {
      // Check if it's still today and market hasn't passed
      const marketTime = parseMarketTime(marketDay.time);
      if (marketTime && now.getHours() * 60 + now.getMinutes() > marketTime.endMinutes) {
        daysUntil = 7; // Next week
      }
    }

    const marketDate = new Date(now);
    marketDate.setDate(now.getDate() + daysUntil);

    if (!nextDate || marketDate < nextDate) {
      nextDate = marketDate;
      nextSchedule = marketDay;
    }
  }

  if (!nextDate || !nextSchedule) return null;

  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'long', 
    month: 'short', 
    day: 'numeric' 
  };
  
  const dateStr = nextDate.toLocaleDateString('en-US', options);
  return `${dateStr}, ${nextSchedule.time}`;
};

const parseMarketTime = (timeStr: string) => {
  // Parse time like "8:00 AM - 2:00 PM"
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;

  const [, startHour, startMin, startAmPm, endHour, endMin, endAmPm] = match;
  
  let startHour24 = parseInt(startHour);
  let endHour24 = parseInt(endHour);
  
  if (startAmPm.toUpperCase() === 'PM' && startHour24 !== 12) startHour24 += 12;
  if (startAmPm.toUpperCase() === 'AM' && startHour24 === 12) startHour24 = 0;
  
  if (endAmPm.toUpperCase() === 'PM' && endHour24 !== 12) endHour24 += 12;
  if (endAmPm.toUpperCase() === 'AM' && endHour24 === 12) endHour24 = 0;

  return {
    startMinutes: startHour24 * 60 + parseInt(startMin),
    endMinutes: endHour24 * 60 + parseInt(endMin)
  };
};
