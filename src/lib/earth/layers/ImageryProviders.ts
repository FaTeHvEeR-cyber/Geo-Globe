/**
 * @fileoverview Imagery Providers - Tile Source Configurations
 * 
 * This module provides factory functions for creating various imagery providers
 * including OpenStreetMap, ESRI, Bing, CartoDB, and custom tile sources.
 * 
 * @module layers/ImageryProviders
 * @author Earth Explorer Team
 * @version 1.0.0
 */

import { IMAGERY_PROVIDERS, API_KEYS } from '../config';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Supported imagery layer types
 */
export type ImageryLayerType =
  | 'osm'
  | 'bing-aerial'
  | 'esri-imagery'
  | 'esri-terrain'
  | 'carto-dark'
  | 'carto-light'
  | 'hybrid';

/**
 * Imagery provider metadata
 */
export interface ImageryLayerInfo {
  id: ImageryLayerType;
  name: string;
  icon: string;
  description: string;
  attribution: string;
}

/**
 * Available imagery layers with metadata
 */
export const IMAGERY_LAYER_INFO: Record<ImageryLayerType, ImageryLayerInfo> = {
  'osm': {
    id: 'osm',
    name: 'OpenStreetMap',
    icon: '🗺️',
    description: 'OpenStreetMap standard layer',
    attribution: '© OpenStreetMap contributors',
  },
  'bing-aerial': {
    id: 'bing-aerial',
    name: 'Bing Aerial',
    icon: '🛰️',
    description: 'Bing Maps aerial imagery',
    attribution: '© Microsoft',
  },
  'esri-imagery': {
    id: 'esri-imagery',
    name: 'ESRI Imagery',
    icon: '🌍',
    description: 'ESRI World Imagery',
    attribution: '© Esri',
  },
  'esri-terrain': {
    id: 'esri-terrain',
    name: 'Terrain',
    icon: '🏔️',
    description: 'ESRI World Topo Map',
    attribution: '© Esri',
  },
  'carto-dark': {
    id: 'carto-dark',
    name: 'Dark Matter',
    icon: '🌙',
    description: 'CartoDB Dark Matter theme',
    attribution: '© CartoDB',
  },
  'carto-light': {
    id: 'carto-light',
    name: 'Positron',
    icon: '⚪',
    description: 'CartoDB Positron theme',
    attribution: '© CartoDB',
  },
  'hybrid': {
    id: 'hybrid',
    name: 'Hybrid',
    icon: '🌐',
    description: 'Satellite with labels',
    attribution: '© Microsoft, © Esri',
  },
};

/**
 * ImageryProviders class - Factory for creating imagery providers
 */
export class ImageryProviders {
  private Cesium: any;

  /**
   * Creates a new ImageryProviders factory
   * @param Cesium - The Cesium namespace
   */
  constructor(Cesium: any) {
    this.Cesium = Cesium;
  }

  /**
   * Creates an imagery provider based on the layer type
   * @param type - The type of imagery layer
   * @returns The imagery provider instance
   */
  createProvider(type: ImageryLayerType): any {
    switch (type) {
      case 'osm':
        return this.createOSMProvider();
      case 'bing-aerial':
        return this.createBingAerialProvider();
      case 'esri-imagery':
        return this.createESRIImageryProvider();
      case 'esri-terrain':
        return this.createESRITerrainProvider();
      case 'carto-dark':
        return this.createCartoDarkProvider();
      case 'carto-light':
        return this.createCartoLightProvider();
      case 'hybrid':
        return this.createBingAerialProvider(); // Base layer for hybrid
      default:
        return this.createOSMProvider();
    }
  }

  /**
   * Creates an OpenStreetMap imagery provider
   * @returns OSM imagery provider
   */
  createOSMProvider(): any {
    return new this.Cesium.OpenStreetMapImageryProvider({
      url: IMAGERY_PROVIDERS.OSM.url,
      maximumLevel: IMAGERY_PROVIDERS.OSM.maxLevel,
      credit: new this.Cesium.Credit(IMAGERY_PROVIDERS.OSM.credit),
    });
  }

