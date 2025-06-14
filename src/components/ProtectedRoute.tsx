
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  // Allow access in development environment
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

  // Skip authentication check in development
  if (isDevelopment) {
    return <>{children}</>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
