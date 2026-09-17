/**
 * @fileoverview Geo Search - Nominatim Geocoding with Autocomplete
 * 
 * This module provides location search functionality using the OpenStreetMap
 * Nominatim API for forward and reverse geocoding.
 * 
 * IMPORTANT: Nominatim has strict rate limits (1 request/second).
 * This module implements proper rate limiting and caching.
 * 
 * @module tools/GeoSearch
 * @author Earth Explorer Team
 * @version 1.0.0
 * 
 * @see https://operations.osmfoundation.org/policies/nominatim/
 */

import { GEOCODING_CONFIG, RATE_LIMITS } from '../config';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Search result from geocoding
 */
export interface SearchResult {
  /** Unique place ID */
  placeId: string;
  /** Short display name */
  name: string;
  /** Full display name with address */
  displayName: string;
  /** Latitude */
  latitude: number;
  /** Longitude */
  longitude: number;
  /** Result type (city, country, etc.) */
  type: string;
  /** Bounding box [south, north, west, east] */
  bbox?: [number, number, number, number];
  /** Additional tags */
  extra?: Record<string, string>;
}

/**
 * Reverse geocoding result
 */
export interface ReverseSearchResult {
  placeId: string;
  displayName: string;
  latitude: number;
  longitude: number;
  address?: {
    houseNumber?: string;
    road?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

/**
 * Search options
 */
export interface SearchOptions {
  /** Maximum results to return */
  limit?: number;
  /** Country code filter */
  countryCodes?: string[];
  /** Viewbox for biased results */
  viewbox?: [number, number, number, number];
  /** Exclude place ids */
  excludePlaceIds?: string[];
}

/**
 * Cache entry for response caching
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// ============================================================================
// RATE LIMITER CLASS
// ============================================================================

/**
 * Rate limiter to ensure we don't exceed API limits
 */
class RateLimiter {
  private lastRequestTime: number = 0;
  private minInterval: number;
  private pendingQueue: Array<() => void> = [];
  private isProcessing: boolean = false;

  constructor(minIntervalMs: number) {
    this.minInterval = minIntervalMs;
  }

  /**
   * Wait for rate limit before executing request
   */
  async waitForSlot(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;

    if (elapsed >= this.minInterval) {
      this.lastRequestTime = now;
      return;
    }

    // Need to wait
    const waitTime = this.minInterval - elapsed;
    
    return new Promise((resolve) => {
      this.pendingQueue.push(() => {
        this.lastRequestTime = Date.now();
        resolve();
      });

      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process queued requests
   */
  private processQueue(): void {
    if (this.pendingQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    const waitTime = Math.max(0, this.minInterval - elapsed);

    setTimeout(() => {
      const next = this.pendingQueue.shift();
      if (next) {
        this.lastRequestTime = Date.now();
        next();
      }
      this.processQueue();
    }, waitTime);
  }
}

// ============================================================================
// SIMPLE CACHE CLASS
// ============================================================================

/**
 * Simple in-memory cache for API responses
 */
class SimpleCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL: number;

  constructor(defaultTTLMs: number = 300000) { // 5 minutes default
    this.defaultTTL = defaultTTLMs;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + (ttl ?? this.defaultTTL),
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// ============================================================================
// GEOSEARCH CLASS
// ============================================================================

/**
 * GeoSearch class - Geocoding service client with rate limiting
 * 
 * Uses Nominatim (OpenStreetMap) which is FREE but rate-limited.
 * Rate limit: 1 request per second
 * 
 * @example
 * const search = new GeoSearch();
 * const results = await search.search('New York');
 */
export class GeoSearch {
  private baseUrl: string;
  private rateLimiter: RateLimiter;
  private cache: SimpleCache;
  private userAgent: string;

  /**
   * Creates a new GeoSearch instance
   */
  constructor() {
    this.baseUrl = GEOCODING_CONFIG.nominatimUrl;
    this.rateLimiter = new RateLimiter(RATE_LIMITS.NOMINATIM.minIntervalMs);
    this.cache = new SimpleCache(300000); // 5 minute cache
    this.userAgent = RATE_LIMITS.NOMINATIM.userAgent;
  }

  /**
   * Searches for a location by query string
   * @param query - Search query
   * @param options - Search options
   * @returns Array of search results
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    if (!query.trim()) {
      return [];
    }

    // Check cache first
    const cacheKey = `search:${query}:${JSON.stringify(options)}`;
    const cached = this.cache.get<SearchResult[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Wait for rate limit
    await this.rateLimiter.waitForSlot();

    const params = new URLSearchParams({
      format: 'json',
      q: query,
      limit: (options.limit ?? GEOCODING_CONFIG.maxResults).toString(),
      addressdetails: '1',
    });

    if (options.countryCodes?.length) {
      params.set('countrycodes', options.countryCodes.join(','));
    }

    if (options.viewbox) {
      params.set('viewbox', options.viewbox.join(','));
      params.set('bounded', '1');
    }

    if (options.excludePlaceIds?.length) {
      params.set('exclude_place_ids', options.excludePlaceIds.join(','));
    }

    try {
      const response = await fetch(`${this.baseUrl}${GEOCODING_CONFIG.searchEndpoint}?${params}`, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        // Handle rate limit response
        if (response.status === 429) {
          console.warn('Nominatim rate limit exceeded. Please try again later.');
          return [];
        }
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      const results = this.parseSearchResults(data);

      // Cache results
      this.cache.set(cacheKey, results);

      return results;
    } catch (error) {
      console.error('Geocoding search failed:', error);
      return [];
    }
  }

  /**
   * Reverse geocodes a coordinate to an address
   * @param latitude - Latitude
   * @param longitude - Longitude
   * @returns Reverse search result or null
   */
  async reverse(latitude: number, longitude: number): Promise<ReverseSearchResult | null> {
    // Check cache
    const cacheKey = `reverse:${latitude.toFixed(4)}:${longitude.toFixed(4)}`;
    const cached = this.cache.get<ReverseSearchResult>(cacheKey);
    if (cached) {
      return cached;
    }

    // Wait for rate limit
    await this.rateLimiter.waitForSlot();

    const params = new URLSearchParams({
      format: 'json',
      lat: latitude.toString(),
      lon: longitude.toString(),
      addressdetails: '1',
      zoom: '18',
    });

    try {
      const response = await fetch(`${this.baseUrl}${GEOCODING_CONFIG.reverseEndpoint}?${params}`, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.warn('Nominatim rate limit exceeded. Please try again later.');
          return null;
        }
        throw new Error(`Reverse search failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data || data.error) {
        return null;
      }

      const result = this.parseReverseResult(data);

      // Cache result
      if (result) {
        this.cache.set(cacheKey, result);
      }

      return result;
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return null;
    }
  }

  /**
   * Gets suggestions for autocomplete input
   * Implements debouncing to reduce API calls
   * 
   * @param query - Partial query string
   * @param options - Search options
   * @returns Array of suggestion strings
   */
  async getSuggestions(query: string, options: SearchOptions = {}): Promise<string[]> {
    // Only search if query is at least 3 characters
    if (query.length < 3) {
      return [];
    }

    const results = await this.search(query, { ...options, limit: 5 });
    return results.map((r) => r.name);
  }

  /**
   * Parses raw search results from Nominatim
   * @private
   */
  private parseSearchResults(data: any[]): SearchResult[] {
    return data.map((item) => ({
      placeId: item.place_id?.toString() ?? '',
      name: this.extractShortName(item),
      displayName: item.display_name ?? '',
      latitude: parseFloat(item.lat) ?? 0,
      longitude: parseFloat(item.lon) ?? 0,
      type: item.type ?? item.addresstype ?? 'unknown',
      bbox: item.boundingbox
        ? [
            parseFloat(item.boundingbox[0]),
            parseFloat(item.boundingbox[1]),
            parseFloat(item.boundingbox[2]),
            parseFloat(item.boundingbox[3]),
          ]
        : undefined,
      extra: {
        osmType: item.osm_type,
        osmId: item.osm_id?.toString(),
        class: item.class,
        importance: item.importance?.toString(),
      },
    }));
  }

  /**
   * Parses a reverse geocoding result
   * @private
   */
  private parseReverseResult(data: any): ReverseSearchResult {
    return {
      placeId: data.place_id?.toString() ?? '',
      displayName: data.display_name ?? '',
      latitude: parseFloat(data.lat) ?? 0,
      longitude: parseFloat(data.lon) ?? 0,
      address: data.address
        ? {
            houseNumber: data.address.house_number,
            road: data.address.road,
            city: data.address.city ?? data.address.town ?? data.address.village,
            state: data.address.state,
            country: data.address.country,
            postcode: data.address.postcode,
          }
        : undefined,
    };
  }

  /**
   * Extracts a short name from Nominatim result
   * @private
   */
  private extractShortName(item: any): string {
    if (item.namedetails?.name) {
      return item.namedetails.name;
    }
    
    const parts = item.display_name?.split(',') ?? [];
    return parts[0]?.trim() ?? 'Unknown';
  }

  /**
   * Clears the cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance with proper rate limiting
export const geoSearch = new GeoSearch();

export default GeoSearch;
