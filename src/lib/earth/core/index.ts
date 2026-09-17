/**
 * @fileoverview Core Module Index
 * 
 * Exports all core functionality for the Earth Explorer application.
 * 
 * @module core
 */

export { GlobeEngine } from './GlobeEngine';
export type { GlobeEngineOptions } from './GlobeEngine';

export { CameraController } from './CameraController';
export type { CameraPosition, FlyToOptions, KeyboardConfig } from './CameraController';

export { SceneManager } from './SceneManager';
export type { SceneModeType, LightingConfig, AtmosphereConfig } from './SceneManager';
