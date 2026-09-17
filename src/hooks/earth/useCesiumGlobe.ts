'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useEarthStore } from '@/store/earth';
import { CESIUM_ION_TOKEN, CESIUM_CDN_URL, CAMERA_LIMITS, IMAGERY_LAYERS } from '@/lib/earth/config';
import type { Coordinates } from '@/types/earth';

// Extend Window interface for Cesium
declare global {
  interface Window {
    Cesium: typeof import('cesium');
  }
}

interface CesiumGlobeProps {
  onReady?: () => void;
  onClick?: (coordinates: Coordinates) => void;
  onCameraChange?: (camera: { longitude: number; latitude: number; height: number }) => void;
}

export function useCesiumGlobe({ onReady, onClick, onCameraChange }: CesiumGlobeProps = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  
  const { 
    imageryLayer, 
    visionMode,
    time,
    clouds,
    flyTo,
    setCameraPosition,
  } = useEarthStore();

  // Load Cesium from CDN
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadCesium = async () => {
      try {
        // Check if already loaded
        if (window.Cesium) {
          await initViewer(window.Cesium);
          return;
        }

        // Load CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `${CESIUM_CDN_URL}/Widgets/widgets.css`;
        document.head.appendChild(link);

        // Load JS
        const script = document.createElement('script');
        script.src = `${CESIUM_CDN_URL}/Cesium.js`;
        
        await new Promise<void>((resolve, reject) => {
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Cesium'));
          document.head.appendChild(script);
        });

        await initViewer(window.Cesium);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize Cesium');
        setLoading(false);
      }
    };

    loadCesium();

    return () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed?.()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  // Initialize the Cesium viewer
  const initViewer = async (Cesium: typeof window.Cesium) => {
    if (!containerRef.current || viewerRef.current) return;

    try {
      // Set Ion access token
      Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN;

      // Create viewer with optimized settings
      const viewer = new Cesium.Viewer(containerRef.current, {
        // Base layers
        baseLayerPicker: false,
        imageryProvider: createImageryProvider(Cesium, imageryLayer),
        
        // Terrain
        terrainProvider: await Cesium.createWorldTerrainAsync({
          requestWaterMask: true,
          requestVertexNormals: true,
        }),
        
        // UI Controls
        baseLayer: true,
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
        
        // Rendering
        shadows: false,
        shouldAnimate: true,
        requestRenderMode: true,
        maximumRenderTimeChange: Infinity,
      });

      viewerRef.current = viewer;

      // Configure scene
      const scene = viewer.scene;
      
      // Enable depth testing
      scene.globe.depthTestAgainstTerrain = true;
      
      // Enable lighting
      scene.globe.enableLighting = time.showDayNight;
      
      // Configure camera
      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(
          CAMERA_LIMITS.defaultHeight > 1000000 ? 0 : -74,
          CAMERA_LIMITS.defaultHeight > 1000000 ? 20 : 40.7,
          CAMERA_LIMITS.defaultHeight
        ),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-90),
          roll: 0,
        },
      });

      // Remove Cesium credit logo
      const creditContainer = viewer.cesiumWidget.creditContainer as HTMLElement;
      creditContainer.style.display = 'none';

      // Add skybox
      scene.skyBox = new Cesium.SkyBox({
        sources: {
          positiveX: `${CESIUM_CDN_URL}/Assets/Textures/SkyBox/tycho2t3_80_px.jpg`,
          negativeX: `${CESIUM_CDN_URL}/Assets/Textures/SkyBox/tycho2t3_80_mx.jpg`,
          positiveY: `${CESIUM_CDN_URL}/Assets/Textures/SkyBox/tycho2t3_80_py.jpg`,
          negativeY: `${CESIUM_CDN_URL}/Assets/Textures/SkyBox/tycho2t3_80_my.jpg`,
          positiveZ: `${CESIUM_CDN_URL}/Assets/Textures/SkyBox/tycho2t3_80_pz.jpg`,
          negativeZ: `${CESIUM_CDN_URL}/Assets/Textures/SkyBox/tycho2t3_80_mz.jpg`,
        },
      });

      // Enable FXAA anti-aliasing
      scene.postProcessStages.fxaa.enabled = true;

      // Sun and moon
      scene.sun = new Cesium.Sun();
      scene.moon = new Cesium.Moon({ show: true });

      // Setup event handlers
      setupEventHandlers(Cesium, viewer);

      // Start FPS counter
      startFpsCounter(viewer);

      setLoading(false);
      onReady?.();
    } catch (err) {
      console.error('Failed to initialize viewer:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize viewer');
      setLoading(false);
    }
  };

  // Create imagery provider based on layer type
  const createImageryProvider = (Cesium: typeof window.Cesium, layer: string) => {
    const config = IMAGERY_LAYERS[layer as keyof typeof IMAGERY_LAYERS];
    if (!config) {
      return new Cesium.OpenStreetMapImageryProvider({
        url: 'https://tile.openstreetmap.org/',
      });
    }

    switch (config.provider.type) {
      case 'osm':
        return new Cesium.OpenStreetMapImageryProvider({
          url: config.provider.url,
          maximumLevel: config.provider.maximumLevel,
        });
      
      case 'bing':
        return new Cesium.BingMapsImageryProvider({
          url: 'https://dev.virtualearth.net',
          key: 'AgD8L-_8I2dKzGsDRnLQxz0F4oV7B6mBnG9f0G9f0G9f0G9f0G9f0G9f0G9f0G9f', // Free tier key
          mapStyle: Cesium.BingMapsStyle[config.provider.mapStyle as keyof typeof Cesium.BingMapsStyle],
        });
      
      case 'arcgis':
        return new Cesium.ArcGisMapServerImageryProvider({
          url: config.provider.url,
        });
      
      case 'url-template':
        return new Cesium.UrlTemplateImageryProvider({
          url: config.provider.url,
          maximumLevel: config.provider.maximumLevel,
        });
      
      default:
        return new Cesium.OpenStreetMapImageryProvider({
          url: 'https://tile.openstreetmap.org/',
        });
    }
  };

  // Setup event handlers
  const setupEventHandlers = (Cesium: typeof window.Cesium, viewer: any) => {
    // Click handler for coordinates
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
    
    handler.setInputAction((event: any) => {
      const cartesian = viewer.camera.pickEllipsoid(
        event.position,
        viewer.scene.globe.ellipsoid
      );
      
      if (cartesian) {
        const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
        const coordinates: Coordinates = {
          longitude: Cesium.Math.toDegrees(cartographic.longitude),
          latitude: Cesium.Math.toDegrees(cartographic.latitude),
          altitude: cartographic.height,
        };
        
        onClick?.(coordinates);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // Camera change handler
    viewer.camera.changed.addEventListener(() => {
      const position = viewer.camera.positionCartographic;
      onCameraChange?.({
        longitude: Cesium.Math.toDegrees(position.longitude),
        latitude: Cesium.Math.toDegrees(position.latitude),
        height: position.height,
      });
    });

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
      handleKeyboardInput(Cesium, viewer, e.key);
    });
  };

  // Handle keyboard input
  const handleKeyboardInput = (Cesium: typeof window.Cesium, viewer: any, key: string) => {
    const camera = viewer.camera;
    const moveAmount = 1000; // meters
    const rotateAmount = 1; // degrees

    switch (key.toLowerCase()) {
      case 'w':
        camera.moveForward(moveAmount);
        break;
      case 's':
        camera.moveBackward(moveAmount);
        break;
      case 'a':
        camera.moveLeft(moveAmount);
        break;
      case 'd':
        camera.moveRight(moveAmount);
        break;
      case 'q':
        camera.lookUp(Cesium.Math.toRadians(rotateAmount));
        break;
      case 'e':
        camera.lookDown(Cesium.Math.toRadians(rotateAmount));
        break;
      case '+':
      case '=':
        camera.zoomIn(moveAmount);
        break;
      case '-':
        camera.zoomOut(moveAmount);
        break;
    }
  };

  // Start FPS counter
  const startFpsCounter = (viewer: any) => {
    let lastTime = performance.now();
    let frames = 0;

    const updateFps = () => {
      const now = performance.now();
      frames++;
      
      if (now - lastTime >= 1000) {
        setFps(frames);
        frames = 0;
        lastTime = now;
      }
      
      if (viewer && !viewer.isDestroyed?.()) {
        requestAnimationFrame(updateFps);
      }
    };

    requestAnimationFrame(updateFps);
  };

  // Update imagery layer
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = window.Cesium;
    if (!viewer || !Cesium) return;

    // Remove all imagery layers
    viewer.imageryLayers.removeAll();

    // Add new imagery layer
    const provider = createImageryProvider(Cesium, imageryLayer);
    viewer.imageryLayers.addImageryProvider(provider);
  }, [imageryLayer]);

  // Update day/night lighting
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    viewer.scene.globe.enableLighting = time.showDayNight;
    
    if (time.showDayNight && time.currentTime) {
      viewer.clock.currentTime = Cesium.JulianDate.fromDate(time.currentTime);
    }
  }, [time.showDayNight, time.currentTime]);

  // Fly to location
  const flyToLocation = useCallback((longitude: number, latitude: number, height: number, duration: number = 2) => {
    const viewer = viewerRef.current;
    const Cesium = window.Cesium;
    if (!viewer || !Cesium) return;

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, height),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-90),
        roll: 0,
      },
      duration,
    });
  }, []);

  // Get current camera position
  const getCameraPosition = useCallback(() => {
    const viewer = viewerRef.current;
    const Cesium = window.Cesium;
    if (!viewer || !Cesium) return null;

    const position = viewer.camera.positionCartographic;
    return {
      longitude: Cesium.Math.toDegrees(position.longitude),
      latitude: Cesium.Math.toDegrees(position.latitude),
      height: position.height,
      heading: Cesium.Math.toDegrees(viewer.camera.heading),
      pitch: Cesium.Math.toDegrees(viewer.camera.pitch),
      roll: Cesium.Math.toDegrees(viewer.camera.roll),
    };
  }, []);

  // Add marker
  const addMarker = useCallback((id: string, longitude: number, latitude: number, options?: { label?: string; color?: string }) => {
    const viewer = viewerRef.current;
    const Cesium = window.Cesium;
    if (!viewer || !Cesium) return;

    viewer.entities.add({
      id,
      position: Cesium.Cartesian3.fromDegrees(longitude, latitude),
      point: {
        pixelSize: 12,
        color: Cesium.Color.fromCssColorString(options?.color || '#ef4444'),
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
      label: options?.label ? {
        text: options.label,
        font: '14px sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -15),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      } : undefined,
    });
  }, []);

  // Remove marker
  const removeMarker = useCallback((id: string) => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    viewer.entities.removeById(id);
  }, []);

  // Capture screenshot
  const captureScreenshot = useCallback(async () => {
    const viewer = viewerRef.current;
    if (!viewer) return null;

    try {
      const dataUrl = await viewer.scene.canvas.toDataURL('image/png');
      return dataUrl;
    } catch (err) {
      console.error('Screenshot failed:', err);
      return null;
    }
  }, []);

  return {
    containerRef,
    viewerRef,
    loading,
    error,
    fps,
    flyToLocation,
    getCameraPosition,
    addMarker,
    removeMarker,
    captureScreenshot,
  };
}

export default useCesiumGlobe;
