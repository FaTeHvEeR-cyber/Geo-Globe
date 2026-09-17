/**
 * @fileoverview Earth Explorer Configuration Module
 * 
 * Centralized configuration for API keys, default settings, and constants.
 * All API keys should be configured via environment variables.
 * 
 * @module config
 * @author Earth Explorer Team
 * @version 1.0.0
 */

// ============================================================================
// API KEYS - Configured via Environment Variables or Defaults
// ============================================================================

/**
 * API Keys configuration object
 * 
 * Keys are loaded from environment variables with fallback to defaults below.
 * 
 * FREE APIs (No key required):
 * - OpenStreetMap/Nominatim: Free geocoding
 * - Open-Meteo: Free weather data
 * - NASA GIBS: Free cloud imagery
 * - ESRI: Free imagery for viewing
 * - CartoDB: Free tier basemaps
 * 
 * FREE TIER APIs (Key required):
 * - Cesium Ion: https://cesium.com/ion/tokens (Free: 50,000 requests/month)
 * - OpenWeatherMap: https://openweathermap.org/api (Free: 1,000 requests/day)
 * - Mapillary: https://www.mapillary.com/developer/api-documentation (Free tier available)
 */
export const API_KEYS = {
  /**
   * Cesium Ion access token
   * Required for: Cesium World Terrain, Bing Maps imagery
   * Get yours: https://cesium.com/ion/tokens
   */
  CESIUM_ION: (typeof process !== 'undefined' 
    ? process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN 
    : (typeof window !== 'undefined' ? (window as any).CESIUM_ION_TOKEN : undefined)) 
    || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI0YTIxYTNlNS1kM2ZjLTRkZmMtYjVjMS0xZDdjY2E4Njg2MmQiLCJpZCI6NDAyNTM1LCJpYXQiOjE3NzMzMjc1Njd9.MPIWl6jY_Kb9wZXFt9j8-gi00GDWwUC1Bm52-sS94BQ',
  
  /**
   * OpenWeatherMap API key
   * Required for: Real-time weather data, weather overlays
   * Get yours: https://openweathermap.org/api
   */
  OPEN_WEATHER_MAP: (typeof process !== 'undefined' 
    ? process.env.NEXT_PUBLIC_OPENWEATHERMAP_KEY 
    : (typeof window !== 'undefined' ? (window as any).OPENWEATHERMAP_KEY : undefined)) 
    || '2b70da9791cd3460a148f36be69f1bca',
  
  /**
   * Mapillary API token for street-level imagery
   * Required for: 360° street-level imagery viewer
   * Get yours: https://www.mapillary.com/developer/api-documentation
   * 
   * OPTIONAL - Street view links use Google Street View as fallback
   */
  MAPILLARY: (typeof process !== 'undefined' 
    ? process.env.NEXT_PUBLIC_MAPILLARY_TOKEN 
    : (typeof window !== 'undefined' ? (window as any).MAPILLARY_TOKEN : undefined)) 
    || '',
} as const;

// ============================================================================
// RATE LIMITING CONFIGURATION
// ============================================================================

/**
 * Rate limit settings for various APIs
 * Important: Respect API rate limits to avoid being blocked
 */
export const RATE_LIMITS = {
  /**
   * Nominatim (OpenStreetMap Geocoding)
   * Policy: max 1 request/second
   * FREE - No API key required
   * https://operations.osmfoundation.org/policies/nominatim/
   */
  NOMINATIM: {
    minIntervalMs: 1100,
    userAgent: 'EarthExplorer/1.0',
    requiresKey: false,
  },
  
  /**
   * Open-Meteo Weather API
   * Policy: Fair use, reasonable rate limiting
   * FREE - No API key required
   * https://open-meteo.com/en/terms
   */
  OPEN_METEO: {
    minIntervalMs: 100,
    requiresKey: false,
  },
  
  /**
   * OpenWeatherMap API
   * Policy: 60 calls/minute (free tier)
   * Requires API key
   */
  OPEN_WEATHER_MAP: {
    minIntervalMs: 1100,
    baseUrl: 'https://api.openweathermap.org/data/2.5',
    requiresKey: true,
  },
  
  /**
   * Mapillary API
   * Policy: Rate limited by API token
   * Requires API key (optional feature)
   */
  MAPILLARY: {
    minIntervalMs: 100,
    baseUrl: 'https://graph.mapillary.com',
    requiresKey: true,
  },
} as const;

// ============================================================================
// CESIUM CONFIGURATION
// ============================================================================

export const CESIUM_CDN_URL = 'https://cesium.com/downloads/cesiumjs/releases/1.139/Build/Cesium';

export const CAMERA_LIMITS = {
  minHeight: 100,
  maxHeight: 20000000,
  defaultHeight: 20000000,
  maxPitch: -90,
  minPitch: -180,
} as const;

// ============================================================================
// IMAGERY LAYER CONFIGURATION (All Free)
// ============================================================================

