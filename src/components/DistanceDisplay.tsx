
import React from 'react';
import { Card } from '@/components/ui/card';
import { useMap } from './MapProvider';

const DistanceDisplay = () => {
  const { selectedPoints, pointNames } = useMap();

  console.log('DistanceDisplay render - selectedPoints:', selectedPoints.length);

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

  // Show default state when no points are selected
  if (selectedPoints.length === 0) {
    console.log('Showing default distance calculator state');
    return (
      <Card className="absolute bottom-4 left-4 p-4 z-[1000] bg-white/95 backdrop-blur-sm border-2 border-blue-500">
        <div className="space-y-2">
          <p className="text-sm font-medium">Distance Calculator</p>
          <p className="text-sm text-gray-600">
            Click on the map or enter addresses to calculate distance between two points
          </p>
        </div>
      </Card>
    );
  }

  // Show progress when we have one point
  if (selectedPoints.length === 1) {
    console.log('Showing one point selected state');
    return (
      <Card className="absolute bottom-4 left-4 p-4 z-[1000] bg-white/95 backdrop-blur-sm">
        <div className="space-y-2">
          <p className="text-sm font-medium">Distance Measurement</p>
          <p className="text-sm text-gray-600">
            Point 1: {pointNames[0] || 'Clicked Point'}
          </p>
          <p className="text-sm text-gray-600">
            Click another point or enter a second address to calculate distance
          </p>
        </div>
      </Card>
    );
  }

  // Show distance calculation when we have two points
  const distance = calculateDistance(selectedPoints[0], selectedPoints[1]);

  console.log('Showing distance calculation:', distance);
  return (
    <Card className="absolute bottom-4 left-4 p-4 z-[1000] bg-white/95 backdrop-blur-sm">
      <div className="space-y-2">
        <p className="text-sm font-medium">Distance Measurement</p>
        <p className="text-2xl font-bold text-blue-600">
          {distance.toFixed(2)} miles
        </p>
        <div className="text-xs text-gray-600 space-y-1">
          <p><strong>From:</strong> {pointNames[0] || 'Point 1'}</p>
          <p><strong>To:</strong> {pointNames[1] || 'Point 2'}</p>
        </div>
      </div>
    </Card>
  );
};

export default DistanceDisplay;
