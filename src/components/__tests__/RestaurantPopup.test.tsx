
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RestaurantPopup from '../RestaurantPopup';
import { Restaurant } from '@/hooks/useRestaurants';

describe('RestaurantPopup - UI Regression Tests', () => {
  const mockRestaurant: Restaurant = {
    id: 1,
    name: 'Test Restaurant',
    coordinates: [-122.3321, 47.6062],
    rating: 4.5,
    reviews: 100,
    cuisine: 'Italian',
    description: 'A nice Italian restaurant',
    website: 'https://example.com',
    isVegetarian: true
  };

  const mockOnClose = vi.fn();

  it('should not render a close button (X button)', () => {
    const { container } = render(
      <RestaurantPopup 
        restaurant={mockRestaurant} 
        onClose={mockOnClose} 
      />
    );

    // Check that there's no close button with common close button patterns
    expect(container.querySelector('button')).toBeNull();
    
    // Also check for common close button classes or data attributes
    const closeButtons = container.querySelectorAll('[data-testid*="close"], [class*="close"], button[aria-label*="close"]');
    expect(closeButtons).toHaveLength(0);
  });

  it('should render restaurant information correctly', () => {
    const { getByText } = render(
      <RestaurantPopup 
        restaurant={mockRestaurant} 
        onClose={mockOnClose} 
      />
    );

    expect(getByText('Test Restaurant')).toBeInTheDocument();
    expect(getByText('4.5')).toBeInTheDocument();
    expect(getByText('(100 reviews)')).toBeInTheDocument();
    expect(getByText('Italian')).toBeInTheDocument();
    expect(getByText('A nice Italian restaurant')).toBeInTheDocument();
    expect(getByText('Visit Website')).toBeInTheDocument();
  });
});
