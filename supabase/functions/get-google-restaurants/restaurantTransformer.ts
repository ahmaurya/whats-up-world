
export interface TransformedRestaurant {
  id: number;
  name: string;
  coordinates: [number, number];
  rating: number;
  reviews: number;
  cuisine: string;
  description: string;
  restaurantType: string;
  types: string[];
  website: string | null;
}

export const removeDuplicatePlaces = (places: any[]): any[] => {
  return places.filter((place, index, self) => 
    index === self.findIndex(p => p.id === place.id)
  );
};

export const transformPlacesToRestaurants = (
  places: any[],
  restaurantType: string
): TransformedRestaurant[] => {
  return places.map((place: any, index: number) => ({
    id: index + 1,
    name: place.displayName?.text || 'Unknown Restaurant',
    coordinates: [place.location?.longitude || 0, place.location?.latitude || 0],
    rating: place.rating || 0,
    reviews: place.userRatingCount || 0,
    cuisine: place.primaryType || 'restaurant',
    description: place.formattedAddress || '',
    restaurantType: restaurantType,
    types: place.types || [],
    website: place.websiteUri || null
  }));
};

export const filterVegetarianFromNonVeg = (restaurants: TransformedRestaurant[]): TransformedRestaurant[] => {
  const vegetarianKeywords = ['vegetarian', 'vegan', 'plant-based', 'veggie'];
  const vegetarianTypes = ['vegetarian_restaurant', 'vegan_restaurant'];
  
  return restaurants.filter((restaurant: TransformedRestaurant) => {
    const name = restaurant.name.toLowerCase();
    const description = restaurant.description.toLowerCase();
    const types = restaurant.types || [];
    
    const hasVegKeyword = vegetarianKeywords.some(keyword => 
      name.includes(keyword) || description.includes(keyword)
    );
    
    const hasVegType = types.some((type: string) => 
      vegetarianTypes.some(vegType => type.includes(vegType))
    );
    
    return !hasVegKeyword && !hasVegType;
  });
};
