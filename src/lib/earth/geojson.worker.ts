import { validateGeoJSON } from './geojson';
self.onmessage = (event: MessageEvent<string>) => {
  try { self.postMessage({ data: validateGeoJSON(JSON.parse(event.data)) }); }
  catch (error) { self.postMessage({ error: error instanceof Error ? error.message : 'Invalid GeoJSON.' }); }
};
