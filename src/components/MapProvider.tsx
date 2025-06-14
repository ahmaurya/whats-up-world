import React, { createContext, useContext, useState, ReactNode } from 'react';

interface MapContextType {
  selectedPoints: [number, number][];
  pointNames: string[];
  addPoint: (point: [number, number]) => void;
  addPointWithName: (point: [number, number], name: string) => void;
  clearPoints: () => void;
  showRailTransit: boolean;
  toggleRailTransit: () => void;
  showTramTransit: boolean;
  toggleTramTransit: () => void;
  showBusTransit: boolean;
  toggleBusTransit: () => void;
  showRestaurants: boolean;
  toggleRestaurants: () => void;
  showVegetarianRestaurants: boolean;
  toggleVegetarianRestaurants: () => void;
  showNonVegetarianRestaurants: boolean;
  toggleNonVegetarianRestaurants: () => void;
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
  const [showRailTransit, setShowRailTransit] = useState(false);
  const [showTramTransit, setShowTramTransit] = useState(false);
  const [showBusTransit, setShowBusTransit] = useState(false);
  const [showRestaurants, setShowRestaurants] = useState(false);
  const [showVegetarianRestaurants, setShowVegetarianRestaurants] = useState(true);
  const [showNonVegetarianRestaurants, setShowNonVegetarianRestaurants] = useState(false);

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

  const toggleRailTransit = () => {
    setShowRailTransit(prev => !prev);
  };

  const toggleTramTransit = () => {
    setShowTramTransit(prev => !prev);
  };

  const toggleBusTransit = () => {
    setShowBusTransit(prev => !prev);
  };

  const toggleRestaurants = () => {
    setShowRestaurants(prev => !prev);
  };

  const toggleVegetarianRestaurants = () => {
    setShowVegetarianRestaurants(prev => !prev);
  };

  const toggleNonVegetarianRestaurants = () => {
    setShowNonVegetarianRestaurants(prev => !prev);
  };

  return (
    <MapContext.Provider value={{
      selectedPoints,
      pointNames,
      addPoint,
      addPointWithName,
      clearPoints,
      showRailTransit,
      toggleRailTransit,
      showTramTransit,
      toggleTramTransit,
      showBusTransit,
      toggleBusTransit,
      showRestaurants,
      toggleRestaurants,
      showVegetarianRestaurants,
      toggleVegetarianRestaurants,
      showNonVegetarianRestaurants,
      toggleNonVegetarianRestaurants
    }}>
      {children}
    </MapContext.Provider>
  );
};
