/**
 * @fileoverview Cloud System - Real-time Cloud Layer Management
 * 
 * This module manages cloud visualization including real-time NASA GIBS
 * cloud imagery and animated cloud movement.
 * 
 * @module effects/CloudSystem
 * @author Earth Explorer Team
 * @version 1.0.0
 */

import { IMAGERY_PROVIDERS } from '../config';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Cloud layer configuration
 */
export interface CloudConfig {
  /** Cloud layer visibility */
  visible: boolean;
  /** Cloud opacity (0-1) */
  opacity: number;
  /** Enable cloud animation */
  animate: boolean;
  /** Animation speed multiplier */
  animationSpeed: number;
  /** Cloud layer altitude (meters) */
  altitude?: number;
}

/**
 * Cloud system update event
 */
export interface CloudUpdateEvent {
  visible: boolean;
  opacity: number;
  timestamp: Date;
}

/**
 * CloudSystem class - Manages cloud layer visualization
 */
export class CloudSystem {
  private viewer: any;
  private Cesium: any;
  private cloudLayer: any = null;
  private config: CloudConfig = {
    visible: false,
    opacity: 0.7,
    animate: false,
    animationSpeed: 1,
  };
  private animationFrame: number | null = null;
  private updateCallbacks: Set<(event: CloudUpdateEvent) => void> = new Set();

  /**
   * Creates a new CloudSystem
   * @param viewer - The Cesium viewer instance
   * @param Cesium - The Cesium namespace
   */
  constructor(viewer: any, Cesium: any) {
    this.viewer = viewer;
    this.Cesium = Cesium;
  }

  /**
   * Shows the cloud layer
   */
  async show(): Promise<void> {
    if (!this.viewer || !this.Cesium) return;

    if (this.cloudLayer) {
      this.cloudLayer.show = true;
      this.config.visible = true;
      return;
    }

    // Create cloud imagery provider using NASA GIBS
    const cloudProvider = new this.Cesium.UrlTemplateImageryProvider({
      url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_Cloud_Effective_Radius/default/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png',
      maximumLevel: IMAGERY_PROVIDERS.NASA_GIBS_CLOUDS.maxLevel,
      credit: new this.Cesium.Credit(IMAGERY_PROVIDERS.NASA_GIBS_CLOUDS.credit),
    });

    // Add to imagery layers
    this.cloudLayer = this.viewer.imageryLayers.addImageryProvider(cloudProvider);
    this.cloudLayer.alpha = this.config.opacity;
    this.config.visible = true;

    // Start animation if enabled
    if (this.config.animate) {
      this.startAnimation();
    }

    this.emitUpdate();
  }

  /**
   * Hides the cloud layer
   */
  hide(): void {
    if (this.cloudLayer) {
      this.cloudLayer.show = false;
      this.config.visible = false;
      this.stopAnimation();
      this.emitUpdate();
    }
  }

  /**
   * Toggles the cloud layer visibility
   */
  toggle(): void {
    if (this.config.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Removes the cloud layer completely
   */
  remove(): void {
    if (this.cloudLayer && this.viewer) {
      this.viewer.imageryLayers.remove(this.cloudLayer, true);
      this.cloudLayer = null;
      this.config.visible = false;
      this.stopAnimation();
      this.emitUpdate();
    }
  }

  /**
   * Sets the cloud layer opacity
   * @param opacity - Opacity value (0-1)
   */
  setOpacity(opacity: number): void {
    this.config.opacity = Math.max(0, Math.min(1, opacity));
    if (this.cloudLayer) {
      this.cloudLayer.alpha = this.config.opacity;
    }
    this.emitUpdate();
  }

  /**
   * Gets the current cloud configuration
   * @returns Current configuration
   */
  getConfig(): CloudConfig {
    return { ...this.config };
  }

  /**
   * Updates the cloud configuration
   * @param config - New configuration values
   */
  updateConfig(config: Partial<CloudConfig>): void {
    const wasAnimating = this.config.animate;
    this.config = { ...this.config, ...config };

    if (this.cloudLayer) {
      this.cloudLayer.alpha = this.config.opacity;
      this.cloudLayer.show = this.config.visible;
    }

    // Handle animation state change
    if (config.animate !== undefined) {
      if (config.animate && !wasAnimating && this.config.visible) {
        this.startAnimation();
      } else if (!config.animate && wasAnimating) {
        this.stopAnimation();
      }
    }

    this.emitUpdate();
  }

  /**
   * Starts cloud animation
   * Simulates cloud movement by adjusting layer parameters
   */
  startAnimation(): void {
    if (this.animationFrame !== null) return;

    this.config.animate = true;
    
    const animate = () => {
      if (!this.config.animate || !this.config.visible) {
        this.animationFrame = null;
        return;
      }

      // In a real implementation, this would shift the cloud texture
      // For now, we just update the viewer
      if (this.viewer && !this.viewer.isDestroyed?.()) {
        this.viewer.render();
      }

      this.animationFrame = requestAnimationFrame(animate);
    };

    animate();
  }

  /**
   * Stops cloud animation
   */
  stopAnimation(): void {
    this.config.animate = false;
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  /**
   * Checks if cloud layer is visible
   * @returns True if visible
   */
  isVisible(): boolean {
    return this.config.visible;
  }

  /**
   * Registers a callback for cloud updates
   * @param callback - Function to call on updates
   * @returns Unsubscribe function
   */
  onUpdate(callback: (event: CloudUpdateEvent) => void): () => void {
    this.updateCallbacks.add(callback);
    return () => this.updateCallbacks.delete(callback);
  }

  /**
   * Emits an update event
   * @private
   */
  private emitUpdate(): void {
    const event: CloudUpdateEvent = {
      visible: this.config.visible,
      opacity: this.config.opacity,
      timestamp: new Date(),
    };
    this.updateCallbacks.forEach(callback => callback(event));
  }

  /**
   * Destroys the cloud system and cleans up resources
   */
  destroy(): void {
    this.stopAnimation();
    this.remove();
    this.updateCallbacks.clear();
  }
}

export default CloudSystem;
