
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

        // Query the National Register of Historic Places API
        const response = await fetch(
          `https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_Historic_Places/FeatureServer/0/query?` +
          `where=1%3D1&` +
          `geometry=${west},${south},${east},${north}&` +
          `geometryType=esriGeometryEnvelope&` +
          `spatialRel=esriSpatialRelIntersects&` +
          `outFields=*&` +
          `returnGeometry=true&` +
          `f=json&` +
          `resultRecordCount=100`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch historic places');
        }

        const data = await response.json();
        
        console.log('🏛️ Raw API response:', data);
        
        if (data.features) {
          const places: HistoricPlace[] = data.features.map((feature: any, index: number) => ({
            id: feature.attributes.OBJECTID?.toString() || `historic-${index}`,
            name: feature.attributes.RESNAME || feature.attributes.NAME || 'Historic Place',
            coordinates: [feature.geometry.x, feature.geometry.y] as [number, number],
            county: feature.attributes.COUNTYNAME || 'Unknown',
            state: feature.attributes.STATE || 'Unknown',
            date_listed: feature.attributes.DATE_LISTED || 'Unknown',
            resource_type: feature.attributes.RESTYPES || 'Historic Site',
            nris_reference: feature.attributes.NRIS_REF || ''
          }));

          console.log(`🏛️ Fetched ${places.length} historic places:`, places);
          console.log('🏛️ Sample place data:', places[0]);
          setHistoricPlaces(places);
        }
      } catch (err) {
        console.error('Error fetching historic places:', err);
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
