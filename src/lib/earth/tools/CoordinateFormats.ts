/**
 * @fileoverview Coordinate Formats - DD, DMS, UTM, MGRS Converters
 * 
 * This module provides coordinate conversion utilities for transforming
 * between different coordinate formats used in geospatial applications.
 * 
 * @module tools/CoordinateFormats
 * @author Earth Explorer Team
 * @version 1.0.0
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Decimal Degrees coordinate
 */
export interface DecimalDegrees {
  latitude: number;
  longitude: number;
  altitude?: number;
}

/**
 * Degrees Minutes Seconds coordinate
 */
export interface DegreesMinutesSeconds {
  latitude: {
    degrees: number;
    minutes: number;
    seconds: number;
    hemisphere: 'N' | 'S';
  };
  longitude: {
    degrees: number;
    minutes: number;
    seconds: number;
    hemisphere: 'E' | 'W';
  };
  altitude?: number;
}

/**
 * UTM coordinate
 */
export interface UTMCoordinate {
  zone: number;
  hemisphere: 'N' | 'S';
  easting: number;
  northing: number;
  altitude?: number;
}

/**
 * MGRS coordinate
 */
export interface MGRSCoordinate {
  zone: string;
  square: string;
  easting: number;
  northing: number;
  precision: number;
}

/**
 * All coordinate formats for a position
 */
export interface AllCoordinateFormats {
  dd: DecimalDegrees;
  dms: DegreesMinutesSeconds;
  utm: UTMCoordinate;
  mgrs: MGRSCoordinate;
}

/**
 * CoordinateFormats class - Coordinate conversion utilities
 */
export class CoordinateFormats {
  /**
   * Converts decimal degrees to DMS format
   * @param dd - Decimal degrees coordinate
   * @returns DMS coordinate
   */
  static ddToDms(dd: DecimalDegrees): DegreesMinutesSeconds {
    return {
      latitude: this.decimalToDms(dd.latitude, 'latitude'),
      longitude: this.decimalToDms(dd.longitude, 'longitude'),
      altitude: dd.altitude,
    };
  }

  /**
   * Converts a single decimal degree value to DMS
   * @private
   */
  private static decimalToDms(
    decimal: number,
    type: 'latitude' | 'longitude'
  ): { degrees: number; minutes: number; seconds: number; hemisphere: 'N' | 'S' | 'E' | 'W' } {
    const absolute = Math.abs(decimal);
    const degrees = Math.floor(absolute);
    const minutesFloat = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = Math.round((minutesFloat - minutes) * 60 * 100) / 100;

    let hemisphere: 'N' | 'S' | 'E' | 'W';
    if (type === 'latitude') {
      hemisphere = decimal >= 0 ? 'N' : 'S';
    } else {
      hemisphere = decimal >= 0 ? 'E' : 'W';
    }

    return { degrees, minutes, seconds, hemisphere };
  }

  /**
   * Converts DMS to decimal degrees
   * @param dms - DMS coordinate
   * @returns Decimal degrees coordinate
   */
  static dmsToDd(dms: DegreesMinutesSeconds): DecimalDegrees {
    const lat = this.dmsToDecimal(
      dms.latitude.degrees,
      dms.latitude.minutes,
      dms.latitude.seconds,
      dms.latitude.hemisphere
    );
    const lon = this.dmsToDecimal(
      dms.longitude.degrees,
      dms.longitude.minutes,
      dms.longitude.seconds,
      dms.longitude.hemisphere
    );

    return {
      latitude: lat,
      longitude: lon,
      altitude: dms.altitude,
    };
  }

  /**
   * Converts DMS components to decimal
   * @private
   */
  private static dmsToDecimal(
    degrees: number,
    minutes: number,
    seconds: number,
    hemisphere: 'N' | 'S' | 'E' | 'W'
  ): number {
    let decimal = degrees + minutes / 60 + seconds / 3600;
    if (hemisphere === 'S' || hemisphere === 'W') {
      decimal = -decimal;
    }
    return decimal;
  }

