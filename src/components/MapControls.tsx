import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useMap } from './MapProvider';
import { Train, Bus, Zap, Leaf, UtensilsCrossed, Building2, Coffee, Eye, ShoppingBasket, CircleParking, Images } from 'lucide-react';

const MapControls = () => {
  const { 
    showRailTransit, 
    toggleRailTransit,
    showTramTransit,
    toggleTramTransit,
    showBusTransit, 
    toggleBusTransit, 
    showVegetarianRestaurants, 
    toggleVegetarianRestaurants,
    showNonVegetarianRestaurants,
    toggleNonVegetarianRestaurants,
    showHistoricPlaces,
    toggleHistoricPlaces,
    showCafes,
    toggleCafes,
    showScenicViewpoints,
    toggleScenicViewpoints,
    showFarmersMarkets,
    toggleFarmersMarkets,
    showParking,
    toggleParking,
    showDisabledParking,
    toggleDisabledParking,
    showGeocodedImages,
    toggleGeocodedImages
  } = useMap();

  const layerOptions = [
    {
      id: 'rail',
      label: 'Rail/Subway',
      icon: Train,
      color: 'bg-blue-500',
      checked: showRailTransit,
      toggle: toggleRailTransit
    },
    {
      id: 'tram',
      label: 'Trams',
      icon: Zap,
      color: 'bg-orange-500',
      checked: showTramTransit,
      toggle: toggleTramTransit
    },
    {
      id: 'bus',
      label: 'Bus Lines',
      icon: Bus,
      color: 'bg-green-500',
      checked: showBusTransit,
      toggle: toggleBusTransit
    },
    {
      id: 'vegetarian',
      label: 'Vegetarian Restaurants',
      icon: Leaf,
      color: 'bg-green-500',
      checked: showVegetarianRestaurants,
      toggle: toggleVegetarianRestaurants
    },
    {
      id: 'non-vegetarian',
      label: 'Non-Vegetarian Restaurants',
      icon: UtensilsCrossed,
      color: 'bg-red-500',
      checked: showNonVegetarianRestaurants,
      toggle: toggleNonVegetarianRestaurants
    },
    {
      id: 'cafes',
      label: 'Cafes',
      icon: Coffee,
      color: 'bg-amber-600',
      checked: showCafes,
      toggle: toggleCafes
    },
    {
      id: 'farmers-markets',
      label: 'Farmer\'s Markets',
      icon: ShoppingBasket,
      color: 'bg-green-600',
      checked: showFarmersMarkets,
      toggle: toggleFarmersMarkets
    },
    {
      id: 'parking',
      label: 'Free Parking',
      icon: CircleParking,
      color: 'bg-blue-500',
      checked: showParking,
      toggle: toggleParking
    },
    {
      id: 'disabled-parking',
      label: 'Reserved Disabled Parking',
      icon: CircleParking,
      color: 'bg-purple-600',
      checked: showDisabledParking,
      toggle: toggleDisabledParking
    },
    {
      id: 'historic',
      label: 'Historic Places',
      icon: Building2,
      color: 'bg-amber-600',
      checked: showHistoricPlaces,
      toggle: toggleHistoricPlaces
    },
    {
      id: 'scenic-viewpoints',
      label: 'Scenic Viewpoints',
      icon: Eye,
      color: 'bg-indigo-600',
      checked: showScenicViewpoints,
      toggle: toggleScenicViewpoints
    },
    {
      id: 'cityscape',
      label: 'Cityscape',
      icon: Images,
      color: 'bg-pink-500',
      checked: showGeocodedImages,
      toggle: toggleGeocodedImages
    }
  ];

  return (
    <Card className="absolute top-4 right-4 p-4 z-[2000] bg-white/95 backdrop-blur-sm border shadow-lg max-w-xs">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold mb-3">Map Layers</h3>
        {layerOptions.map((option) => {
          const IconComponent = option.icon;
          return (
            <Button
              key={option.id}
              variant={option.checked ? "default" : "outline"}
              size="sm"
              onClick={option.toggle}
              className="w-full justify-start gap-2 h-auto py-2"
            >
              <IconComponent size={14} />
              <div className={`w-3 h-3 rounded-full ${option.color}`}></div>
              <span className="text-xs">{option.label}</span>
            </Button>
          );
        })}
      </div>
    </Card>
  );
};

export default MapControls;
