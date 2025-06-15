
interface PlaceSearchRequest {
  textQuery: string;
  locationBias: {
    circle: {
      center: {
        latitude: number;
        longitude: number;
      };
      radius: number;
    };
  };
  maxResultCount: number;
  includedType: string;
}

export class GooglePlacesService {
  private apiKey: string;
  private baseUrl = 'https://places.googleapis.com/v1/places:searchText';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Google Places API key not configured');
    }
    this.apiKey = apiKey;
  }

  async searchPlaces(
    query: string,
    lat: number,
    lng: number,
    radius: number
  ): Promise<any[]> {
    const requestBody: PlaceSearchRequest = {
      textQuery: query,
      locationBias: {
        circle: {
          center: {
            latitude: lat,
            longitude: lng
          },
          radius: radius
        }
      },
      maxResultCount: 50,
      includedType: "cafe"
    };

    try {
      console.log(`Searching for: "${query}"`);
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.rating,places.userRatingCount,places.primaryType,places.formattedAddress,places.types,places.websiteUri'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        console.error(`Search "${query}" failed: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const places = data.places || [];
      
      console.log(`Found ${places.length} places for "${query}"`);
      return places;

    } catch (error) {
      console.error(`Error in search "${query}":`, error);
      return [];
    }
  }

  async searchMultipleQueries(
    queries: string[],
    lat: number,
    lng: number,
    radius: number
  ): Promise<any[]> {
    const allPlaces: any[] = [];

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      const places = await this.searchPlaces(query, lat, lng, radius);
      allPlaces.push(...places);

      // Rate limiting delay between requests
      if (i < queries.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return allPlaces;
  }
}

export const getCafeQueries = (): string[] => [
  'cafe',
  'coffee shop',
  'coffee house'
];
