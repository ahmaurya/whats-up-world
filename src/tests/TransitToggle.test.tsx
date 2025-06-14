
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MapProvider } from '@/components/MapProvider';
import MapControls from '@/components/MapControls';

// Mock Leaflet since it requires DOM
jest.mock('leaflet', () => ({
  map: jest.fn(() => ({
    setView: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    getBounds: jest.fn(() => ({
      getNorth: () => 47.7,
      getSouth: () => 47.5,
      getEast: () => -122.2,
      getWest: () => -122.4
    })),
    getZoom: () => 13,
    hasLayer: jest.fn(() => false),
    addLayer: jest.fn(),
    removeLayer: jest.fn()
  })),
  tileLayer: jest.fn(() => ({
    addTo: jest.fn()
  })),
  layerGroup: jest.fn(() => ({
    addTo: jest.fn(),
    clearLayers: jest.fn(),
    addLayer: jest.fn()
  })),
  polyline: jest.fn(() => ({
    bindTooltip: jest.fn(() => ({
      addTo: jest.fn()
    }))
  }))
}));

describe('Transit Lines Toggle', () => {
  test('should toggle transit lines button state', () => {
    render(
      <MapProvider>
        <MapControls />
      </MapProvider>
    );

    const transitButton = screen.getByText('Transit Lines');
    expect(transitButton).toBeInTheDocument();

    // Initial state should be active (default variant)
    expect(transitButton.closest('button')).toHaveClass('bg-primary');

    // Click to toggle off
    fireEvent.click(transitButton);
    expect(transitButton.closest('button')).not.toHaveClass('bg-primary');

    // Click to toggle back on
    fireEvent.click(transitButton);
    expect(transitButton.closest('button')).toHaveClass('bg-primary');
  });

  test('should call toggleTransit when button is clicked', () => {
    const mockToggleTransit = jest.fn();
    
    // We'll need to mock the MapProvider context
    jest.mock('@/components/MapProvider', () => ({
      useMap: () => ({
        showTransit: true,
        toggleTransit: mockToggleTransit,
        clearPoints: jest.fn(),
        showRestaurants: false,
        toggleRestaurants: jest.fn()
      })
    }));

    render(<MapControls />);
    
    const transitButton = screen.getByText('Transit Lines');
    fireEvent.click(transitButton);
    
    expect(mockToggleTransit).toHaveBeenCalledTimes(1);
  });
});
