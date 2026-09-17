'use client';

import { useEffect, useRef, useState } from 'react';
import { useEarthStore } from '@/store/earth';
import { CAMERA_LIMITS, MAPBOX_CONFIG } from '@/lib/earth/config';
import type { Coordinates } from '@/types/earth';

// Cesium CDN URLs
const CESIUM_VERSION = '1.104';
const CESIUM_CDNS = [
  `https://unpkg.com/cesium@${CESIUM_VERSION}/Build/Cesium`,
  `https://cdn.jsdelivr.net/npm/cesium@${CESIUM_VERSION}/Build/Cesium`,
];

declare global {
  interface Window {
    Cesium: any;
  }
}

interface CesiumGlobeComponentProps {
  onReady?: () => void;
  onClick?: (coordinates: Coordinates) => void;
  onCameraChange?: (camera: { longitude: number; latitude: number; height: number }) => void;
}

export default function CesiumGlobeComponent({
  onReady,
  onClick,
  onCameraChange,
}: CesiumGlobeComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const cloudLayerRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  
  const { imageryLayer, visionMode, time, clouds, measurement, markers, addMeasurementPoint } = useEarthStore();

  // Load Cesium from CDN
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let mounted = true;

    const loadCesium = async () => {
      try {
        if (window.Cesium) {
          if (mounted) await initViewer(window.Cesium);
          return;
        }

        for (const cdnUrl of CESIUM_CDNS) {
          try {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = `${cdnUrl}/Widgets/widgets.css`;
            document.head.appendChild(link);

            const script = document.createElement('script');
            script.src = `${cdnUrl}/Cesium.js`;
            script.crossOrigin = 'anonymous';
            
            await new Promise<void>((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error('Timeout')), 60000);
              script.onload = () => { clearTimeout(timeout); resolve(); };
              script.onerror = () => { clearTimeout(timeout); reject(new Error('Load failed')); };
              document.head.appendChild(script);
            });

            await new Promise(r => setTimeout(r, 300));
            if (window.Cesium) break;
          } catch (e) {
            console.warn(`CDN failed: ${cdnUrl}`, e);
          }
        }

        if (!window.Cesium) throw new Error('Failed to load Cesium');
        if (mounted) await initViewer(window.Cesium);
      } catch (err) {
        console.error('Cesium error:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load 3D Globe');
          setLoading(false);
        }
      }
    };

    loadCesium();
    
    return () => { 
      mounted = false;
      if (viewerRef.current && !viewerRef.current.isDestroyed?.()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  // Initialize Viewer
  const initViewer = async (Cesium: any) => {
    if (!containerRef.current || viewerRef.current) return;

    try {
      Cesium.Ion.defaultAccessToken = '';

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
        infoBox: false,
        selectionIndicator: false,
        shadows: false,
        shouldAnimate: true,
        requestRenderMode: false,
        baseLayer: false,
        terrainProvider: undefined,
      });

      viewerRef.current = viewer;
      const scene = viewer.scene;
      
      scene.globe.enableLighting = false;
      scene.globe.depthTestAgainstTerrain = false;
      scene.screenSpaceCameraController.enableCollisionDetection = false;
      scene.screenSpaceCameraController.minimumZoomDistance = 100;
      scene.screenSpaceCameraController.maximumZoomDistance = CAMERA_LIMITS.maxHeight;
      
      // Add initial layer
      addBaseLayer(Cesium, viewer, 'osm');

      // Try to add OSM Buildings
      try {
        const osmBuildings = await Cesium.createOsmBuildingsAsync();
        viewer.scene.primitives.add(osmBuildings);
      } catch (e) {
        console.warn('OSM Buildings not available');
      }

      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(0, 20, CAMERA_LIMITS.defaultHeight),
        orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 },
      });

      try {
        const creditContainer = viewer.cesiumWidget.creditContainer as HTMLElement;
        if (creditContainer) creditContainer.style.display = 'none';
      } catch (e) {}

      setupEventHandlers(Cesium, viewer);
      startFpsCounter(viewer);

      setLoading(false);
      onReady?.();
    } catch (err) {
      console.error('Viewer init error:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize');
      setLoading(false);
    }
  };

  // Add base layer - using Mapbox Styles API
  const addBaseLayer = (Cesium: any, viewer: any, layerType: string) => {
    try {
      viewer.imageryLayers.removeAll();
      
      let provider;
      let styleId: string;
      let creditName: string;
      
      switch (layerType) {
        case 'bing-aerial':
        case 'esri-imagery':
          // Mapbox Satellite
          styleId = MAPBOX_CONFIG.styles.satellite;
          creditName = 'Mapbox Satellite';
          break;
          
        case 'terrain':
          // Mapbox Outdoors
          styleId = MAPBOX_CONFIG.styles.outdoors;
          creditName = 'Mapbox Outdoors';
          break;
          
        case 'dark':
          // Mapbox Dark
          styleId = MAPBOX_CONFIG.styles.dark;
          creditName = 'Mapbox Dark';
          break;
          
        case 'hybrid':
          // Mapbox Standard Satellite (satellite with labels)
          styleId = MAPBOX_CONFIG.styles.standardSatellite;
          creditName = 'Mapbox Standard Satellite';
          break;
          
        case 'osm':
        default:
          // Mapbox Streets
          styleId = MAPBOX_CONFIG.styles.streets;
          creditName = 'Mapbox Streets';
          break;
      }
      
      // Build Mapbox tile URL
      const tileUrl = `https://api.mapbox.com/styles/v1/${MAPBOX_CONFIG.username}/${styleId}/tiles/512/{z}/{x}/{y}@2x?access_token=${MAPBOX_CONFIG.accessToken}`;
      
      console.log('Loading Mapbox style:', styleId);
      
      provider = new Cesium.UrlTemplateImageryProvider({
        url: tileUrl,
        maximumLevel: 18,
        credit: new Cesium.Credit(creditName),
      });
      
      viewer.imageryLayers.addImageryProvider(provider);
      console.log('Layer loaded:', layerType, '(' + creditName + ')');
      
    } catch (err) {
      console.error('Mapbox layer error:', err);
      // Fallback to OSM if Mapbox fails
      try {
        viewer.imageryLayers.removeAll();
        const fallback = new Cesium.OpenStreetMapImageryProvider({
          url: 'https://tile.openstreetmap.org/',
          maximumLevel: 19,
        });
        viewer.imageryLayers.addImageryProvider(fallback);
        console.log('Using OSM fallback');
      } catch (e) {
        console.error('Fallback also failed:', e);
      }
    }
  };

  // Setup event handlers
  const setupEventHandlers = (Cesium: any, viewer: any) => {
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
    
    handler.setInputAction((event: any) => {
      const cartesian = viewer.camera.pickEllipsoid(event.position, viewer.scene.globe.ellipsoid);
      if (cartesian) {
        const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
        const coords: Coordinates = {
          longitude: Cesium.Math.toDegrees(cartographic.longitude),
          latitude: Cesium.Math.toDegrees(cartographic.latitude),
          altitude: cartographic.height,
        };
        onClick?.(coords);
        
        if (measurement.tool !== 'none') {
          addMeasurementPoint(coords);
          viewer.entities.add({
            position: cartesian,
            point: { pixelSize: 8, color: Cesium.Color.YELLOW, outlineColor: Cesium.Color.BLACK, outlineWidth: 2 },
          });
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    handler.setInputAction((event: any) => {
      const cartesian = viewer.camera.pickEllipsoid(event.endPosition, viewer.scene.globe.ellipsoid);
      if (cartesian) {
        const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
        onClick?.({
          longitude: Cesium.Math.toDegrees(cartographic.longitude),
          latitude: Cesium.Math.toDegrees(cartographic.latitude),
          altitude: cartographic.height,
        });
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    handler.setInputAction((event: any) => {
      const cartesian = viewer.camera.pickEllipsoid(event.position, viewer.scene.globe.ellipsoid);
      if (cartesian) {
        const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
        const lon = Cesium.Math.toDegrees(cartographic.longitude);
        const lat = Cesium.Math.toDegrees(cartographic.latitude);
        viewer.entities.add({
          position: cartesian,
          point: { pixelSize: 12, color: Cesium.Color.RED, outlineColor: Cesium.Color.WHITE, outlineWidth: 2 },
          label: {
            text: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
            font: '14px sans-serif',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -15),
          },
        });
      }
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

    // Right-click for Street View
    handler.setInputAction((event: any) => {
      const cartesian = viewer.camera.pickEllipsoid(event.position, viewer.scene.globe.ellipsoid);
      if (cartesian) {
        const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
        const lon = Cesium.Math.toDegrees(cartographic.longitude);
        const lat = Cesium.Math.toDegrees(cartographic.latitude);
        
        // Dispatch event with location info for toast notification
        window.dispatchEvent(new CustomEvent('openStreetView', { 
          detail: { lat, lon } 
        }));
        
        // Open Google Maps Street View - use cbll for best street view targeting
        const streetViewUrl = `https://www.google.com/maps?cbll=${lat},${lon}&cbp=12,0,0,0,0&layer=c`;
        window.open(streetViewUrl, '_blank');
      }
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

    // Two-finger tap for Street View (mobile/touch devices)
    handler.setInputAction((event: any) => {
      const cartesian = viewer.camera.pickEllipsoid(event.position, viewer.scene.globe.ellipsoid);
      if (cartesian) {
        const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
        const lon = Cesium.Math.toDegrees(cartographic.longitude);
        const lat = Cesium.Math.toDegrees(cartographic.latitude);
        
        window.dispatchEvent(new CustomEvent('openStreetView', { 
          detail: { lat, lon } 
        }));
        
        const streetViewUrl = `https://www.google.com/maps?cbll=${lat},${lon}&cbp=12,0,0,0,0&layer=c`;
        window.open(streetViewUrl, '_blank');
      }
    }, Cesium.ScreenSpaceEventType.PINCH_END);

    viewer.camera.changed.addEventListener(() => {
      try {
        const pos = viewer.camera.positionCartographic;
        onCameraChange?.({
          longitude: Cesium.Math.toDegrees(pos.longitude),
          latitude: Cesium.Math.toDegrees(pos.latitude),
          height: pos.height,
        });
      } catch (e) {}
    });

    const handleKey = (e: KeyboardEvent) => {
      const camera = viewer.camera;
      const height = camera.positionCartographic.height;
      const move = Math.max(height / 100, 100);
      switch (e.key.toLowerCase()) {
        case 'w': camera.moveForward(move); break;
        case 's': camera.moveBackward(move); break;
        case 'a': camera.moveLeft(move); break;
        case 'd': camera.moveRight(move); break;
        case 'q': camera.lookUp(Cesium.Math.toRadians(2)); break;
        case 'e': camera.lookDown(Cesium.Math.toRadians(2)); break;
        case '+': case '=': camera.zoomIn(move / 2); break;
        case '-': camera.zoomOut(move / 2); break;
      }
    };
    document.addEventListener('keydown', handleKey);

    // Handle flyToLocation events from search
    const handleFlyTo = (e: CustomEvent) => {
      const { longitude, latitude, height } = e.detail;
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, height),
        orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 },
        duration: 2,
      });
    };
    window.addEventListener('flyToLocation', handleFlyTo as EventListener);
  };

  const startFpsCounter = (viewer: any) => {
    let lastTime = performance.now();
    let frames = 0;
    const update = () => {
      const now = performance.now();
      frames++;
      if (now - lastTime >= 1000) {
        setFps(frames);
        frames = 0;
        lastTime = now;
      }
      if (viewer && !viewer.isDestroyed?.()) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  };

  // Update imagery layer
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = window.Cesium;
    if (!viewer || !Cesium) return;
    addBaseLayer(Cesium, viewer, imageryLayer);
  }, [imageryLayer]);

  // Custom thermal vision shader
  const createThermalVisionStage = (Cesium: any) => {
    return new Cesium.PostProcessStage({
      name: 'thermal_vision',
      fragmentShader: `
        uniform sampler2D colorTexture;
        in vec2 v_textureCoordinates;
        
        void main() {
          vec4 color = texture(colorTexture, v_textureCoordinates);
          float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
          
          // Thermal color mapping: black -> blue -> cyan -> green -> yellow -> red
          vec3 thermal;
          if (gray < 0.2) {
            thermal = mix(vec3(0.0, 0.0, 0.0), vec3(0.0, 0.0, 0.5), gray / 0.2);
          } else if (gray < 0.4) {
            thermal = mix(vec3(0.0, 0.0, 0.5), vec3(0.0, 0.5, 1.0), (gray - 0.2) / 0.2);
          } else if (gray < 0.6) {
            thermal = mix(vec3(0.0, 0.5, 1.0), vec3(0.0, 1.0, 0.0), (gray - 0.4) / 0.2);
          } else if (gray < 0.8) {
            thermal = mix(vec3(0.0, 1.0, 0.0), vec3(1.0, 1.0, 0.0), (gray - 0.6) / 0.2);
          } else {
            thermal = mix(vec3(1.0, 1.0, 0.0), vec3(1.0, 0.0, 0.0), (gray - 0.8) / 0.2);
          }
          
          thermal = pow(thermal, vec3(0.8));
          out_FragColor = vec4(thermal, color.a);
        }
      `
    });
  };

  // Custom wireframe shader - subtle and sharp
  const createWireframeStage = (Cesium: any) => {
    return new Cesium.PostProcessStage({
      name: 'wireframe_vision',
      fragmentShader: `
        uniform sampler2D colorTexture;
        in vec2 v_textureCoordinates;
        
        void main() {
          vec4 color = texture(colorTexture, v_textureCoordinates);
          
          // Sobel edge detection with smaller kernel for sharper edges
          vec2 texelSize = vec2(1.0 / 1920.0, 1.0 / 1080.0);
          
          // Sample neighbors
          float tl = dot(texture(colorTexture, v_textureCoordinates + vec2(-texelSize.x, -texelSize.y)).rgb, vec3(0.299, 0.587, 0.114));
          float t  = dot(texture(colorTexture, v_textureCoordinates + vec2(0.0, -texelSize.y)).rgb, vec3(0.299, 0.587, 0.114));
          float tr = dot(texture(colorTexture, v_textureCoordinates + vec2(texelSize.x, -texelSize.y)).rgb, vec3(0.299, 0.587, 0.114));
          float l  = dot(texture(colorTexture, v_textureCoordinates + vec2(-texelSize.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
          float r  = dot(texture(colorTexture, v_textureCoordinates + vec2(texelSize.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
          float bl = dot(texture(colorTexture, v_textureCoordinates + vec2(-texelSize.x, texelSize.y)).rgb, vec3(0.299, 0.587, 0.114));
          float b  = dot(texture(colorTexture, v_textureCoordinates + vec2(0.0, texelSize.y)).rgb, vec3(0.299, 0.587, 0.114));
          float br = dot(texture(colorTexture, v_textureCoordinates + vec2(texelSize.x, texelSize.y)).rgb, vec3(0.299, 0.587, 0.114));
          
          // Sobel operators
          float gx = -tl - 2.0*l - bl + tr + 2.0*r + br;
          float gy = -tl - 2.0*t - tr + bl + 2.0*b + br;
          float edge = sqrt(gx*gx + gy*gy);
          
          // Sharp threshold for crisp lines
          float edgeStrength = smoothstep(0.05, 0.15, edge);
          
          // Subtle cyan lines on dark background
          vec3 lineColor = vec3(0.3, 0.8, 0.9);
          vec3 bgColor = vec3(0.05, 0.08, 0.1);
          
          // No glow - just clean lines
          vec3 result = mix(bgColor, lineColor, edgeStrength);
          
          out_FragColor = vec4(result, color.a);
        }
      `
    });
  };

  // Update vision mode
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = window.Cesium;
    if (!viewer || !Cesium) return;

    try {
      viewer.scene.globe.material = undefined;
      const stages = viewer.scene.postProcessStages;
      stages.removeAll();

      if (visionMode === 'night-vision') {
        stages.add(Cesium.PostProcessStageLibrary.createNightVisionStage());
      } else if (visionMode === 'thermal') {
        stages.add(createThermalVisionStage(Cesium));
      } else if (visionMode === 'wireframe') {
        stages.add(createWireframeStage(Cesium));
      }
      
      stages.fxaa.enabled = true;
    } catch (err) {
      console.warn('Vision mode error:', err);
    }
  }, [visionMode]);

  // Update day/night lighting
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.scene.globe.enableLighting = time.showDayNight;
    if (time.showDayNight && time.currentTime) {
      const Cesium = window.Cesium;
      if (Cesium) viewer.clock.currentTime = Cesium.JulianDate.fromDate(time.currentTime);
    }
  }, [time.showDayNight, time.currentTime]);

  // Update cloud layer - using NASA GIBS (free, no API key)
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = window.Cesium;
    if (!viewer || !Cesium) return;

    if (cloudLayerRef.current) {
      try {
        viewer.imageryLayers.remove(cloudLayerRef.current);
        cloudLayerRef.current = null;
      } catch (e) {}
    }

    if (clouds.visible) {
      try {
        // NASA GIBS cloud layer - free, no API key needed
        const cloudProvider = new Cesium.UrlTemplateImageryProvider({
          url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_Cloud_Effective_Radius/default/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png',
          maximumLevel: 6,
        });
        cloudLayerRef.current = viewer.imageryLayers.addImageryProvider(cloudProvider);
        cloudLayerRef.current.alpha = clouds.opacity;
      } catch (err) {
        console.warn('Cloud layer error:', err);
      }
    }
  }, [clouds.visible, clouds.opacity]);

  // Update markers
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = window.Cesium;
    if (!viewer || !Cesium || !markers) return;

    viewer.entities.removeAll();
    markers.forEach((marker: any) => {
      viewer.entities.add({
        id: marker.id,
        position: Cesium.Cartesian3.fromDegrees(marker.coordinates.longitude, marker.coordinates.latitude, marker.coordinates.altitude || 0),
        point: {
          pixelSize: 12,
          color: Cesium.Color.fromCssColorString(
            marker.type === 'poi' ? '#3b82f6' : marker.type === 'photo' ? '#22c55e' : marker.type === 'measurement' ? '#eab308' : '#ef4444'
          ),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
        },
        label: marker.name ? {
          text: marker.name,
          font: '14px sans-serif',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -15),
        } : undefined,
      });
    });
  }, [markers]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">🌍</div>
          <h2 className="text-xl font-bold text-white mb-2">Error Loading Globe</h2>
          <p className="text-sm text-slate-400 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" style={{ touchAction: 'none' }} />
      
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full border-4 border-slate-600 border-t-blue-400 animate-spin" />
            <div className="text-center">
              <h2 className="text-xl font-semibold text-white">Loading 3D Globe</h2>
              <p className="text-sm text-slate-400 mt-1">Initializing CesiumJS...</p>
            </div>
          </div>
        </div>
      )}
      
      {!loading && (
        <>
          <div className="absolute top-2 left-2 text-xs font-mono bg-black/50 text-white px-2 py-1 rounded z-10">
            {fps} FPS
          </div>
          <div className="absolute bottom-20 right-4 text-xs bg-black/50 text-white px-3 py-2 rounded z-10">
            <div className="font-semibold mb-1">Controls:</div>
            <div>🖱️ Drag to rotate • Scroll to zoom</div>
            <div>📍 Double-click: Mark location</div>
            <div>🖼️ Right-click/Two-finger: Street View</div>
            <div>WASD pan • QE tilt • +/- zoom</div>
          </div>
        </>
      )}
    </div>
  );
}
