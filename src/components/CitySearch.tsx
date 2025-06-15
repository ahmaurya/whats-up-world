
import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface City {
  name: string;
  country: string;
  coordinates: [number, number]; // [longitude, latitude]
}

interface CitySearchProps {
  onCitySelect: (city: City) => void;
  placeholder?: string;
}

// Real world cities dataset
const CITIES: City[] = [
  { name: 'New York', country: 'USA', coordinates: [-74.0059, 40.7128] },
  { name: 'Los Angeles', country: 'USA', coordinates: [-118.2437, 34.0522] },
  { name: 'Chicago', country: 'USA', coordinates: [-87.6298, 41.8781] },
  { name: 'Houston', country: 'USA', coordinates: [-95.3698, 29.7604] },
  { name: 'Phoenix', country: 'USA', coordinates: [-112.0740, 33.4484] },
  { name: 'Philadelphia', country: 'USA', coordinates: [-75.1652, 39.9526] },
  { name: 'San Antonio', country: 'USA', coordinates: [-98.4936, 29.4241] },
  { name: 'San Diego', country: 'USA', coordinates: [-117.1611, 32.7157] },
  { name: 'Dallas', country: 'USA', coordinates: [-96.7970, 32.7767] },
  { name: 'San Jose', country: 'USA', coordinates: [-121.8863, 37.3382] },
  { name: 'Austin', country: 'USA', coordinates: [-97.7431, 30.2672] },
  { name: 'Jacksonville', country: 'USA', coordinates: [-81.6557, 30.3322] },
  { name: 'San Francisco', country: 'USA', coordinates: [-122.4194, 37.7749] },
  { name: 'Columbus', country: 'USA', coordinates: [-82.9988, 39.9612] },
  { name: 'Charlotte', country: 'USA', coordinates: [-80.8431, 35.2271] },
  { name: 'Fort Worth', country: 'USA', coordinates: [-97.3208, 32.7555] },
  { name: 'Indianapolis', country: 'USA', coordinates: [-86.1581, 39.7684] },
  { name: 'Seattle', country: 'USA', coordinates: [-122.3321, 47.6062] },
  { name: 'Denver', country: 'USA', coordinates: [-104.9903, 39.7392] },
  { name: 'Boston', country: 'USA', coordinates: [-71.0589, 42.3601] },
  { name: 'El Paso', country: 'USA', coordinates: [-106.4850, 31.7619] },
  { name: 'Nashville', country: 'USA', coordinates: [-86.7816, 36.1627] },
  { name: 'Detroit', country: 'USA', coordinates: [-83.0458, 42.3314] },
  { name: 'Oklahoma City', country: 'USA', coordinates: [-97.5164, 35.4676] },
  { name: 'Portland', country: 'USA', coordinates: [-122.6784, 45.5152] },
  { name: 'Las Vegas', country: 'USA', coordinates: [-115.1398, 36.1699] },
  { name: 'Memphis', country: 'USA', coordinates: [-90.0490, 35.1495] },
  { name: 'Louisville', country: 'USA', coordinates: [-85.7585, 38.2027] },
  { name: 'Baltimore', country: 'USA', coordinates: [-76.6122, 39.2904] },
  { name: 'Milwaukee', country: 'USA', coordinates: [-87.9065, 43.0389] },
  { name: 'Albuquerque', country: 'USA', coordinates: [-106.6504, 35.0844] },
  { name: 'Tucson', country: 'USA', coordinates: [-110.9265, 32.2226] },
  { name: 'Fresno', country: 'USA', coordinates: [-119.7871, 36.7378] },
  { name: 'Sacramento', country: 'USA', coordinates: [-121.4944, 38.5816] },
  { name: 'Kansas City', country: 'USA', coordinates: [-94.5786, 39.0997] },
  { name: 'Mesa', country: 'USA', coordinates: [-111.8315, 33.4152] },
  { name: 'Atlanta', country: 'USA', coordinates: [-84.3880, 33.7490] },
  { name: 'Omaha', country: 'USA', coordinates: [-95.9980, 41.2524] },
  { name: 'Colorado Springs', country: 'USA', coordinates: [-104.8214, 38.8339] },
  { name: 'Raleigh', country: 'USA', coordinates: [-78.6382, 35.7796] },
  { name: 'Miami', country: 'USA', coordinates: [-80.1918, 25.7617] },
  { name: 'Virginia Beach', country: 'USA', coordinates: [-75.9780, 36.8529] },
  { name: 'Tampa', country: 'USA', coordinates: [-82.4572, 27.9506] },
  { name: 'Minneapolis', country: 'USA', coordinates: [-93.2650, 44.9778] },
  { name: 'Tulsa', country: 'USA', coordinates: [-95.9928, 36.1540] },
  { name: 'Arlington', country: 'USA', coordinates: [-97.1081, 32.7357] },
  { name: 'New Orleans', country: 'USA', coordinates: [-90.0715, 29.9511] },
  { name: 'Wichita', country: 'USA', coordinates: [-97.3375, 37.6872] },
  { name: 'Cleveland', country: 'USA', coordinates: [-81.6944, 41.4993] },
  { name: 'Bakersfield', country: 'USA', coordinates: [-119.0187, 35.3733] },
  { name: 'Aurora', country: 'USA', coordinates: [-104.8319, 39.7294] },
  { name: 'Anaheim', country: 'USA', coordinates: [-117.9145, 33.8366] },
  
  // International cities
  { name: 'London', country: 'UK', coordinates: [-0.1276, 51.5074] },
  { name: 'Paris', country: 'France', coordinates: [2.3522, 48.8566] },
  { name: 'Berlin', country: 'Germany', coordinates: [13.4050, 52.5200] },
  { name: 'Madrid', country: 'Spain', coordinates: [-3.7038, 40.4168] },
  { name: 'Rome', country: 'Italy', coordinates: [12.4964, 41.9028] },
  { name: 'Amsterdam', country: 'Netherlands', coordinates: [4.9041, 52.3676] },
  { name: 'Barcelona', country: 'Spain', coordinates: [2.1734, 41.3851] },
  { name: 'Vienna', country: 'Austria', coordinates: [16.3738, 48.2082] },
  { name: 'Prague', country: 'Czech Republic', coordinates: [14.4378, 50.0755] },
  { name: 'Budapest', country: 'Hungary', coordinates: [19.0402, 47.4979] },
  { name: 'Warsaw', country: 'Poland', coordinates: [21.0122, 52.2297] },
  { name: 'Stockholm', country: 'Sweden', coordinates: [18.0686, 59.3293] },
  { name: 'Copenhagen', country: 'Denmark', coordinates: [12.5683, 55.6761] },
  { name: 'Oslo', country: 'Norway', coordinates: [10.7522, 59.9139] },
  { name: 'Helsinki', country: 'Finland', coordinates: [24.9384, 60.1699] },
  { name: 'Dublin', country: 'Ireland', coordinates: [-6.2603, 53.3498] },
  { name: 'Edinburgh', country: 'UK', coordinates: [-3.1883, 55.9533] },
  { name: 'Brussels', country: 'Belgium', coordinates: [4.3517, 50.8503] },
  { name: 'Zurich', country: 'Switzerland', coordinates: [8.5417, 47.3769] },
  { name: 'Munich', country: 'Germany', coordinates: [11.5820, 48.1351] },
  { name: 'Frankfurt', country: 'Germany', coordinates: [8.6821, 50.1109] },
  { name: 'Hamburg', country: 'Germany', coordinates: [9.9937, 53.5511] },
  { name: 'Cologne', country: 'Germany', coordinates: [6.9603, 50.9375] },
  { name: 'Milan', country: 'Italy', coordinates: [9.1900, 45.4642] },
  { name: 'Naples', country: 'Italy', coordinates: [14.2681, 40.8518] },
  { name: 'Florence', country: 'Italy', coordinates: [11.2558, 43.7696] },
  { name: 'Venice', country: 'Italy', coordinates: [12.3155, 45.4408] },
  { name: 'Lisbon', country: 'Portugal', coordinates: [-9.1393, 38.7223] },
  { name: 'Porto', country: 'Portugal', coordinates: [-8.6291, 41.1579] },
  { name: 'Athens', country: 'Greece', coordinates: [23.7275, 37.9838] },
  { name: 'Istanbul', country: 'Turkey', coordinates: [28.9784, 41.0082] },
  { name: 'Moscow', country: 'Russia', coordinates: [37.6173, 55.7558] },
  { name: 'St. Petersburg', country: 'Russia', coordinates: [30.3351, 59.9311] },
  { name: 'Kiev', country: 'Ukraine', coordinates: [30.5234, 50.4501] },
  
  // Asian cities
  { name: 'Tokyo', country: 'Japan', coordinates: [139.6917, 35.6895] },
  { name: 'Osaka', country: 'Japan', coordinates: [135.5023, 34.6937] },
  { name: 'Kyoto', country: 'Japan', coordinates: [135.7681, 35.0116] },
  { name: 'Seoul', country: 'South Korea', coordinates: [126.9780, 37.5665] },
  { name: 'Beijing', country: 'China', coordinates: [116.4074, 39.9042] },
  { name: 'Shanghai', country: 'China', coordinates: [121.4737, 31.2304] },
  { name: 'Hong Kong', country: 'Hong Kong', coordinates: [114.1694, 22.3193] },
  { name: 'Singapore', country: 'Singapore', coordinates: [103.8198, 1.3521] },
  { name: 'Bangkok', country: 'Thailand', coordinates: [100.5018, 13.7563] },
  { name: 'Mumbai', country: 'India', coordinates: [72.8777, 19.0760] },
  { name: 'Delhi', country: 'India', coordinates: [77.1025, 28.7041] },
  { name: 'Bangalore', country: 'India', coordinates: [77.5946, 12.9716] },
  { name: 'Chennai', country: 'India', coordinates: [80.2707, 13.0827] },
  { name: 'Kolkata', country: 'India', coordinates: [88.3639, 22.5726] },
  { name: 'Hyderabad', country: 'India', coordinates: [78.4867, 17.3850] },
  { name: 'Pune', country: 'India', coordinates: [73.8567, 18.5204] },
  
  // Australian cities
  { name: 'Sydney', country: 'Australia', coordinates: [151.2093, -33.8688] },
  { name: 'Melbourne', country: 'Australia', coordinates: [144.9631, -37.8136] },
  { name: 'Brisbane', country: 'Australia', coordinates: [153.0251, -27.4698] },
  { name: 'Perth', country: 'Australia', coordinates: [115.8605, -31.9505] },
  { name: 'Adelaide', country: 'Australia', coordinates: [138.6007, -34.9285] },
  
  // Canadian cities
  { name: 'Toronto', country: 'Canada', coordinates: [-79.3832, 43.6532] },
  { name: 'Vancouver', country: 'Canada', coordinates: [-123.1207, 49.2827] },
  { name: 'Montreal', country: 'Canada', coordinates: [-73.5673, 45.5017] },
  { name: 'Calgary', country: 'Canada', coordinates: [-114.0719, 51.0447] },
  { name: 'Ottawa', country: 'Canada', coordinates: [-75.6972, 45.4215] },
  { name: 'Edmonton', country: 'Canada', coordinates: [-113.4909, 53.5461] },
  { name: 'Winnipeg', country: 'Canada', coordinates: [-97.1384, 49.8951] },
  
  // South American cities
  { name: 'São Paulo', country: 'Brazil', coordinates: [-46.6333, -23.5505] },
  { name: 'Rio de Janeiro', country: 'Brazil', coordinates: [-43.1729, -22.9068] },
  { name: 'Buenos Aires', country: 'Argentina', coordinates: [-58.3816, -34.6037] },
  { name: 'Lima', country: 'Peru', coordinates: [-77.0428, -12.0464] },
  { name: 'Bogotá', country: 'Colombia', coordinates: [-74.0721, 4.7110] },
  { name: 'Santiago', country: 'Chile', coordinates: [-70.6693, -33.4489] },
  { name: 'Caracas', country: 'Venezuela', coordinates: [-66.9036, 10.4806] },
  
  // African cities
  { name: 'Cairo', country: 'Egypt', coordinates: [31.2357, 30.0444] },
  { name: 'Lagos', country: 'Nigeria', coordinates: [3.3792, 6.5244] },
  { name: 'Johannesburg', country: 'South Africa', coordinates: [28.0473, -26.2041] },
  { name: 'Cape Town', country: 'South Africa', coordinates: [18.4241, -33.9249] },
  { name: 'Casablanca', country: 'Morocco', coordinates: [-7.5898, 33.5731] },
  { name: 'Nairobi', country: 'Kenya', coordinates: [36.8219, -1.2921] },
];

