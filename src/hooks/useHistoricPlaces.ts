
import { useState, useEffect } from 'react';

export interface HistoricPlace {
  id: string;
  name: string;
  coordinates: [number, number];
  county: string;
  state: string;
  date_listed: string;
  resource_type: string;
  nris_reference: string;
}

export const useHistoricPlaces = (bounds: L.LatLngBounds | null, enabled: boolean) => {
  const [historicPlaces, setHistoricPlaces] = useState<HistoricPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bounds || !enabled) {
      setHistoricPlaces([]);
      return;
    }

    const fetchHistoricPlaces = async () => {
      setLoading(true);
      setError(null);

      try {
        const south = bounds.getSouth();
        const west = bounds.getWest();
        const north = bounds.getNorth();
        const east = bounds.getEast();

        console.log('🏛️ Fetching historic places using OpenStreetMap Overpass API...');

        // Use OpenStreetMap Overpass API for historic places
        const overpassUrl = 'https://overpass-api.de/api/interpreter';
        const overpassQuery = `
          [out:json][timeout:25];
          (
            way["historic"~"building|castle|church|monastery|ruins|archaeological_site|memorial|monument"]
              (${south},${west},${north},${east});
            node["historic"~"building|castle|church|monastery|ruins|archaeological_site|memorial|monument"]
              (${south},${west},${north},${east});
          );
          out geom;
        `;
        
        const overpassResponse = await fetch(overpassUrl, {
          method: 'POST',
          body: overpassQuery
        });
        
        console.log('🔍 Overpass API response status:', overpassResponse.status);
        
        if (overpassResponse.ok) {
          const overpassData = await overpassResponse.json();
          console.log('🔍 Overpass API response data:', overpassData);
          
          if (overpassData.elements && overpassData.elements.length > 0) {
            console.log(`✅ Found ${overpassData.elements.length} historic places`);
            
            const places = overpassData.elements.slice(0, 50).map((element: any) => {
              // Handle both nodes and ways
              let lat, lon;
              if (element.type === 'node') {
                lat = element.lat;
                lon = element.lon;
              } else if (element.type === 'way' && element.geometry && element.geometry.length > 0) {
                // For ways, use the center point of the geometry
                const centerIndex = Math.floor(element.geometry.length / 2);
                lat = element.geometry[centerIndex].lat;
                lon = element.geometry[centerIndex].lon;
              } else if (element.center) {
                lat = element.center.lat;
                lon = element.center.lon;
              } else {
                return null;
              }

              if (!lat || !lon) return null;
              
              return {
                id: `osm-${element.id}`,
                name: element.tags?.name || element.tags?.historic || 'Historic Place',
                coordinates: [lon, lat],
                county: element.tags?.['addr:county'] || element.tags?.['addr:city'] || 'Unknown County',
                state: element.tags?.['addr:state'] || element.tags?.['addr:country'] || 'Unknown State',
                date_listed: element.tags?.start_date || element.tags?.['construction_date'] || 'Unknown Date',
                resource_type: element.tags?.historic || 'Historic Place',
                nris_reference: element.tags?.ref || ''
              };
            }).filter(place => place !== null);
            
            console.log(`🏛️ Processed ${places.length} valid historic places`);
            setHistoricPlaces(places);
            setError(null);
            return;
          }
        }

        // If no data found, show appropriate message
        console.log('🔍 No historic places found in this area');
        setHistoricPlaces([]);
        setError('No historic places found in this area');
        
      } catch (err) {
        console.error('🏛️ Error fetching historic places:', err);
        setError(err instanceof Error ? err.message : 'Error fetching historic places');
        setHistoricPlaces([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistoricPlaces();
  }, [bounds, enabled]);

  return { historicPlaces, loading, error };
};
