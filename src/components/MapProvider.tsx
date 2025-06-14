
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface MapContextType {
  selectedPoints: [number, number][];
  pointNames: string[];
  addPoint: (point: [number, number]) => void;
  addPointWithName: (point: [number, number], name: string) => void;
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
  const [pointNames, setPointNames] = useState<string[]>([]);
  const [showTransit, setShowTransit] = useState(true);
  const [showRestaurants, setShowRestaurants] = useState(false);

  const addPoint = (point: [number, number]) => {
    setSelectedPoints(prev => {
      if (prev.length >= 2) {
        setPointNames(['Clicked Point']);
        return [point];
      }
      const newPoints = [...prev, point];
      setPointNames(prevNames => {
        const newNames = [...prevNames];
        if (newNames.length < newPoints.length) {
          newNames.push(`Clicked Point ${newPoints.length}`);
        }
        return newNames;
      });
      return newPoints;
    });
  };

  const addPointWithName = (point: [number, number], name: string) => {
    setSelectedPoints(prev => {
      if (prev.length >= 2) {
        setPointNames([name]);
        return [point];
      }
      return [...prev, point];
    });
    
    setPointNames(prev => {
      if (selectedPoints.length >= 2) {
        return [name];
      }
      return [...prev, name];
    });
  };

  const clearPoints = () => {
    setSelectedPoints([]);
    setPointNames([]);
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
      pointNames,
      addPoint,
      addPointWithName,
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
