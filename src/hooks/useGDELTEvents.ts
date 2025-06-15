
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
      setEvents([]);
      return;
    }

    const fetchGDELTEvents = async () => {
      setLoading(true);
      setError(null);

      try {
        // Get current date in YYYYMMDD format
        const today = new Date();
        const dateStr = today.getFullYear().toString() + 
                       (today.getMonth() + 1).toString().padStart(2, '0') + 
                       today.getDate().toString().padStart(2, '0');

        const south = bounds.getSouth();
        const west = bounds.getWest();
        const north = bounds.getNorth();
        const east = bounds.getEast();

        console.log('🌍 Fetching GDELT events for date:', dateStr);
        
        // GDELT GEO 2.0 API query
        const gdeltUrl = `https://api.gdeltproject.org/api/v2/geo/geo?QUERY=*&MODE=artlist&MAXRECORDS=50&FORMAT=json&TIMESPAN=3d&GEOCC=${south},${west},${north},${east}`;
        
        const response = await fetch(gdeltUrl);
        
        if (!response.ok) {
          throw new Error(`GDELT API error: ${response.status}`);
        }

        const data = await response.json();
        console.log('🔍 GDELT API response:', data);

        if (data.articles && data.articles.length > 0) {
          const processedEvents = data.articles.slice(0, 30).map((article: any, index: number) => {
            // Parse coordinates if available
            let coordinates: [number, number] = [0, 0];
            if (article.sharingimage && article.sharingimage.includes('lat=') && article.sharingimage.includes('lng=')) {
              const latMatch = article.sharingimage.match(/lat=([^&]+)/);
              const lngMatch = article.sharingimage.match(/lng=([^&]+)/);
              if (latMatch && lngMatch) {
                coordinates = [parseFloat(lngMatch[1]), parseFloat(latMatch[1])];
              }
            } else {
              // Use random coordinates within bounds if no specific location
              const lat = south + Math.random() * (north - south);
              const lng = west + Math.random() * (east - west);
              coordinates = [lng, lat];
            }

            return {
              id: `gdelt-${index}-${Date.now()}`,
              eventDate: article.seendate || new Date().toISOString(),
              coordinates,
              actor1Name: article.domain || 'Unknown Source',
              actor2Name: '',
              eventCode: 'NEWS',
              eventDescription: article.title || 'News Event',
              quadClass: 1,
              goldsteinScale: 0,
              avgTone: 0,
              sourceUrl: article.url || '',
              countryCode: article.sourcecountry || 'US'
            };
          }).filter((event: GDELTEvent) => 
            event.coordinates[0] !== 0 && event.coordinates[1] !== 0
          );

          console.log(`🌍 Processed ${processedEvents.length} GDELT events`);
          setEvents(processedEvents);
        } else {
          console.log('🔍 No GDELT events found in this area');
          setEvents([]);
        }
        
      } catch (err) {
        console.error('🌍 Error fetching GDELT events:', err);
        setError(err instanceof Error ? err.message : 'Error fetching events');
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGDELTEvents();
  }, [bounds, enabled]);

  return { events, loading, error };
};
