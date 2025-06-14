
export interface TransitLine {
  id: string;
  name: string;
  type: 'subway' | 'bus' | 'tram' | 'rail';
  coordinates: [number, number][];
  color?: string;
}

export interface TransitData {
  subway: TransitLine[];
  bus: TransitLine[];
  tram: TransitLine[];
  rail: TransitLine[];
}

export interface OverpassElement {
  type: string;
  id: number;
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
}

export interface OverpassResponse {
  elements: OverpassElement[];
}
