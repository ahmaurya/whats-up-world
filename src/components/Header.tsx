
import React from 'react';
import CitySearch from './CitySearch';

interface HeaderProps {
  onCitySelect: (city: { name: string; country: string; coordinates: [number, number] }) => void;
  currentCity?: string;
}

const Header: React.FC<HeaderProps> = ({ onCitySelect, currentCity }) => {
  return (
    <header className="flex-shrink-0 bg-white shadow-md border-b border-gray-200 z-[2000]">
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-xl font-bold text-gray-800">
          What's Up, {currentCity || 'World'}
        </h1>
        
        <div className="flex items-center gap-4">
          <CitySearch 
            onCitySelect={onCitySelect}
            placeholder="Search for a city..."
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
