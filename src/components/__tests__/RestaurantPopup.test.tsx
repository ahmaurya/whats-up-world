
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
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

  const mockOnClose = () => {};

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

    expect(getByText('Test Restaurant')).toBeTruthy();
    expect(getByText('4.5')).toBeTruthy();
    expect(getByText('(100 reviews)')).toBeTruthy();
    expect(getByText('Italian')).toBeTruthy();
    expect(getByText('A nice Italian restaurant')).toBeTruthy();
    expect(getByText('Visit Website')).toBeTruthy();
  });

  it('should render properly structured HTML', () => {
    const { container } = render(
      <RestaurantPopup 
        restaurant={mockRestaurant} 
        onClose={mockOnClose} 
      />
    );

    // Check that the component renders without throwing
    expect(container.firstChild).toBeTruthy();
    
    // Verify basic structure exists
    const card = container.querySelector('.absolute');
    expect(card).toBeTruthy();
  });
});
