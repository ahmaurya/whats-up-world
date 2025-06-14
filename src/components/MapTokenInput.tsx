
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface MapTokenInputProps {
  onTokenSubmit: (token: string) => void;
}

const MapTokenInput: React.FC<MapTokenInputProps> = ({ onTokenSubmit }) => {
  const [mapboxToken, setMapboxToken] = useState('');

  const handleSubmit = () => {
    if (mapboxToken.trim()) {
      onTokenSubmit(mapboxToken);
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4 text-center">Enter Mapbox Token</h2>
        <p className="text-gray-600 mb-6 text-center">
          Please enter your Mapbox public token to use the map. Get one at{' '}
          <a href="https://mapbox.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            mapbox.com
          </a>
        </p>
        <div className="space-y-4">
          <Input
            type="text"
            placeholder="pk.eyJ1IjoieW91cnVzZXJuYW1lIiwi..."
            value={mapboxToken}
            onChange={(e) => setMapboxToken(e.target.value)}
            className="w-full"
          />
          <Button onClick={handleSubmit} className="w-full">
            Initialize Map
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default MapTokenInput;
