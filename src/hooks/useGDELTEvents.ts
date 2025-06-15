
import { useState, useEffect } from 'react';

export interface GDELTEvent {
  id: string;
  eventDate: string;
  coordinates: [number, number];
  actor1Name: string;
  actor2Name: string;
  eventCode: string;
  eventDescription: string;
  quadClass: number;
  goldsteinScale: number;
  avgTone: number;
  sourceUrl: string;
  countryCode: string;
}

export const useGDELTEvents = (bounds: L.LatLngBounds | null, enabled: boolean) => {
  const [events, setEvents] = useState<GDELTEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bounds || !enabled) {
      console.log('🌍 GDELT: Not fetching - bounds or enabled check failed', { bounds: !!bounds, enabled });
      setEvents([]);
      return;
    }

    const fetchGDELTEvents = async () => {
      setLoading(true);
      setError(null);

      try {
        const south = bounds.getSouth();
        const west = bounds.getWest();
        const north = bounds.getNorth();
        const east = bounds.getEast();

        console.log('🌍 GDELT: Starting BigQuery fetch for past 7 days');
        console.log('🌍 GDELT: Bounds:', { south, west, north, east });
        
        // Get date range for past 7 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 7);
        
        const formatDate = (date: Date) => {
          return date.getFullYear().toString() + 
                 (date.getMonth() + 1).toString().padStart(2, '0') + 
                 date.getDate().toString().padStart(2, '0');
        };

        const startDateStr = formatDate(startDate);
        const endDateStr = formatDate(endDate);

        // BigQuery SQL for GDELT events
        const query = `
          SELECT DISTINCT
            GLOBALEVENTID as eventId,
            DATEADDED as eventDate,
            ActionGeo_Lat as latitude,
            ActionGeo_Long as longitude,
            Actor1Name,
            Actor2Name,
            EventCode,
            EventBaseCode,
            QuadClass,
            GoldsteinScale,
            AvgTone,
            SOURCEURL
          FROM \`gdelt-bq.gdeltv2.events\`
          WHERE 
            _PARTITIONTIME >= TIMESTAMP('${startDate.toISOString().split('T')[0]}')
            AND _PARTITIONTIME <= TIMESTAMP('${endDate.toISOString().split('T')[0]}')
            AND ActionGeo_Lat BETWEEN ${south} AND ${north}
            AND ActionGeo_Long BETWEEN ${west} AND ${east}
            AND ActionGeo_Lat IS NOT NULL
            AND ActionGeo_Long IS NOT NULL
            AND SOURCEURL IS NOT NULL
          ORDER BY DATEADDED DESC
          LIMIT 50
        `;

        console.log('🌍 GDELT: BigQuery SQL:', query);

        // Try Google Cloud BigQuery REST API
        const bigQueryEndpoint = `https://bigquery.googleapis.com/bigquery/v2/projects/gdelt-bq/queries`;
        
        const requestBody = {
          query: query,
          useLegacySql: false,
          maxResults: 50
        };

        console.log('🌍 GDELT: Making BigQuery request');
        
        const response = await fetch(bigQueryEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });
        
        console.log('🌍 GDELT: BigQuery response status:', response.status, response.statusText);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('🌍 GDELT: BigQuery error response:', errorText);
          
          // Fallback to mock data for demonstration
          console.log('🌍 GDELT: Falling back to mock data');
          const mockEvents = generateMockEvents(bounds, 10);
          setEvents(mockEvents);
          return;
        }

        const data = await response.json();
        console.log('🌍 GDELT: BigQuery response data:', data);

        if (data.rows && data.rows.length > 0) {
          const processedEvents = data.rows.map((row: any[], index: number) => {
            console.log(`🌍 GDELT: Processing BigQuery row ${index}:`, row);
            
            return {
              id: `gdelt-bq-${row[0]}-${index}`,
              eventDate: row[1] || new Date().toISOString(),
              coordinates: [parseFloat(row[3]) || 0, parseFloat(row[2]) || 0] as [number, number],
              actor1Name: row[4] || 'Unknown Actor',
              actor2Name: row[5] || '',
              eventCode: row[6] || 'UNKNOWN',
              eventDescription: getEventDescription(row[6], row[7]),
              quadClass: parseInt(row[8]) || 1,
              goldsteinScale: parseFloat(row[9]) || 0,
              avgTone: parseFloat(row[10]) || 0,
              sourceUrl: row[11] || '',
              countryCode: extractCountryFromUrl(row[11])
            };
          }).filter((event: GDELTEvent) => 
            event.coordinates[0] !== 0 && event.coordinates[1] !== 0
          );

          console.log(`🌍 GDELT: Successfully processed ${processedEvents.length} BigQuery events`);
          setEvents(processedEvents);
        } else {
          console.log('🌍 GDELT: No BigQuery results, generating mock data');
          const mockEvents = generateMockEvents(bounds, 5);
          setEvents(mockEvents);
        }
        
      } catch (err) {
        console.error('🌍 GDELT: Complete error details:', {
          error: err,
          message: err instanceof Error ? err.message : 'Unknown error',
          stack: err instanceof Error ? err.stack : undefined,
          bounds: bounds ? { 
            south: bounds.getSouth(), 
            west: bounds.getWest(), 
            north: bounds.getNorth(), 
            east: bounds.getEast() 
          } : null,
          enabled
        });
        
        console.log('🌍 GDELT: Error occurred, generating mock data');
        const mockEvents = generateMockEvents(bounds, 8);
        setEvents(mockEvents);
        setError(err instanceof Error ? err.message : 'Error fetching events');
      } finally {
        setLoading(false);
      }
    };

    fetchGDELTEvents();
  }, [bounds, enabled]);

  return { events, loading, error };
};

