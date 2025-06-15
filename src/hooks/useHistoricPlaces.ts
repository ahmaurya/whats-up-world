
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

        console.log('🏛️ Bounds:', { south, west, north, east });

        // DEBUGGING STEP 1: Test if the service exists with minimal query
        console.log('🔍 STEP 1: Testing service existence...');
        
        const testUrl = 'https://services.arcgis.com/P3ePLMYs2RVChkJx/ArcGIS/rest/services/USA_Historic_Places/FeatureServer/0?f=json';
        console.log('🔍 Testing service info URL:', testUrl);
        
        const serviceTest = await fetch(testUrl);
        console.log('🔍 Service test response status:', serviceTest.status);
        
        if (serviceTest.ok) {
          const serviceInfo = await serviceTest.json();
          console.log('🔍 Service info:', serviceInfo);
        } else {
          console.log('🔍 Service test failed, trying alternative...');
          
          // DEBUGGING STEP 2: Try different service URL structure
          const altTestUrl = 'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_Historic_Places/FeatureServer/0?f=json';
          console.log('🔍 Testing alternative service URL:', altTestUrl);
          
          const altServiceTest = await fetch(altTestUrl);
          console.log('🔍 Alternative service response status:', altServiceTest.status);
          
          if (altServiceTest.ok) {
            const altServiceInfo = await altServiceTest.json();
            console.log('🔍 Alternative service info:', altServiceInfo);
          }
        }

        // DEBUGGING STEP 3: Try a completely different historic places service
        console.log('🔍 STEP 3: Trying National Park Service API...');
        const npsTestUrl = 'https://services1.arcgis.com/fBc8EJBxQRMcHlei/arcgis/rest/services/NRHP_Public_Portal/FeatureServer/0?f=json';
        console.log('🔍 Testing NPS service URL:', npsTestUrl);
        
        const npsTest = await fetch(npsTestUrl);
        console.log('🔍 NPS service response status:', npsTest.status);
        
        if (npsTest.ok) {
          const npsInfo = await npsTest.json();
          console.log('🔍 NPS service info:', npsInfo);
          
          // If this service works, try a simple query
          console.log('🔍 STEP 4: Testing simple query on NPS service...');
          const simpleQueryUrl = `${npsTestUrl.replace('?f=json', '/query')}?where=1=1&outFields=*&f=json&resultRecordCount=1`;
          console.log('🔍 Simple query URL:', simpleQueryUrl);
          
          const simpleQuery = await fetch(simpleQueryUrl);
          console.log('🔍 Simple query response status:', simpleQuery.status);
          
          if (simpleQuery.ok) {
            const simpleResult = await simpleQuery.json();
            console.log('🔍 Simple query result:', simpleResult);
            
            if (simpleResult.features && simpleResult.features.length > 0) {
              console.log('🔍 Sample feature from NPS:', simpleResult.features[0]);
              console.log('🔍 NPS feature attributes:', simpleResult.features[0].attributes);
              console.log('🔍 NPS feature geometry:', simpleResult.features[0].geometry);
            }
          }
        }

        // For now, set empty results while we debug
        setHistoricPlaces([]);
        setError('Service debugging in progress - check console for results');
        
      } catch (err) {
        console.error('🏛️ Error during debugging:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setHistoricPlaces([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistoricPlaces();
  }, [bounds, enabled]);

  return { historicPlaces, loading, error };
};
