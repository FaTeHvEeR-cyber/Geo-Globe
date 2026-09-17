/**
 * @fileoverview Screen Capture - Screenshot Utility
 * 
 * This module provides functionality for capturing screenshots of the
 * 3D globe viewer and downloading them as image files.
 * 
 * @module ui/ScreenCapture
 * @author Earth Explorer Team
 * @version 1.0.0
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Screenshot options
 */
export interface ScreenshotOptions {
  /** Output file name (without extension) */
  filename?: string;
  /** Image format */
  format?: 'png' | 'jpeg' | 'webp';
  /** Image quality (for jpeg/webp, 0-1) */
  quality?: number;
  /** Include watermark */
  watermark?: boolean;
  /** Custom watermark text */
  watermarkText?: string;
}

/**
 * Screenshot result
 */
export interface ScreenshotResult {
  /** Data URL of the image */
  dataUrl: string;
  /** File name */
  filename: string;
  /** Image width */
  width: number;
  /** Image height */
  height: number;
  /** File size in bytes (approximate) */
  size: number;
}

/**
 * ScreenCapture class - Screenshot capture utility
 */
export class ScreenCapture {
  private viewer: any;

  /**
   * Creates a new ScreenCapture instance
   * @param viewer - The Cesium viewer instance
   */
  constructor(viewer: any) {
    this.viewer = viewer;
  }

  /**
   * Captures a screenshot of the current view
   * @param options - Screenshot options
   * @returns Promise resolving to screenshot result
   */
  async capture(options: ScreenshotOptions = {}): Promise<ScreenshotResult | null> {
    if (!this.viewer) {
      console.error('Viewer not available');
      return null;
    }

    try {
      // Render current frame
      this.viewer.render();

      // Get canvas
      const canvas = this.viewer.canvas as HTMLCanvasElement;

      // Generate filename
      const filename = options.filename ?? `earth-explorer-${Date.now()}`;

      // Convert to data URL
      const format = options.format ?? 'png';
      const mimeType = `image/${format}`;
      const quality = options.quality ?? 0.92;

      let dataUrl: string;

      if (options.watermark) {
        dataUrl = this.addWatermark(canvas, options.watermarkText ?? 'Earth Explorer', format, quality);
      } else {
        dataUrl = canvas.toDataURL(mimeType, quality);
      }

      // Calculate approximate size
      const size = Math.round((dataUrl.length * 3) / 4);

      return {
        dataUrl,
        filename: `${filename}.${format}`,
        width: canvas.width,
        height: canvas.height,
        size,
      };
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      return null;
    }
  }

  /**
   * Captures and downloads a screenshot
   * @param options - Screenshot options
   * @returns Promise resolving to true if successful
   */
  async captureAndDownload(options: ScreenshotOptions = {}): Promise<boolean> {
    const result = await this.capture(options);

    if (!result) {
      return false;
    }

    try {
      // Create download link
      const link = document.createElement('a');
      link.download = result.filename;
      link.href = result.dataUrl;
      link.click();

      return true;
    } catch (error) {
      console.error('Screenshot download failed:', error);
      return false;
    }
  }

  /**
   * Adds a watermark to the image
   * @private
   */
  private addWatermark(
    canvas: HTMLCanvasElement,
    text: string,
    format: string,
    quality: number
  ): string {
    // Create a new canvas for the watermarked image
    const watermarkedCanvas = document.createElement('canvas');
    watermarkedCanvas.width = canvas.width;
    watermarkedCanvas.height = canvas.height;

    const ctx = watermarkedCanvas.getContext('2d');
    if (!ctx) {
      return canvas.toDataURL(`image/${format}`, quality);
    }

    // Draw original image
    ctx.drawImage(canvas, 0, 0);

    // Add watermark
    ctx.font = '16px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 2;

    const padding = 10;
    const textWidth = ctx.measureText(text).width;

    // Position in bottom-right corner
    const x = watermarkedCanvas.width - textWidth - padding;
    const y = watermarkedCanvas.height - padding;

    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);

    return watermarkedCanvas.toDataURL(`image/${format}`, quality);
  }

  /**
   * Gets the canvas as a Blob
   * @param options - Screenshot options
   * @returns Promise resolving to Blob or null
   */
  async getBlob(options: ScreenshotOptions = {}): Promise<Blob | null> {
    const result = await this.capture(options);

    if (!result) {
      return null;
    }

    return new Promise((resolve) => {
      fetch(result.dataUrl)
        .then((res) => res.blob())
        .then(resolve)
        .catch(() => resolve(null));
    });
  }

  /**
   * Copies the screenshot to clipboard
   * @returns Promise resolving to true if successful
   */
  async copyToClipboard(): Promise<boolean> {
    try {
      const blob = await this.getBlob({ format: 'png' });

      if (!blob) {
        return false;
      }

      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);

      return true;
    } catch (error) {
      console.error('Copy to clipboard failed:', error);
      return false;
    }
  }

  /**
   * Destroys the capture utility
   */
  destroy(): void {
    this.viewer = null;
  }
}

export default ScreenCapture;
