/**
 * @fileoverview Time Controller - Time Slider, Play/Pause, Speed Control
 * 
 * This module manages the simulation time for day/night cycle visualization,
 * including time animation, speed control, and time-based effects.
 * 
 * @module time/TimeController
 * @author Earth Explorer Team
 * @version 1.0.0
 */

import { TIME_CONFIG } from '../config';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Time controller configuration
 */
export interface TimeControllerConfig {
  /** Current simulation time */
  currentTime: Date;
  /** Animation playing state */
  playing: boolean;
  /** Animation speed (seconds per second) */
  speed: number;
  /** Minimum speed multiplier */
  minSpeed: number;
  /** Maximum speed multiplier */
  maxSpeed: number;
}

/**
 * Time change event
 */
export interface TimeChangeEvent {
  time: Date;
  playing: boolean;
  speed: number;
}

/**
 * TimeController class - Manages simulation time
 */
export class TimeController {
  private viewer: any;
  private Cesium: any;
  private config: TimeControllerConfig;
  private animationFrame: number | null = null;
  private lastFrameTime: number = 0;
  private changeCallbacks: Set<(event: TimeChangeEvent) => void> = new Set();

  /**
   * Creates a new TimeController
   * @param viewer - The Cesium viewer instance
   * @param Cesium - The Cesium namespace
   */
  constructor(viewer: any, Cesium: any) {
    this.viewer = viewer;
    this.Cesium = Cesium;
    this.config = {
      currentTime: new Date(),
      playing: false,
      speed: TIME_CONFIG.defaultSpeed,
      minSpeed: TIME_CONFIG.minSpeed,
      maxSpeed: TIME_CONFIG.maxSpeed,
    };
  }

  /**
   * Sets the current simulation time
   * @param time - The time to set
   */
  setTime(time: Date): void {
    this.config.currentTime = time;
    this.updateViewerTime();
    this.emitChange();
  }

  /**
   * Gets the current simulation time
   * @returns Current time
   */
  getTime(): Date {
    return new Date(this.config.currentTime);
  }

  /**
   * Starts time animation
   */
  play(): void {
    if (this.config.playing) return;

    this.config.playing = true;
    this.lastFrameTime = performance.now();
    this.startAnimation();
    this.emitChange();
  }

  /**
   * Pauses time animation
   */
  pause(): void {
    if (!this.config.playing) return;

    this.config.playing = false;
    this.stopAnimation();
    this.emitChange();
  }

  /**
   * Toggles play/pause
   */
  toggle(): void {
    if (this.config.playing) {
      this.pause();
    } else {
      this.play();
    }
  }

  /**
   * Sets the animation speed
   * @param speed - Speed multiplier
   */
  setSpeed(speed: number): void {
    this.config.speed = Math.max(
      this.config.minSpeed,
      Math.min(this.config.maxSpeed, speed)
    );
    this.emitChange();
  }

  /**
   * Gets the current animation speed
   * @returns Speed multiplier
   */
  getSpeed(): number {
    return this.config.speed;
  }

  /**
   * Increases the speed by a factor
   * @param factor - Multiplier factor (default: 10)
   */
  increaseSpeed(factor: number = 10): void {
    this.setSpeed(this.config.speed * factor);
  }

  /**
   * Decreases the speed by a factor
   * @param factor - Divisor factor (default: 10)
   */
  decreaseSpeed(factor: number = 10): void {
    this.setSpeed(this.config.speed / factor);
  }

  /**
   * Sets the time to now
   */
  setToNow(): void {
    this.setTime(new Date());
  }

  /**
   * Sets the time to a specific hour today
   * @param hour - Hour (0-23)
   * @param minute - Minute (0-59)
   */
  setToHour(hour: number, minute: number = 0): void {
    const time = new Date(this.config.currentTime);
    time.setHours(hour, minute, 0, 0);
    this.setTime(time);
  }

  /**
   * Advances time by a specified amount
   * @param hours - Hours to advance
   * @param minutes - Minutes to advance
   */
  advanceTime(hours: number = 0, minutes: number = 0): void {
    const time = new Date(this.config.currentTime);
    time.setHours(time.getHours() + hours, time.getMinutes() + minutes);
    this.setTime(time);
  }

  /**
   * Gets the configuration
   * @returns Current configuration
   */
  getConfig(): TimeControllerConfig {
    return { ...this.config };
  }

  /**
   * Checks if animation is playing
   * @returns True if playing
   */
  isPlaying(): boolean {
    return this.config.playing;
  }

  /**
   * Starts the animation loop
   * @private
   */
  private startAnimation(): void {
    const animate = () => {
      if (!this.config.playing) {
        this.animationFrame = null;
        return;
      }

      const now = performance.now();
      const elapsed = (now - this.lastFrameTime) / 1000; // seconds
      this.lastFrameTime = now;

      // Advance time by speed * elapsed seconds
      const newTime = new Date(
        this.config.currentTime.getTime() + this.config.speed * elapsed * 1000
      );
      this.config.currentTime = newTime;
      this.updateViewerTime();

      this.animationFrame = requestAnimationFrame(animate);
    };

    this.animationFrame = requestAnimationFrame(animate);
  }

  /**
   * Stops the animation loop
   * @private
   */
  private stopAnimation(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  /**
   * Updates the viewer's clock time
   * @private
   */
  private updateViewerTime(): void {
    if (!this.viewer || !this.Cesium) return;

    const julianDate = this.Cesium.JulianDate.fromDate(this.config.currentTime);
    this.viewer.clock.currentTime = julianDate;
  }

  /**
   * Registers a callback for time changes
   * @param callback - Function to call on changes
   * @returns Unsubscribe function
   */
  onTimeChange(callback: (event: TimeChangeEvent) => void): () => void {
    this.changeCallbacks.add(callback);
    return () => this.changeCallbacks.delete(callback);
  }

  /**
   * Emits a time change event
   * @private
   */
  private emitChange(): void {
    const event: TimeChangeEvent = {
      time: new Date(this.config.currentTime),
      playing: this.config.playing,
      speed: this.config.speed,
    };
    this.changeCallbacks.forEach((callback) => callback(event));
  }

  /**
   * Formats time for display
   * @param time - Time to format
   * @returns Formatted string
   */
  static formatTime(time: Date): string {
    return time.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  /**
   * Formats date for display
   * @param time - Time to format
   * @returns Formatted string
   */
  static formatDate(time: Date): string {
    return time.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  /**
   * Destroys the controller and cleans up
   */
  destroy(): void {
    this.stopAnimation();
    this.changeCallbacks.clear();
  }
}

export default TimeController;
