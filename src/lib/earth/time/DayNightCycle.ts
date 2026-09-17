/**
 * @fileoverview Day/Night Cycle - Sun Position, Terminator, Night Lights
 * 
 * This module manages day/night cycle visualization including sun-based
 * lighting, night lights overlay, and the terminator line.
 * 
 * @module time/DayNightCycle
 * @author Earth Explorer Team
 * @version 1.0.0
 */

import { TimeController } from './TimeController';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Sun position data
 */
export interface SunPosition {
  /** Sun altitude above horizon (degrees) */
  altitude: number;
  /** Sun azimuth (degrees from north) */
  azimuth: number;
  /** Whether sun is above horizon */
  isDay: boolean;
}

/**
 * Day/night configuration
 */
export interface DayNightConfig {
  /** Enable day/night lighting effect */
  enabled: boolean;
  /** Show night lights layer */
  showNightLights: boolean;
  /** Night lights intensity */
  nightLightsIntensity: number;
}

/**
 * DayNightCycle class - Manages day/night visualization
 */
export class DayNightCycle {
  private viewer: any;
  private Cesium: any;
  private timeController: TimeController | null = null;
  private config: DayNightConfig = {
    enabled: false,
    showNightLights: false,
    nightLightsIntensity: 1.0,
  };
  private nightLightsLayer: any = null;

  /**
   * Creates a new DayNightCycle
   * @param viewer - The Cesium viewer instance
   * @param Cesium - The Cesium namespace
   */
  constructor(viewer: any, Cesium: any) {
    this.viewer = viewer;
    this.Cesium = Cesium;
  }

  /**
   * Sets the time controller for synchronized updates
   * @param controller - TimeController instance
   */
  setTimeController(controller: TimeController): void {
    this.timeController = controller;
    controller.onTimeChange(() => {
      if (this.config.enabled) {
        this.updateLighting();
      }
    });
  }

  /**
   * Enables or disables day/night lighting
   * @param enabled - Whether to enable
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    this.updateLighting();
  }

  /**
   * Gets the enabled state
   * @returns True if enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Shows or hides night lights
   * @param show - Whether to show
   */
  setNightLightsVisible(show: boolean): void {
    this.config.showNightLights = show;

    if (show && !this.nightLightsLayer) {
      this.addNightLightsLayer();
    } else if (!show && this.nightLightsLayer) {
      this.removeNightLightsLayer();
    }
  }

  /**
   * Sets the night lights intensity
   * @param intensity - Intensity value (0-1)
   */
  setNightLightsIntensity(intensity: number): void {
    this.config.nightLightsIntensity = Math.max(0, Math.min(1, intensity));
    if (this.nightLightsLayer) {
      this.nightLightsLayer.alpha = this.config.nightLightsIntensity;
    }
  }

  /**
   * Gets the configuration
   * @returns Current configuration
   */
  getConfig(): DayNightConfig {
    return { ...this.config };
  }

  /**
   * Updates the lighting effect
   * @private
   */
  private updateLighting(): void {
    if (!this.viewer) return;

    this.viewer.scene.globe.enableLighting = this.config.enabled;

    if (this.config.enabled && this.timeController) {
      const time = this.timeController.getTime();
      const julianDate = this.Cesium.JulianDate.fromDate(time);
      this.viewer.clock.currentTime = julianDate;
    }
  }

  /**
   * Adds the night lights layer
   * @private
   */
  private async addNightLightsLayer(): Promise<void> {
    if (!this.viewer || !this.Cesium || this.nightLightsLayer) return;

    // Use NASA Black Marble imagery (simplified URL pattern)
    try {
      const provider = new this.Cesium.UrlTemplateImageryProvider({
        url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_CityLights_2012/default/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png',
        maximumLevel: 8,
        credit: new this.Cesium.Credit('NASA Earth Observatory'),
      });

      this.nightLightsLayer = this.viewer.imageryLayers.addImageryProvider(provider);
      this.nightLightsLayer.alpha = this.config.nightLightsIntensity;
      this.nightLightsLayer.dayAlpha = 0; // Hide during day
      this.nightLightsLayer.nightAlpha = this.config.nightLightsIntensity;
    } catch (error) {
      console.warn('Failed to load night lights layer:', error);
    }
  }