export const IMAGERY_PROVIDERS = {
  OSM: {
    url: 'https://tile.openstreetmap.org/',
    maxLevel: 19,
    attribution: '© OpenStreetMap contributors',
    credit: 'OpenStreetMap',
    requiresKey: false,
  },
  
  ESRI_IMAGERY: {
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
    attribution: '© Esri',
    credit: 'Esri World Imagery',
    requiresKey: false,
  },
  
  ESRI_TERRAIN: {
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer',
    attribution: '© Esri',
    credit: 'Esri Terrain',
    requiresKey: false,
  },
  
  ESRI_LABELS: {
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer',
    attribution: '© Esri',
    credit: 'Esri Labels',
    requiresKey: false,
  },
  
  CARTO_DARK: {
    url: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    maxLevel: 18,
    attribution: '© CartoDB',
    credit: 'CartoDB Dark Matter',
    requiresKey: false,
  },
  
  CARTO_LIGHT: {
    url: 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    maxLevel: 18,
    attribution: '© CartoDB',
    credit: 'CartoDB Positron',
    requiresKey: false,
  },
  
  NASA_GIBS_CLOUDS: {
    url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_Cloud_Effective_Radius/default/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png',
    maxLevel: 8,
    attribution: 'NASA GIBS',
    credit: 'NASA GIBS',
    requiresKey: false,
  },
  
  NASA_BLACK_MARBLE: {
    url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_CityLights_2012/default/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png',
    maxLevel: 8,
    attribution: 'NASA Earth Observatory',
    credit: 'NASA Black Marble',
    requiresKey: false,
  },
  
  OPENWEATHERMAP_CLOUDS: {
    url: 'https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png',
    maxLevel: 10,
    attribution: '© OpenWeatherMap',
    credit: 'OpenWeatherMap Clouds',
    requiresKey: true,
  },
  
  OPENWEATHERMAP_PRECIPITATION: {
    url: 'https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png',
    maxLevel: 10,
    attribution: '© OpenWeatherMap',
    credit: 'OpenWeatherMap Precipitation',
    requiresKey: true,
  },
  
  OPENWEATHERMAP_TEMP: {
    url: 'https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png',
    maxLevel: 10,
    attribution: '© OpenWeatherMap',
    credit: 'OpenWeatherMap Temperature',
    requiresKey: true,
  },
} as const;

// ============================================================================
// TERRAIN CONFIGURATION
// ============================================================================

export const TERRAIN_CONFIG = {
  requestWaterMask: true,
  requestVertexNormals: true,
} as const;

// ============================================================================
// WEATHER API CONFIGURATION
// ============================================================================

export const WEATHER_CONFIG = {
  // Open-Meteo (FREE, no key required)
  openMeteoUrl: 'https://api.open-meteo.com/v1',
  openMeteoParams: 'temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code,cloud_cover,is_day',
  
  // OpenWeatherMap (requires key)
  openWeatherMapUrl: 'https://api.openweathermap.org/data/2.5',
  
  refreshInterval: 60000,
} as const;

// ============================================================================
// GEOCODING CONFIGURATION
// ============================================================================

export const GEOCODING_CONFIG = {
  nominatimUrl: 'https://nominatim.openstreetmap.org',
  searchEndpoint: '/search',
  reverseEndpoint: '/reverse',
  maxResults: 5,
  rateLimitDelay: RATE_LIMITS.NOMINATIM.minIntervalMs,
  userAgent: RATE_LIMITS.NOMINATIM.userAgent,
} as const;

// ============================================================================
// TIME CONFIGURATION
// ============================================================================

export const TIME_CONFIG = {
  defaultSpeed: 60,
  minSpeed: 1,
  maxSpeed: 86400,
  frameInterval: 100,
} as const;

// ============================================================================
// UI CONFIGURATION
// ============================================================================

export const UI_CONFIG = {
  sidebarWidth: 320,
  sidebarCollapsedWidth: 48,
  animationDuration: 300,
  toastDuration: 3000,
  minTouchTarget: 44,
  focusRingWidth: 2,
  contrastRatio: 4.5,
} as const;

// ============================================================================
// PERFORMANCE CONFIGURATION
// ============================================================================

export const PERFORMANCE_CONFIG = {
  requestRenderMode: true,
  maximumRenderTimeChange: Infinity,
  enableFXAA: true,
  depthTestAgainstTerrain: true,
  maxTileCache: 1000,
  lazyLoadDistance: 5000,
} as const;

// ============================================================================
// SKYBOX CONFIGURATION
// ============================================================================

export const SKYBOX_CONFIG = {
  positiveX: `${CESIUM_CDN_URL}/Assets/Textures/SkyBox/tycho2t3_80_px.jpg`,
  negativeX: `${CESIUM_CDN_URL}/Assets/Textures/SkyBox/tycho2t3_80_mx.jpg`,
  positiveY: `${CESIUM_CDN_URL}/Assets/Textures/SkyBox/tycho2t3_80_py.jpg`,
  negativeY: `${CESIUM_CDN_URL}/Assets/Textures/SkyBox/tycho2t3_80_my.jpg`,
  positiveZ: `${CESIUM_CDN_URL}/Assets/Textures/SkyBox/tycho2t3_80_pz.jpg`,
  negativeZ: `${CESIUM_CDN_URL}/Assets/Textures/SkyBox/tycho2t3_80_mz.jpg`,
} as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ImageryProviderKey = keyof typeof IMAGERY_PROVIDERS;
