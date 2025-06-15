
export interface MediaLink {
  type: 'info';
  url?: string;
  title: string;
  description?: string;
}

export const searchHistoricPlaceMedia = async (placeName: string, cityName?: string): Promise<MediaLink[]> => {
  // Return empty array - no media links will be shown
  return [];
};
