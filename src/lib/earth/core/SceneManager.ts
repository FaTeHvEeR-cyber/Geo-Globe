/**
 * @fileoverview Scene Manager - Lighting, Atmosphere, Skybox Management
 * 
 * This module handles scene-level configuration including day/night lighting,
 * atmospheric effects, skybox configuration, and scene mode switching.
 * 
 * @module core/SceneManager
 * @author Earth Explorer Team
 * @version 1.0.0
 */

import { SKYBOX_CONFIG, CESIUM_CDN_URL } from '../config';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Scene mode types
 */
export type SceneModeType = '3d' | '2d' | 'columbus';

/**
 * Lighting configuration
 */
export interface LightingConfig {
  /** Enable sun-based lighting */
  enabled: boolean;
  /** Show night lights layer */
  showNightLights: boolean;
  /** Current simulated time */
  currentTime?: Date;
}

/**
 * Atmosphere configuration
 */
export interface AtmosphereConfig {
  /** Show sky atmosphere effect */
  showSkyAtmosphere: boolean;
  /** Show ground atmosphere effect */
  showGroundAtmosphere: boolean;
  /** Enable fog */
  enableFog: boolean;
  /** Fog density */
  fogDensity: number;
}

/**
 * SceneManager class - Manages scene-level settings
 */
export class SceneManager {
  private viewer: any;
  private Cesium: any;
  private currentSceneMode: SceneModeType = '3d';
  private lightingConfig: LightingConfig = {
    enabled: false,
    showNightLights: false,
  };
  private atmosphereConfig: AtmosphereConfig = {
    showSkyAtmosphere: true,
    showGroundAtmosphere: true,
    enableFog: true,
    fogDensity: 0.0002,
  };

  /**
   * Creates a new SceneManager
   * @param viewer - The Cesium viewer instance
   * @param Cesium - The Cesium namespace
   */
  constructor(viewer: any, Cesium: any) {
    this.viewer = viewer;
    this.Cesium = Cesium;
  }

  /**
   * Sets the scene mode (3D, 2D, or Columbus)
   * @param mode - The scene mode to set
   * @param duration - Transition duration in seconds (default: 1)
   */
  setSceneMode(mode: SceneModeType, duration: number = 1): void {
    if (!this.viewer) return;

    this.currentSceneMode = mode;

    switch (mode) {
      case '3d':
        this.viewer.scene.morphTo3D(duration);
        break;
      case '2d':
        this.viewer.scene.morphTo2D(duration);
        break;
      case 'columbus':
        this.viewer.scene.morphToColumbusView(duration);
        break;
    }
  }

  /**
   * Gets the current scene mode
   * @returns Current scene mode
   */
  getSceneMode(): SceneModeType {
    return this.currentSceneMode;
  }

  /**
   * Enables or disables day/night lighting
   * @param enabled - Whether to enable lighting
   */
  setLighting(enabled: boolean): void {
    if (!this.viewer) return;

    this.lightingConfig.enabled = enabled;
    this.viewer.scene.globe.enableLighting = enabled;
  }

  /**
   * Gets the current lighting configuration
   * @returns Lighting configuration
   */
  getLightingConfig(): LightingConfig {
    return { ...this.lightingConfig };
  }

  /**
   * Sets the current simulation time
   * @param time - The date/time to set
   */
  setCurrentTime(time: Date): void {
    if (!this.viewer || !this.Cesium) return;

    this.lightingConfig.currentTime = time;
    this.viewer.clock.currentTime = this.Cesium.JulianDate.fromDate(time);
  }

  /**
   * Gets the current simulation time
   * @returns Current time or null if not set
   */
  getCurrentTime(): Date | null {
    return this.lightingConfig.currentTime ?? null;
  }

  /**
   * Configures the atmosphere settings
   * @param config - Atmosphere configuration
   */
  setAtmosphereConfig(config: Partial<AtmosphereConfig>): void {
    if (!this.viewer) return;

    this.atmosphereConfig = { ...this.atmosphereConfig, ...config };

    const scene = this.viewer.scene;

    if ('showSkyAtmosphere' in config) {
      scene.skyAtmosphere.show = config.showSkyAtmosphere;
    }

    if ('showGroundAtmosphere' in config) {
      scene.globe.showGroundAtmosphere = config.showGroundAtmosphere;
    }

    if ('enableFog' in config || 'fogDensity' in config) {
      scene.fog.enabled = this.atmosphereConfig.enableFog;
      if (this.atmosphereConfig.enableFog && this.atmosphereConfig.fogDensity) {
        scene.fog.density = this.atmosphereConfig.fogDensity;
      }
    }
  }

  /**
   * Gets the current atmosphere configuration
   * @returns Atmosphere configuration
   */
  getAtmosphereConfig(): AtmosphereConfig {
    return { ...this.atmosphereConfig };
  }

  /**
   * Sets a custom skybox with the provided textures
   * @param sources - Skybox texture URLs
   */
  setSkybox(sources: {
    positiveX: string;
    negativeX: string;
    positiveY: string;
    negativeY: string;
    positiveZ: string;
    negativeZ: string;
  }): void {
    if (!this.viewer || !this.Cesium) return;

    this.viewer.scene.skyBox = new this.Cesium.SkyBox({ sources });
  }

  /**
   * Resets the skybox to default
   */
  resetSkybox(): void {
    this.setSkybox(SKYBOX_CONFIG);
  }

  /**
   * Shows or hides the sun
   * @param show - Whether to show the sun
   */
  setShowSun(show: boolean): void {
    if (!this.viewer) return;

    if (show && !this.viewer.scene.sun) {
      this.viewer.scene.sun = new this.Cesium.Sun();
    } else if (!show) {
      this.viewer.scene.sun = undefined;
    }
  }

  /**
   * Shows or hides the moon
   * @param show - Whether to show the moon
   */
  setShowMoon(show: boolean): void {
    if (!this.viewer) return;

    if (show && !this.viewer.scene.moon) {
      this.viewer.scene.moon = new this.Cesium.Moon({ show: true });
    } else if (this.viewer.scene.moon) {
      this.viewer.scene.moon.show = show;
    }
  }

  /**
   * Sets the globe base color (used when no imagery is loaded)
   * @param color - CSS color string
   */
  setGlobeBaseColor(color: string): void {
    if (!this.viewer || !this.Cesium) return;

    this.viewer.scene.globe.baseColor = this.Cesium.Color.fromCssColorString(color);
  }

  /**
   * Enables or disables depth testing against terrain
   * @param enabled - Whether to enable depth testing
   */
  setDepthTestAgainstTerrain(enabled: boolean): void {
    if (!this.viewer) return;

    this.viewer.scene.globe.depthTestAgainstTerrain = enabled;
  }

  /**
   * Enables or disables FXAA anti-aliasing
   * @param enabled - Whether to enable FXAA
   */
  setFXAA(enabled: boolean): void {
    if (!this.viewer) return;

    this.viewer.scene.postProcessStages.fxaa.enabled = enabled;
  }

  /**
   * Shows or hides the globe
   * @param show - Whether to show the globe
   */
  setShowGlobe(show: boolean): void {
    if (!this.viewer) return;

    this.viewer.scene.globe.show = show;
  }

  /**
   * Gets the scene object for advanced configuration
   * @returns The Cesium scene
   */
  getScene(): any {
    return this.viewer?.scene;
  }

  /**
   * Destroys the manager and cleans up resources
   */
  destroy(): void {
    // No persistent resources to clean up
  }
}

export default SceneManager;