  /**
   * Converts decimal degrees to UTM
   * @param dd - Decimal degrees coordinate
   * @returns UTM coordinate
   */
  static ddToUtm(dd: DecimalDegrees): UTMCoordinate {
    const { latitude, longitude } = dd;
    
    // Calculate UTM zone
    let zone = Math.floor((longitude + 180) / 6) + 1;
    
    // Special zones for Norway and Svalbard
    if (latitude >= 56 && latitude < 64 && longitude >= 3 && longitude < 12) {
      zone = 32;
    }
    if (latitude >= 72 && latitude <= 84 && longitude >= 0 && longitude < 42) {
      if (longitude >= 0 && longitude < 9) zone = 31;
      else if (longitude >= 9 && longitude < 21) zone = 33;
      else if (longitude >= 21 && longitude < 33) zone = 35;
      else if (longitude >= 33 && longitude < 42) zone = 37;
    }

    const hemisphere: 'N' | 'S' = latitude >= 0 ? 'N' : 'S';
    const latRad = (latitude * Math.PI) / 180;
    const lonRad = (longitude * Math.PI) / 180;
    
    // UTM parameters (WGS84)
    const a = 6378137.0; // Semi-major axis
    const f = 1 / 298.257223563; // Flattening
    const k0 = 0.9996; // Scale factor
    const e = Math.sqrt(2 * f - f * f);
    
    const e2 = e * e;
    const e4 = e2 * e2;
    const e6 = e4 * e2;
    const ep2 = e2 / (1 - e2);
    
    // Calculate meridional arc
    const n = a / Math.sqrt(1 - e2 * Math.sin(latRad) ** 2);
    const t = Math.tan(latRad) ** 2;
    const c = ep2 * Math.cos(latRad) ** 2;
    const A = (lonRad - ((zone - 1) * 6 - 183) * Math.PI / 180) * Math.cos(latRad);
    
    const M = a * (
      (1 - e2 / 4 - 3 * e4 / 64 - 5 * e6 / 256) * latRad -
      (3 * e2 / 8 + 3 * e4 / 32 + 45 * e6 / 1024) * Math.sin(2 * latRad) +
      (15 * e4 / 256 + 45 * e6 / 1024) * Math.sin(4 * latRad) -
      (35 * e6 / 3072) * Math.sin(6 * latRad)
    );
    
    // Calculate easting and northing
    let easting = k0 * n * (
      A + 
      (1 - t + c) * A ** 3 / 6 + 
      (5 - 18 * t + t ** 2 + 72 * c - 58 * ep2) * A ** 5 / 120
    ) + 500000;
    
    let northing = k0 * (
      M + n * Math.tan(latRad) * (
        A ** 2 / 2 +
        (5 - t + 9 * c + 4 * c ** 2) * A ** 4 / 24 +
        (61 - 58 * t + t ** 2 + 600 * c - 330 * ep2) * A ** 6 / 720
      )
    );
    
    if (latitude < 0) {
      northing += 10000000;
    }
    
    return {
      zone,
      hemisphere,
      easting: Math.round(easting * 100) / 100,
      northing: Math.round(northing * 100) / 100,
      altitude: dd.altitude,
    };
  }

