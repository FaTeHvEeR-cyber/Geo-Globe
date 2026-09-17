/**
 * @fileoverview Street View Manager - Mapillary Integration
 * 
 * This module provides street-level imagery integration using Mapillary API.
 * Features:
 * - Find nearby street-level imagery
 * - Generate street view links
 * - Open Google Street View as fallback
 * 
 * IMPORTANT: Mapillary requires an API token.
 * Get your free token at: https://www.mapillary.com/developer/api-documentation
 * 
 * @module streetview/StreetViewManager
 * @author Earth Explorer Team
 * @version 1.0.0
 */

import { API_KEYS, RATE_LIMITS } from '../config';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Street view image data
 */
export interface StreetViewImage {
  /** Image ID */
  id: string;
  /** Image URL */
  url: string;
  /** Thumbnail URL */
  thumbnailUrl: string;
  /** Latitude */
  latitude: number;
  /** Longitude */
  longitude: number;
  /** Camera heading in degrees */
  heading: number;
  /** Capture date */
  capturedAt: Date;
  /** Contributor username */
  contributor: string;
  /** Sequence ID */
  sequenceId?: string;
  /** Is panoramic */
  isPanoramic: boolean;
}

/**
 * Street view coverage data
 */
export interface StreetViewCoverage {
  /** Center latitude */
  latitude: number;
  /** Center longitude */
  longitude: number;
  /** Search radius in meters */
  radius: number;
  /** Total images found */
  totalImages: number;
  /** Images array */
  images: StreetViewImage[];
  /** Has coverage */
  hasCoverage: boolean;
}

/**
 * Street view options
 */
export interface StreetViewOptions {
  /** Search radius in meters */
  radius?: number;
  /** Maximum results */
  limit?: number;
  /** Filter by date range */
  fromDate?: Date;
  /** Filter by date range */
  toDate?: Date;
  /** Only panoramic images */
  panoramicOnly?: boolean;
}

/**
 * Street view callback
 */
export type StreetViewCallback = (coverage: StreetViewCoverage) => void;

// ============================================================================
// RATE LIMITER
// ============================================================================

class RateLimiter {
  private lastRequestTime: number = 0;
  private minInterval: number;

  constructor(minIntervalMs: number) {
    this.minInterval = minIntervalMs;
  }

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;

    if (elapsed < this.minInterval) {
      await new Promise((resolve) => setTimeout(resolve, this.minInterval - elapsed));
    }

    this.lastRequestTime = Date.now();
  }
}

// ============================================================================
// STREET VIEW MANAGER CLASS
// ============================================================================

/**
 * StreetViewManager class - Manages street-level imagery
 * 
 * Uses Mapillary API for street-level imagery.
 * Falls back to Google Street View links if Mapillary is unavailable.
 * 
 * @example
 * const streetView = new StreetViewManager();
 * const coverage = await streetView.getCoverage(40.7128, -74.0060);
 * if (coverage.hasCoverage) {
 *   streetView.openViewer(coverage.images[0]);
 * }
 */
export class StreetViewManager {
  private apiToken: string | null;
  private rateLimiter: RateLimiter;
  private cache: Map<string, { data: StreetViewCoverage; expires: number }> = new Map();
  private cacheTTL: number = 3600000; // 1 hour
  private callbacks: Set<StreetViewCallback> = new Set();
  private viewerOpen: boolean = false;

  constructor() {
    this.apiToken = API_KEYS.MAPILLARY || null;
    this.rateLimiter = new RateLimiter(RATE_LIMITS.MAPILLARY.minIntervalMs);
  }

  /**
   * Checks if Mapillary API is configured
   * @returns True if API token is available
   */
  isConfigured(): boolean {
    return !!this.apiToken;
  }

  /**
   * Sets the API token
   * @param token - Mapillary API token
   */
  setApiToken(token: string): void {
    this.apiToken = token;
    this.cache.clear();
  }

