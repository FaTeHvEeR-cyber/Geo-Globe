// Geospatial utility functions using Turf.js

import * as turf from '@turf/turf';

/**
 * Convert decimal degrees to degrees, minutes, seconds
 */
export function ddToDms(decimal: number, isLat: boolean): string {
  const absolute = Math.abs(decimal);
  const degrees = Math.floor(absolute);
  const minutesNotTruncated = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = Math.floor((minutesNotTruncated - minutes) * 60 * 100) / 100;

  const direction = isLat
    ? decimal >= 0 ? 'N' : 'S'
    : decimal >= 0 ? 'E' : 'W';

  return `${degrees}°${minutes.toString().padStart(2, '0')}'${seconds.toFixed(2).padStart(5, '0')}"${direction}`;
}

/**
 * Convert decimal degrees to UTM
 */
export function ddToUtm(latitude: number, longitude: number): string {
  const zone = Math.floor((longitude + 180) / 6) + 1;
  const lat = turf.radiansToDegrees(turf.degreesToRadians(latitude));
  const lon = turf.radiansToDegrees(turf.degreesToRadians(longitude));
  
  // Calculate UTM coordinates
  const point = turf.point([lon, lat]);
  const utm = turf.toMercator(point);
  
  const easting = Math.round(utm.geometry.coordinates[0]);
  const northing = Math.round(utm.geometry.coordinates[1]);
  
  const band = getUtmBand(latitude);
  
  return `${zone}${band} ${easting} ${northing}`;
}

/**
 * Get UTM latitude band letter
 */
function getUtmBand(lat: number): string {
  const bands = 'CDEFGHJKLMNPQRSTUVWX';
  if (lat < -80 || lat > 84) return 'Z';
  const index = Math.floor((lat + 80) / 8);
  return bands[index] || 'N';
}

/**
 * Convert decimal degrees to MGRS (simplified)
 */
export function ddToMgrs(latitude: number, longitude: number): string {
  // Get UTM first
  const zone = Math.floor((longitude + 180) / 6) + 1;
  const band = getUtmBand(latitude);
  
  // Calculate 100km square identifier (simplified)
  const e100 = Math.floor((longitude % 6 + 3) / 100000);
  const n100 = Math.floor((latitude % 8) + 1);
  
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const eLetter = letters[(zone - 1) % 3 * 8 + e100] || 'U';
  const nLetter = letters[band.charCodeAt(0) - 67 + n100] || 'P';
  
  // Calculate easting and northing
  const point = turf.point([longitude, latitude]);
  const utm = turf.toMercator(point);
  
  const easting = String(Math.round(utm.geometry.coordinates[0]) % 100000).padStart(5, '0');
  const northing = String(Math.round(utm.geometry.coordinates[1]) % 100000).padStart(5, '0');
  
  return `${zone}${band}${eLetter}${nLetter}${easting}${northing}`;
}

/**
 * Calculate Haversine distance between two points in kilometers
 */
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const from = turf.point([lon1, lat1]);
  const to = turf.point([lon2, lat2]);
  const options: turf.Units = 'kilometers';
  
  return turf.distance(from, to, { units: options });
}

/**
 * Calculate geodesic distance (more accurate for long distances)
 */
export function geodesicDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const from = turf.point([lon1, lat1]);
  const to = turf.point([lon2, lat2]);
  
  // Use rhumb distance for geodesic approximation
  return turf.rhumbDistance(from, to, { units: 'kilometers' });
}

/**
 * Calculate bearing between two points
 */
export function calculateBearing(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const from = turf.point([lon1, lat1]);
  const to = turf.point([lon2, lat2]);
  const bearing = turf.bearing(from, to);
  
  // Normalize to 0-360
  return (bearing + 360) % 360;
}

/**
 * Calculate destination point given start, bearing and distance
 */
export function destinationPoint(
  lat: number, lon: number,
  bearing: number, distance: number
): { latitude: number; longitude: number } {
  const from = turf.point([lon, lat]);
  const dest = turf.destination(from, distance, bearing, { units: 'kilometers' });
  
  return {
    latitude: dest.geometry.coordinates[1],
    longitude: dest.geometry.coordinates[0],
  };
}

/**
 * Calculate midpoint between two points
 */
export function midpoint(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): { latitude: number; longitude: number } {
  const from = turf.point([lon1, lat1]);
  const to = turf.point([lon2, lat2]);
  const mid = turf.midpoint(from, to);
  
  return {
    latitude: mid.geometry.coordinates[1],
    longitude: mid.geometry.coordinates[0],
  };
}

/**
 * Calculate area of a polygon in square kilometers
 */
