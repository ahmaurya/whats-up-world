
import React from 'react';

const LiveVehicleStyles: React.FC = () => {
  React.useEffect(() => {
    // Add custom CSS for live vehicle markers
    const style = document.createElement('style');
    style.textContent = `
      .live-vehicle-marker {
        cursor: pointer !important;
        transition: transform 0.2s ease;
      }
      
      .live-vehicle-marker:hover {
        transform: scale(1.1) !important;
      }
      
      .live-bus-marker {
        z-index: 1001 !important;
      }
      
      .live-rail-marker {
        z-index: 1002 !important;
      }
      
      .live-tram-marker {
        z-index: 1003 !important;
      }
      
      .live-vehicle-tooltip {
        background: rgba(0, 0, 0, 0.8) !important;
        color: white !important;
        border: none !important;
        border-radius: 4px !important;
        font-size: 12px !important;
        padding: 4px 8px !important;
      }
      
      .live-vehicle-popup .leaflet-popup-content {
        margin: 8px !important;
      }
      
      .live-vehicle-popup .leaflet-popup-content-wrapper {
        border-radius: 8px !important;
      }
      
      /* Animation for live vehicles */
      @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
        70% { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }
        100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
      }
      
      .live-bus-marker > div {
        animation: pulse 2s infinite;
      }
      
      @keyframes rail-pulse {
        0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
        70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
        100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
      }
      
      .live-rail-marker > div {
        animation: rail-pulse 3s infinite;
      }
      
      @keyframes tram-pulse {
        0% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.7); }
        70% { box-shadow: 0 0 0 10px rgba(249, 115, 22, 0); }
        100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); }
      }
      
      .live-tram-marker > div {
        animation: tram-pulse 2.5s infinite;
      }
    `;
    
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return null;
};

export default LiveVehicleStyles;
