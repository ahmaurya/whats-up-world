
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useMap } from './MapProvider';
import { Map, Train, Bus, Leaf, UtensilsCrossed } from 'lucide-react';

const MapControls = () => {
  const { 
    showRailTransit, 
    toggleRailTransit, 
    showBusTransit, 
    toggleBusTransit, 
    showVegetarianRestaurants, 
    toggleVegetarianRestaurants,
    showNonVegetarianRestaurants,
    toggleNonVegetarianRestaurants
  } = useMap();

  return (
    <Card className="absolute top-16 right-4 p-3 space-y-3 z-[2000] bg-white/95 backdrop-blur-sm border shadow-lg w-auto min-w-0">
      <div className="flex flex-col space-y-2 items-center">
        <Button
          variant={showRailTransit ? "default" : "outline"}
          size="sm"
          onClick={toggleRailTransit}
          className="flex items-center gap-2 w-full justify-center text-xs px-3 py-1.5 min-w-[160px]"
        >
          <Train size={14} />
          Rail/Subway
        </Button>
        
        <Button
          variant={showBusTransit ? "default" : "outline"}
          size="sm"
          onClick={toggleBusTransit}
          className="flex items-center gap-2 w-full justify-center text-xs px-3 py-1.5 min-w-[160px]"
        >
          <Bus size={14} />
          Bus Lines
        </Button>
        
        <Button
          variant={showVegetarianRestaurants ? "default" : "outline"}
          size="sm"
          onClick={toggleVegetarianRestaurants}
          className="flex items-center gap-2 w-full justify-center text-xs px-3 py-1.5 min-w-[160px]"
        >
          <Leaf size={14} />
          Vegetarian
        </Button>

        <Button
          variant={showNonVegetarianRestaurants ? "default" : "outline"}
          size="sm"
          onClick={toggleNonVegetarianRestaurants}
          className="flex items-center gap-2 w-full justify-center text-xs px-3 py-1.5 min-w-[160px]"
        >
          <UtensilsCrossed size={14} />
          Non-Vegetarian
        </Button>
      </div>
      
      <div className="text-xs text-gray-600 space-y-2 w-44">
        <div className="space-y-1">
          <div className="flex items-center gap-2 justify-center">
            <div className="w-4 h-1 bg-blue-500 rounded"></div>
            <span>Subway/Rail</span>
          </div>
          <div className="flex items-center gap-2 justify-center">
            <div className="w-4 h-1 bg-green-500 rounded"></div>
            <span>Bus Lines</span>
          </div>
          <div className="flex items-center gap-2 justify-center">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Vegetarian</span>
          </div>
          <div className="flex items-center gap-2 justify-center">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Non-Vegetarian</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default MapControls;
