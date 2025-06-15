
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { LiveVehicle } from '@/hooks/useLiveTransitData';

interface LiveVehicleMarkersProps {
  map: L.Map | null;
  vehicles: LiveVehicle[];
  vehicleType: 'bus' | 'rail' | 'tram';
  visible: boolean;
}

const LiveVehicleMarkers: React.FC<LiveVehicleMarkersProps> = ({
  map,
  vehicles,
  vehicleType,
  visible
}) => {
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  // Create custom icons for different vehicle types
  const createVehicleIcon = (vehicle: LiveVehicle) => {
    const getIconConfig = () => {
      switch (vehicle.vehicleType) {
        case 'bus':
          return {
            html: '🚌',
            className: 'live-bus-marker',
            iconSize: [20, 20],
            color: '#22C55E' // Green
          };
        case 'rail':
          return {
            html: '🚊',
            className: 'live-rail-marker',
            iconSize: [24, 24],
            color: '#3B82F6' // Blue
          };
        case 'tram':
          return {
            html: '🚋',
            className: 'live-tram-marker',
            iconSize: [22, 22],
            color: '#F97316' // Orange
          };
        default:
          return {
            html: '🚌',
            className: 'live-vehicle-marker',
            iconSize: [20, 20],
            color: '#6B7280'
          };
      }
    };

    const config = getIconConfig();

    return L.divIcon({
      html: `
        <div style="
          position: relative;
          width: ${config.iconSize[0]}px;
          height: ${config.iconSize[1]}px;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotate(${vehicle.bearing || 0}deg);
        ">
          <div style="
            background: white;
            border: 2px solid ${config.color};
            border-radius: 50%;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          ">
            ${config.html}
          </div>
        </div>
      `,
      className: config.className,
      iconSize: config.iconSize as [number, number],
      iconAnchor: [config.iconSize[0] / 2, config.iconSize[1] / 2]
    });
  };

  // Create popup content for vehicle
  const createPopupContent = (vehicle: LiveVehicle) => {
    const timeSinceUpdate = Math.floor((Date.now() - vehicle.timestamp) / 1000);
    const occupancyDisplay = vehicle.occupancyStatus?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';
    
    return `
      <div class="live-vehicle-popup" style="min-width: 200px;">
        <div style="border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 8px;">
          <h3 style="margin: 0; font-size: 16px; font-weight: bold; color: #1f2937;">
            ${vehicle.routeName}
          </h3>
          <p style="margin: 2px 0 0 0; font-size: 12px; color: #6b7280;">
            ${vehicle.operator}
          </p>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
          <div>
            <strong>Vehicle ID:</strong><br/>
            ${vehicle.id}
          </div>
          <div>
            <strong>Route:</strong><br/>
            ${vehicle.routeId}
          </div>
          <div>
            <strong>Speed:</strong><br/>
            ${vehicle.speed ? `${Math.round(vehicle.speed)} mph` : 'Unknown'}
          </div>
          <div>
            <strong>Occupancy:</strong><br/>
            ${occupancyDisplay}
          </div>
        </div>
        
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #6b7280;">
          Updated ${timeSinceUpdate}s ago
        </div>
      </div>
    `;
  };

  useEffect(() => {
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach(marker => {
      map.removeLayer(marker);
    });
    markersRef.current.clear();

    // Add new markers if visible
    if (visible && vehicles.length > 0) {
      console.log(`🚌 Adding ${vehicles.length} live ${vehicleType} markers to map`);
      
      vehicles.forEach(vehicle => {
        const marker = L.marker([vehicle.latitude, vehicle.longitude], {
          icon: createVehicleIcon(vehicle),
          zIndexOffset: 1000 // Keep live vehicles on top
        });

        // Add popup with vehicle information
        marker.bindPopup(createPopupContent(vehicle));

        // Add tooltip for quick info
        marker.bindTooltip(
          `${vehicle.routeName} - ${vehicle.operator}`,
          {
            permanent: false,
            direction: 'top',
            offset: [0, -15],
            className: 'live-vehicle-tooltip'
          }
        );

        marker.addTo(map);
        markersRef.current.set(vehicle.id, marker);
      });
    }

    // Cleanup function
    return () => {
      markersRef.current.forEach(marker => {
        map.removeLayer(marker);
      });
      markersRef.current.clear();
    };
  }, [map, vehicles, visible, vehicleType]);

  return null;
};

export default LiveVehicleMarkers;
