// Configuration constants for the Earth application

// Mapbox Configuration
export const MAPBOX_CONFIG = {
  accessToken: 'pk.eyJ1IjoiZmF0ZWh2ZWVyc2luZ2giLCJhIjoiY21td2I0dnY1Mm5objJyczJkcnlzbzliNiJ9.zk4me78x93Ch6YP31F5QRw',
  // Mapbox style IDs (mapbox://styles/mapbox/{style-id})
  styles: {
    outdoors: 'outdoors-v12',
    streets: 'streets-v12',
    dark: 'dark-v11',
    satellite: 'satellite-v9',
    standardSatellite: 'standard-satellite',
  },
  username: 'mapbox',
  tileSize: 512,
  maxZoom: 22,
  // Helper to build tile URL
  getTileUrl: function(styleId: string) {
    return `https://api.mapbox.com/styles/v1/${this.username}/${styleId}/tiles/512/{z}/{x}/{y}@2x?access_token=${this.accessToken}`;
  },
};

// Cesium CDN base URL - will be dynamically selected in component
export const CESIUM_CDN_URL = 'https://unpkg.com/cesium@1.120/Build/Cesium';

// Imagery layer configurations
export const IMAGERY_LAYERS = {
  osm: {
    id: 'osm',
    name: 'OpenStreetMap',
    icon: '🗺️',
    description: 'Community-driven street map',
    provider: {
      type: 'osm',
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap contributors',
      maximumLevel: 19,
    },
  },
  'bing-aerial': {
    id: 'bing-aerial',
    name: 'Bing Aerial',
    icon: '🛰️',
    description: 'High-resolution satellite imagery',
    provider: {
      type: 'bing',
      mapStyle: 'Aerial',
    },
  },
  'esri-imagery': {
    id: 'esri-imagery',
    name: 'ESRI World Imagery',
    icon: '🌍',
    description: 'ESRI satellite imagery',
    provider: {
      type: 'arcgis',
      url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
    },
  },
  terrain: {
    id: 'terrain',
    name: 'Terrain',
    icon: '🏔️',
    description: 'Shaded relief terrain',
    provider: {
      type: 'arcgis',
      url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer',
    },
  },
  dark: {
    id: 'dark',
    name: 'Dark Matter',
    icon: '🌙',
    description: 'CartoDB dark theme',
    provider: {
      type: 'url-template',
      url: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      attribution: '© CartoDB',
      maximumLevel: 18,
    },
  },
  hybrid: {
    id: 'hybrid',
    name: 'Hybrid',
    icon: '🌐',
    description: 'Satellite with labels',
    provider: {
      type: 'hybrid',
      imagery: 'bing-aerial',
      labels: 'bing-labels',
    },
  },
} as const;

// Vision mode configurations
export const VISION_MODES = {
  normal: {
    id: 'normal',
    name: 'Normal',
    icon: '👁️',
    description: 'Standard view',
    shader: null,
  },
  'night-vision': {
    id: 'night-vision',
    name: 'Night Vision',
    icon: '🌙',
    description: 'Green-tinted monochrome NVG effect',
    shader: {
      fragment: `
        float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        float scanline = sin(gl_FragCoord.y * 0.5) * 0.04;
        float noise = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) * 0.05;
        float vignette = 1.0 - smoothstep(0.3, 0.9, length(v_textureCoordinates - 0.5) * 1.5);
        float green = (luminance + scanline + noise) * 1.2 * vignette;
        gl_FragColor = vec4(0.05, green * 0.9, 0.05, 1.0);
      `,
    },
  },
  thermal: {
    id: 'thermal',
    name: 'Thermal',
    icon: '🔥',
    description: 'False-color heatmap',
    shader: {
      fragment: `
        float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        vec3 cold = vec3(0.0, 0.0, 1.0);
        vec3 warm = vec3(1.0, 1.0, 0.0);
        vec3 hot = vec3(1.0, 0.0, 0.0);
        vec3 thermal = mix(cold, warm, luminance);
        thermal = mix(thermal, hot, luminance * luminance);
        gl_FragColor = vec4(thermal, 1.0);
      `,
    },
  },
  wireframe: {
    id: 'wireframe',
    name: 'Wireframe',
    icon: '📐',
    description: 'Terrain wireframe mesh',
    shader: null, // Handled differently
  },
  infrared: {
    id: 'infrared',
    name: 'Infrared',
    icon: '🔴',
    description: 'NASA IR imagery',
    shader: null, // Uses different imagery
  },
} as const;