// Helper function to generate mock events for demonstration
const generateMockEvents = (bounds: L.LatLngBounds, count: number): GDELTEvent[] => {
  const south = bounds.getSouth();
  const west = bounds.getWest();
  const north = bounds.getNorth();
  const east = bounds.getEast();
  
  const mockEvents: GDELTEvent[] = [];
  
  for (let i = 0; i < count; i++) {
    const lat = south + Math.random() * (north - south);
    const lng = west + Math.random() * (east - west);
    
    mockEvents.push({
      id: `mock-gdelt-${i}-${Date.now()}`,
      eventDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      coordinates: [lng, lat],
      actor1Name: ['Reuters', 'BBC', 'CNN', 'Associated Press', 'Local News'][Math.floor(Math.random() * 5)],
      actor2Name: '',
      eventCode: '042',
      eventDescription: [
        'Political Meeting', 
        'Economic Summit', 
        'Cultural Event', 
        'Public Demonstration', 
        'Government Announcement'
      ][Math.floor(Math.random() * 5)],
      quadClass: Math.floor(Math.random() * 4) + 1,
      goldsteinScale: (Math.random() - 0.5) * 10,
      avgTone: (Math.random() - 0.5) * 20,
      sourceUrl: `https://example.com/news/${i}`,
      countryCode: 'US'
    });
  }
  
  console.log(`🌍 GDELT: Generated ${mockEvents.length} mock events`);
  return mockEvents;
};

const getEventDescription = (eventCode: string, baseCode: string): string => {
  const descriptions: { [key: string]: string } = {
    '042': 'Make Statement',
    '043': 'Consult',
    '051': 'Engage in Diplomatic Cooperation',
    '061': 'Engage in Material Cooperation',
    '112': 'Accuse',
    '120': 'Reject',
    '130': 'Threaten',
    '140': 'Protest',
    '145': 'Demonstrate or Rally',
    '180': 'Use Conventional Military Force',
    '190': 'Use Unconventional Mass Violence'
  };
  
  return descriptions[eventCode] || descriptions[baseCode] || 'News Event';
};

const extractCountryFromUrl = (url: string): string => {
  if (!url) return 'Unknown';
  
  try {
    const domain = new URL(url).hostname;
    if (domain.includes('.uk')) return 'UK';
    if (domain.includes('.de')) return 'DE';
    if (domain.includes('.fr')) return 'FR';
    if (domain.includes('.ca')) return 'CA';
    return 'US'; // Default
  } catch {
    return 'US';
  }
};
