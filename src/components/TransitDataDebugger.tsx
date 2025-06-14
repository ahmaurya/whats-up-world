
import React, { useState, useEffect } from 'react';
import { fetchTransitData } from '@/utils/gtfsApi';
import { TransitData, BoundingBox } from '@/types/transit';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const TransitDataDebugger: React.FC = () => {
  const [transitData, setTransitData] = useState<TransitData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [bounds, setBounds] = useState<BoundingBox>({
    north: 47.7,
    south: 47.5,
    east: -122.2,
    west: -122.4
  });

  const testFetchData = async () => {
    setIsLoading(true);
    console.log('TransitDataDebugger: Testing data fetch with bounds:', bounds);
    
    try {
      const data = await fetchTransitData(bounds);
      console.log('TransitDataDebugger: Received data:', data);
      setTransitData(data);
    } catch (error) {
      console.error('TransitDataDebugger: Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    testFetchData();
  }, []);

  const totalLines = transitData 
    ? transitData.subway.length + transitData.bus.length + transitData.tram.length + transitData.rail.length
    : 0;

  return (
    <Card className="absolute bottom-4 left-4 z-[2001] bg-white/95 backdrop-blur-sm border shadow-lg p-4 max-w-md">
      <h3 className="text-sm font-semibold mb-3">Transit Data Debugger</h3>
      
      <div className="space-y-2 text-xs">
        <div>
          <strong>Status:</strong> {isLoading ? 'Loading...' : 'Ready'}
        </div>
        
        <div>
          <strong>Total Lines:</strong> {totalLines}
        </div>
        
        {transitData && (
          <div className="space-y-1">
            <div>Subway: {transitData.subway.length}</div>
            <div>Bus: {transitData.bus.length}</div>
            <div>Tram: {transitData.tram.length}</div>
            <div>Rail: {transitData.rail.length}</div>
          </div>
        )}
        
        <div className="mt-2">
          <strong>Test Bounds:</strong>
          <div className="text-xs text-gray-600">
            N: {bounds.north}, S: {bounds.south}<br/>
            E: {bounds.east}, W: {bounds.west}
          </div>
        </div>
        
        <Button 
          size="sm" 
          onClick={testFetchData}
          disabled={isLoading}
          className="w-full mt-2"
        >
          Refresh Data
        </Button>
        
        {transitData && transitData.subway.length > 0 && (
          <div className="mt-2 text-xs">
            <strong>Sample Route:</strong><br/>
            {transitData.subway[0].name}<br/>
            Coords: {transitData.subway[0].coordinates.length}
          </div>
        )}
      </div>
    </Card>
  );
};

export default TransitDataDebugger;
