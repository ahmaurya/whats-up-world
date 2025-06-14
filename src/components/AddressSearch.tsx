
import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MapPin } from 'lucide-react';

interface AddressSearchProps {
  placeholder: string;
  onAddressSelect: (address: string, coordinates: [number, number]) => void;
  disabled?: boolean;
  value?: string;
}

const AddressSearch: React.FC<AddressSearchProps> = ({
  placeholder,
  onAddressSelect,
  disabled = false,
  value = ''
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mock address suggestions for demo - in a real app, use a geocoding API
  const mockAddresses = [
    'New York, NY',
    'Los Angeles, CA',
    'Chicago, IL',
    'Houston, TX',
    'Phoenix, AZ',
    'Philadelphia, PA',
    'San Antonio, TX',
    'San Diego, CA',
    'Dallas, TX',
    'San Jose, CA',
    'Austin, TX',
    'Jacksonville, FL',
    'San Francisco, CA',
    'Columbus, OH',
    'Charlotte, NC',
    'Fort Worth, TX',
    'Indianapolis, IN',
    'Seattle, WA',
    'Denver, CO',
    'Boston, MA',
    'El Paso, TX',
    'Nashville, TN',
    'Detroit, MI',
    'Oklahoma City, OK',
    'Portland, OR',
    'Las Vegas, NV',
    'Memphis, TN',
    'Louisville, KY',
    'Baltimore, MD',
    'Milwaukee, WI',
    'Paris, France',
    'London, UK',
    'Tokyo, Japan',
    'Sydney, Australia',
    'Berlin, Germany',
    'Rome, Italy',
    'Madrid, Spain',
    'Amsterdam, Netherlands',
    'Barcelona, Spain',
    'Vienna, Austria'
  ];

  const getMockCoordinates = (address: string): [number, number] => {
    const lowerAddress = address.toLowerCase();
    
    if (lowerAddress.includes('new york')) return [-73.9857, 40.7589];
    if (lowerAddress.includes('los angeles')) return [-118.2437, 34.0522];
    if (lowerAddress.includes('chicago')) return [-87.6298, 41.8781];
    if (lowerAddress.includes('houston')) return [-95.3698, 29.7604];
    if (lowerAddress.includes('phoenix')) return [-112.0740, 33.4484];
    if (lowerAddress.includes('philadelphia')) return [-75.1652, 39.9526];
    if (lowerAddress.includes('san antonio')) return [-98.4936, 29.4241];
    if (lowerAddress.includes('san diego')) return [-117.1611, 32.7157];
    if (lowerAddress.includes('dallas')) return [-96.7970, 32.7767];
    if (lowerAddress.includes('san jose')) return [-121.8863, 37.3382];
    if (lowerAddress.includes('austin')) return [-97.7431, 30.2672];
    if (lowerAddress.includes('san francisco')) return [-122.4194, 37.7749];
    if (lowerAddress.includes('seattle')) return [-122.3321, 47.6062];
    if (lowerAddress.includes('denver')) return [-104.9903, 39.7392];
    if (lowerAddress.includes('boston')) return [-71.0589, 42.3601];
    if (lowerAddress.includes('paris')) return [2.3522, 48.8566];
    if (lowerAddress.includes('london')) return [-0.1276, 51.5074];
    if (lowerAddress.includes('tokyo')) return [139.6917, 35.6895];
    if (lowerAddress.includes('sydney')) return [151.2093, -33.8688];
    if (lowerAddress.includes('berlin')) return [13.4050, 52.5200];
    if (lowerAddress.includes('rome')) return [12.4964, 41.9028];
    if (lowerAddress.includes('madrid')) return [-3.7038, 40.4168];
    if (lowerAddress.includes('amsterdam')) return [4.9041, 52.3676];
    if (lowerAddress.includes('barcelona')) return [2.1734, 41.3851];
    if (lowerAddress.includes('vienna')) return [16.3738, 48.2082];
    
    // Default to random location in US
    return [-98.5795 + (Math.random() - 0.5) * 20, 39.8283 + (Math.random() - 0.5) * 10];
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    if (value.length > 1) {
      const filtered = mockAddresses.filter(address =>
        address.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 5));
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    setShowSuggestions(false);
    const coordinates = getMockCoordinates(suggestion);
    onAddressSelect(suggestion, coordinates);
  };

  const handleSubmit = () => {
    if (inputValue.trim()) {
      const coordinates = getMockCoordinates(inputValue);
      onAddressSelect(inputValue.trim(), coordinates);
      setInputValue('');
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={inputRef}>
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1"
        />
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!inputValue.trim() || disabled}
          className="px-3"
        >
          <Search size={16} />
        </Button>
      </div>
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2 text-sm"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <MapPin size={14} className="text-gray-400" />
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AddressSearch;
