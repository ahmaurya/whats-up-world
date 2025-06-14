
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useMap } from './MapProvider';
import { fetchTransitData } from '@/utils/gtfsApi';
import { TransitData, BoundingBox } from '@/types/transit';

interface TransitLinesManagerProps {
  map: L.Map | null;
}

const TransitLinesManager: React.FC<TransitLinesManagerProps> = ({ map }) => {
  const { showTransit } = useMap();
  const transitLayerRef = useRef<L.LayerGroup | null>(null);
  const [transitData, setTransitData] = useState<TransitData | null>(null);

  // Fetch transit data when component mounts
  useEffect(() => {
    const loadTransitData = async () => {
      if (!map) return;
      
      console.log('TransitLinesManager: Loading transit data...');
      const bounds = map.getBounds();
      const boundingBox: BoundingBox = {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
      };

      try {
        const data = await fetchTransitData(boundingBox);
        console.log('TransitLinesManager: Transit data loaded:', data);
        console.log('=== COMPLETE TRANSIT DATA DUMP ===');
        console.log('Full transit data object:', JSON.stringify(data, null, 2));
        console.log('Total lines by type:');
        console.log('- Subway lines:', data.subway.length);
        console.log('- Bus lines:', data.bus.length);
        console.log('- Tram lines:', data.tram.length);
        console.log('- Rail lines:', data.rail.length);
        
        if (data.subway.length > 0) {
          console.log('Sample subway line:', data.subway[0]);
          console.log('Sample subway coordinates (first 5):', data.subway[0].coordinates.slice(0, 5));
        }
        if (data.bus.length > 0) {
          console.log('Sample bus line:', data.bus[0]);
          console.log('Sample bus coordinates (first 5):', data.bus[0].coordinates.slice(0, 5));
        }
        console.log('=== END TRANSIT DATA DUMP ===');
        
        setTransitData(data);
      } catch (error) {
        console.error('TransitLinesManager: Error loading transit data:', error);
      }
    };

    loadTransitData();
  }, [map]);

  // Handle transit visibility toggle
  useEffect(() => {
    console.log('=== TRANSIT VISIBILITY EFFECT ===');
    console.log('TransitLinesManager: showTransit changed to:', showTransit);
    console.log('Transit data exists:', !!transitData);
    console.log('Map exists:', !!map);
    console.log('Transit layer exists:', !!transitLayerRef.current);

    if (!map) {
      console.log('Early return: no map');
      return;
    }

    if (!transitLayerRef.current) {
      transitLayerRef.current = L.layerGroup().addTo(map);
      console.log('TransitLinesManager: Created transit layer group and added to map');
      console.log('Transit layer added to map:', map.hasLayer(transitLayerRef.current));
    }

    const transitLayer = transitLayerRef.current;

    if (showTransit && transitData) {
      console.log('TransitLinesManager: Adding transit lines to map');
      
      // Clear existing lines
      transitLayer.clearLayers();
      console.log('Cleared existing layers from transit group');

      // Add all transit lines
      const allLines = [...transitData.subway, ...transitData.bus, ...transitData.tram, ...transitData.rail];
      console.log('Total lines to add:', allLines.length);
      
      allLines.forEach((line, index) => {
        if (line.coordinates && line.coordinates.length > 0) {
          console.log(`Adding line ${index + 1}/${allLines.length}: ${line.name}`);
          console.log(`- Type: ${line.type}, Color: ${line.color}`);
          console.log(`- Coordinates count: ${line.coordinates.length}`);
          console.log(`- First coordinate: [${line.coordinates[0][0]}, ${line.coordinates[0][1]}]`);
          console.log(`- Last coordinate: [${line.coordinates[line.coordinates.length - 1][0]}, ${line.coordinates[line.coordinates.length - 1][1]}]`);
          
          const polyline = L.polyline(line.coordinates as [number, number][], {
            color: line.color,
            weight: 3,
            opacity: 0.8
          }).bindPopup(`<strong>${line.name}</strong><br/>Operator: ${line.operator}`);
          
          transitLayer.addLayer(polyline);
          console.log(`✓ Successfully added ${line.type} line: ${line.name}`);
          console.log(`- Polyline bounds:`, polyline.getBounds());
        } else {
          console.log(`✗ Skipping line ${line.name} - no coordinates`);
        }
      });
      
      console.log('Final transit layer state:');
      console.log('- Layer count in group:', transitLayer.getLayers().length);
      console.log('- Transit layer on map:', map.hasLayer(transitLayer));
      console.log('- Map center:', map.getCenter());
      console.log('- Map zoom:', map.getZoom());
      console.log('- Map bounds:', map.getBounds());
    } else {
      console.log('TransitLinesManager: Clearing transit lines from map');
      console.log('- Reason: showTransit =', showTransit, ', transitData exists =', !!transitData);
      transitLayer.clearLayers();
      console.log('- Cleared all layers from transit group');
    }
    console.log('=== END TRANSIT VISIBILITY EFFECT ===');
  }, [map, showTransit, transitData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (transitLayerRef.current) {
        transitLayerRef.current.clearLayers();
        transitLayerRef.current.remove();
        console.log('TransitLinesManager: Cleaned up transit layer on unmount');
      }
    };
  }, []);

  return null;
};

export default TransitLinesManager;