  /**
   * Creates a Bing Maps aerial imagery provider
   * Uses Cesium Ion asset ID
   * @returns Bing aerial imagery provider
   */
  createBingAerialProvider(): any {
    return this.Cesium.IonImageryProvider.fromAssetId(2);
  }

  /**
   * Creates an ESRI World Imagery provider
   * @returns ESRI imagery provider
   */
  createESRIImageryProvider(): any {
    return new this.Cesium.ArcGisMapServerImageryProvider({
      url: IMAGERY_PROVIDERS.ESRI_IMAGERY.url,
      credit: new this.Cesium.Credit(IMAGERY_PROVIDERS.ESRI_IMAGERY.credit),
    });
  }

  /**
   * Creates an ESRI World Topo Map provider
   * @returns ESRI terrain provider
   */
  createESRITerrainProvider(): any {
    return new this.Cesium.ArcGisMapServerImageryProvider({
      url: IMAGERY_PROVIDERS.ESRI_TERRAIN.url,
      credit: new this.Cesium.Credit(IMAGERY_PROVIDERS.ESRI_TERRAIN.credit),
    });
  }

  /**
   * Creates a CartoDB Dark Matter provider
   * @returns CartoDB dark provider
   */
  createCartoDarkProvider(): any {
    return new this.Cesium.UrlTemplateImageryProvider({
      url: IMAGERY_PROVIDERS.CARTO_DARK.url,
      maximumLevel: IMAGERY_PROVIDERS.CARTO_DARK.maxLevel,
      credit: new this.Cesium.Credit(IMAGERY_PROVIDERS.CARTO_DARK.credit),
    });
  }

  /**
   * Creates a CartoDB Positron (light) provider
   * @returns CartoDB light provider
   */
  createCartoLightProvider(): any {
    return new this.Cesium.UrlTemplateImageryProvider({
      url: 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      maximumLevel: 18,
      credit: new this.Cesium.Credit('CartoDB Positron'),
    });
  }

  /**
   * Creates an ESRI labels overlay provider
   * Used for hybrid mode to add labels on top of imagery
   * @returns ESRI labels provider
   */
  createLabelsOverlayProvider(): any {
    return new this.Cesium.ArcGisMapServerImageryProvider({
      url: IMAGERY_PROVIDERS.ESRI_LABELS.url,
      credit: new this.Cesium.Credit(IMAGERY_PROVIDERS.ESRI_LABELS.credit),
    });
  }

  /**
   * Creates a NASA GIBS cloud layer provider
   * @returns NASA cloud imagery provider
   */
  createCloudProvider(): any {
    return new this.Cesium.UrlTemplateImageryProvider({
      url: IMAGERY_PROVIDERS.NASA_GIBS_CLOUDS.url,
      maximumLevel: IMAGERY_PROVIDERS.NASA_GIBS_CLOUDS.maxLevel,
      credit: new this.Cesium.Credit(IMAGERY_PROVIDERS.NASA_GIBS_CLOUDS.credit),
    });
  }

  /**
   * Creates a custom URL template imagery provider
   * @param url - URL template with {z}, {x}, {y} placeholders
   * @param options - Additional options
   * @returns Custom imagery provider
   */
  createCustomProvider(url: string, options: {
    maxLevel?: number;
    credit?: string;
  } = {}): any {
    return new this.Cesium.UrlTemplateImageryProvider({
      url,
      maximumLevel: options.maxLevel ?? 18,
      credit: options.credit ? new this.Cesium.Credit(options.credit) : undefined,
    });
  }

  /**
   * Gets the layer info for a given type
   * @param type - The imagery layer type
   * @returns Layer metadata
   */
  getLayerInfo(type: ImageryLayerType): ImageryLayerInfo {
    return IMAGERY_LAYER_INFO[type];
  }

  /**
   * Gets all available layer types with their info
   * @returns Array of layer info
   */
  getAllLayerInfo(): ImageryLayerInfo[] {
    return Object.values(IMAGERY_LAYER_INFO);
  }
}

export default ImageryProviders;
