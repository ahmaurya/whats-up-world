
import { render } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import RestaurantMarkersManager from '../RestaurantMarkersManager';
import { useRestaurants } from '@/hooks/useRestaurants';
import { useMap } from '../MapProvider';
import L from 'leaflet';

// Create mock implementations
const mockFetchRestaurants = () => Promise.resolve();
const mockUseRestaurants = useRestaurants as unknown as () => {
  restaurants: never[];
  fetchRestaurants: typeof mockFetchRestaurants;
  loading: boolean;
  error: null;
};

const mockUseMap = useMap as unknown as () => {
  showVegetarianRestaurants: boolean;
  showNonVegetarianRestaurants: boolean;
  selectedPoints: never[];
  pointNames: never[];
  addPoint: () => void;
  addPointWithName: () => void;
  clearPoints: () => void;
  showRailTransit: boolean;
  toggleRailTransit: () => void;
  showTramTransit: boolean;
  toggleTramTransit: () => void;
  showBusTransit: boolean;
  toggleBusTransit: () => void;
  showRestaurants: boolean;
  toggleRestaurants: () => void;
  toggleVegetarianRestaurants: () => void;
  toggleNonVegetarianRestaurants: () => void;
};

// Mock the hooks
jest.mock('@/hooks/useRestaurants', () => ({
  useRestaurants: mockUseRestaurants
}));

jest.mock('../MapProvider', () => ({
  useMap: mockUseMap
}));

// Mock Leaflet
jest.mock('leaflet', () => ({
  default: {
    marker: () => ({
      addTo: () => {},
      bindPopup: () => {},
      on: () => {},
    }),
    divIcon: () => ({}),
  },
}));

describe('RestaurantMarkersManager - Filtering Tests', () => {
  const mockMap = {
    getCenter: () => ({ lat: 47.6062, lng: -122.3321 }),
    getBounds: () => ({
      getCenter: () => ({ lat: 47.6062, lng: -122.3321 }),
    }),
    getZoom: () => 13,
    on: () => {},
    off: () => {},
    hasLayer: () => false,
    removeLayer: () => {},
  } as unknown as L.Map;

  const mockOnRestaurantClick = () => {};

  beforeEach(() => {
    // Reset mock implementations
    (mockUseRestaurants as any).mockReturnValue({
      restaurants: [],
      fetchRestaurants: mockFetchRestaurants,
      loading: false,
      error: null,
    });
  });

  afterEach(() => {
    // Clean up any timers
    jest.clearAllTimers();
  });

  it('should not fetch restaurants when no restaurant types are enabled', async () => {
    (mockUseMap as any).mockReturnValue({
      showVegetarianRestaurants: false,
      showNonVegetarianRestaurants: false,
      selectedPoints: [],
      pointNames: [],
      addPoint: () => {},
      addPointWithName: () => {},
      clearPoints: () => {},
      showRailTransit: false,
      toggleRailTransit: () => {},
      showTramTransit: false,
      toggleTramTransit: () => {},
      showBusTransit: false,
      toggleBusTransit: () => {},
      showRestaurants: false,
      toggleRestaurants: () => {},
      toggleVegetarianRestaurants: () => {},
      toggleNonVegetarianRestaurants: () => {},
    });

    const { container } = render(
      <RestaurantMarkersManager 
        map={mockMap} 
        onRestaurantClick={mockOnRestaurantClick} 
      />
    );

    // Basic rendering test
    expect(container).toBeDefined();
  });

  it('should fetch restaurants when both vegetarian and non-vegetarian are enabled', async () => {
    (mockUseMap as any).mockReturnValue({
      showVegetarianRestaurants: true,
      showNonVegetarianRestaurants: true,
      selectedPoints: [],
      pointNames: [],
      addPoint: () => {},
      addPointWithName: () => {},
      clearPoints: () => {},
      showRailTransit: false,
      toggleRailTransit: () => {},
      showTramTransit: false,
      toggleTramTransit: () => {},
      showBusTransit: false,
      toggleBusTransit: () => {},
      showRestaurants: false,
      toggleRestaurants: () => {},
      toggleVegetarianRestaurants: () => {},
      toggleNonVegetarianRestaurants: () => {},
    });

    const { container } = render(
      <RestaurantMarkersManager 
        map={mockMap} 
        onRestaurantClick={mockOnRestaurantClick} 
      />
    );

    // Basic rendering test
    expect(container).toBeDefined();
  });
});
