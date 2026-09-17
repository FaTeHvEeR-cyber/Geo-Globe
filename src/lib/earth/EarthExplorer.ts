/**
 * @fileoverview Earth Explorer - Main Application Class
 * 
 * This is the main entry point for the Earth Explorer application.
 * It orchestrates all modules and provides a unified API for the UI.
 * 
 * @module EarthExplorer
 * @author Earth Explorer Team
 * @version 1.0.0
 */

// Core modules
import { GlobeEngine } from './core/GlobeEngine';
import { CameraController } from './core/CameraController';
import { SceneManager } from './core/SceneManager';

// Layer modules
import { LayerManager } from './layers/LayerManager';
import type { ImageryLayerType } from './layers/ImageryProviders';

// Effects modules
import { PostProcessing } from './effects/PostProcessing';
import { CloudSystem } from './effects/CloudSystem';
import type { VisionMode } from './effects/PostProcessing';

// Tools modules
import { CoordinateFormats } from './tools/CoordinateFormats';
import { GeoSearch, geoSearch } from './tools/GeoSearch';
import { MeasureTools } from './tools/MeasureTools';
import type { MeasurePoint, MeasurementResult } from './tools/MeasureTools';

// Time modules
import { TimeController } from './time/TimeController';
import { DayNightCycle } from './time/DayNightCycle';

// Weather modules
import { WeatherService, weatherService } from './weather/WeatherService';
import { WeatherOverlay } from './weather/WeatherOverlay';
import type { CurrentWeather, WeatherForecast } from './weather/WeatherService';

// Street View modules
import { StreetViewManager, streetViewManager } from './streetview/StreetViewManager';
import type { StreetViewImage, StreetViewCoverage } from './streetview/StreetViewManager';

// UI modules
import { ScreenCapture } from './ui/ScreenCapture';
import { FPSCounter } from './ui/FPSCounter';

// Config
import { CAMERA_LIMITS, API_KEYS } from './config';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Earth Explorer initialization options
 */
export interface EarthExplorerOptions {
  /** Container element or ID */
  container: HTMLElement | string;
  /** Initial imagery layer */
  initialImagery?: ImageryLayerType;
  /** Callback when ready */
  onReady?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Enable keyboard navigation */
  enableKeyboardNavigation?: boolean;
  /** Enable weather service */
  enableWeather?: boolean;
  /** Enable street view */
  enableStreetView?: boolean;
}

/**
 * Application state
 */
export interface ApplicationState {
  /** Is the application initialized */
  initialized: boolean;
  /** Current imagery layer */
  imageryLayer: ImageryLayerType;
  /** Current vision mode */
  visionMode: VisionMode;
  /** Current scene mode */
  sceneMode: '3d' | '2d' | 'columbus';
  /** Cloud visibility */
  cloudsVisible: boolean;
  /** Day/night enabled */
  dayNightEnabled: boolean;
  /** Time animation playing */
  timePlaying: boolean;
  /** Weather enabled */
  weatherEnabled: boolean;
  /** Street view enabled */
  streetViewEnabled: boolean;
}

/**
 * Coordinate display data
 */
export interface CoordinateDisplay {
  dd: string;
  dms: string;
  utm: string;
  mgrs: string;
}

// ============================================================================
// EARTH EXPLORER CLASS
// ============================================================================

/**
 * EarthExplorer class - Main application controller
 * 
 * Orchestrates all modules and provides a unified API.
 * 
 * @example
 * const explorer = new EarthExplorer({
 *   container: 'globe-container',
 *   onReady: () => console.log('Ready!'),
 * });
 * 
 * await explorer.initialize();
 */
export class EarthExplorer {
  // Core modules
  private globeEngine: GlobeEngine | null = null;
  private cameraController: CameraController | null = null;
  private sceneManager: SceneManager | null = null;

  // Layer modules
  private layerManager: LayerManager | null = null;

  // Effects modules
  private postProcessing: PostProcessing | null = null;
  private cloudSystem: CloudSystem | null = null;

  // Tools modules
  private measureTools: MeasureTools | null = null;

  // Time modules
  private timeController: TimeController | null = null;
  private dayNightCycle: DayNightCycle | null = null;

  // Weather modules
  private weatherService: WeatherService | null = null;
  private weatherOverlay: WeatherOverlay | null = null;

  // Street View modules
  private streetViewManager: StreetViewManager | null = null;

  // UI modules
  private screenCapture: ScreenCapture | null = null;
  private fpsCounter: FPSCounter | null = null;

