/**
 * @fileoverview Globe Engine - CesiumJS Viewer Setup & Configuration
 * 
 * This module handles the initialization and configuration of the CesiumJS viewer.
 * It provides the core 3D globe functionality including terrain rendering,
 * skybox configuration, and basic scene setup.
 * 
 * @module core/GlobeEngine
 * @author Earth Explorer Team
 * @version 1.0.0
 */

import {
  API_KEYS,
  CESIUM_CDN_URL,
  CAMERA_LIMITS,
  TERRAIN_CONFIG,
  PERFORMANCE_CONFIG,
  SKYBOX_CONFIG,
} from '../config';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Options for initializing the GlobeEngine
 */
export interface GlobeEngineOptions {
  /** Container element or ID for the viewer */
  container: HTMLElement | string;
  /** Callback when globe is ready */
  onReady?: () => void;
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
  /** Initial imagery layer to display */
  initialImagery?: string;
}

/**
 * GlobeEngine class - Manages the CesiumJS viewer instance
 */
export class GlobeEngine {
  private viewer: any = null;
  private Cesium: any = null;
  private container: HTMLElement | string;
  private onReady?: () => void;
  private onError?: (error: Error) => void;
  private isLoading: boolean = false;
  private isDestroyed: boolean = false;

  /**
   * Creates a new GlobeEngine instance
   * @param options - Configuration options for the globe
   */
  constructor(options: GlobeEngineOptions) {
    this.container = options.container;
    this.onReady = options.onReady;
    this.onError = options.onError;
  }

  /**
   * Initializes the CesiumJS viewer
   * Loads Cesium from CDN and creates the viewer instance
   * @returns Promise that resolves when initialization is complete
   */
  async initialize(): Promise<void> {
    if (this.viewer || this.isLoading) {
      return;
    }

    this.isLoading = true;

    try {
      // Load Cesium from CDN
      await this.loadCesiumFromCDN();
      
      // Initialize viewer
      await this.createViewer();
      
      this.isLoading = false;
      this.onReady?.();
    } catch (error) {
      this.isLoading = false;
      const err = error instanceof Error ? error : new Error('Failed to initialize globe');
      this.onError?.(err);
      throw err;
    }
  }

