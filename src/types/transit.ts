
export interface TransitLine {
  id: string;
  name: string;
  type: 'subway' | 'bus' | 'tram' | 'rail';
  coordinates: [number, number][];
  color?: string;
  operator?: string;
  ref?: string;
}

export interface TransitData {
  subway: TransitLine[];
  bus: TransitLine[];
  tram: TransitLine[];
  rail: TransitLine[];
}

export interface OverpassNode {
  type: 'node';
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

export interface OverpassWay {
  type: 'way';
  id: number;
  nodes: number[];
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
}

export interface OverpassRelation {
  type: 'relation';
  id: number;
  members: Array<{
    type: 'way' | 'node' | 'relation';
    ref: number;
    role?: string;
  }>;
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
}

export type OverpassElement = OverpassNode | OverpassWay | OverpassRelation;

export interface OverpassResponse {
  version: number;
  generator: string;
  elements: OverpassElement[];
}

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}
