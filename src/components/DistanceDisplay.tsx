
import React from 'react';
import { Card } from '@/components/ui/card';
import { useMap } from './MapProvider';

const DistanceDisplay = () => {
  const { selectedPoints } = useMap();

  const calculateDistance = (point1: [number, number], point2: [number, number]) => {
    const [lon1, lat1] = point1;
    const [lon2, lat2] = point2;
    
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  };

  if (selectedPoints.length < 2) {
    return (
      <Card className="absolute bottom-4 left-4 p-4 z-10 bg-white/95 backdrop-blur-sm">
        <p className="text-sm text-gray-600">
          Click two points on the map to measure distance
        </p>
      </Card>
    );
  }

  const distance = calculateDistance(selectedPoints[0], selectedPoints[1]);

  return (
    <Card className="absolute bottom-4 left-4 p-4 z-10 bg-white/95 backdrop-blur-sm">
      <div className="space-y-2">
        <p className="text-sm font-medium">Distance Measurement</p>
        <p className="text-2xl font-bold text-blue-600">
          {distance.toFixed(2)} miles
        </p>
        <p className="text-xs text-gray-600">
          Between selected points
        </p>
      </div>
    </Card>
  );
};

export default DistanceDisplay;
