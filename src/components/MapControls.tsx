
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useMap } from './MapProvider';
import { Train, Bus, Zap, Leaf, UtensilsCrossed, Building2 } from 'lucide-react';

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
    toggleHistoricPlaces
  } = useMap();

  return (
    <Card className="absolute top-16 right-4 p-3 space-y-3 z-[2000] bg-white/95 backdrop-blur-sm border shadow-lg w-auto min-w-0">
      <div className="flex flex-col space-y-2 items-center">
        <Button
          variant={showRailTransit ? "default" : "outline"}
          size="sm"
          onClick={toggleRailTransit}
          className="flex items-center gap-2 w-full justify-start text-xs px-3 py-1.5 min-w-[180px]"
        >
          <Train size={14} />
          <div className="w-4 h-1 bg-blue-500 rounded mr-1"></div>
          Rail/Subway
        </Button>

        <Button
          variant={showTramTransit ? "default" : "outline"}
          size="sm"
          onClick={toggleTramTransit}
          className="flex items-center gap-2 w-full justify-start text-xs px-3 py-1.5 min-w-[180px]"
        >
          <Zap size={14} />
          <div className="w-4 h-1 bg-orange-500 rounded mr-1"></div>
          Trams
        </Button>
        
        <Button
          variant={showBusTransit ? "default" : "outline"}
          size="sm"
          onClick={toggleBusTransit}
          className="flex items-center gap-2 w-full justify-start text-xs px-3 py-1.5 min-w-[180px]"
        >
          <Bus size={14} />
          <div className="w-4 h-1 bg-green-500 rounded mr-1"></div>
          Bus Lines
        </Button>
        
        <Button
          variant={showVegetarianRestaurants ? "default" : "outline"}
          size="sm"
          onClick={toggleVegetarianRestaurants}
          className="flex items-center gap-2 w-full justify-start text-xs px-3 py-1.5 min-w-[180px]"
        >
          <Leaf size={14} />
          <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
          Vegetarian
        </Button>

        <Button
          variant={showNonVegetarianRestaurants ? "default" : "outline"}
          size="sm"
          onClick={toggleNonVegetarianRestaurants}
          className="flex items-center gap-2 w-full justify-start text-xs px-3 py-1.5 min-w-[180px]"
        >
          <UtensilsCrossed size={14} />
          <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
          Non-Vegetarian
        </Button>

        <Button
          variant={showHistoricPlaces ? "default" : "outline"}
          size="sm"
          onClick={toggleHistoricPlaces}
          className="flex items-center gap-2 w-full justify-start text-xs px-3 py-1.5 min-w-[180px]"
        >
          <Building2 size={14} />
          <div className="w-3 h-3 bg-amber-600 rounded-full mr-1"></div>
          Historic Places
        </Button>
      </div>
    </Card>
  );
};

export default MapControls;