  // State
  private state: ApplicationState = {
    initialized: false,
    imageryLayer: 'osm',
    visionMode: 'normal',
    sceneMode: '3d',
    cloudsVisible: false,
    dayNightEnabled: false,
    timePlaying: false,
    weatherEnabled: false,
    streetViewEnabled: false,
  };

  // Options
  private options: EarthExplorerOptions;

  /**
   * Creates a new EarthExplorer instance
   * @param options - Initialization options
   */
  constructor(options: EarthExplorerOptions) {
    this.options = {
      enableKeyboardNavigation: true,
      enableWeather: true,
      enableStreetView: true,
      ...options,
    };
  }

  /**
   * Initializes the application
   */
  async initialize(): Promise<void> {
    try {
      // Initialize globe engine
      this.globeEngine = new GlobeEngine({
        container: this.options.container,
        onReady: () => this.onGlobeReady(),
        onError: this.options.onError,
      });

      await this.globeEngine.initialize();
    } catch (error) {
      this.options.onError?.(error instanceof Error ? error : new Error('Initialization failed'));
      throw error;
    }
  }

  /**
   * Called when the globe is ready
   * @private
   */
  private async onGlobeReady(): Promise<void> {
    if (!this.globeEngine) return;

    const viewer = this.globeEngine.getViewer();
    const Cesium = this.globeEngine.getCesium();

    // Initialize camera controller
    this.cameraController = new CameraController(viewer, Cesium);
    if (this.options.enableKeyboardNavigation) {
      this.cameraController.enableKeyboardNavigation();
    }

    // Initialize scene manager
    this.sceneManager = new SceneManager(viewer, Cesium);

    // Initialize layer manager
    this.layerManager = new LayerManager(viewer, Cesium);
    await this.layerManager.setBaseLayer(this.options.initialImagery ?? 'osm');

    // Initialize post-processing
    this.postProcessing = new PostProcessing(viewer, Cesium);

    // Initialize cloud system
    this.cloudSystem = new CloudSystem(viewer, Cesium);

    // Initialize measurement tools
    this.measureTools = new MeasureTools(viewer, Cesium);

    // Initialize time controller
    this.timeController = new TimeController(viewer, Cesium);

    // Initialize day/night cycle
    this.dayNightCycle = new DayNightCycle(viewer, Cesium);
    this.dayNightCycle.setTimeController(this.timeController);

    // Initialize weather service
    if (this.options.enableWeather) {
      this.weatherService = weatherService;
      this.weatherOverlay = new WeatherOverlay(this.weatherService);
      this.state.weatherEnabled = true;
    }

    // Initialize street view manager
    if (this.options.enableStreetView) {
      this.streetViewManager = streetViewManager;
      this.state.streetViewEnabled = true;
    }

    // Initialize screen capture
    this.screenCapture = new ScreenCapture(viewer);

    // Initialize FPS counter
    this.fpsCounter = new FPSCounter(viewer);
    this.fpsCounter.start();

    // Mark as initialized
    this.state.initialized = true;

    // Expose methods to window for external access
    this.exposeGlobalMethods();

    // Call ready callback
    this.options.onReady?.();
  }

  /**
   * Exposes methods to window for external access
   * @private
   */
  private exposeGlobalMethods(): void {
    if (typeof window === 'undefined') return;

    (window as any).flyToLocation = (lon: number, lat: number, height?: number) => {
      this.flyTo(lon, lat, height);
    };

    (window as any).resetView = () => {
      this.flyToHome();
    };

    (window as any).captureScreenshot = async () => {
      return this.captureScreenshot();
    };

    (window as any).toggleFullscreen = () => {
      this.toggleFullscreen();
    };

    (window as any).openStreetView = (lat: number, lon: number) => {
      this.openStreetView(lat, lon);
    };

    (window as any).getWeather = async (lat: number, lon: number) => {
      return this.getWeather(lat, lon);
    };
  }

  // =========================================================================
  // IMAGERY LAYER METHODS
  // =========================================================================

  /**
   * Sets the base imagery layer
   */
  async setImageryLayer(layer: ImageryLayerType): Promise<void> {
    if (!this.layerManager) return;
    await this.layerManager.setBaseLayer(layer);
    this.state.imageryLayer = layer;
  }

  /**
   * Gets the current imagery layer
   */
  getImageryLayer(): ImageryLayerType {
    return this.state.imageryLayer;
  }

  // =========================================================================
  // VISION MODE METHODS
  // =========================================================================

  /**
   * Sets the vision mode
   */
  setVisionMode(mode: VisionMode): void {
    if (!this.postProcessing) return;
    this.postProcessing.setVisionMode(mode);
    this.state.visionMode = mode;
  }

