/**
 * @fileoverview Measure Tools - Distance & Area Measurement
 * 
 * This module provides measurement tools for calculating distances and areas
 * on the Earth's surface using geodesic calculations.
 * 
 * @module tools/MeasureTools
 * @author Earth Explorer Team
 * @version 1.0.0
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Measurement tool types
 */
export type MeasurementTool = 'none' | 'distance' | 'area';

/**
 * Coordinate point for measurement
 */
export interface MeasurePoint {
  latitude: number;
  longitude: number;
  altitude?: number;
}

/**
 * Measurement result
 */
export interface MeasurementResult {
  /** Tool type used */
  tool: MeasurementTool;
  /** Measurement points */
  points: MeasurePoint[];
  /** Total distance in kilometers */
  distance: number;
  /** Total area in square kilometers */
  area: number;
  /** Perimeter length in kilometers */
  perimeter: number;
  /** Unit of measurement */
  unit: 'km' | 'm' | 'mi' | 'ft';
}

/**
 * Measurement event callback
 */
export type MeasurementCallback = (result: MeasurementResult) => void;

/**
 * MeasureTools class - Distance and area measurement utilities
 */
export class MeasureTools {
  private viewer: any;
  private Cesium: any;
  private activeTool: MeasurementTool = 'none';
  private points: MeasurePoint[] = [];
  private entityIds: string[] = [];
  private totalDistance: number = 0;
  private totalArea: number = 0;
  private callbacks: Set<MeasurementCallback> = new Set();

  /**
   * Earth's radius in kilometers
   */
  private static readonly EARTH_RADIUS_KM = 6371.0;

  /**
   * Creates a new MeasureTools instance
   * @param viewer - The Cesium viewer instance
   * @param Cesium - The Cesium namespace
   */
  constructor(viewer: any, Cesium: any) {
    this.viewer = viewer;
    this.Cesium = Cesium;
  }

  /**
   * Sets the active measurement tool
   * @param tool - The tool to activate
   */
  setTool(tool: MeasurementTool): void {
    if (this.activeTool !== 'none' && tool !== this.activeTool) {
      this.clear();
    }
    this.activeTool = tool;
  }

  /**
   * Gets the active measurement tool
   * @returns Current tool
   */
  getTool(): MeasurementTool {
    return this.activeTool;
  }

  /**
   * Adds a measurement point
   * @param point - The point to add
   */
  addPoint(point: MeasurePoint): void {
    if (this.activeTool === 'none') return;

    this.points.push(point);
    this.updateMeasurements();
    this.addVisualEntity(point);
    this.emitResult();
  }

  /**
   * Adds a visual entity for the point
   * @private
   */
  private addVisualEntity(point: MeasurePoint): void {
    if (!this.viewer || !this.Cesium) return;

    const position = this.Cesium.Cartesian3.fromDegrees(
      point.longitude,
      point.latitude,
      point.altitude ?? 0
    );

    // Add point marker
    const pointEntity = this.viewer.entities.add({
      position,
      point: {
        pixelSize: 10,
        color: this.Cesium.Color.YELLOW,
        outlineColor: this.Cesium.Color.BLACK,
        outlineWidth: 2,
        heightReference: this.Cesium.HeightReference.CLAMP_TO_GROUND,
      },
    });

    this.entityIds.push(pointEntity.id);

    // Add line for distance measurement
    if (this.activeTool === 'distance' && this.points.length > 1) {
      const prevPoint = this.points[this.points.length - 2];
      const prevPosition = this.Cesium.Cartesian3.fromDegrees(
        prevPoint.longitude,
        prevPoint.latitude
      );

      const lineEntity = this.viewer.entities.add({
        polyline: {
          positions: [prevPosition, position],
          width: 3,
          material: new this.Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.2,
            color: this.Cesium.Color.YELLOW,
          }),
          clampToGround: true,
        },
      });

