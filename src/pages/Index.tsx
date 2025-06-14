
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

  // Check if we're in development environment
  const isDevelopment = window.location.hostname === 'localhost' || 
                       window.location.hostname.includes('lovable.dev') ||
                       window.location.hostname.includes('lovable.app');

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // In production, require authentication
  if (!isDevelopment && !user) {
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
      {/* Show user menu only if user is authenticated */}
      {user && (
        <div className="absolute top-4 left-4 z-[1001]">
          <UserMenu />
        </div>
      )}
      {/* Show development notice if not authenticated in dev */}
      {isDevelopment && !user && (
        <div className="absolute top-4 right-4 z-[1001] bg-yellow-100 border border-yellow-400 text-yellow-800 px-3 py-2 rounded text-sm">
          Development Mode - Authentication Disabled
          <Button 
            onClick={() => navigate('/auth')} 
            variant="outline" 
            size="sm" 
            className="ml-2 h-6 text-xs"
          >
            Login
          </Button>
        </div>
      )}
      <MapProvider>
        <Map />
      </MapProvider>
    </div>
  );
};

export default Index;
