
export interface RequestParams {
  lat: number;
  lng: number;
  radius: number;
  restaurantType: 'vegetarian' | 'non-vegetarian';
}

export class ValidationError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const validateRequestParams = (params: any): RequestParams => {
  const { lat, lng, radius, restaurantType } = params;

  // Check required parameters
  if (!lat || !lng || !radius || !restaurantType) {
    throw new ValidationError('Missing required parameters: lat, lng, radius, restaurantType');
  }

  // Validate coordinates
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw new ValidationError('Invalid coordinates');
  }

  // Validate radius
  if (radius < 1 || radius > 50000) {
    throw new ValidationError('Radius must be between 1 and 50000 meters');
  }

  // Validate restaurant type
  if (restaurantType !== 'vegetarian' && restaurantType !== 'non-vegetarian') {
    throw new ValidationError('Invalid restaurant type. Must be "vegetarian" or "non-vegetarian"');
  }

  return { lat, lng, radius, restaurantType };
};
