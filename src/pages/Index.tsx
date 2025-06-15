
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Map from '@/components/Map';
import Header from '@/components/Header';
import { MapProvider } from '@/components/MapProvider';
import { useAuth } from '@/hooks/useAuth';
import UserMenu from '@/components/UserMenu';
import { Button } from '@/components/ui/button';
import { useLeaflet } from '@/hooks/useLeaflet';

interface City {
  name: string;
  country: string;
  coordinates: [number, number];
}

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const handleCitySelect = (city: City) => {
    console.log('City selected:', city);
    // The map will be updated through the MapProvider context
    // We'll trigger a custom event that the map can listen to
    const event = new CustomEvent('citySelected', { 
      detail: { 
        coordinates: city.coordinates,
        name: city.name,
        country: city.country
      } 
    });
    window.dispatchEvent(event);
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full relative">
      <Header onCitySelect={handleCitySelect} />
      
      {/* Adjust the main content to account for header height */}
      <div className="pt-16 h-full">
        {/* Show user menu only if user is authenticated */}
        {user && (
          <div className="absolute top-20 left-4 z-[2001]">
            <UserMenu />
          </div>
        )}
        
        {/* Show authentication disabled notice */}
        <div className="absolute top-20 right-4 z-[2001] bg-blue-100 border border-blue-400 text-blue-800 px-3 py-2 rounded text-sm shadow-lg">
          Authentication Disabled - Development Mode
          <Button 
            onClick={() => navigate('/auth')} 
            variant="outline" 
            size="sm" 
            className="ml-2 h-6 text-xs"
          >
            Test Auth
          </Button>
        </div>
        
        <MapProvider>
          <Map />
        </MapProvider>
      </div>
    </div>
  );
};

export default Index;
