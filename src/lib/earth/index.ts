/**
 * @fileoverview Earth Explorer Library Index
 * 
 * Main entry point for the Earth Explorer library.
 * Exports all modules and types for external use.
 * 
 * @module earth
 * @author Earth Explorer Team
 * @version 1.0.0
 */

// ============================================================================
// MAIN CLASS
// ============================================================================

export { EarthExplorer } from './EarthExplorer';
export type { 
  EarthExplorerOptions, 
  ApplicationState, 
  CoordinateDisplay 
} from './EarthExplorer';

// ============================================================================
// CORE MODULES
// ============================================================================

export { GlobeEngine } from './core/GlobeEngine';
export { CameraController } from './core/CameraController';
export { SceneManager } from './core/SceneManager';
export type { 
  GlobeEngineOptions,
  CameraPosition,
  FlyToOptions,
  KeyboardConfig,
  SceneModeType,
  LightingConfig,
  AtmosphereConfig,
} from './core';

// ============================================================================
// LAYER MODULES
// ============================================================================

export { LayerManager } from './layers/LayerManager';
export { ImageryProviders, IMAGERY_LAYER_INFO } from './layers/ImageryProviders';
export type { 
  LayerConfig, 
  ManagedLayer, 
  LayerChangeEvent,
  ImageryLayerType, 
  ImageryLayerInfo,
} from './layers';

// ============================================================================
// EFFECTS MODULES
// ============================================================================

export { PostProcessing } from './effects/PostProcessing';
export { CloudSystem } from './effects/CloudSystem';
export type { 
  VisionMode, 
  EffectConfig,
  CloudConfig,
  CloudUpdateEvent,
} from './effects';

// ============================================================================
// TOOLS MODULES
// ============================================================================

export { CoordinateFormats } from './tools/CoordinateFormats';
export { GeoSearch, geoSearch } from './tools/GeoSearch';
export { MeasureTools } from './tools/MeasureTools';
export type {
  DecimalDegrees,
  DegreesMinutesSeconds,
  UTMCoordinate,
  MGRSCoordinate,
  AllCoordinateFormats,
  SearchResult,
  ReverseSearchResult,
  SearchOptions,
  MeasurementTool,
  MeasurePoint,
  MeasurementResult,
} from './tools';

// ============================================================================
// TIME MODULES
// ============================================================================

export { TimeController } from './time/TimeController';
export { DayNightCycle } from './time/DayNightCycle';
export type {
  TimeControllerConfig,
  TimeChangeEvent,
  SunPosition,
  DayNightConfig,
} from './time';

// ============================================================================
// WEATHER MODULES
// ============================================================================

export { WeatherService, weatherService } from './weather/WeatherService';
export { WeatherOverlay } from './weather/WeatherOverlay';
export type {
  CurrentWeather,
  WeatherForecast,
  WeatherAlert,
  WeatherUpdateEvent,
  WeatherOverlayConfig,
  WeatherOverlayState,
} from './weather';

// ============================================================================
// STREET VIEW MODULES
// ============================================================================

export { StreetViewManager, streetViewManager } from './streetview/StreetViewManager';
export type {
  StreetViewImage,
  StreetViewCoverage,
  StreetViewOptions,
} from './streetview';

// ============================================================================
// UI MODULES
// ============================================================================

export { ScreenCapture } from './ui/ScreenCapture';
export { FPSCounter } from './ui/FPSCounter';
export type {
  ScreenshotOptions,
  ScreenshotResult,
  PerformanceStats,
  FPSUpdateCallback,
} from './ui';

// ============================================================================
// CONFIGURATION
// ============================================================================

export {
  API_KEYS,
  RATE_LIMITS,
  CESIUM_CDN_URL,
  CAMERA_LIMITS,
  IMAGERY_PROVIDERS,
  TERRAIN_CONFIG,
  WEATHER_CONFIG,
  GEOCODING_CONFIG,
  TIME_CONFIG,
  UI_CONFIG,
  PERFORMANCE_CONFIG,
  SKYBOX_CONFIG,
} from './config';
export type { ImageryProviderKey } from './config';
