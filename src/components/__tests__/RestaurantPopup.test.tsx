
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RestaurantPopup from '../RestaurantPopup';
import { Restaurant } from '@/hooks/useRestaurants';

describe('RestaurantPopup - UI Regression Tests', () => {
  const mockRestaurant: Restaurant = {
    id: '1',
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
    render(
      <RestaurantPopup 
        restaurant={mockRestaurant} 
        onClose={mockOnClose} 
      />
    );

    // Check that there's no close button with common close button patterns
    expect(screen.queryByText('×')).not.toBeInTheDocument();
    expect(screen.queryByText('✕')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/close/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
    
    // Also check for common close button classes or data attributes
    const closeButtons = document.querySelectorAll('[data-testid*="close"], [class*="close"], button[aria-label*="close"]');
    expect(closeButtons).toHaveLength(0);
  });

  it('should render restaurant information correctly', () => {
    render(
      <RestaurantPopup 
        restaurant={mockRestaurant} 
        onClose={mockOnClose} 
      />
    );

    expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('(100 reviews)')).toBeInTheDocument();
    expect(screen.getByText('Italian')).toBeInTheDocument();
    expect(screen.getByText('A nice Italian restaurant')).toBeInTheDocument();
    expect(screen.getByText('Visit Website')).toBeInTheDocument();
  });
});