  /**
   * Loads CesiumJS library from CDN
   * @private
   */
  private async loadCesiumFromCDN(): Promise<void> {
    // Check if already loaded
    if (typeof window !== 'undefined' && (window as any).Cesium) {
      this.Cesium = (window as any).Cesium;
      return;
    }

    // Load CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${CESIUM_CDN_URL}/Widgets/widgets.css`;
    document.head.appendChild(link);

    // Load JS
    const script = document.createElement('script');
    script.src = `${CESIUM_CDN_URL}/Cesium.js`;

    await new Promise<void>((resolve, reject) => {
      script.onload = () => {
        this.Cesium = (window as any).Cesium;
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load CesiumJS from CDN'));
      document.head.appendChild(script);
    });
  }

  /**
   * Creates the CesiumJS viewer instance
   * @private
   */
  private async createViewer(): Promise<void> {
    if (!this.Cesium) {
      throw new Error('Cesium not loaded');
    }

    const containerEl = typeof this.container === 'string'
      ? document.getElementById(this.container)
      : this.container;

    if (!containerEl) {
      throw new Error('Container element not found');
    }

    // Set Ion access token
    this.Cesium.Ion.defaultAccessToken = API_KEYS.CESIUM_ION;

    // Create viewer with optimized settings
    this.viewer = new this.Cesium.Viewer(containerEl, {
      // Base layers
      baseLayerPicker: false,
      imageryProvider: false, // Will be set by LayerManager
      
      // Terrain
      terrainProvider: await this.Cesium.createWorldTerrainAsync({
        requestWaterMask: TERRAIN_CONFIG.requestWaterMask,
        requestVertexNormals: TERRAIN_CONFIG.requestVertexNormals,
      }),
      
      // UI Controls - All disabled, we use custom UI
      baseLayer: true,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      animation: false,
      timeline: false,
      fullscreenButton: false,
      vrButton: false,
      infoBox: true,
      selectionIndicator: true,
      
      // Rendering optimization
      shadows: false,
      shouldAnimate: true,
      requestRenderMode: PERFORMANCE_CONFIG.requestRenderMode,
      maximumRenderTimeChange: PERFORMANCE_CONFIG.maximumRenderTimeChange,
    });

    // Configure scene
    this.configureScene();
    
    // Configure camera
    this.configureCamera();
    
    // Hide credit logo
    this.hideCreditLogo();
  }

  /**
   * Configures the scene settings
   * @private
   */
  private configureScene(): void {
    const scene = this.viewer.scene;
    
    // Enable depth testing
    scene.globe.depthTestAgainstTerrain = PERFORMANCE_CONFIG.depthTestAgainstTerrain;
    
    // Configure skybox
    scene.skyBox = new this.Cesium.SkyBox({
      sources: SKYBOX_CONFIG,
    });
    
    // Enable FXAA anti-aliasing
    scene.postProcessStages.fxaa.enabled = PERFORMANCE_CONFIG.enableFXAA;
    
    // Add sun and moon
    scene.sun = new this.Cesium.Sun();
    scene.moon = new this.Cesium.Moon({ show: true });
    
    // Enable atmosphere
    scene.skyAtmosphere.show = true;
    scene.fog.enabled = true;
  }

  /**
   * Configures the camera default position
   * @private
   */
  private configureCamera(): void {
    this.viewer.camera.setView({
      destination: this.Cesium.Cartesian3.fromDegrees(
        0,
        20,
        CAMERA_LIMITS.defaultHeight
      ),
      orientation: {
        heading: this.Cesium.Math.toRadians(0),
        pitch: this.Cesium.Math.toRadians(-90),
        roll: 0,
      },
    });
  }

  /**
   * Hides the Cesium credit logo
   * @private
   */
  private hideCreditLogo(): void {
    const creditContainer = this.viewer.cesiumWidget.creditContainer as HTMLElement;
    if (creditContainer) {
      creditContainer.style.display = 'none';
    }
  }

  /**
   * Gets the Cesium viewer instance
   * @returns The Cesium viewer
   */
  getViewer(): any {
    return this.viewer;
  }

  /**
   * Gets the Cesium library reference
   * @returns The Cesium namespace
   */
  getCesium(): any {
    return this.Cesium;
  }

  /**
   * Gets the scene object
   * @returns The Cesium scene
   */
  getScene(): any {
    return this.viewer?.scene;
  }

  /**
   * Gets the camera object
   * @returns The Cesium camera
   */
  getCamera(): any {
    return this.viewer?.camera;
  }

  /**
   * Gets the entities collection
   * @returns The Cesium entity collection
   */
  getEntities(): any {
    return this.viewer?.entities;
  }

  /**
   * Gets the imagery layers collection
   * @returns The Cesium imagery layers
   */
  getImageryLayers(): any {
    return this.viewer?.imageryLayers;
  }

  /**
   * Checks if the viewer is ready
   * @returns True if the viewer is initialized and ready
   */
  isReady(): boolean {
    return this.viewer !== null && !this.isDestroyed;
  }

  /**
   * Renders a frame (for requestRenderMode)
   */
  render(): void {
    if (this.viewer && !this.isDestroyed) {
      this.viewer.render();
    }
  }

  /**
   * Resizes the viewer to fit its container
   */
  resize(): void {
    if (this.viewer && !this.isDestroyed) {
      this.viewer.resize();
    }
  }

  /**
   * Destroys the viewer and cleans up resources
   */
  destroy(): void {
    if (this.viewer && !this.isDestroyed) {
      this.viewer.destroy();
      this.viewer = null;
      this.isDestroyed = true;
    }
  }
}

export default GlobeEngine;
