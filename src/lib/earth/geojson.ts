import type { FeatureCollection } from 'geojson';

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_FEATURES = 2000;
export const MAX_VERTICES = 50000;

export function validateGeoJSON(value: unknown): FeatureCollection {
  const fail = (message: string): never => { throw new Error(message); };
  if (!value || typeof value !== 'object') return fail('Expected a GeoJSON FeatureCollection.');
  const collection = value as Record<string, unknown>;
  if (collection.type !== 'FeatureCollection' || !Array.isArray(collection.features)) return fail('Expected a GeoJSON FeatureCollection.');
  if (!collection.features.length || collection.features.length > MAX_FEATURES) return fail(`Use 1–${MAX_FEATURES} features per file.`);
  if (collection.crs) return fail('Use WGS84 longitude/latitude coordinates without a custom CRS.');
  let vertices = 0;
  const position = (p: unknown) => {
    if (!Array.isArray(p) || p.length < 2 || p.length > 3 || !p.every(n => typeof n === 'number' && Number.isFinite(n)) || Math.abs(p[0]) > 180 || Math.abs(p[1]) > 90) fail('Invalid WGS84 coordinate.');
    if (++vertices > MAX_VERTICES) fail(`Limit exceeded: ${MAX_VERTICES.toLocaleString()} vertices per file.`);
  };
  const sequence = (v: unknown, min: number, ring = false) => {
    if (!Array.isArray(v) || v.length < min) return fail('Geometry contains too few positions.');
    v.forEach(position);
    if (ring && JSON.stringify(v[0]) !== JSON.stringify(v.at(-1))) fail('Polygon rings must be closed.');
  };
  const rings = (v: unknown) => {
    if (!Array.isArray(v) || !v.length) return fail('Polygon must contain a ring.');
    v.forEach(r => sequence(r, 4, true));
  };
  for (const feature of collection.features) {
    if (!feature || feature.type !== 'Feature' || !feature.geometry) fail('Every feature must contain a supported geometry.');
    const { type, coordinates } = feature.geometry;
    switch (type) {
      case 'Point': position(coordinates); break;
      case 'MultiPoint': sequence(coordinates, 1); break;
      case 'LineString': sequence(coordinates, 2); break;
      case 'MultiLineString':
        if (!Array.isArray(coordinates) || !coordinates.length) fail('Empty MultiLineString.');
        coordinates.forEach((line: unknown) => sequence(line, 2)); break;
      case 'Polygon': rings(coordinates); break;
      case 'MultiPolygon':
        if (!Array.isArray(coordinates) || !coordinates.length) fail('Empty MultiPolygon.');
        coordinates.forEach(rings); break;
      default: fail(`Unsupported geometry: ${String(type)}.`);
    }
  }
  // Never interpret imported property values as HTML or remote resource URLs.
  return { type: 'FeatureCollection', features: collection.features.map((f: any) => ({ type: 'Feature', properties: {}, geometry: { type: f.geometry.type, coordinates: f.geometry.coordinates } })) };
}
