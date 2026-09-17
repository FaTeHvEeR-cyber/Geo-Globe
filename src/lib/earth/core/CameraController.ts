/**
 * @fileoverview Camera Controller - Camera Modes, Fly-to, First-person Navigation
 * 
 * This module provides comprehensive camera control for the 3D globe including
 * smooth fly-to animations, keyboard navigation, and camera mode switching.
 * 
 * @module core/CameraController
 * @author Earth Explorer Team
 * @version 1.0.0
 */

import { CAMERA_LIMITS } from '../config';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Camera position data
 */
export interface CameraPosition {
  longitude: number;
  latitude: number;
  height: number;
  heading: number;
  pitch: number;
  roll: number;
}

/**
 * Fly-to options for smooth camera transitions
 */
export interface FlyToOptions {
  /** Destination longitude in degrees */
  longitude: number;
  /** Destination latitude in degrees */
  latitude: number;
  /** Destination height in meters */
  height?: number;
  /** Camera heading in degrees (default: 0) */
  heading?: number;
  /** Camera pitch in degrees (default: -45) */
  pitch?: number;
  /** Animation duration in seconds (default: 2) */
  duration?: number;
  /** Callback when flight completes */
  onComplete?: () => void;
}

/**
 * Keyboard navigation configuration
 */
export interface KeyboardConfig {
  /** Pan forward key */
  forward: string;
  /** Pan backward key */
  backward: string;
  /** Pan left key */
  left: string;
  /** Pan right key */
  right: string;
  /** Tilt up key */
  tiltUp: string;
  /** Tilt down key */
  tiltDown: string;
  /** Zoom in key */
  zoomIn: string;
  /** Zoom out key */
  zoomOut: string;
}

/**
 * CameraController class - Manages camera navigation and positioning
 */
export class CameraController {
  private viewer: any;
  private Cesium: any;
  private keyboardEnabled: boolean = false;
  private keyboardHandler: ((e: KeyboardEvent) => void) | null = null;
  private cameraChangeCallbacks: Set<(pos: CameraPosition) => void> = new Set();

  /**
   * Default keyboard configuration
   */
  private static DEFAULT_KEYBOARD_CONFIG: KeyboardConfig = {
    forward: 'w',
    backward: 's',
    left: 'a',
    right: 'd',
    tiltUp: 'q',
    tiltDown: 'e',
    zoomIn: '+',
    zoomOut: '-',
  };

  /**
   * Creates a new CameraController
   * @param viewer - The Cesium viewer instance
   * @param Cesium - The Cesium namespace
   */
  constructor(viewer: any, Cesium: any) {
    this.viewer = viewer;
    this.Cesium = Cesium;
    this.setupCameraChangeHandler();
  }

  /**
   * Sets up the camera change event handler
   * @private
   */
  private setupCameraChangeHandler(): void {
    if (!this.viewer) return;

    this.viewer.camera.changed.addEventListener(() => {
      const position = this.getPosition();
      this.cameraChangeCallbacks.forEach(callback => callback(position));
    });
  }

  /**
   * Flies the camera to a specified location with smooth animation
   * @param options - Fly-to configuration options
   */
  flyTo(options: FlyToOptions): void {
    if (!this.viewer || !this.Cesium) return;

    const {
      longitude,
      latitude,
      height = 50000,
      heading = 0,
      pitch = -45,
      duration = 2,
      onComplete,
    } = options;

    this.viewer.camera.flyTo({
      destination: this.Cesium.Cartesian3.fromDegrees(longitude, latitude, height),
      orientation: {
        heading: this.Cesium.Math.toRadians(heading),
        pitch: this.Cesium.Math.toRadians(pitch),
        roll: 0,
      },
      duration,
      complete: onComplete,
    });
  }

  /**
   * Flies to the home/default view
   */
  flyToHome(): void {
    this.flyTo({
      longitude: 0,
      latitude: 20,
      height: CAMERA_LIMITS.defaultHeight,
      heading: 0,
      pitch: -90,
      duration: 2,
    });
  }

  /**
   * Sets the camera position immediately (no animation)
   * @param options - Position options
   */
  setPosition(options: Omit<FlyToOptions, 'duration' | 'onComplete'>): void {
    if (!this.viewer || !this.Cesium) return;

    const {
      longitude,
      latitude,
      height = 50000,
      heading = 0,
      pitch = -45,
    } = options;

    this.viewer.camera.setView({
      destination: this.Cesium.Cartesian3.fromDegrees(longitude, latitude, height),
      orientation: {
        heading: this.Cesium.Math.toRadians(heading),
        pitch: this.Cesium.Math.toRadians(pitch),
        roll: 0,
      },
    });
  }

