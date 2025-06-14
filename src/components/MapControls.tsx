
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useMap } from './MapProvider';
import { Map, Bus, Train } from 'lucide-react';

const MapControls = () => {
  const { clearPoints, showTransit, toggleTransit, showRestaurants, toggleRestaurants } = useMap();

  return (
    <Card className="absolute top-4 left-4 p-4 space-y-2 z-10 bg-white/95 backdrop-blur-sm">
      <div className="flex flex-col space-y-2">
        <Button
          variant={showTransit ? "default" : "outline"}
          size="sm"
          onClick={toggleTransit}
          className="flex items-center gap-2"
        >
          <Train size={16} />
          Transit Lines
        </Button>
        
        <Button
          variant={showRestaurants ? "default" : "outline"}
          size="sm"
          onClick={toggleRestaurants}
          className="flex items-center gap-2"
        >
          <Map size={16} />
          Restaurants
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={clearPoints}
        >
          Clear Points
        </Button>
      </div>
      
      <div className="text-xs text-gray-600 mt-4 space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-blue-500 rounded"></div>
          <span>Subway/Rail</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-green-500 rounded border-dashed border border-green-500"></div>
          <span>Bus Lines</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
          <span>Restaurants</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span>Distance Points</span>
        </div>
      </div>
    </Card>
  );
};

export default MapControls;
