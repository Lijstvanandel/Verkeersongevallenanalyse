import { SchoolZone } from '../types/schoolzones';
import { TrafficAccident } from '../types/ongevallen';

/**
 * Calculates great-circle distance between two WGS84 coordinates in meters
 */
export function getDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Finds all traffic accidents within a given radius (in meters) of a school zone.
 * Checks distance to both the school center point and its polyline road coordinates.
 */
export function findAccidentsNearSchool(
  schoolZone: SchoolZone,
  accidents: TrafficAccident[],
  radiusMeters = 250
): TrafficAccident[] {
  return accidents.filter((acc) => {
    // Quick bounding box check
    const latDiff = Math.abs(acc.lat - schoolZone.lat);
    const lngDiff = Math.abs(acc.lng - schoolZone.lng);
    if (latDiff > 0.005 || lngDiff > 0.008) return false;

    // Check distance to center point
    const centerDist = getDistanceMeters(
      schoolZone.lat,
      schoolZone.lng,
      acc.lat,
      acc.lng
    );
    if (centerDist <= radiusMeters) return true;

    // Check distance to any point along the road segment polyline
    if (schoolZone.coordinates && schoolZone.coordinates.length > 0) {
      for (const [pLat, pLng] of schoolZone.coordinates) {
        if (getDistanceMeters(pLat, pLng, acc.lat, acc.lng) <= radiusMeters) {
          return true;
        }
      }
    }

    return false;
  });
}
