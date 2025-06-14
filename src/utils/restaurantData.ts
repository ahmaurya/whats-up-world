
export interface Restaurant {
  id: number;
  name: string;
  coordinates: [number, number];
  rating: number;
  reviews: number;
  cuisine: string;
  description: string;
}

export const mockRestaurants: Restaurant[] = [
  {
    id: 1,
    name: "Tony's Little Star Pizza",
    coordinates: [-122.4194, 37.7749],
    rating: 4.5,
    reviews: 1200,
    cuisine: "Italian",
    description: "Famous for deep dish pizza in San Francisco"
  },
  {
    id: 2,
    name: "Guelaguetza",
    coordinates: [-118.2437, 34.0522],
    rating: 4.3,
    reviews: 890,
    cuisine: "Mexican",
    description: "Authentic Oaxacan cuisine in Los Angeles"
  },
  {
    id: 3,
    name: "Pike Place Chowder",
    coordinates: [-122.3321, 47.6062],
    rating: 4.6,
    reviews: 2100,
    cuisine: "Seafood",
    description: "Award-winning chowder at Pike Place Market"
  },
  {
    id: 4,
    name: "Katz's Delicatessen",
    coordinates: [-73.9857, 40.7589],
    rating: 4.4,
    reviews: 3400,
    cuisine: "Jewish Deli",
    description: "Historic NYC deli famous for pastrami sandwiches"
  }
];