  /**
   * Removes the night lights layer
   * @private
   */
  private removeNightLightsLayer(): void {
    if (this.nightLightsLayer && this.viewer) {
      this.viewer.imageryLayers.remove(this.nightLightsLayer, true);
      this.nightLightsLayer = null;
    }
  }

  /**
   * Calculates sun position for a given location and time
   * @param latitude - Observer latitude
   * @param longitude - Observer longitude
   * @param time - Time (uses current time if not provided)
   * @returns Sun position data
   */
  getSunPosition(latitude: number, longitude: number, time?: Date): SunPosition {
    const date = time ?? (this.timeController?.getTime() ?? new Date());
    return this.calculateSunPosition(latitude, longitude, date);
  }

  /**
   * Calculates sun position using astronomical formulas
   * @private
   */
  private calculateSunPosition(lat: number, lon: number, date: Date): SunPosition {
    // Simplified sun position calculation
    const rad = Math.PI / 180;

    // Calculate day of year
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

    // Calculate declination angle
    const declination = 23.45 * Math.sin(rad * (360 / 365) * (dayOfYear - 81));

    // Calculate hour angle
    const hours = date.getUTCHours() + date.getUTCMinutes() / 60;
    const hourAngle = 15 * (hours - 12) - lon;

    // Calculate altitude
    const latRad = lat * rad;
    const decRad = declination * rad;
    const hourRad = hourAngle * rad;

    const sinAlt =
      Math.sin(latRad) * Math.sin(decRad) +
      Math.cos(latRad) * Math.cos(decRad) * Math.cos(hourRad);
    const altitude = Math.asin(sinAlt) / rad;

    // Calculate azimuth
    const cosAz =
      (Math.sin(decRad) - Math.sin(latRad) * sinAlt) /
      (Math.cos(latRad) * Math.cos(Math.asin(sinAlt)));
    let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAz))) / rad;

    if (hourAngle > 0) {
      azimuth = 360 - azimuth;
    }

    return {
      altitude,
      azimuth,
      isDay: altitude > 0,
    };
  }

  /**
   * Checks if it's daytime at a location
   * @param latitude - Latitude
   * @param longitude - Longitude
   * @returns True if daytime
   */
  isDaytime(latitude: number, longitude: number): boolean {
    return this.getSunPosition(latitude, longitude).isDay;
  }

  /**
   * Gets sunrise time for a location
   * @param latitude - Latitude
   * @param longitude - Longitude
   * @param date - Date (uses current date if not provided)
   * @returns Approximate sunrise time
   */
  getSunrise(latitude: number, longitude: number, date?: Date): Date {
    const d = date ?? new Date();
    return this.calculateSunTime(latitude, longitude, d, true);
  }

  /**
   * Gets sunset time for a location
   * @param latitude - Latitude
   * @param longitude - Longitude
   * @param date - Date (uses current date if not provided)
   * @returns Approximate sunset time
   */
  getSunset(latitude: number, longitude: longitude, date?: Date): Date {
    const d = date ?? new Date();
    return this.calculateSunTime(latitude, longitude, d, false);
  }

  /**
   * Calculates sunrise or sunset time
   * @private
   */
  private calculateSunTime(lat: number, lon: number, date: Date, sunrise: boolean): Date {
    // Simplified calculation
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
    const startOfYear = new Date(date.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((start.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));

    const declination = 23.45 * Math.sin((Math.PI / 180) * (360 / 365) * (dayOfYear - 81));
    
    const rad = Math.PI / 180;
    const cosHourAngle =
      (Math.sin(-0.83 * rad) - Math.sin(lat * rad) * Math.sin(declination * rad)) /
      (Math.cos(lat * rad) * Math.cos(declination * rad));

    const hourAngle = Math.acos(Math.max(-1, Math.min(1, cosHourAngle))) / rad;

    let solarTime: number;
    if (sunrise) {
      solarTime = 12 - hourAngle / 15;
    } else {
      solarTime = 12 + hourAngle / 15;
    }

    // Convert to local time (simplified)
    const localTime = solarTime - lon / 15;
    const hours = Math.floor(localTime);
    const minutes = Math.round((localTime - hours) * 60);

    const result = new Date(start);
    result.setHours(hours, minutes, 0, 0);

    return result;
  }

  /**
   * Destroys the manager and cleans up
   */
  destroy(): void {
    this.removeNightLightsLayer();
    this.setEnabled(false);
  }
}

export default DayNightCycle;
