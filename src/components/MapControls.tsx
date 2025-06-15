
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMap } from './MapProvider';
import { Settings, Train, Bus, Zap, Leaf, UtensilsCrossed, Building2, Coffee } from 'lucide-react';

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
    toggleCafes
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
      id: 'historic',
      label: 'Historic Places',
      icon: Building2,
      color: 'bg-amber-600',
      checked: showHistoricPlaces,
      toggle: toggleHistoricPlaces
    }
  ];

  return (
    <Card className="absolute top-4 right-4 p-2 z-[2000] bg-white/95 backdrop-blur-sm border shadow-lg">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Settings size={16} />
            Map Layers
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          className="w-64 bg-white border shadow-lg z-[2001]" 
          align="end"
          side="bottom"
        >
          <DropdownMenuLabel>Toggle Map Layers</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <div className="p-2 space-y-3">
            {layerOptions.map((option) => {
              const IconComponent = option.icon;
              return (
                <div key={option.id} className="flex items-center space-x-3">
                  <Checkbox
                    id={option.id}
                    checked={option.checked}
                    onCheckedChange={option.toggle}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <label
                    htmlFor={option.id}
                    className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                  >
                    <IconComponent size={14} />
                    <div className={`w-3 h-3 rounded-full ${option.color}`}></div>
                    {option.label}
                  </label>
                </div>
              );
            })}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </Card>
  );
};

export default MapControls;