  /**
   * Gets street view coverage for a location
   * 
   * @param latitude - Location latitude
   * @param longitude - Location longitude
   * @param options - Search options
   * @returns Coverage data
   */
  async getCoverage(
    latitude: number,
    longitude: number,
    options: StreetViewOptions = {}
  ): Promise<StreetViewCoverage> {
    const { radius = 100, limit = 10 } = options;

    // Check cache
    const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)},${radius}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    // If no API token, return empty coverage but indicate Google Street View is available
    if (!this.apiToken) {
      return {
        latitude,
        longitude,
        radius,
        totalImages: 0,
        images: [],
        hasCoverage: false,
      };
    }

    await this.rateLimiter.waitForSlot();

    try {
      // Use Mapillary Graph API v4
      const bbox = this.calculateBbox(latitude, longitude, radius);
      
      const params = new URLSearchParams({
        fields: 'id,thumb_256_url,thumb_original_url,geometry,captured_at,creator,heading,is_pano',
        bbox: `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`,
        limit: limit.toString(),
      });

      const response = await fetch(
        `${RATE_LIMITS.MAPILLARY.baseUrl}/images?${params}`,
        {
          headers: {
            'Authorization': `OAuth ${this.apiToken}`,
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          console.error('Mapillary API token is invalid or expired');
          return this.createEmptyCoverage(latitude, longitude, radius);
        }
        throw new Error(`Mapillary API error: ${response.status}`);
      }

      const data = await response.json();
      const images = this.parseMapillaryImages(data.data || []);

      const coverage: StreetViewCoverage = {
        latitude,
        longitude,
        radius,
        totalImages: images.length,
        images,
        hasCoverage: images.length > 0,
      };

      // Cache result
      this.cache.set(cacheKey, { data: coverage, expires: Date.now() + this.cacheTTL });

      return coverage;
    } catch (error) {
      console.error('Failed to fetch street view coverage:', error);
      return this.createEmptyCoverage(latitude, longitude, radius);
    }
  }

  /**
   * Gets the nearest street view image to a location
   * 
   * @param latitude - Location latitude
   * @param longitude - Location longitude
   * @param radius - Search radius in meters
   * @returns Nearest image or null
   */
  async getNearestImage(
    latitude: number,
    longitude: number,
    radius: number = 100
  ): Promise<StreetViewImage | null> {
    const coverage = await this.getCoverage(latitude, longitude, { radius, limit: 1 });
    return coverage.images[0] || null;
  }

  /**
   * Opens the Mapillary viewer for an image
   * 
   * @param image - Street view image to open
   */
  openViewer(image: StreetViewImage): void {
    // Open Mapillary viewer in new tab
    const viewerUrl = `https://www.mapillary.com/app/?pKey=${image.id}&focus=photo`;
    window.open(viewerUrl, '_blank', 'noopener,noreferrer');
    this.viewerOpen = true;
  }

  /**
   * Opens Google Street View for a location
   * Fallback when Mapillary is unavailable
   * 
   * @param latitude - Location latitude
   * @param longitude - Location longitude
   */
  openGoogleStreetView(latitude: number, longitude: number): void {
    const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${latitude},${longitude}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  /**
   * Opens street view for a location (Mapillary or Google fallback)
   * 
   * @param latitude - Location latitude
   * @param longitude - Location longitude
   */
  async openStreetView(latitude: number, longitude: number): Promise<void> {
    if (this.apiToken) {
      const nearest = await this.getNearestImage(latitude, longitude, 500);
      if (nearest) {
        this.openViewer(nearest);
        return;
      }
    }

    // Fallback to Google Street View
    this.openGoogleStreetView(latitude, longitude);
  }

  /**
   * Gets a static street view thumbnail URL
   * 
   * @param latitude - Location latitude
   * @param longitude - Location longitude
   * @param width - Image width
   * @param height - Image height
   * @returns Thumbnail URL or null
   */
  async getThumbnailUrl(
    latitude: number,
    longitude: number,
    width: number = 256,
    height: number = 256
  ): Promise<string | null> {
    if (!this.apiToken) {
      return null;
    }

    const nearest = await this.getNearestImage(latitude, longitude, 100);
    if (nearest) {
      return nearest.thumbnailUrl;
    }

    return null;
  }

  /**
   * Checks if street view is available for a location
   * 
   * @param latitude - Location latitude
   * @param longitude - Location longitude
   * @param radius - Search radius in meters
   * @returns True if coverage exists
   */
  async hasCoverage(latitude: number, longitude: number, radius: number = 100): Promise<boolean> {
    const coverage = await this.getCoverage(latitude, longitude, { radius, limit: 1 });
    return coverage.hasCoverage;
  }

  /**
   * Calculates bounding box from center and radius
   * @private
   */
  private calculateBbox(
    latitude: number,
    longitude: number,
    radius: number
  ): { north: number; south: number; east: number; west: number } {
    const earthRadius = 6371000; // meters
    const latRad = (latitude * Math.PI) / 180;
    
    const latOffset = (radius / earthRadius) * (180 / Math.PI);
    const lonOffset = (radius / (earthRadius * Math.cos(latRad))) * (180 / Math.PI);

    return {
      north: latitude + latOffset,
      south: latitude - latOffset,
      east: longitude + lonOffset,
      west: longitude - lonOffset,
    };
  }

  /**
   * Parses Mapillary API response
   * @private
   */
  private parseMapillaryImages(data: any[]): StreetViewImage[] {
    return data.map((item) => {
      const geometry = item.geometry?.coordinates || [0, 0];
      
      return {
        id: item.id,
        url: item.thumb_original_url || '',
        thumbnailUrl: item.thumb_256_url || '',
        longitude: geometry[0],
        latitude: geometry[1],
        heading: item.heading || 0,
        capturedAt: item.captured_at ? new Date(item.captured_at) : new Date(),
        contributor: item.creator?.username || 'Unknown',
        sequenceId: item.sequence,
        isPanoramic: item.is_pano || false,
      };
    });
  }

  /**
   * Creates empty coverage result
   * @private
   */
  private createEmptyCoverage(latitude: number, longitude: number, radius: number): StreetViewCoverage {
    return {
      latitude,
      longitude,
      radius,
      totalImages: 0,
      images: [],
      hasCoverage: false,
    };
  }

  /**
   * Registers a callback for coverage updates
   * @param callback - Function to call on updates
   * @returns Unsubscribe function
   */
  onCoverage(callback: StreetViewCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Clears the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Checks if viewer is open
   * @returns True if viewer is open
   */
  isViewerOpen(): boolean {
    return this.viewerOpen;
  }

  /**
   * Destroys the manager
   */
  destroy(): void {
    this.cache.clear();
    this.callbacks.clear();
    this.viewerOpen = false;
  }
}

// Export singleton instance
export const streetViewManager = new StreetViewManager();

export default StreetViewManager;
