import steenwijkerlandPolygonGeoJson from './steenwijkerlandPolygon.json';

// Exact bounding box of Gemeente Steenwijkerland
export const STEENWIJKERLAND_BOUNDS = {
  north: 52.880,
  south: 52.620,
  west: 5.720,
  east: 6.250,
  center: {
    lat: 52.765,
    lng: 6.065,
  },
  defaultZoom: 12,
};

// Official 3,782-vertex GeoJSON MultiPolygon of Gemeente Steenwijkerland
export const STEENWIJKERLAND_GEOJSON = steenwijkerlandPolygonGeoJson;

// Converted [lat, lng][] ring of the official Gemeente Steenwijkerland boundary
export const STEENWIJKERLAND_POLYGON: [number, number][] = (
  steenwijkerlandPolygonGeoJson.coordinates[0][0] as [number, number][]
).map(([lng, lat]) => [lat, lng]);

/**
 * Strictly checks whether a WGS84 coordinate lies inside the municipal boundary of Gemeente Steenwijkerland.
 */
export function isPointInSteenwijkerland(lat: number, lng: number): boolean {
  if (
    lat < STEENWIJKERLAND_BOUNDS.south ||
    lat > STEENWIJKERLAND_BOUNDS.north ||
    lng < STEENWIJKERLAND_BOUNDS.west ||
    lng > STEENWIJKERLAND_BOUNDS.east
  ) {
    return false;
  }

  const vs = STEENWIJKERLAND_POLYGON;
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][1];
    const yi = vs[i][0];
    const xj = vs[j][1];
    const yj = vs[j][0];

    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

export interface SteenwijkerlandKern {
  name: string;
  lat: number;
  lng: number;
  zoom: number;
}

export const STEENWIJKERLAND_KERNEN: SteenwijkerlandKern[] = [
  { name: 'Steenwijk', lat: 52.7876, lng: 6.1205, zoom: 14 },
  { name: 'Vollenhove', lat: 52.6814, lng: 5.9522, zoom: 14 },
  { name: 'Giethoorn', lat: 52.7397, lng: 6.0772, zoom: 14 },
  { name: 'Oldemarkt', lat: 52.8208, lng: 5.9756, zoom: 14 },
  { name: 'Sint Jansklooster', lat: 52.6819, lng: 6.0056, zoom: 14 },
  { name: 'Blokzijl', lat: 52.7269, lng: 5.9614, zoom: 15 },
  { name: 'Steenwijkerwold', lat: 52.8058, lng: 6.0628, zoom: 14 },
  { name: 'Tuk', lat: 52.7995, lng: 6.0965, zoom: 15 },
  { name: 'Zuidveen', lat: 52.7751, lng: 6.0989, zoom: 15 },
  { name: 'Willemsoord', lat: 52.8272, lng: 6.0597, zoom: 14 },
  { name: 'De Blesse', lat: 52.8414, lng: 6.0419, zoom: 14 },
  { name: 'Wanneperveen', lat: 52.7036, lng: 6.1225, zoom: 14 },
  { name: 'Belt-Schutsloot', lat: 52.6714, lng: 6.0672, zoom: 14 },
  { name: 'Ossenzijl', lat: 52.8097, lng: 5.9219, zoom: 14 },
  { name: 'Kuinre', lat: 52.7897, lng: 5.8397, zoom: 14 },
  { name: 'Blankenham', lat: 52.7625, lng: 5.8931, zoom: 14 },
  { name: 'Scheerwolde', lat: 52.7636, lng: 6.0208, zoom: 14 },
  { name: 'Onna', lat: 52.7697, lng: 6.1497, zoom: 14 },
  { name: 'Kallenkote', lat: 52.7858, lng: 6.1783, zoom: 14 },
  { name: 'Eesveen', lat: 52.8117, lng: 6.1436, zoom: 14 },
  { name: 'Paasloo', lat: 52.8153, lng: 6.0089, zoom: 14 },
  { name: 'Blesdijke', lat: 52.8428, lng: 6.0128, zoom: 14 },
];

export function findClosestKern(lat: number, lng: number): string {
  let best = 'Steenwijk';
  let bestDist = Infinity;
  for (const k of STEENWIJKERLAND_KERNEN) {
    const dLat = (k.lat - lat) * 111;
    const dLng = (k.lng - lng) * 67;
    const d = dLat * dLat + dLng * dLng;
    if (d < bestDist) {
      bestDist = d;
      best = k.name;
    }
  }
  return best;
}