// Weather API configuration
export const WEATHER_CONFIG = {
  openMeteo: {
    baseUrl: 'https://api.open-meteo.com/v1',
    endpoints: {
      current: '/forecast',
      hourly: '/forecast',
      daily: '/forecast',
    },
  },
  openWeatherMap: {
    baseUrl: 'https://api.openweathermap.org/data/2.5',
    tileUrl: 'https://tile.openweathermap.org/map',
    // Note: Requires API key for some features
    apiKey: '', // Set via environment variable
  },
};

// Cloud layer configuration
export const CLOUD_CONFIG = {
  altitude: 8000, // meters
  refreshIntervals: [10, 30, 60], // minutes
  tileUrl: 'https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png',
  nasaModisUrl: 'https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi',
};

// Geocoding configuration
export const GEOCODING_CONFIG = {
  nominatim: {
    baseUrl: 'https://nominatim.openstreetmap.org',
    endpoints: {
      search: '/search',
      reverse: '/reverse',
    },
  },
  photon: {
    baseUrl: 'https://photon.komoot.io/api',
  },
};

// Street view configuration
export const STREET_VIEW_CONFIG = {
  mapillary: {
    apiUrl: 'https://graph.mapillary.com',
    clientId: '', // Set via environment
    tileSize: 256,
    maxZoom: 17,
  },
  kartaview: {
    apiUrl: 'https://api.openstreetcam.org',
  },
};

// Time configuration
export const TIME_CONFIG = {
  speeds: [1, 10, 60, 360, 3600], // x real time
  defaultSpeed: 60,
  minDate: new Date(2000, 0, 1),
  maxDate: new Date(2100, 11, 31),
};

// Performance presets
export const PERFORMANCE_PRESETS = {
  low: {
    quality: 'low',
    antialiasing: false,
    fxaa: false,
    terrainLod: 2,
    maxTileCache: 256, // MB
    buildingRadius: 1000,
    maxFps: 30,
  },
  medium: {
    quality: 'medium',
    antialiasing: true,
    fxaa: true,
    terrainLod: 4,
    maxTileCache: 512,
    buildingRadius: 3000,
    maxFps: 60,
  },
  high: {
    quality: 'high',
    antialiasing: true,
    fxaa: true,
    terrainLod: 6,
    maxTileCache: 1024,
    buildingRadius: 5000,
    maxFps: 60,
  },
  ultra: {
    quality: 'ultra',
    antialiasing: true,
    fxaa: true,
    terrainLod: 10,
    maxTileCache: 2048,
    buildingRadius: 10000,
    maxFps: 120,
  },
} as const;

// Camera limits
export const CAMERA_LIMITS = {
  minHeight: 10, // meters above ground
  maxHeight: 30000000, // meters (orbital view)
  minPitch: -90, // degrees (looking straight down)
  maxPitch: -5, // degrees (near horizontal)
  defaultHeight: 20000000, // meters (full Earth view)
};

// Default view locations
export const DEFAULT_LOCATIONS = {
  global: { latitude: 20, longitude: 0, height: 20000000 },
  newYork: { latitude: 40.7128, longitude: -74.006, height: 50000 },
  london: { latitude: 51.5074, longitude: -0.1278, height: 50000 },
  tokyo: { latitude: 35.6762, longitude: 139.6503, height: 50000 },
  sydney: { latitude: -33.8688, longitude: 151.2093, height: 50000 },
  paris: { latitude: 48.8566, longitude: 2.3522, height: 50000 },
};

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
  pan: { forward: 'w', backward: 's', left: 'a', right: 'd' },
  zoom: { in: '+', out: '-' },
  tilt: { up: 'q', down: 'e' },
  rotate: { clockwise: 'r', counterclockwise: 'f' },
  reset: 'Home',
  search: '/',
  fullscreen: 'F11',
  screenshot: 'P',
} as const;
