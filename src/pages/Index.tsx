
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Map from '@/components/Map';
import { MapProvider } from '@/components/MapProvider';
import { useAuth } from '@/hooks/useAuth';
import UserMenu from '@/components/UserMenu';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50">
        <div className="text-center space-y-6 max-w-md">
          <h1 className="text-4xl font-bold text-gray-900">Welcome to Maps</h1>
          <p className="text-lg text-gray-600">
            Discover restaurants and transit routes in your area. Sign in to get started.
          </p>
          <Button onClick={() => navigate('/auth')} size="lg" className="gap-2">
            <LogIn size={20} />
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full relative">
      <div className="absolute top-4 left-4 z-[1001]">
        <UserMenu />
      </div>
      <MapProvider>
        <Map />
      </MapProvider>
    </div>
  );
};

export default Index;
