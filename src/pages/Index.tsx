
import React from 'react';
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

  return (
    <div className="h-screen w-full relative">
      {/* Show user menu only if user is authenticated */}
      {user && (
        <div className="absolute top-4 left-4 z-[2001]">
          <UserMenu />
        </div>
      )}
      {/* Show authentication disabled notice */}
      <div className="absolute top-4 right-4 z-[2001] bg-blue-100 border border-blue-400 text-blue-800 px-3 py-2 rounded text-sm shadow-lg">
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
  );
};

export default Index;