  /**
   * Converts UTM to decimal degrees
   * @param utm - UTM coordinate
   * @returns Decimal degrees coordinate
   */
  static utmToDd(utm: UTMCoordinate): DecimalDegrees {
    // Simplified conversion (for display purposes)
    const { zone, hemisphere, easting, northing } = utm;
    
    const k0 = 0.9996;
    const a = 6378137.0;
    const f = 1 / 298.257223563;
    const e = Math.sqrt(2 * f - f * f);
    const e1 = (1 - Math.sqrt(1 - e * e)) / (1 + Math.sqrt(1 - e * e));
    
    const x = easting - 500000;
    let y = northing;
    if (hemisphere === 'S') {
      y -= 10000000;
    }
    
    const zoneCentralMeridian = (zone - 1) * 6 - 180 + 3;
    
    const M = y / k0;
    const mu = M / (a * (1 - e * e / 4 - 3 * e ** 4 / 64 - 5 * e ** 6 / 256));
    
    const phi1 = mu +
      (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * mu) +
      (21 * e1 ** 2 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * mu) +
      (151 * e1 ** 3 / 96) * Math.sin(6 * mu);
    
    const e2 = e * e / (1 - e * e);
    const N1 = a / Math.sqrt(1 - e * e * Math.sin(phi1) ** 2);
    const T1 = Math.tan(phi1) ** 2;
    const C1 = e2 * Math.cos(phi1) ** 2;
    const R1 = a * (1 - e * e) / (1 - e * e * Math.sin(phi1) ** 2) ** 1.5;
    const D = x / (N1 * k0);
    
    const latitude = (phi1 * 180 / Math.PI) - (
      N1 * Math.tan(phi1) / R1 * (
        D ** 2 / 2 -
        (5 + 3 * T1 + 10 * C1 - 4 * C1 ** 2 - 9 * e2) * D ** 4 / 24 +
        (61 + 90 * T1 + 298 * C1 + 45 * T1 ** 2 - 3 * C1 ** 2 - 252 * e2) * D ** 6 / 720
      )
    ) * 180 / Math.PI;
    
    const longitude = zoneCentralMeridian + (
      D -
      (1 + 2 * T1 + C1) * D ** 3 / 6 +
      (5 - 2 * C1 + 28 * T1 - 3 * C1 ** 2 + 8 * e2 + 24 * T1 ** 2) * D ** 5 / 120
    ) * 180 / Math.PI / Math.cos(phi1);
    
    return {
      latitude: Math.round(latitude * 1000000) / 1000000,
      longitude: Math.round(longitude * 1000000) / 1000000,
      altitude: utm.altitude,
    };
  }

  /**
   * Converts decimal degrees to MGRS
   * Simplified implementation for display purposes
   * @param dd - Decimal degrees coordinate
   * @returns MGRS coordinate
   */
  static ddToMgrs(dd: DecimalDegrees): MGRSCoordinate {
    const utm = this.ddToUtm(dd);
    
    // Simplified MGRS conversion
    const zone = `${utm.zone}${utm.hemisphere}`;
    
    // Calculate 100km square identifier (simplified)
    const e100km = Math.floor(utm.easting / 100000);
    const n100km = Math.floor(utm.northing / 100000) % 20;
    
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const col = letters[(utm.zone - 1) % 3 * 8 + e100km - 1];
    const row = letters[n100km];
    
    const square = `${col}${row}`;
    
    const easting = Math.round(utm.easting % 100000);
    const northing = Math.round(utm.northing % 100000);
    
    return {
      zone,
      square,
      easting,
      northing,
      precision: 5,
    };
  }

  /**
   * Formats a DMS coordinate as a string
   * @param dms - DMS coordinate
   * @returns Formatted string
   */
  static formatDms(dms: DegreesMinutesSeconds): string {
    const lat = dms.latitude;
    const lon = dms.longitude;
    return `${lat.degrees}°${lat.minutes}'${lat.seconds.toFixed(2)}"${lat.hemisphere} ${lon.degrees}°${lon.minutes}'${lon.seconds.toFixed(2)}"${lon.hemisphere}`;
  }

  /**
   * Formats a UTM coordinate as a string
   * @param utm - UTM coordinate
   * @returns Formatted string
   */
  static formatUtm(utm: UTMCoordinate): string {
    return `${utm.zone}${utm.hemisphere} ${utm.easting.toFixed(0)}mE ${utm.northing.toFixed(0)}mN`;
  }

  /**
   * Formats an MGRS coordinate as a string
   * @param mgrs - MGRS coordinate
   * @returns Formatted string
   */
  static formatMgrs(mgrs: MGRSCoordinate): string {
    const pad = (n: number, len: number) => n.toString().padStart(len, '0');
    return `${mgrs.zone} ${mgrs.square} ${pad(mgrs.easting, 5)} ${pad(mgrs.northing, 5)}`;
  }

  /**
   * Converts decimal degrees to all formats
   * @param dd - Decimal degrees coordinate
   * @returns All coordinate formats
   */
  static toAllFormats(dd: DecimalDegrees): AllCoordinateFormats {
    return {
      dd,
      dms: this.ddToDms(dd),
      utm: this.ddToUtm(dd),
      mgrs: this.ddToMgrs(dd),
    };
  }
}

export default CoordinateFormats;
