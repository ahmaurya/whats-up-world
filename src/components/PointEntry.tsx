
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useMap } from './MapProvider';
import { MapPin, X } from 'lucide-react';

const PointEntry = () => {
  const { selectedPoints, addPointWithName, clearPoints, pointNames } = useMap();
  const [point1Name, setPoint1Name] = useState('');
  const [point2Name, setPoint2Name] = useState('');

  const handleAddPoint = (pointIndex: number) => {
    const name = pointIndex === 0 ? point1Name : point2Name;
    if (name.trim()) {
      // For demo purposes, we'll use approximate coordinates for common cities
      // In a real app, you'd use a geocoding service
      const mockCoordinates = getMockCoordinates(name);
      addPointWithName(mockCoordinates, name.trim());
      
      if (pointIndex === 0) {
        setPoint1Name('');
      } else {
        setPoint2Name('');
      }
    }
  };

  const getMockCoordinates = (name: string): [number, number] => {
    const lowerName = name.toLowerCase();
    
    // Mock coordinates for demo - in real app, use geocoding API
    if (lowerName.includes('new york') || lowerName.includes('nyc')) {
      return [-73.9857, 40.7589];
    } else if (lowerName.includes('los angeles') || lowerName.includes('la')) {
      return [-118.2437, 34.0522];
    } else if (lowerName.includes('chicago')) {
      return [-87.6298, 41.8781];
    } else if (lowerName.includes('san francisco')) {
      return [-122.4194, 37.7749];
    } else if (lowerName.includes('paris')) {
      return [2.3522, 48.8566];
    } else if (lowerName.includes('london')) {
      return [-0.1276, 51.5074];
    } else {
      // Default to center of US with some random offset
      return [-98.5795 + (Math.random() - 0.5) * 20, 39.8283 + (Math.random() - 0.5) * 10];
    }
  };

  return (
    <Card className="absolute top-4 right-4 w-80 z-10 bg-white/95 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MapPin size={20} />
          Distance Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="point1">Point 1 (Name/Address)</Label>
          <div className="flex gap-2">
            <Input
              id="point1"
              value={point1Name}
              onChange={(e) => setPoint1Name(e.target.value)}
              placeholder="e.g., New York, Paris, 123 Main St"
              disabled={selectedPoints.length >= 1}
            />
            <Button
              size="sm"
              onClick={() => handleAddPoint(0)}
              disabled={!point1Name.trim() || selectedPoints.length >= 1}
            >
              Add
            </Button>
          </div>
          {selectedPoints.length >= 1 && pointNames[0] && (
            <p className="text-sm text-green-600">✓ {pointNames[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="point2">Point 2 (Name/Address)</Label>
          <div className="flex gap-2">
            <Input
              id="point2"
              value={point2Name}
              onChange={(e) => setPoint2Name(e.target.value)}
              placeholder="e.g., Los Angeles, London, 456 Oak Ave"
              disabled={selectedPoints.length < 1 || selectedPoints.length >= 2}
            />
            <Button
              size="sm"
              onClick={() => handleAddPoint(1)}
              disabled={!point2Name.trim() || selectedPoints.length < 1 || selectedPoints.length >= 2}
            >
              Add
            </Button>
          </div>
          {selectedPoints.length >= 2 && pointNames[1] && (
            <p className="text-sm text-green-600">✓ {pointNames[1]}</p>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={clearPoints}
            className="flex items-center gap-1"
          >
            <X size={14} />
            Clear All
          </Button>
        </div>

        <div className="text-xs text-gray-600">
          <p>You can also click directly on the map to add points.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PointEntry;
