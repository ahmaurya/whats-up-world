
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useTransitStore } from '@/hooks/useTransitStore';
import { fetchTransitData } from '@/utils/gtfsApi';
import { TransitData, BoundingBox } from '@/types/transit';

interface TransitLinesManagerProps {
  map: L.Map | null;
}

const TransitLinesManager: React.FC<TransitLinesManagerProps> = ({ map }) => {
  const { showTransit } = useTransitStore();
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
        setTransitData(data);
      } catch (error) {
        console.error('TransitLinesManager: Error loading transit data:', error);
      }
    };

    loadTransitData();
  }, [map]);

  // Handle transit visibility toggle
  useEffect(() => {
    console.log('TransitLinesManager: showTransit changed to:', showTransit);
    console.log('Transit data or showTransit changed');
    console.log('- transitData exists:', !!transitData);
    console.log('- showTransit:', showTransit);

    if (!map) {
      console.log('Early return: no map');
      return;
    }

    if (!transitLayerRef.current) {
      transitLayerRef.current = L.layerGroup().addTo(map);
      console.log('TransitLinesManager: Created transit layer group');
    }

    const transitLayer = transitLayerRef.current;

    if (showTransit && transitData) {
      console.log('TransitLinesManager: Adding transit lines to map');
      
      // Clear existing lines
      transitLayer.clearLayers();

      // Add all transit lines
      [...transitData.subway, ...transitData.bus, ...transitData.tram, ...transitData.rail].forEach(line => {
        if (line.coordinates && line.coordinates.length > 0) {
          const polyline = L.polyline(line.coordinates as [number, number][], {
            color: line.color,
            weight: 3,
            opacity: 0.8
          }).bindPopup(`<strong>${line.name}</strong><br/>Operator: ${line.operator}`);
          
          transitLayer.addLayer(polyline);
          console.log(`Added ${line.type} line: ${line.name}`);
        }
      });
    } else {
      console.log('TransitLinesManager: Clearing transit lines from map');
      transitLayer.clearLayers();
    }
  }, [map, showTransit, transitData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (transitLayerRef.current) {
        transitLayerRef.current.clearLayers();
        transitLayerRef.current.remove();
      }
    };
  }, []);

  return null;
};

export default TransitLinesManager;
