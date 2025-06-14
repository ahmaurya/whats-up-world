
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface MapContextType {
  selectedPoints: [number, number][];
  addPoint: (point: [number, number]) => void;
  clearPoints: () => void;
  showTransit: boolean;
  toggleTransit: () => void;
  showRestaurants: boolean;
  toggleRestaurants: () => void;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

export const useMap = () => {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error('useMap must be used within MapProvider');
  }
  return context;
};

interface MapProviderProps {
  children: ReactNode;
}

export const MapProvider: React.FC<MapProviderProps> = ({ children }) => {
  const [selectedPoints, setSelectedPoints] = useState<[number, number][]>([]);
  const [showTransit, setShowTransit] = useState(true);
  const [showRestaurants, setShowRestaurants] = useState(false);

  const addPoint = (point: [number, number]) => {
    setSelectedPoints(prev => {
      if (prev.length >= 2) {
        return [point];
      }
      return [...prev, point];
    });
  };

  const clearPoints = () => {
    setSelectedPoints([]);
  };

  const toggleTransit = () => {
    setShowTransit(prev => !prev);
  };

  const toggleRestaurants = () => {
    setShowRestaurants(prev => !prev);
  };

  return (
    <MapContext.Provider value={{
      selectedPoints,
      addPoint,
      clearPoints,
      showTransit,
      toggleTransit,
      showRestaurants,
      toggleRestaurants
    }}>
      {children}
    </MapContext.Provider>
  );
};
