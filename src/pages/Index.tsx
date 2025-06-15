import React, { useState, useEffect } from 'react';
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
  const [currentCity, setCurrentCity] = useState<string>('');

  // Update document title when city changes
  useEffect(() => {
    const title = currentCity ? `What's Up, ${currentCity}` : "What's Up, World";
    document.title = title;
  }, [currentCity]);

  // Function to reverse geocode coordinates to city name
  const getCityFromCoordinates = async (lat: number, lon: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`
      );
      const data = await response.json();
      
      if (data && data.address) {
        const city = data.address.city || 
                    data.address.town || 
                    data.address.village || 
                    data.address.municipality || 
                    data.address.county ||
                    'Unknown';
        return city;
      }
    } catch (error) {
      console.warn('Failed to get city from coordinates:', error);
    }
    return null;
  };

  // Get user's current location and infer city on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          console.log(`Inferring city from user location: ${latitude}, ${longitude}`);
          
          const inferredCity = await getCityFromCoordinates(latitude, longitude);
          if (inferredCity) {
            console.log(`Inferred city: ${inferredCity}`);
            setCurrentCity(inferredCity);
          }
        },
        (error) => {
          console.warn('Geolocation failed, keeping default title:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    }
  }, []);

  const handleCitySelect = (city: City) => {
    console.log('City selected:', city);
    setCurrentCity(city.name);
    
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
      <Header onCitySelect={handleCitySelect} currentCity={currentCity} />
      
      {/* Adjust the main content to account for header height */}
      <div className="pt-16 h-full">
        {/* Show user menu only if user is authenticated */}
        {user && (
          <div className="absolute top-20 left-4 z-[2001]">
            <UserMenu />
          </div>
        )}
        
        <MapProvider>
          <Map />
        </MapProvider>
      </div>
    </div>
  );
};

export default Index;
