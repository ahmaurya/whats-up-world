
import L from 'leaflet';

export const shouldFetchRestaurants = (
  currentBounds: L.LatLngBounds,
  lastFetchedBounds: L.LatLngBounds | null
): boolean => {
  if (!lastFetchedBounds) return true;
  
  const currentCenter = currentBounds.getCenter();
  const lastCenter = lastFetchedBounds.getCenter();
  
  // Calculate distance between centers
  const distance = currentCenter.distanceTo(lastCenter);
  
  // Fetch if moved more than 2km or if bounds don't overlap significantly
  return distance > 2000 || !lastFetchedBounds.intersects(currentBounds);
};

// Removed zoom level restriction for GDELT events - now always returns true
export const isZoomLevelSufficient = (zoom: number): boolean => {
  return true; // Show events at any zoom level
};

export const createDebouncer = (callback: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return (...args: any[]) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      callback(...args);
    }, delay);
  };
};
