
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
        // Get current date in YYYYMMDD format
        const today = new Date();
        const dateStr = today.getFullYear().toString() + 
                       (today.getMonth() + 1).toString().padStart(2, '0') + 
                       today.getDate().toString().padStart(2, '0');

        const south = bounds.getSouth();
        const west = bounds.getWest();
        const north = bounds.getNorth();
        const east = bounds.getEast();

        console.log('🌍 GDELT: Starting fetch for date:', dateStr);
        console.log('🌍 GDELT: Bounds:', { south, west, north, east });
        
        // Try multiple GDELT API endpoints and approaches
        const endpoints = [
          // GEO 2.0 API - Articles with geographic info
          `https://api.gdeltproject.org/api/v2/geo/geo?QUERY=*&MODE=artlist&MAXRECORDS=50&FORMAT=json&TIMESPAN=3d&GEOCC=${south},${west},${north},${east}`,
          
          // Alternative approach - broader geographic query
          `https://api.gdeltproject.org/api/v2/geo/geo?QUERY=*&MODE=artlist&MAXRECORDS=30&FORMAT=json&TIMESPAN=1d`,
          
          // Doc 2.0 API as fallback
          `https://api.gdeltproject.org/api/v2/doc/doc?QUERY=*&MODE=artlist&MAXRECORDS=20&FORMAT=json&TIMESPAN=1d`
        ];

        let successfulResponse = null;
        let lastError = null;

        for (let i = 0; i < endpoints.length; i++) {
          const endpoint = endpoints[i];
          console.log(`🌍 GDELT: Trying endpoint ${i + 1}:`, endpoint);
          
          try {
            const response = await fetch(endpoint, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (compatible; MapApp/1.0)'
              },
              mode: 'cors'
            });
            
            console.log(`🌍 GDELT: Response ${i + 1} status:`, response.status, response.statusText);
            
            if (response.ok) {
              const data = await response.json();
              console.log(`🌍 GDELT: Successfully got data from endpoint ${i + 1}:`, data);
              successfulResponse = data;
              break;
            } else {
              console.warn(`🌍 GDELT: Endpoint ${i + 1} failed with status:`, response.status);
              lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
          } catch (fetchError) {
            console.error(`🌍 GDELT: Endpoint ${i + 1} fetch error:`, fetchError);
            lastError = fetchError;
            continue;
          }
        }

        if (!successfulResponse) {
          throw lastError || new Error('All GDELT endpoints failed');
        }

        const data = successfulResponse;

        if (data.articles && data.articles.length > 0) {
          console.log(`🌍 GDELT: Processing ${data.articles.length} articles`);
          
          const processedEvents = data.articles.slice(0, 30).map((article: any, index: number) => {
            console.log(`🌍 GDELT: Processing article ${index}:`, article);
            
            // Parse coordinates if available
            let coordinates: [number, number] = [0, 0];
            
            // Try to extract coordinates from various fields
            if (article.sharingimage && article.sharingimage.includes('lat=') && article.sharingimage.includes('lng=')) {
              const latMatch = article.sharingimage.match(/lat=([^&]+)/);
              const lngMatch = article.sharingimage.match(/lng=([^&]+)/);
              if (latMatch && lngMatch) {
                coordinates = [parseFloat(lngMatch[1]), parseFloat(latMatch[1])];
                console.log(`🌍 GDELT: Extracted coordinates from sharingimage:`, coordinates);
              }
            } else if (article.lat && article.lng) {
              coordinates = [parseFloat(article.lng), parseFloat(article.lat)];
              console.log(`🌍 GDELT: Using direct lat/lng:`, coordinates);
            } else {
              // Use random coordinates within bounds if no specific location
              const lat = south + Math.random() * (north - south);
              const lng = west + Math.random() * (east - west);
              coordinates = [lng, lat];
              console.log(`🌍 GDELT: Using random coordinates:`, coordinates);
            }

            return {
              id: `gdelt-${index}-${Date.now()}`,
              eventDate: article.seendate || article.date || new Date().toISOString(),
              coordinates,
              actor1Name: article.domain || article.source || 'Unknown Source',
              actor2Name: '',
              eventCode: 'NEWS',
              eventDescription: article.title || article.headline || 'News Event',
              quadClass: 1,
              goldsteinScale: 0,
              avgTone: 0,
              sourceUrl: article.url || '',
              countryCode: article.sourcecountry || 'US'
            };
          }).filter((event: GDELTEvent) => 
            event.coordinates[0] !== 0 && event.coordinates[1] !== 0
          );

          console.log(`🌍 GDELT: Successfully processed ${processedEvents.length} events`);
          setEvents(processedEvents);
        } else {
          console.log('🌍 GDELT: No articles found in response');
          setEvents([]);
        }
        
      } catch (err) {
        console.error('🌍 GDELT: Complete error details:', {
          error: err,
          message: err instanceof Error ? err.message : 'Unknown error',
          stack: err instanceof Error ? err.stack : undefined,
          bounds: { south, west, north, east },
          enabled
        });
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
