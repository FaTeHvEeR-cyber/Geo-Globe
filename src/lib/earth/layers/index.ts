/**
 * @fileoverview Layers Module Index
 * 
 * Exports all layer management functionality.
 * 
 * @module layers
 */

export { LayerManager } from './LayerManager';
export type { LayerConfig, ManagedLayer, LayerChangeEvent } from './LayerManager';

export { ImageryProviders, IMAGERY_LAYER_INFO } from './ImageryProviders';
export type { ImageryLayerType, ImageryLayerInfo } from './ImageryProviders';