  /**
   * Gets the current vision mode
   */
  getVisionMode(): VisionMode {
    return this.state.visionMode;
  }

  // =========================================================================
  // SCENE MODE METHODS
  // =========================================================================

  /**
   * Sets the scene mode
   */
  setSceneMode(mode: '3d' | '2d' | 'columbus'): void {
    if (!this.sceneManager) return;
    this.sceneManager.setSceneMode(mode);
    this.state.sceneMode = mode;
  }

  /**
   * Gets the current scene mode
   */
  getSceneMode(): '3d' | '2d' | 'columbus' {
    return this.state.sceneMode;
  }

  // =========================================================================
  // CLOUD METHODS
  // =========================================================================

  /**
   * Shows the cloud layer
   */
  async showClouds(): Promise<void> {
    if (!this.cloudSystem) return;
    await this.cloudSystem.show();
    this.state.cloudsVisible = true;
  }

  /**
   * Hides the cloud layer
   */
  hideClouds(): void {
    if (!this.cloudSystem) return;
    this.cloudSystem.hide();
    this.state.cloudsVisible = false;
  }

  /**
   * Sets cloud opacity
   */
  setCloudOpacity(opacity: number): void {
    this.cloudSystem?.setOpacity(opacity);
  }

  // =========================================================================
  // TIME METHODS
  // =========================================================================

  /**
   * Enables day/night cycle
   */
  setDayNightEnabled(enabled: boolean): void {
    if (!this.dayNightCycle) return;
    this.dayNightCycle.setEnabled(enabled);
    this.state.dayNightEnabled = enabled;
  }

  /**
   * Sets the current time
   */
  setTime(time: Date): void {
    this.timeController?.setTime(time);
  }

  /**
   * Gets the current time
   */
  getTime(): Date | null {
    return this.timeController?.getTime() ?? null;
  }

  /**
   * Starts time animation
   */
  playTime(): void {
    this.timeController?.play();
    this.state.timePlaying = true;
  }

  /**
   * Pauses time animation
   */
  pauseTime(): void {
    this.timeController?.pause();
    this.state.timePlaying = false;
  }

  /**
   * Sets time animation speed
   */
  setTimeSpeed(speed: number): void {
    this.timeController?.setSpeed(speed);
  }

  // =========================================================================
  // WEATHER METHODS
  // =========================================================================

  /**
   * Gets current weather for a location
   */
  async getWeather(latitude: number, longitude: number): Promise<CurrentWeather | null> {
    if (!this.weatherService) return null;
    return this.weatherService.getCurrentWeather(latitude, longitude);
  }

  /**
   * Gets weather forecast for a location
   */
  async getWeatherForecast(latitude: number, longitude: number, hours?: number): Promise<WeatherForecast[]> {
    if (!this.weatherService) return [];
    return this.weatherService.getForecast(latitude, longitude, hours);
  }

  // =========================================================================
  // STREET VIEW METHODS
  // =========================================================================

  /**
   * Opens street view for a location
   */
  async openStreetView(latitude: number, longitude: number): Promise<void> {
    if (!this.streetViewManager) return;
    await this.streetViewManager.openStreetView(latitude, longitude);
  }

  /**
   * Gets street view coverage for a location
   */
  async getStreetViewCoverage(latitude: number, longitude: number): Promise<StreetViewCoverage | null> {
    if (!this.streetViewManager) return null;
    return this.streetViewManager.getCoverage(latitude, longitude);
  }

  /**
   * Checks if street view is available for a location
   */
  async hasStreetViewCoverage(latitude: number, longitude: number): Promise<boolean> {
    if (!this.streetViewManager) return false;
    return this.streetViewManager.hasCoverage(latitude, longitude);
  }

  // =========================================================================
  // CAMERA METHODS
  // =========================================================================

  /**
   * Flies to a location
   */
  flyTo(longitude: number, latitude: number, height?: number): void {
    this.cameraController?.flyTo({ longitude, latitude, height });
  }

  /**
   * Flies to home view
   */
  flyToHome(): void {
    this.cameraController?.flyToHome();
  }

  /**
   * Gets camera position
   */
  getCameraPosition(): { longitude: number; latitude: number; height: number } | null {
    const pos = this.cameraController?.getPosition();
    return pos ? { longitude: pos.longitude, latitude: pos.latitude, height: pos.height } : null;
  }

  // =========================================================================
  // MEASUREMENT METHODS
  // =========================================================================

  /**
   * Sets the active measurement tool
   */
  setMeasurementTool(tool: 'none' | 'distance' | 'area'): void {
    this.measureTools?.setTool(tool);
  }

  /**
   * Adds a measurement point
   */
  addMeasurementPoint(point: MeasurePoint): void {
    this.measureTools?.addPoint(point);
  }