export function calculatePolygonArea(
  coordinates: Array<{ latitude: number; longitude: number }>
): number {
  if (coordinates.length < 3) return 0;
  
  const ring = coordinates.map(c => [c.longitude, c.latitude]);
  ring.push(ring[0]); // Close the polygon
  
  const polygon = turf.polygon([ring]);
  return turf.area(polygon) / 1000000; // Convert m² to km²
}

/**
 * Calculate perimeter of a polygon in kilometers
 */
export function calculatePolygonPerimeter(
  coordinates: Array<{ latitude: number; longitude: number }>
): number {
  if (coordinates.length < 2) return 0;
  
  let perimeter = 0;
  for (let i = 0; i < coordinates.length; i++) {
    const next = (i + 1) % coordinates.length;
    perimeter += haversineDistance(
      coordinates[i].latitude, coordinates[i].longitude,
      coordinates[next].latitude, coordinates[next].longitude
    );
  }
  
  return perimeter;
}

/**
 * Check if a point is inside a polygon
 */
export function pointInPolygon(
  point: { latitude: number; longitude: number },
  polygon: Array<{ latitude: number; longitude: number }>
): boolean {
  const pt = turf.point([point.longitude, point.latitude]);
  const ring = polygon.map(c => [c.longitude, c.latitude]);
  ring.push(ring[0]);
  
  const poly = turf.polygon([ring]);
  return turf.booleanPointInPolygon(pt, poly);
}

/**
 * Generate a grid of points within a bounding box
 */
export function generateGrid(
  bounds: { north: number; south: number; east: number; west: number },
  spacing: number // in km
): Array<{ latitude: number; longitude: number }> {
  const points: Array<{ latitude: number; longitude: number }> = [];
  const bbox: turf.BBox = [bounds.west, bounds.south, bounds.east, bounds.north];
  
  const cellSide = spacing;
  const options: turf.Units = 'kilometers';
  
  const grid = turf.pointGrid(bbox, cellSide, { units: options });
  
  grid.features.forEach(feature => {
    points.push({
      longitude: feature.geometry.coordinates[0],
      latitude: feature.geometry.coordinates[1],
    });
  });
  
  return points;
}

/**
 * Get bounding box of a set of coordinates
 */
export function getBounds(
  coordinates: Array<{ latitude: number; longitude: number }>
): { north: number; south: number; east: number; west: number } {
  if (coordinates.length === 0) {
    return { north: 90, south: -90, east: 180, west: -180 };
  }
  
  let north = -90;
  let south = 90;
  let east = -180;
  let west = 180;
  
  coordinates.forEach(c => {
    north = Math.max(north, c.latitude);
    south = Math.min(south, c.latitude);
    east = Math.max(east, c.longitude);
    west = Math.min(west, c.longitude);
  });
  
  return { north, south, east, west };
}

/**
 * Simplify a polyline (reduce points while preserving shape)
 */
export function simplifyLine(
  coordinates: Array<{ latitude: number; longitude: number }>,
  tolerance: number // in km
): Array<{ latitude: number; longitude: number }> {
  if (coordinates.length < 3) return coordinates;
  
  const line = turf.lineString(
    coordinates.map(c => [c.longitude, c.latitude])
  );
  
  const simplified = turf.simplify(line, { tolerance: tolerance / 111, highQuality: true });
  
  return simplified.geometry.coordinates.map(c => ({
    longitude: c[0],
    latitude: c[1],
  }));
}

/**
 * Format distance for display
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  } else if (km < 10) {
    return `${km.toFixed(2)} km`;
  } else if (km < 100) {
    return `${km.toFixed(1)} km`;
  } else {
    return `${Math.round(km)} km`;
  }
}

/**
 * Format area for display
 */
export function formatArea(km2: number): string {
  if (km2 < 0.01) {
    return `${Math.round(km2 * 1000000)} m²`;
  } else if (km2 < 1) {
    return `${(km2 * 100).toFixed(2)} ha`;
  } else if (km2 < 100) {
    return `${km2.toFixed(2)} km²`;
  } else {
    return `${Math.round(km2)} km²`;
  }
}

/**
 * Interpolate between two points
 */
export function interpolatePoint(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
  fraction: number
): { latitude: number; longitude: number } {
  const from = turf.point([lon1, lat1]);
  const to = turf.point([lon2, lat2]);
  const line = turf.lineString([[lon1, lat1], [lon2, lat2]]);
  const length = turf.length(line, { units: 'kilometers' });
  const along = turf.along(line, length * fraction, { units: 'kilometers' });
  
  return {
    longitude: along.geometry.coordinates[0],
    latitude: along.geometry.coordinates[1],
  };
}
