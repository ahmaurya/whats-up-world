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
  website?: string;
  operator?: string;
  opening_hours?: string;
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
            relation["tourism"="viewpoint"](${south},${west},${north},${east});
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

              const tags = element.tags || {};
              
              // Filter out generic names and create meaningful names
              let name = tags.name || '';
              
              // Skip generic viewpoints without proper names
              if (!name || 
                  name === 'Scenic Viewpoint' || 
                  name === 'Viewpoint' || 
                  name === 'View Point' ||
                  name.toLowerCase().includes('unnamed') ||
                  name.toLowerCase().includes('untitled')) {
                // Only keep if it has other identifying information
                if (tags.ref) {
                  name = `Viewpoint ${tags.ref}`;
                } else if (tags.ele && parseInt(tags.ele) > 0) {
                  name = `${tags.ele}m Viewpoint`;
                } else if (tags.natural) {
                  name = `${tags.natural} Viewpoint`;
                } else {
                  return null; // Skip generic viewpoints
                }
              }

              // Create more detailed descriptions based on available tags
              let description = tags.description || tags.note || '';
              
              // Skip if description is too generic
              if (description === 'Scenic viewpoint offering panoramic views of the surrounding landscape' ||
                  description === 'Beautiful views' ||
                  description === 'Nice view' ||
                  description.length < 10) {
                // Try to create a better description from available information
                const parts = [];
                if (tags.natural) parts.push(`Stunning ${tags.natural} vistas`);
                if (tags.mountain_range) parts.push(`overlooking the ${tags.mountain_range}`);
                if (tags.ele && parseInt(tags.ele) > 1000) parts.push(`from ${tags.ele}m elevation`);
                if (tags.direction) parts.push(`facing ${tags.direction}`);
                
                if (parts.length > 0) {
                  description = parts.join(' ');
                } else if (tags.wikipedia || tags.website) {
                  description = `Notable scenic viewpoint with documented significance`;
                } else {
                  description = `Elevated viewpoint offering scenic vistas`;
                }
              }
              
              return {
                id: `osm-viewpoint-${element.id}`,
                name: name,
                coordinates: [lon, lat],
                description: description,
                elevation: tags.ele || tags.elevation,
                direction: tags.direction,
                image: tags.image || tags.wikimedia_commons,
                wikipedia: tags.wikipedia,
                website: tags.website,
                operator: tags.operator,
                opening_hours: tags.opening_hours
              };
            }).filter(viewpoint => viewpoint !== null);
            
            console.log(`🏔️ Processed ${viewpoints.length} valid scenic viewpoints (filtered out generic ones)`);
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
