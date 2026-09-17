// Cesium configuration - uses free, public resources
// No API key required for OpenStreetMap and basic features
// Optional: Add Cesium Ion token for enhanced terrain/buildings

// Default ion access token are available for development
// Get your own free token at https://ion.cesium.com/
export const CESIUM_CONFIG = {
  // Cesium Ion default token (free tier)
  // For production, replace with your own token
  ionAccessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlYTQxM2NkNy03OGYzLTQ5ZTAtYjM1Yy1hMjMzYjQzOGNiMmIiLCJpZCI6MjU5LCJpYXQiOjE3MDM1NDEwMzV9.cVmWzF5vKKDqJzBZP6_DJaJW0BjWCJdDxPr8GzR',
  
  // Base URL for Cesium static assets
  baseUrl: '/cesium',
  
  // Default imagery providers (all free)
  imageryProviders: {
    osm: {
      name: 'OpenStreetMap',
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap contributors',
    },
    stamenTerrain: {
      name: 'Stamen Terrain',
      url: 'https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}.png',
      attribution: '© Stadia Maps, © Stamen Design, © OpenStreetMap',
    },
    stamenToner: {
      name: 'Stamen Toner',
      url: 'https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}.png',
      attribution: '© Stadia Maps, © Stamen Design, © OpenStreetMap',
    },
    esriWorldImagery: {
      name: 'ESRI World Imagery',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
      attribution: '© Esri',
    },
    esriStreet: {
      name: 'ESRI Street Map',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer',
      attribution: '© Esri',
    },
  },
  
  // Weather API configuration
  weather: {
    openMeteoUrl: 'https://api.open-meteo.com/v1',
    openWeatherMapUrl: 'https://api.openweathermap.org/data/2.5',
  },
  
  // Mapillary configuration (street-level imagery)
  mapillary: {
    clientId: '', // Add your Mapillary client ID if needed
    apiUrl: 'https://graph.mapillary.com',
  },
};

// Imagery layer definitions
export type ImageryLayerType = 'osm' | 'satellite' | 'terrain' | 'toner' | 'hybrid';

export interface ImageryLayerConfig {
  id: ImageryLayerType;
  name: string;
  icon: string;
  description: string;
}

export const IMAGERY_LAYERS: ImageryLayerConfig[] = [
  {
    id: 'osm',
    name: 'OpenStreetMap',
    icon: '🗺️',
    description: 'Community-driven street map',
  },
  {
    id: 'satellite',
    name: 'Satellite',
    icon: '🛰️',
    description: 'High-resolution satellite imagery',
  },
  {
    id: 'terrain',
    name: 'Terrain',
    icon: '🏔️',
    description: 'Terrain with elevation shading',
  },
  {
    id: 'toner',
    name: 'High Contrast',
    icon: '⬛',
    description: 'Stark black and white style',
  },
  {
    id: 'hybrid',
    name: 'Hybrid',
    icon: '🌐',
    description: 'Satellite with labels overlay',
  },
];
