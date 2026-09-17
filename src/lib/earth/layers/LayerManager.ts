/**
 * @fileoverview Layer Manager - Add/Remove/Toggle Imagery Layers
 * 
 * This module provides comprehensive layer management including adding,
 * removing, reordering, and configuring imagery layers on the globe.
 * 
 * @module layers/LayerManager
 * @author Earth Explorer Team
 * @version 1.0.0
 */

import { ImageryProviders, ImageryLayerType } from './ImageryProviders';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Layer configuration options
 */
export interface LayerConfig {
  /** Layer opacity (0-1) */
  opacity: number;
  /** Layer visibility */
  visible: boolean;
  /** Layer brightness (-1 to 1) */
  brightness?: number;
  /** Layer contrast (-1 to 1) */
  contrast?: number;
  /** Layer hue (0-360) */
  hue?: number;
  /** Layer saturation (-1 to 1) */
  saturation?: number;
  /** Layer gamma */
  gamma?: number;
}

/**
 * Managed layer data
 */
export interface ManagedLayer {
  id: string;
  type: ImageryLayerType | 'clouds' | 'labels' | 'custom';
  imageryLayer: any;
  config: LayerConfig;
}

/**
 * Layer change event data
 */
export interface LayerChangeEvent {
  action: 'add' | 'remove' | 'update' | 'reorder';
  layer: ManagedLayer;
}

/**
 * LayerManager class - Manages imagery layers on the globe
 */
export class LayerManager {
  private viewer: any;
  private Cesium: any;
  private providers: ImageryProviders;
  private layers: Map<string, ManagedLayer> = new Map();
  private baseLayer: ManagedLayer | null = null;
  private cloudLayer: ManagedLayer | null = null;
  private labelsLayer: ManagedLayer | null = null;
  private changeCallbacks: Set<(event: LayerChangeEvent) => void> = new Set();

  /**
   * Creates a new LayerManager
   * @param viewer - The Cesium viewer instance
   * @param Cesium - The Cesium namespace
   */
  constructor(viewer: any, Cesium: any) {
    this.viewer = viewer;
    this.Cesium = Cesium;
    this.providers = new ImageryProviders(Cesium);
  }

  /**
   * Sets the base imagery layer
   * @param type - The type of imagery layer
   * @param config - Optional layer configuration
   */
  async setBaseLayer(type: ImageryLayerType, config: Partial<LayerConfig> = {}): Promise<void> {
    if (!this.viewer) return;

    // Remove existing base layer
    if (this.baseLayer) {
      this.removeLayer(this.baseLayer.id);
    }

    // Create new provider
    const provider = await this.providers.createProvider(type);
    const imageryLayer = this.viewer.imageryLayers.addImageryProvider(provider);

    // Create managed layer
    const layerId = `base-${type}-${Date.now()}`;
    const managedLayer: ManagedLayer = {
      id: layerId,
      type,
      imageryLayer,
      config: {
        opacity: config.opacity ?? 1,
        visible: config.visible ?? true,
        brightness: config.brightness,
        contrast: config.contrast,
        hue: config.hue,
        saturation: config.saturation,
        gamma: config.gamma,
      },
    };

    // Apply configuration
    this.applyLayerConfig(imageryLayer, managedLayer.config);

    // Store layer
    this.layers.set(layerId, managedLayer);
    this.baseLayer = managedLayer;

    // Handle hybrid mode - add labels overlay
    if (type === 'hybrid') {
      await this.addLabelsOverlay();
    } else if (this.labelsLayer) {
      this.removeLayer(this.labelsLayer.id);
      this.labelsLayer = null;
    }

    // Emit change event
    this.emitChange('add', managedLayer);
  }

  /**
   * Gets the current base layer
   * @returns Current base layer or null
   */
  getBaseLayer(): ManagedLayer | null {
    return this.baseLayer;
  }

  /**
   * Adds a labels overlay for hybrid mode
   * @private
   */
  private async addLabelsOverlay(): Promise<void> {
    if (this.labelsLayer) {
      this.removeLayer(this.labelsLayer.id);
    }

    const provider = this.providers.createLabelsOverlayProvider();
    const imageryLayer = this.viewer.imageryLayers.addImageryProvider(provider);

    const layerId = `labels-${Date.now()}`;
    const managedLayer: ManagedLayer = {
      id: layerId,
      type: 'labels',
      imageryLayer,
      config: { opacity: 1, visible: true },
    };

    this.layers.set(layerId, managedLayer);
    this.labelsLayer = managedLayer;
    this.emitChange('add', managedLayer);
  }

  /**
   * Adds a cloud layer overlay
   * @param opacity - Cloud layer opacity (0-1)
   */
  async addCloudLayer(opacity: number = 0.7): Promise<void> {
    if (!this.viewer) return;

    // Remove existing cloud layer
    if (this.cloudLayer) {
      this.removeLayer(this.cloudLayer.id);
    }

    const provider = this.providers.createCloudProvider();
    const imageryLayer = this.viewer.imageryLayers.addImageryProvider(provider);

    const layerId = `clouds-${Date.now()}`;
    const managedLayer: ManagedLayer = {
      id: layerId,
      type: 'clouds',
      imageryLayer,
      config: { opacity, visible: true },
    };

    this.applyLayerConfig(imageryLayer, managedLayer.config);
    this.layers.set(layerId, managedLayer);
    this.cloudLayer = managedLayer;
    this.emitChange('add', managedLayer);
  }