      this.entityIds.push(lineEntity.id);
    }

    // Add/update polygon for area measurement
    if (this.activeTool === 'area' && this.points.length >= 3) {
      this.updatePolygonEntity();
    }
  }

  /**
   * Updates the polygon entity for area measurement
   * @private
   */
  private updatePolygonEntity(): void {
    if (!this.viewer || !this.Cesium) return;

    // Remove old polygon
    this.viewer.entities.removeById('measure-polygon');

    const positions = this.points.map((p) =>
      this.Cesium.Cartesian3.fromDegrees(p.longitude, p.latitude)
    );

    this.viewer.entities.add({
      id: 'measure-polygon',
      polygon: {
        hierarchy: positions,
        material: this.Cesium.Color.YELLOW.withAlpha(0.3),
        outline: true,
        outlineColor: this.Cesium.Color.YELLOW,
        outlineWidth: 2,
        heightReference: this.Cesium.HeightReference.CLAMP_TO_GROUND,
      },
    });
  }

  /**
   * Updates distance and area calculations
   * @private
   */
  private updateMeasurements(): void {
    // Calculate total distance
    this.totalDistance = 0;
    for (let i = 1; i < this.points.length; i++) {
      this.totalDistance += this.haversineDistance(
        this.points[i - 1],
        this.points[i]
      );
    }

    // Calculate area using Shoelace formula for spherical polygon
    this.totalArea = 0;
    if (this.points.length >= 3) {
      this.totalArea = this.sphericalPolygonArea(this.points);
    }
  }

  /**
   * Calculates the Haversine distance between two points
   * @param p1 - First point
   * @param p2 - Second point
   * @returns Distance in kilometers
   */
  haversineDistance(p1: MeasurePoint, p2: MeasurePoint): number {
    const R = MeasureTools.EARTH_RADIUS_KM;
    const dLat = this.toRad(p2.latitude - p1.latitude);
    const dLon = this.toRad(p2.longitude - p1.longitude);
    const lat1 = this.toRad(p1.latitude);
    const lat2 = this.toRad(p2.latitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Calculates the area of a spherical polygon
   * @param points - Polygon vertices
   * @returns Area in square kilometers
   */
  sphericalPolygonArea(points: MeasurePoint[]): number {
    if (points.length < 3) return 0;

    const R = MeasureTools.EARTH_RADIUS_KM;
    let area = 0;
    const n = points.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const k = (i + 2) % n;

      const lat1 = this.toRad(points[i].latitude);
      const lat2 = this.toRad(points[j].latitude);
      const lon1 = this.toRad(points[i].longitude);
      const lon2 = this.toRad(points[j].longitude);

      // Girard's theorem for spherical excess
      area += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
    }

    area = Math.abs(area * R * R / 2);
    return area;
  }

  /**
   * Converts degrees to radians
   * @private
   */
  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Gets the current measurement result
   * @returns Measurement result
   */
  getResult(): MeasurementResult {
    return {
      tool: this.activeTool,
      points: [...this.points],
      distance: this.totalDistance,
      area: this.totalArea,
      perimeter: this.totalDistance,
      unit: 'km',
    };
  }

  /**
   * Clears all measurements
   */
  clear(): void {
    if (this.viewer) {
      // Remove all entities
      this.entityIds.forEach((id) => {
        this.viewer.entities.removeById(id);
      });
      this.viewer.entities.removeById('measure-polygon');

      // Clear arrays
      this.entityIds = [];
    }

    this.points = [];
    this.totalDistance = 0;
    this.totalArea = 0;

    this.emitResult();
  }

  /**
   * Removes the last added point
   */
  removeLastPoint(): void {
    if (this.points.length === 0) return;

    this.points.pop();
    this.updateMeasurements();

    // Remove visual entities (simplified - removes last 2 entities)
    for (let i = 0; i < 2 && this.entityIds.length > 0; i++) {
      const id = this.entityIds.pop();
      if (id && this.viewer) {
        this.viewer.entities.removeById(id);
      }
    }

    // Update polygon if in area mode
    if (this.activeTool === 'area' && this.points.length >= 3) {
      this.updatePolygonEntity();
    }

    this.emitResult();
  }

  /**
   * Registers a callback for measurement updates
   * @param callback - Function to call on updates
   * @returns Unsubscribe function
   */
  onMeasurement(callback: MeasurementCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Emits the current measurement result
   * @private
   */
  private emitResult(): void {
    const result = this.getResult();
    this.callbacks.forEach((callback) => callback(result));
  }

  /**
   * Checks if measurement is active
   * @returns True if a tool is active
   */
  isActive(): boolean {
    return this.activeTool !== 'none';
  }

  /**
   * Gets the number of points
   * @returns Point count
   */
  getPointCount(): number {
    return this.points.length;
  }

  /**
   * Formats a distance for display
   * @param distanceKm - Distance in kilometers
   * @param unit - Unit to use
   * @returns Formatted string
   */
  static formatDistance(distanceKm: number, unit: 'km' | 'm' | 'mi' | 'ft' = 'km'): string {
    switch (unit) {
      case 'm':
        return `${(distanceKm * 1000).toFixed(2)} m`;
      case 'mi':
        return `${(distanceKm * 0.621371).toFixed(2)} mi`;
      case 'ft':
        return `${(distanceKm * 3280.84).toFixed(2)} ft`;
      default:
        return `${distanceKm.toFixed(2)} km`;
    }
  }

  /**
   * Formats an area for display
   * @param areaKm2 - Area in square kilometers
   * @param unit - Unit to use
   * @returns Formatted string
   */
  static formatArea(areaKm2: number, unit: 'km' | 'm' | 'mi' | 'ft' = 'km'): string {
    switch (unit) {
      case 'm':
        return `${(areaKm2 * 1000000).toFixed(2)} m²`;
      case 'mi':
        return `${(areaKm2 * 0.386102).toFixed(2)} mi²`;
      case 'ft':
        return `${(areaKm2 * 10763910).toFixed(2)} ft²`;
      default:
        return `${areaKm2.toFixed(2)} km²`;
    }
  }

  /**
   * Destroys the measurement tools and cleans up
   */
  destroy(): void {
    this.clear();
    this.callbacks.clear();
    this.activeTool = 'none';
  }
}

export default MeasureTools;