  /**
   * Clears measurements
   */
  clearMeasurements(): void {
    this.measureTools?.clear();
  }

  /**
   * Gets measurement result
   */
  getMeasurementResult(): MeasurementResult | null {
    return this.measureTools?.getResult() ?? null;
  }

  /**
   * Registers measurement callback
   */
  onMeasurement(callback: (result: MeasurementResult) => void): (() => void) | undefined {
    return this.measureTools?.onMeasurement(callback);
  }

  // =========================================================================
  // SEARCH METHODS
  // =========================================================================

  /**
   * Searches for a location
   */
  async search(query: string): Promise<any[]> {
    return geoSearch.search(query);
  }

  /**
   * Reverse geocodes a location
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<any | null> {
    return geoSearch.reverse(latitude, longitude);
  }

  // =========================================================================
  // SCREENSHOT METHODS
  // =========================================================================

  /**
   * Captures a screenshot
   */
  async captureScreenshot(): Promise<boolean> {
    return this.screenCapture?.captureAndDownload() ?? false;
  }

  /**
   * Captures screenshot without downloading
   */
  async getScreenshotDataUrl(): Promise<string | null> {
    const result = await this.screenCapture?.capture();
    return result?.dataUrl ?? null;
  }

  // =========================================================================
  // FULLSCREEN METHODS
  // =========================================================================

  /**
   * Toggles fullscreen mode
   */
  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  /**
   * Checks if fullscreen
   */
  isFullscreen(): boolean {
    return !!document.fullscreenElement;
  }

  // =========================================================================
  // COORDINATE METHODS
  // =========================================================================

  /**
   * Formats coordinates in all formats
   */
  formatCoordinates(latitude: number, longitude: number): CoordinateDisplay {
    const all = CoordinateFormats.toAllFormats({ latitude, longitude });
    return {
      dd: `${latitude.toFixed(6)}°, ${longitude.toFixed(6)}°`,
      dms: CoordinateFormats.formatDms(all.dms),
      utm: CoordinateFormats.formatUtm(all.utm),
      mgrs: CoordinateFormats.formatMgrs(all.mgrs),
    };
  }

  /**
   * Converts coordinates to different formats
   */
  convertCoordinates(latitude: number, longitude: number): ReturnType<typeof CoordinateFormats.toAllFormats> {
    return CoordinateFormats.toAllFormats({ latitude, longitude });
  }

  // =========================================================================
  // FPS METHODS
  // =========================================================================

  /**
   * Gets the current FPS
   */
  getFPS(): number {
    return this.fpsCounter?.getFPS() ?? 0;
  }

  /**
   * Registers FPS update callback
   */
  onFPSUpdate(callback: (stats: any) => void): (() => void) | undefined {
    return this.fpsCounter?.onUpdate(callback);
  }

  // =========================================================================
  // STATE METHODS
  // =========================================================================

  /**
   * Gets the application state
   */
  getState(): ApplicationState {
    return { ...this.state };
  }

  /**
   * Checks if initialized
   */
  isInitialized(): boolean {
    return this.state.initialized;
  }

  /**
   * Checks if weather is enabled
   */
  isWeatherEnabled(): boolean {
    return this.state.weatherEnabled;
  }

  /**
   * Checks if street view is enabled
   */
  isStreetViewEnabled(): boolean {
    return this.state.streetViewEnabled;
  }

  // =========================================================================
  // LIFECYCLE METHODS
  // =========================================================================

  /**
   * Destroys the application and cleans up resources
   */
  destroy(): void {
    // Destroy modules in reverse order
    this.fpsCounter?.destroy();
    this.screenCapture?.destroy();
    this.streetViewManager?.destroy();
    this.weatherOverlay?.destroy();
    this.dayNightCycle?.destroy();
    this.timeController?.destroy();
    this.measureTools?.destroy();
    this.cloudSystem?.destroy();
    this.postProcessing?.destroy();
    this.layerManager?.destroy();
    this.sceneManager?.destroy();
    this.cameraController?.destroy();
    this.globeEngine?.destroy();

    // Clear references
    this.fpsCounter = null;
    this.screenCapture = null;
    this.streetViewManager = null;
    this.weatherOverlay = null;
    this.weatherService = null;
    this.dayNightCycle = null;
    this.timeController = null;
    this.measureTools = null;
    this.cloudSystem = null;
    this.postProcessing = null;
    this.layerManager = null;
    this.sceneManager = null;
    this.cameraController = null;
    this.globeEngine = null;

    this.state.initialized = false;
  }
}

export default EarthExplorer;