  /**
   * Removes the cloud layer
   */
  removeCloudLayer(): void {
    if (this.cloudLayer) {
      this.removeLayer(this.cloudLayer.id);
      this.cloudLayer = null;
    }
  }

  /**
   * Sets the cloud layer opacity
   * @param opacity - Opacity value (0-1)
   */
  setCloudOpacity(opacity: number): void {
    if (this.cloudLayer) {
      this.cloudLayer.config.opacity = opacity;
      this.cloudLayer.imageryLayer.alpha = opacity;
      this.emitChange('update', this.cloudLayer);
    }
  }

  /**
   * Shows or hides the cloud layer
   * @param visible - Visibility
   */
  setCloudVisible(visible: boolean): void {
    if (visible && !this.cloudLayer) {
      this.addCloudLayer();
    } else if (!visible && this.cloudLayer) {
      this.removeCloudLayer();
    }
  }

  /**
   * Removes a specific layer by ID
   * @param layerId - The layer ID to remove
   */
  removeLayer(layerId: string): void {
    const layer = this.layers.get(layerId);
    if (!layer) return;

    this.viewer.imageryLayers.remove(layer.imageryLayer, true);
    this.layers.delete(layerId);
    this.emitChange('remove', layer);
  }

  /**
   * Updates a layer's configuration
   * @param layerId - The layer ID
   * @param config - New configuration values
   */
  updateLayerConfig(layerId: string, config: Partial<LayerConfig>): void {
    const layer = this.layers.get(layerId);
    if (!layer) return;

    layer.config = { ...layer.config, ...config };
    this.applyLayerConfig(layer.imageryLayer, layer.config);
    this.emitChange('update', layer);
  }

  /**
   * Applies layer configuration to an imagery layer
   * @private
   */
  private applyLayerConfig(imageryLayer: any, config: LayerConfig): void {
    imageryLayer.alpha = config.opacity;
    imageryLayer.show = config.visible;

    if (config.brightness !== undefined) {
      imageryLayer.brightness = config.brightness;
    }
    if (config.contrast !== undefined) {
      imageryLayer.contrast = config.contrast;
    }
    if (config.hue !== undefined) {
      imageryLayer.hue = config.hue;
    }
    if (config.saturation !== undefined) {
      imageryLayer.saturation = config.saturation;
    }
    if (config.gamma !== undefined) {
      imageryLayer.gamma = config.gamma;
    }
  }

  /**
   * Gets a layer by ID
   * @param layerId - The layer ID
   * @returns The managed layer or undefined
   */
  getLayer(layerId: string): ManagedLayer | undefined {
    return this.layers.get(layerId);
  }

  /**
   * Gets all managed layers
   * @returns Array of managed layers
   */
  getAllLayers(): ManagedLayer[] {
    return Array.from(this.layers.values());
  }

  /**
   * Moves a layer to a new index in the layer stack
   * @param layerId - The layer ID to move
   * @param newIndex - The new index position
   */
  moveLayer(layerId: string, newIndex: number): void {
    const layer = this.layers.get(layerId);
    if (!layer) return;

    const currentIndex = this.viewer.imageryLayers.indexOf(layer.imageryLayer);
    if (currentIndex === -1 || currentIndex === newIndex) return;

    const delta = newIndex - currentIndex;
    if (delta > 0) {
      for (let i = 0; i < delta; i++) {
        this.viewer.imageryLayers.raise(layer.imageryLayer);
      }
    } else {
      for (let i = 0; i < -delta; i++) {
        this.viewer.imageryLayers.lower(layer.imageryLayer);
      }
    }

    this.emitChange('reorder', layer);
  }

  /**
   * Registers a callback for layer changes
   * @param callback - Function to call when layers change
   * @returns Unsubscribe function
   */
  onLayerChange(callback: (event: LayerChangeEvent) => void): () => void {
    this.changeCallbacks.add(callback);
    return () => this.changeCallbacks.delete(callback);
  }

  /**
   * Emits a layer change event
   * @private
   */
  private emitChange(action: LayerChangeEvent['action'], layer: ManagedLayer): void {
    this.changeCallbacks.forEach(callback => callback({ action, layer }));
  }

  /**
   * Removes all layers except the base layer
   */
  clearOverlays(): void {
    this.layers.forEach((layer, id) => {
      if (layer !== this.baseLayer) {
        this.removeLayer(id);
      }
    });
  }

  /**
   * Removes all layers
   */
  clearAll(): void {
    this.layers.forEach((_, id) => this.removeLayer(id));
    this.baseLayer = null;
    this.cloudLayer = null;
    this.labelsLayer = null;
  }

  /**
   * Destroys the manager and cleans up resources
   */
  destroy(): void {
    this.clearAll();
    this.changeCallbacks.clear();
  }
}

export default LayerManager;
