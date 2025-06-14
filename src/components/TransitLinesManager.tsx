
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
      
      console.log('🚇 TransitLinesManager: Loading Seattle transit data...');
      const bounds = map.getBounds();
      const boundingBox: BoundingBox = {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
      };

      try {
        const data = await fetchTransitData(boundingBox);
        console.log('🚇 Seattle Transit Data Successfully Loaded!');
        console.log('==========================================');
        console.log('📊 SEATTLE TRANSIT DATA SUMMARY:');
        console.log(`- Light Rail/Subway Lines: ${data.subway.length}`);
        console.log(`- Bus Routes: ${data.bus.length}`);
        console.log(`- Streetcar/Tram Lines: ${data.tram.length}`);
        console.log(`- Commuter Rail Lines: ${data.rail.length}`);
        console.log(`- Total Transit Lines: ${data.subway.length + data.bus.length + data.tram.length + data.rail.length}`);
        console.log('==========================================');
        
        console.log('🚇 DETAILED TRANSIT LINE DATA:');
        
        if (data.subway.length > 0) {
          console.log('\n📍 LIGHT RAIL/SUBWAY LINES:');
          data.subway.forEach((line, index) => {
            console.log(`${index + 1}. ${line.name}`);
            console.log(`   - Operator: ${line.operator}`);
            console.log(`   - Color: ${line.color}`);
            console.log(`   - Coordinates: ${line.coordinates.length} points`);
            console.log(`   - Route: ${line.coordinates[0]} → ${line.coordinates[line.coordinates.length - 1]}`);
            console.log('   - Full coordinate data:', line.coordinates);
          });
        }
        
        if (data.bus.length > 0) {
          console.log('\n🚌 BUS ROUTES:');
          data.bus.forEach((line, index) => {
            console.log(`${index + 1}. ${line.name}`);
            console.log(`   - Operator: ${line.operator}`);
            console.log(`   - Color: ${line.color}`);
            console.log(`   - Coordinates: ${line.coordinates.length} points`);
            console.log(`   - Route: ${line.coordinates[0]} → ${line.coordinates[line.coordinates.length - 1]}`);
            console.log('   - Full coordinate data:', line.coordinates);
          });
        }
        
        if (data.tram.length > 0) {
          console.log('\n🚋 STREETCAR/TRAM LINES:');
          data.tram.forEach((line, index) => {
            console.log(`${index + 1}. ${line.name}`);
            console.log(`   - Operator: ${line.operator}`);
            console.log(`   - Color: ${line.color}`);
            console.log(`   - Coordinates: ${line.coordinates.length} points`);
            console.log(`   - Route: ${line.coordinates[0]} → ${line.coordinates[line.coordinates.length - 1]}`);
            console.log('   - Full coordinate data:', line.coordinates);
          });
        }
        
        if (data.rail.length > 0) {
          console.log('\n🚂 COMMUTER RAIL LINES:');
          data.rail.forEach((line, index) => {
            console.log(`${index + 1}. ${line.name}`);
            console.log(`   - Operator: ${line.operator}`);
            console.log(`   - Color: ${line.color}`);
            console.log(`   - Coordinates: ${line.coordinates.length} points`);
            console.log(`   - Route: ${line.coordinates[0]} → ${line.coordinates[line.coordinates.length - 1]}`);
            console.log('   - Full coordinate data:', line.coordinates);
          });
        }
        
        console.log('==========================================');
        console.log('📍 MAP BOUNDS USED FOR FILTERING:');
        console.log(`   North: ${boundingBox.north}`);
        console.log(`   South: ${boundingBox.south}`);
        console.log(`   East: ${boundingBox.east}`);
        console.log(`   West: ${boundingBox.west}`);
        console.log('==========================================');
        
        setTransitData(data);
      } catch (error) {
        console.error('❌ TransitLinesManager: Error loading Seattle transit data:', error);
      }
    };

    loadTransitData();
  }, [map]);

  // Handle transit visibility toggle
  useEffect(() => {
    if (!map) return;

    if (!transitLayerRef.current) {
      transitLayerRef.current = L.layerGroup().addTo(map);
      console.log('🗺️ Created transit layer group and added to map');
    }

    const transitLayer = transitLayerRef.current;

    if (showTransit && transitData) {
      console.log('🚇 Adding Seattle transit lines to map...');
      
      // Clear existing lines
      transitLayer.clearLayers();

      // Add all transit lines
      const allLines = [...transitData.subway, ...transitData.bus, ...transitData.tram, ...transitData.rail];
      console.log(`📍 Adding ${allLines.length} transit lines to map`);
      
      allLines.forEach((line, index) => {
        if (line.coordinates && line.coordinates.length > 0) {
          const polyline = L.polyline(line.coordinates as [number, number][], {
            color: line.color,
            weight: 3,
            opacity: 0.8
          }).bindPopup(`<strong>${line.name}</strong><br/>Operator: ${line.operator}`);
          
          transitLayer.addLayer(polyline);
          console.log(`✅ Added ${line.type}: ${line.name} (${line.coordinates.length} points)`);
        }
      });
      
      console.log(`🗺️ Successfully added ${transitLayer.getLayers().length} transit lines to map`);
    } else {
      console.log('🚇 Hiding transit lines from map');
      transitLayer.clearLayers();
    }
  }, [map, showTransit, transitData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (transitLayerRef.current) {
        transitLayerRef.current.clearLayers();
        transitLayerRef.current.remove();
        console.log('🧹 Cleaned up transit layer on unmount');
      }
    };
  }, []);

  return null;
};

export default TransitLinesManager;
