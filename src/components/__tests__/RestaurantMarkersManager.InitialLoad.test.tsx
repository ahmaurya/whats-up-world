
import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import RestaurantMarkersManager from '../RestaurantMarkersManager';
import { useRestaurants } from '@/hooks/useRestaurants';
import { useMap } from '../MapProvider';
import L from 'leaflet';

// Mock the hooks
vi.mock('@/hooks/useRestaurants');
vi.mock('../MapProvider');

// Mock Leaflet
vi.mock('leaflet', () => ({
  default: {
    marker: vi.fn(() => ({
      addTo: vi.fn(),
      bindPopup: vi.fn(),
      on: vi.fn(),
    })),
    divIcon: vi.fn(() => ({})),
  },
}));

const mockFetchRestaurants = vi.fn();
const mockUseRestaurants = useRestaurants as vi.MockedFunction<typeof useRestaurants>;
const mockUseMap = useMap as vi.MockedFunction<typeof useMap>;

describe('RestaurantMarkersManager - Initial Load Tests', () => {
  const mockMap = {
    getCenter: vi.fn(() => ({ lat: 47.6062, lng: -122.3321 })),
    getBounds: vi.fn(() => ({
      getCenter: vi.fn(() => ({ lat: 47.6062, lng: -122.3321 })),
    })),
    getZoom: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    hasLayer: vi.fn(() => false),
    removeLayer: vi.fn(),
  } as unknown as L.Map;

  const mockOnRestaurantClick = vi.fn();

  beforeEach(() => {
    mockUseRestaurants.mockReturnValue({
      restaurants: [],
      fetchRestaurants: mockFetchRestaurants,
      loading: false,
      error: null,
    });

    mockUseMap.mockReturnValue({
      showVegetarianRestaurants: true,
      showNonVegetarianRestaurants: false,
      selectedPoints: [],
      pointNames: [],
      addPoint: vi.fn(),
      addPointWithName: vi.fn(),
      clearPoints: vi.fn(),
      showRailTransit: false,
      toggleRailTransit: vi.fn(),
      showTramTransit: false,
      toggleTramTransit: vi.fn(),
      showBusTransit: false,
      toggleBusTransit: vi.fn(),
      showRestaurants: false,
      toggleRestaurants: vi.fn(),
      toggleVegetarianRestaurants: vi.fn(),
      toggleNonVegetarianRestaurants: vi.fn(),
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should fetch restaurants on initial load with low zoom level (zoom < 12)', async () => {
    (mockMap.getZoom as vi.Mock).mockReturnValue(8);

    render(
      <RestaurantMarkersManager 
        map={mockMap} 
        onRestaurantClick={mockOnRestaurantClick} 
      />
    );

    await waitFor(() => {
      expect(mockFetchRestaurants).toHaveBeenCalledWith(
        47.6062,
        -122.3321,
        5000,
        true,
        false
      );
    }, { timeout: 2000 });
  });

  it('should fetch restaurants on initial load with medium zoom level (zoom = 12)', async () => {
    (mockMap.getZoom as vi.Mock).mockReturnValue(12);

    render(
      <RestaurantMarkersManager 
        map={mockMap} 
        onRestaurantClick={mockOnRestaurantClick} 
      />
    );

    await waitFor(() => {
      expect(mockFetchRestaurants).toHaveBeenCalledWith(
        47.6062,
        -122.3321,
        5000,
        true,
        false
      );
    }, { timeout: 2000 });
  });

  it('should fetch restaurants on initial load with high zoom level (zoom > 12)', async () => {
    (mockMap.getZoom as vi.Mock).mockReturnValue(16);

    render(
      <RestaurantMarkersManager 
        map={mockMap} 
        onRestaurantClick={mockOnRestaurantClick} 
      />
    );

    await waitFor(() => {
      expect(mockFetchRestaurants).toHaveBeenCalledWith(
        47.6062,
        -122.3321,
        5000,
        true,
        false
      );
    }, { timeout: 2000 });
  });

  it('should ensure zoom level does not prevent initial restaurant loading', async () => {
    (mockMap.getZoom as vi.Mock).mockReturnValue(5);

    render(
      <RestaurantMarkersManager 
        map={mockMap} 
        onRestaurantClick={mockOnRestaurantClick} 
      />
    );

    await waitFor(() => {
      expect(mockFetchRestaurants).toHaveBeenCalledWith(
        47.6062,
        -122.3321,
        5000,
        true,
        false
      );
    }, { timeout: 2000 });
  });
});
