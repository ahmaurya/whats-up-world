
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

        console.log('🏛️ DEBUG STEP 2: Testing different API endpoints...');

        // TEST 1: Try the National Register of Historic Places REST API (different format)
        console.log('🔍 TEST 1: National Register REST API');
        const nrhpUrl = 'https://services1.arcgis.com/fBc8EJBxQRMcHlei/ArcGIS/rest/services/NRHP_Public_Portal/FeatureServer/0/query';
        const nrhpParams = new URLSearchParams({
          where: '1=1',
          outFields: '*',
          f: 'json',
          resultRecordCount: '5',
          geometry: `${west},${south},${east},${north}`,
          geometryType: 'esriGeometryEnvelope',
          spatialRel: 'esriSpatialRelIntersects'
        });
        
        const nrhpTestUrl = `${nrhpUrl}?${nrhpParams.toString()}`;
        console.log('🔍 NRHP Test URL:', nrhpTestUrl);
        
        const nrhpResponse = await fetch(nrhpTestUrl);
        console.log('🔍 NRHP Response status:', nrhpResponse.status);
        
        if (nrhpResponse.ok) {
          const nrhpData = await nrhpResponse.json();
          console.log('🔍 NRHP Response data:', nrhpData);
          
          if (nrhpData.features && nrhpData.features.length > 0) {
            console.log('✅ NRHP API WORKS! Sample feature:', nrhpData.features[0]);
            
            // Process the data
            const places = nrhpData.features.map((feature: any, index: number) => {
              const attrs = feature.attributes;
              const geom = feature.geometry;
              
              return {
                id: attrs.OBJECTID || `place-${index}`,
                name: attrs.RESNAME || attrs.NAME || 'Unknown Historic Place',
                coordinates: [geom.x || geom.longitude || 0, geom.y || geom.latitude || 0],
                county: attrs.COUNTY || 'Unknown County',
                state: attrs.STATE || 'Unknown State',
                date_listed: attrs.DATE_LISTED || attrs.DATELIST || 'Unknown Date',
                resource_type: attrs.RESTYPE || attrs.TYPE || 'Historic Place',
                nris_reference: attrs.NRIS_REFERENCE || attrs.REFNUM || ''
              };
            });
            
            setHistoricPlaces(places);
            setError(null);
            return;
          }
        }

        // TEST 2: Try OpenStreetMap Overpass API for historic places
        console.log('🔍 TEST 2: OpenStreetMap Overpass API');
        const overpassUrl = 'https://overpass-api.de/api/interpreter';
        const overpassQuery = `
          [out:json][timeout:25];
          (
            way["historic"~"building|castle|church|monastery|ruins|archaeological_site"]
              (${south},${west},${north},${east});
            node["historic"~"building|castle|church|monastery|ruins|archaeological_site"]
              (${south},${west},${north},${east});
          );
          out geom;
        `;
        
        const overpassResponse = await fetch(overpassUrl, {
          method: 'POST',
          body: overpassQuery
        });
        
        console.log('🔍 Overpass Response status:', overpassResponse.status);
        
        if (overpassResponse.ok) {
          const overpassData = await overpassResponse.json();
          console.log('🔍 Overpass Response data:', overpassData);
          
          if (overpassData.elements && overpassData.elements.length > 0) {
            console.log('✅ OVERPASS API WORKS! Sample element:', overpassData.elements[0]);
            
            const places = overpassData.elements.slice(0, 20).map((element: any, index: number) => {
              const lat = element.lat || (element.center && element.center.lat) || 0;
              const lon = element.lon || (element.center && element.center.lon) || 0;
              
              return {
                id: `osm-${element.id}`,
                name: element.tags?.name || element.tags?.historic || 'Historic Place',
                coordinates: [lon, lat],
                county: element.tags?.['addr:county'] || 'Unknown County',
                state: element.tags?.['addr:state'] || 'Unknown State',
                date_listed: element.tags?.start_date || 'Unknown Date',
                resource_type: element.tags?.historic || 'Historic Place',
                nris_reference: ''
              };
            });
            
            setHistoricPlaces(places);
            setError(null);
            return;
          }
        }

        // TEST 3: Try a simple mock data approach for now
        console.log('🔍 TEST 3: Using mock data as fallback');
        const mockPlaces: HistoricPlace[] = [
          {
            id: 'mock-1',
            name: 'Sample Historic Building',
            coordinates: [(west + east) / 2, (south + north) / 2],
            county: 'Sample County',
            state: 'Sample State',
            date_listed: '1980-01-01',
            resource_type: 'Building',
            nris_reference: 'MOCK001'
          }
        ];
        
        setHistoricPlaces(mockPlaces);
        setError('Using mock data - check console for API test results');
        
      } catch (err) {
        console.error('🏛️ Error during API testing:', err);
        setError(err instanceof Error ? err.message : 'Unknown error during API testing');
        setHistoricPlaces([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistoricPlaces();
  }, [bounds, enabled]);

  return { historicPlaces, loading, error };
};
