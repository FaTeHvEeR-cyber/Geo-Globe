'use client';

import { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { useGlobeStore } from '@/store/globe-store';
import type { ImageryLayerType } from '@/types/globe';

// Set Cesium base URL for static assets
if (typeof window !== 'undefined') {
  (window as unknown as { CESIUM_BASE_URL: string }).CESIUM_BASE_URL = '/cesium';
}

// Cesium Ion access token for enhanced features (free tier)
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlYTQxM2NkNy03OGYzLTQ5ZTAtYjM1Yy1hMjMzYjQzOGNiMmIiLCJpZCI6MjU5LCJpYXQiOjE3MDM1NDEwMzV9.cVmWzF5vKKDqJzBZP6_DJaJW0BjWCJdDxPr8GzR';

interface CesiumGlobeProps {
  onLocationClick?: (lon: number, lat: number) => void;
}

export function CesiumGlobe({ onLocationClick }: CesiumGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const imageryLayerRef = useRef<Cesium.ImageryLayer | null>(null);
  const nightLightsLayerRef = useRef<Cesium.ImageryLayer | null>(null);
  const dayNightTerminatorRef = useRef<Cesium.Entity | null>(null);

  const {
    imageryLayer,
    showNightLights,
    showTerrain,
    showDayNightTerminator,
    setSelectedLocation,
    setWeatherData,
    openStreetView,
  } = useGlobeStore();

  // Create imagery provider based on layer type
  const createImageryProvider = useCallback((type: ImageryLayerType): Cesium.ImageryProvider => {
    switch (type) {
      case 'osm':
        return new Cesium.OpenStreetMapImageryProvider({
          url: 'https://tile.openstreetmap.org/',
          maximumLevel: 19,
        });
      case 'satellite':
        return new Cesium.ArcGisMapServerImageryProvider({
          url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
        });
      case 'terrain':
        return new Cesium.ArcGisMapServerImageryProvider({
          url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer',
        });
      case 'toner':
        return new Cesium.UrlTemplateImageryProvider({
          url: 'https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}.png',
          maximumLevel: 18,
          credit: new Cesium.Credit('Stadia Maps, Stamen Design, OpenStreetMap contributors'),
        });
      case 'hybrid':
        // Hybrid uses satellite as base, labels will be added as separate layer
        return new Cesium.ArcGisMapServerImageryProvider({
          url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
        });
      default:
        return new Cesium.OpenStreetMapImageryProvider({
          url: 'https://tile.openstreetmap.org/',
        });
    }
  }, []);

  // Initialize Cesium viewer
  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    const viewer = new Cesium.Viewer(containerRef.current, {
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      animation: false,
      timeline: false,
      fullscreenButton: false,
      vrButton: false,
      infoBox: true,
      selectionIndicator: true,
      shadows: false,
      shouldAnimate: true,
      terrainProvider: showTerrain
        ? Cesium.createWorldTerrainAsync({
            requestWaterMask: true,
            requestVertexNormals: true,
          }) as unknown as Cesium.TerrainProvider
        : undefined,
    });

    viewerRef.current = viewer;

    // Remove Cesium logo for cleaner UI (optional)
    const creditContainer = viewer.cesiumWidget.creditContainer as HTMLElement;
    creditContainer.style.display = 'none';

    // Enable lighting based on sun position
    viewer.scene.globe.enableLighting = false;

    // Set initial camera position (global view)
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(0, 20, 20000000),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-90),
        roll: 0,
      },
    });

    // Add click handler for location selection
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
    handler.setInputAction((event: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      const cartesian = viewer.camera.pickEllipsoid(event.position, viewer.scene.globe.ellipsoid);
      if (cartesian) {
        const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
        const lon = Cesium.Math.toDegrees(cartographic.longitude);
        const lat = Cesium.Math.toDegrees(cartographic.latitude);

        setSelectedLocation({ lon, lat });
        onLocationClick?.(lon, lat);

        // Add a marker
        viewer.entities.add({
          position: cartesian,
          point: {
            pixelSize: 10,
            color: Cesium.Color.fromCssColorString('#ef4444'),
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          },
          label: {
            text: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
            font: '14px sans-serif',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -15),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          },
        });
      }
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

    // Right click for street view
    handler.setInputAction((event: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      const cartesian = viewer.camera.pickEllipsoid(event.position, viewer.scene.globe.ellipsoid);
      if (cartesian) {
        const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
        const lon = Cesium.Math.toDegrees(cartographic.longitude);
        const lat = Cesium.Math.toDegrees(cartographic.latitude);
        openStreetView({ lon, lat });
      }
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

    return () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [showTerrain, setSelectedLocation, onLocationClick, openStreetView]);

  // Update imagery layer when type changes
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    // Remove existing imagery layer
    if (imageryLayerRef.current) {
      viewer.imageryLayers.remove(imageryLayerRef.current);
    }

    // Add new imagery layer
    const provider = createImageryProvider(imageryLayer);
    imageryLayerRef.current = viewer.imageryLayers.addImageryProvider(provider);

    // For hybrid, add a labels layer on top
    if (imageryLayer === 'hybrid') {
      const labelsProvider = new Cesium.ArcGisMapServerImageryProvider({
        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer',
      });
      viewer.imageryLayers.addImageryProvider(labelsProvider);
    }
  }, [imageryLayer, createImageryProvider]);

  // Toggle night lights layer
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (showNightLights) {
      // Add NASA Black Marble night lights
      const nightLightsProvider = new Cesium.IonImageryProvider({ assetId: 3845 });
      nightLightsLayerRef.current = viewer.imageryLayers.addImageryProvider(nightLightsProvider);
      nightLightsLayerRef.current.alpha = 0.8;
    } else if (nightLightsLayerRef.current) {
      viewer.imageryLayers.remove(nightLightsLayerRef.current);
      nightLightsLayerRef.current = null;
    }
  }, [showNightLights]);

  // Toggle day/night terminator
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (showDayNightTerminator) {
      viewer.scene.globe.enableLighting = true;
    } else {
      viewer.scene.globe.enableLighting = false;
    }
  }, [showDayNightTerminator]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full"
      style={{ touchAction: 'none' }}
    />
  );
}
