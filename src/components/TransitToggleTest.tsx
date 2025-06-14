
import React from 'react';
import { useMap } from './MapProvider';

const TransitToggleTest: React.FC = () => {
  const { showTransit } = useMap();

  return (
    <div className="absolute top-32 left-4 z-[2001] bg-white/95 backdrop-blur-sm border shadow-lg p-3 rounded">
      <h3 className="text-sm font-semibold mb-2">Transit Toggle Test</h3>
      <div className="text-xs space-y-1">
        <div>
          Transit State: <span className={showTransit ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
            {showTransit ? "ON" : "OFF"}
          </span>
        </div>
        <div className="mt-2 text-gray-600">
          This panel shows the current transit toggle state for debugging.
        </div>
      </div>
    </div>
  );
};

export default TransitToggleTest;
