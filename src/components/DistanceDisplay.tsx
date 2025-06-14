
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMap } from './MapProvider';
import { X, MapPin } from 'lucide-react';
import AddressSearch from './AddressSearch';

const DistanceDisplay = () => {
  const { selectedPoints, pointNames, addPointWithName, clearPoints } = useMap();
  const [showAddressInputs, setShowAddressInputs] = useState(false);

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

  const handleAddressSelect = (address: string, coordinates: [number, number]) => {
    addPointWithName(coordinates, address);
  };

  // Show default state when no points are selected
  if (selectedPoints.length === 0) {
    console.log('Showing default distance calculator state');
    return (
      <Card className="absolute bottom-4 left-4 p-4 z-[1000] bg-white/95 backdrop-blur-sm border-2 border-blue-500">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Distance Calculator</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddressInputs(!showAddressInputs)}
              className="text-xs"
            >
              {showAddressInputs ? 'Hide' : 'Enter Addresses'}
            </Button>
          </div>
          
          {showAddressInputs ? (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-600 mb-1">From:</p>
                <AddressSearch
                  placeholder="Enter starting location..."
                  onAddressSelect={handleAddressSelect}
                />
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">To:</p>
                <AddressSearch
                  placeholder="Enter destination..."
                  onAddressSelect={handleAddressSelect}
                  disabled={selectedPoints.length === 0}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              Click on the map or enter addresses to calculate distance between two points
            </p>
          )}
        </div>
      </Card>
    );
  }

  // Show progress when we have one point
  if (selectedPoints.length === 1) {
    console.log('Showing one point selected state');
    return (
      <Card className="absolute bottom-4 left-4 p-4 z-[1000] bg-white/95 backdrop-blur-sm">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Distance Measurement</p>
            <Button
              variant="outline"
              size="sm"
              onClick={clearPoints}
              className="text-xs flex items-center gap-1"
            >
              <X size={12} />
              Clear
            </Button>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              <strong>From:</strong> {pointNames[0] || 'Clicked Point'}
            </p>
            
            <div>
              <p className="text-xs text-gray-600 mb-1">To:</p>
              <AddressSearch
                placeholder="Enter destination..."
                onAddressSelect={handleAddressSelect}
              />
            </div>
            
            <p className="text-xs text-gray-500">
              Or click another point on the map
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Show distance calculation when we have two points
  const distance = calculateDistance(selectedPoints[0], selectedPoints[1]);

  console.log('Showing distance calculation:', distance);
  return (
    <Card className="absolute bottom-4 left-4 p-4 z-[1000] bg-white/95 backdrop-blur-sm">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Distance Measurement</p>
          <Button
            variant="outline"
            size="sm"
            onClick={clearPoints}
            className="text-xs flex items-center gap-1"
          >
            <X size={12} />
            Clear
          </Button>
        </div>
        
        <div className="space-y-2">
          <p className="text-2xl font-bold text-blue-600">
            {distance.toFixed(2)} miles
          </p>
          <div className="text-xs text-gray-600 space-y-1">
            <p><strong>From:</strong> {pointNames[0] || 'Point 1'}</p>
            <p><strong>To:</strong> {pointNames[1] || 'Point 2'}</p>
          </div>
          
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddressInputs(!showAddressInputs)}
              className="text-xs w-full"
            >
              <MapPin size={12} className="mr-1" />
              {showAddressInputs ? 'Hide Address Search' : 'Search New Addresses'}
            </Button>
            
            {showAddressInputs && (
              <div className="space-y-2 mt-2">
                <AddressSearch
                  placeholder="Enter new starting location..."
                  onAddressSelect={(address, coords) => {
                    clearPoints();
                    handleAddressSelect(address, coords);
                  }}
                />
                <AddressSearch
                  placeholder="Enter new destination..."
                  onAddressSelect={(address, coords) => {
                    clearPoints();
                    handleAddressSelect(address, coords);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default DistanceDisplay;
