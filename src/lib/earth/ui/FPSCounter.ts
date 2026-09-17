/**
 * @fileoverview FPS Counter - Performance Monitor
 * 
 * This module provides real-time FPS (frames per second) monitoring
 * for the 3D globe viewer.
 * 
 * @module ui/FPSCounter
 * @author Earth Explorer Team
 * @version 1.0.0
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Performance statistics
 */
export interface PerformanceStats {
  /** Current FPS */
  fps: number;
  /** Average FPS over the last N frames */
  avgFps: number;
  /** Minimum FPS recorded */
  minFps: number;
  /** Maximum FPS recorded */
  maxFps: number;
  /** Frame time in milliseconds */
  frameTime: number;
  /** Memory usage (if available) */
  memory?: number;
}

/**
 * FPS update callback
 */
export type FPSUpdateCallback = (stats: PerformanceStats) => void;

/**
 * FPSCounter class - Performance monitoring utility
 */
export class FPSCounter {
  private viewer: any;
  private enabled: boolean = false;
  private animationFrame: number | null = null;

  // Timing data
  private lastTime: number = 0;
  private frameCount: number = 0;
  private fps: number = 0;

  // Statistics tracking
  private fpsHistory: number[] = [];
  private maxHistoryLength: number = 60;
  private minFps: number = Infinity;
  private maxFps: number = 0;

  // Callbacks
  private callbacks: Set<FPSUpdateCallback> = new Set();

  /**
   * Creates a new FPSCounter
   * @param viewer - The Cesium viewer instance
   */
  constructor(viewer: any) {
    this.viewer = viewer;
  }

  /**
   * Starts the FPS counter
   */
  start(): void {
    if (this.enabled) return;

    this.enabled = true;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.update();
  }

  /**
   * Stops the FPS counter
   */
  stop(): void {
    this.enabled = false;

    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  /**
   * Resets the statistics
   */
  reset(): void {
    this.fps = 0;
    this.frameCount = 0;
    this.fpsHistory = [];
    this.minFps = Infinity;
    this.maxFps = 0;
    this.lastTime = performance.now();
  }

  /**
   * Gets the current performance statistics
   * @returns Performance statistics
   */
  getStats(): PerformanceStats {
    const avgFps = this.fpsHistory.length > 0
      ? this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
      : 0;

    const stats: PerformanceStats = {
      fps: this.fps,
      avgFps: Math.round(avgFps * 10) / 10,
      minFps: this.minFps === Infinity ? 0 : this.minFps,
      maxFps: this.maxFps,
      frameTime: this.fps > 0 ? 1000 / this.fps : 0,
    };

    // Add memory if available (Chrome only)
    if ((performance as any).memory) {
      stats.memory = (performance as any).memory.usedJSHeapSize / (1024 * 1024);
    }

    return stats;
  }

  /**
   * Gets the current FPS
   * @returns Current FPS
   */
  getFPS(): number {
    return this.fps;
  }

  /**
   * Registers a callback for FPS updates
   * @param callback - Function to call on updates
   * @returns Unsubscribe function
   */
  onUpdate(callback: FPSUpdateCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Checks if the counter is running
   * @returns True if running
   */
  isRunning(): boolean {
    return this.enabled;
  }

  /**
   * Update loop
   * @private
   */
  private update(): void {
    if (!this.enabled) return;

    const now = performance.now();
    this.frameCount++;

    // Calculate FPS every second
    if (now - this.lastTime >= 1000) {
      this.fps = Math.round(this.frameCount * 1000 / (now - this.lastTime));
      this.frameCount = 0;
      this.lastTime = now;

      // Update statistics
      this.fpsHistory.push(this.fps);
      if (this.fpsHistory.length > this.maxHistoryLength) {
        this.fpsHistory.shift();
      }

      if (this.fps > 0) {
        this.minFps = Math.min(this.minFps, this.fps);
        this.maxFps = Math.max(this.maxFps, this.fps);
      }

      // Emit update
      this.emitUpdate();
    }

    this.animationFrame = requestAnimationFrame(() => this.update());
  }

  /**
   * Emits an update to all callbacks
   * @private
   */
  private emitUpdate(): void {
    const stats = this.getStats();
    this.callbacks.forEach((callback) => callback(stats));
  }

  /**
   * Sets the maximum history length for averaging
   * @param length - Number of frames to average
   */
  setMaxHistoryLength(length: number): void {
    this.maxHistoryLength = Math.max(1, length);
    while (this.fpsHistory.length > this.maxHistoryLength) {
      this.fpsHistory.shift();
    }
  }

  /**
   * Destroys the counter
   */
  destroy(): void {
    this.stop();
    this.callbacks.clear();
    this.viewer = null;
  }
}

export default FPSCounter;
