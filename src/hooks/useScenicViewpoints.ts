
import { useState, useEffect } from 'react';

export interface ScenicViewpoint {
  id: string;
  name: string;
  coordinates: [number, number];
  description?: string;
  elevation?: string;
  direction?: string;
  image?: string;
  wikipedia?: string;
}

export const useScenicViewpoints = (bounds: L.LatLngBounds | null, enabled: boolean) => {
  const [scenicViewpoints, setScenicViewpoints] = useState<ScenicViewpoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bounds || !enabled) {
      setScenicViewpoints([]);
      return;
    }

    const fetchScenicViewpoints = async () => {
      setLoading(true);
      setError(null);

      try {
        const south = bounds.getSouth();
        const west = bounds.getWest();
        const north = bounds.getNorth();
        const east = bounds.getEast();

        console.log('🏔️ Fetching scenic viewpoints using OpenStreetMap Overpass API...');

        const overpassUrl = 'https://overpass-api.de/api/interpreter';
        const overpassQuery = `
          [out:json][timeout:25];
          (
            node["tourism"="viewpoint"](${south},${west},${north},${east});
            way["tourism"="viewpoint"](${south},${west},${north},${east});
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
            console.log(`✅ Found ${overpassData.elements.length} scenic viewpoints`);
            
            const viewpoints = overpassData.elements.slice(0, 50).map((element: any) => {
              let lat, lon;
              if (element.type === 'node') {
                lat = element.lat;
                lon = element.lon;
              } else if (element.type === 'way' && element.geometry && element.geometry.length > 0) {
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
                id: `osm-viewpoint-${element.id}`,
                name: element.tags?.name || 'Scenic Viewpoint',
                coordinates: [lon, lat],
                description: element.tags?.description || element.tags?.note || 'Scenic viewpoint with beautiful views',
                elevation: element.tags?.ele || element.tags?.elevation,
                direction: element.tags?.direction,
                image: element.tags?.image || element.tags?.wikimedia_commons,
                wikipedia: element.tags?.wikipedia
              };
            }).filter(viewpoint => viewpoint !== null);
            
            console.log(`🏔️ Processed ${viewpoints.length} valid scenic viewpoints`);
            setScenicViewpoints(viewpoints);
            setError(null);
            return;
          }
        }

        console.log('🔍 No scenic viewpoints found in this area');
        setScenicViewpoints([]);
        setError('No scenic viewpoints found in this area');
        
      } catch (err) {
        console.error('🏔️ Error fetching scenic viewpoints:', err);
        setError(err instanceof Error ? err.message : 'Error fetching scenic viewpoints');
        setScenicViewpoints([]);
      } finally {
        setLoading(false);
      }
    };

    fetchScenicViewpoints();
  }, [bounds, enabled]);

  return { scenicViewpoints, loading, error };
};