  /**
   * Gets the current camera position
   * @returns Camera position data
   */
  getPosition(): CameraPosition {
    if (!this.viewer) {
      return {
        longitude: 0,
        latitude: 0,
        height: CAMERA_LIMITS.defaultHeight,
        heading: 0,
        pitch: -90,
        roll: 0,
      };
    }

    const position = this.viewer.camera.positionCartographic;
    return {
      longitude: this.Cesium.Math.toDegrees(position.longitude),
      latitude: this.Cesium.Math.toDegrees(position.latitude),
      height: position.height,
      heading: this.Cesium.Math.toDegrees(this.viewer.camera.heading),
      pitch: this.Cesium.Math.toDegrees(this.viewer.camera.pitch),
      roll: this.Cesium.Math.toDegrees(this.viewer.camera.roll),
    };
  }

  /**
   * Gets the camera height above the terrain
   * @returns Height in meters
   */
  getHeight(): number {
    return this.getPosition().height;
  }

  /**
   * Enables keyboard navigation
   * @param config - Custom keyboard configuration (optional)
   */
  enableKeyboardNavigation(config: Partial<KeyboardConfig> = {}): void {
    if (this.keyboardEnabled || !this.viewer) return;

    const keyConfig = { ...CameraController.DEFAULT_KEYBOARD_CONFIG, ...config };
    
    this.keyboardHandler = (e: KeyboardEvent) => {
      this.handleKeyboardInput(e.key.toLowerCase(), keyConfig);
    };

    document.addEventListener('keydown', this.keyboardHandler);
    this.keyboardEnabled = true;
  }

  /**
   * Disables keyboard navigation
   */
  disableKeyboardNavigation(): void {
    if (!this.keyboardEnabled || !this.keyboardHandler) return;

    document.removeEventListener('keydown', this.keyboardHandler);
    this.keyboardHandler = null;
    this.keyboardEnabled = false;
  }

  /**
   * Handles keyboard input for navigation
   * @private
   */
  private handleKeyboardInput(key: string, config: KeyboardConfig): void {
    if (!this.viewer) return;

    const camera = this.viewer.camera;
    const height = camera.positionCartographic.height;
    const moveAmount = height / 100;
    const rotateAmount = 2;

    switch (key) {
      case config.forward:
        camera.moveForward(moveAmount);
        break;
      case config.backward:
        camera.moveBackward(moveAmount);
        break;
      case config.left:
        camera.moveLeft(moveAmount);
        break;
      case config.right:
        camera.moveRight(moveAmount);
        break;
      case config.tiltUp:
        camera.lookUp(this.Cesium.Math.toRadians(rotateAmount));
        break;
      case config.tiltDown:
        camera.lookDown(this.Cesium.Math.toRadians(rotateAmount));
        break;
      case config.zoomIn:
      case '=':
        camera.zoomIn(moveAmount / 2);
        break;
      case config.zoomOut:
        camera.zoomOut(moveAmount / 2);
        break;
    }
  }

  /**
   * Zooms in by a specified amount
   * @param amount - Zoom amount in meters (default: 10% of current height)
   */
  zoomIn(amount?: number): void {
    if (!this.viewer) return;
    const zoomAmount = amount ?? this.viewer.camera.positionCartographic.height * 0.1;
    this.viewer.camera.zoomIn(zoomAmount);
  }

  /**
   * Zooms out by a specified amount
   * @param amount - Zoom amount in meters (default: 10% of current height)
   */
  zoomOut(amount?: number): void {
    if (!this.viewer) return;
    const zoomAmount = amount ?? this.viewer.camera.positionCartographic.height * 0.1;
    this.viewer.camera.zoomOut(zoomAmount);
  }

  /**
   * Rotates the camera around the current view center
   * @param angle - Rotation angle in degrees
   */
  rotate(angle: number): void {
    if (!this.viewer || !this.Cesium) return;
    this.viewer.camera.rotate(this.Cesium.Math.toRadians(angle));
  }

  /**
   * Registers a callback for camera position changes
   * @param callback - Function to call when camera changes
   * @returns Unsubscribe function
   */
  onCameraChange(callback: (position: CameraPosition) => void): () => void {
    this.cameraChangeCallbacks.add(callback);
    return () => this.cameraChangeCallbacks.delete(callback);
  }

  /**
   * Looks at a specific point on the globe
   * @param longitude - Target longitude in degrees
   * @param latitude - Target latitude in degrees
   * @param range - Distance from target in meters
   */
  lookAt(longitude: number, latitude: number, range: number = 50000): void {
    if (!this.viewer || !this.Cesium) return;

    this.viewer.camera.lookAt(
      this.Cesium.Cartesian3.fromDegrees(longitude, latitude),
      new this.Cesium.HeadingPitchRange(
        this.Cesium.Math.toRadians(0),
        this.Cesium.Math.toRadians(-45),
        range
      )
    );
  }

  /**
   * Unlocks the camera from a lookAt target
   */
  unlockLookAt(): void {
    if (!this.viewer) return;
    this.viewer.camera.lookAtTransform(this.Cesium.Matrix4.IDENTITY);
  }

  /**
   * Destroys the controller and cleans up resources
   */
  destroy(): void {
    this.disableKeyboardNavigation();
    this.cameraChangeCallbacks.clear();
  }
}

export default CameraController;
