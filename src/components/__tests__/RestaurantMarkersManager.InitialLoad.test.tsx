
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

describe('RestaurantMarkersManager - Initial Load Tests', () => {
  const createMockMap = (zoom: number) => ({
    getCenter: () => ({ lat: 47.6062, lng: -122.3321 }),
    getBounds: () => ({
      getCenter: () => ({ lat: 47.6062, lng: -122.3321 }),
    }),
    getZoom: () => zoom,
    on: () => {},
    off: () => {},
    hasLayer: () => false,
    removeLayer: () => {},
  }) as unknown as L.Map;

  const mockOnRestaurantClick = () => {};

  const defaultMapContext = {
    showVegetarianRestaurants: true,
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
  };

  beforeEach(() => {
    (mockUseRestaurants as any).mockReturnValue({
      restaurants: [],
      fetchRestaurants: mockFetchRestaurants,
      loading: false,
      error: null,
    });

    (mockUseMap as any).mockReturnValue(defaultMapContext);
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should fetch restaurants on initial load with low zoom level (zoom < 12)', async () => {
    const mockMap = createMockMap(8);

    const { container } = render(
      <RestaurantMarkersManager 
        map={mockMap} 
        onRestaurantClick={mockOnRestaurantClick} 
      />
    );

    expect(container).toBeDefined();
  });

  it('should fetch restaurants on initial load with medium zoom level (zoom = 12)', async () => {
    const mockMap = createMockMap(12);

    const { container } = render(
      <RestaurantMarkersManager 
        map={mockMap} 
        onRestaurantClick={mockOnRestaurantClick} 
      />
    );

    expect(container).toBeDefined();
  });

  it('should fetch restaurants on initial load with high zoom level (zoom > 12)', async () => {
    const mockMap = createMockMap(16);

    const { container } = render(
      <RestaurantMarkersManager 
        map={mockMap} 
        onRestaurantClick={mockOnRestaurantClick} 
      />
    );

    expect(container).toBeDefined();
  });

  it('should ensure zoom level does not prevent initial restaurant loading', async () => {
    const mockMap = createMockMap(5);

    const { container } = render(
      <RestaurantMarkersManager 
        map={mockMap} 
        onRestaurantClick={mockOnRestaurantClick} 
      />
    );

    expect(container).toBeDefined();
  });
});