const CitySearch: React.FC<CitySearchProps> = ({ 
  onCitySelect, 
  placeholder = "Search for a city..." 
}) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<City[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    if (value.length > 1) {
      const filtered = CITIES.filter(city =>
        city.name.toLowerCase().includes(value.toLowerCase()) ||
        city.country.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 8)); // Limit to 8 suggestions
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (city: City) => {
    setInputValue(`${city.name}, ${city.country}`);
    setShowSuggestions(false);
    onCitySelect(city);
  };

  const handleSubmit = () => {
    if (inputValue.trim()) {
      // Try to find exact match first
      const exactMatch = CITIES.find(city => 
        city.name.toLowerCase() === inputValue.trim().toLowerCase()
      );
      
      if (exactMatch) {
        onCitySelect(exactMatch);
        setInputValue(`${exactMatch.name}, ${exactMatch.country}`);
      } else if (suggestions.length > 0) {
        // Use first suggestion if no exact match
        const firstSuggestion = suggestions[0];
        onCitySelect(firstSuggestion);
        setInputValue(`${firstSuggestion.name}, ${firstSuggestion.country}`);
      }
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
    <div className="relative flex-1 max-w-md" ref={inputRef}>
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!inputValue.trim()}
          className="px-3"
        >
          <Search size={16} />
        </Button>
      </div>
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((city, index) => (
            <button
              key={`${city.name}-${city.country}-${index}`}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2 text-sm border-b border-gray-100 last:border-b-0"
              onClick={() => handleSuggestionClick(city)}
            >
              <MapPin size={14} className="text-gray-400" />
              <span className="font-medium">{city.name}</span>
              <span className="text-gray-500">{city.country}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CitySearch;
