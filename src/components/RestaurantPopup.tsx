
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, ExternalLink } from 'lucide-react';
import { Restaurant } from '@/hooks/useRestaurants';

interface RestaurantPopupProps {
  restaurant: Restaurant;
  onClose: () => void;
}

const RestaurantPopup: React.FC<RestaurantPopupProps> = ({ restaurant, onClose }) => {
  return (
    <Card className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-6 z-20 bg-white shadow-lg max-w-sm w-full mx-4 min-h-[250px]">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-bold pr-8">{restaurant.name}</h3>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 flex-shrink-0 -mt-2 -mr-2">
          <X size={16} />
        </Button>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            <span className="text-2xl font-bold text-amber-500">
              {restaurant.rating > 0 ? restaurant.rating.toFixed(1) : 'N/A'}
            </span>
            <span className="text-yellow-400 ml-1">★</span>
          </div>
          <span className="text-gray-600">
            ({restaurant.reviews.toLocaleString()} reviews)
          </span>
        </div>
        
        <div className="space-y-2">
          <p className="text-sm">
            <span className="font-medium">Type:</span> {restaurant.cuisine}
          </p>
          <p className="text-sm text-gray-600">
            {restaurant.description}
          </p>
          
          {restaurant.website && (
            <div className="pt-2">
              <a 
                href={restaurant.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
              >
                <ExternalLink size={14} />
                Visit Website
              </a>
            </div>
          )}
        </div>
        
        <div className="pt-2 border-t mt-4">
          <p className="text-xs text-gray-500">
            * Data provided by Google Places API
          </p>
        </div>
      </div>
    </Card>
  );
};

export default RestaurantPopup;
