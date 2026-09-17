/**
 * @fileoverview Post Processing - Shader Pipeline Manager
 * 
 * This module manages post-processing effects including shader compilation,
 * effect stacking, and custom GLSL shader application.
 * 
 * @module effects/PostProcessing
 * @author Earth Explorer Team
 * @version 1.0.0
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Vision mode types
 */
export type VisionMode = 'normal' | 'night-vision' | 'thermal' | 'wireframe';

/**
 * Post-processing effect configuration
 */
export interface EffectConfig {
  /** Effect enabled state */
  enabled: boolean;
  /** Effect intensity (0-1) */
  intensity?: number;
  /** Custom uniform values */
  uniforms?: Record<string, number | number[]>;
}

/**
 * PostProcessing class - Manages shader effects
 */
export class PostProcessing {
  private viewer: any;
  private Cesium: any;
  private currentMode: VisionMode = 'normal';
  private currentStages: any[] = [];

  /**
   * Creates a new PostProcessing manager
   * @param viewer - The Cesium viewer instance
   * @param Cesium - The Cesium namespace
   */
  constructor(viewer: any, Cesium: any) {
    this.viewer = viewer;
    this.Cesium = Cesium;
  }

  /**
   * Sets the vision mode
   * @param mode - The vision mode to apply
   * @param config - Optional effect configuration
   */
  setVisionMode(mode: VisionMode, config: Partial<EffectConfig> = {}): void {
    if (!this.viewer || !this.Cesium) return;

    // Clear existing stages
    this.clearStages();

    this.currentMode = mode;

    switch (mode) {
      case 'night-vision':
        this.applyNightVision(config);
        break;
      case 'thermal':
        this.applyThermalVision(config);
        break;
      case 'wireframe':
        this.applyWireframeEffect(config);
        break;
      case 'normal':
      default:
        // No post-processing for normal mode
        break;
    }
  }

  /**
   * Gets the current vision mode
   * @returns Current vision mode
   */
  getVisionMode(): VisionMode {
    return this.currentMode;
  }

  /**
   * Clears all post-processing stages
   */
  clearStages(): void {
    if (!this.viewer) return;

    this.viewer.scene.postProcessStages.removeAll();
    this.currentStages = [];
  }

  /**
   * Applies night vision shader effect
   * @private
   */
  private applyNightVision(config: Partial<EffectConfig> = {}): void {
    const intensity = config.intensity ?? 1.0;

    const fragmentShader = `
      uniform float u_intensity;
      uniform sampler2D colorTexture;
      varying vec2 v_textureCoordinates;

      void main(void) {
        vec4 color = texture2D(colorTexture, v_textureCoordinates);
        
        // Calculate luminance
        float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        
        // Apply amplification based on intensity
        float amplified = pow(luminance * (1.0 + u_intensity * 0.5), 0.8);
        
        // Night vision green tint
        vec3 nightColor = vec3(0.1 * amplified, amplified, 0.1 * amplified);
        
        // Add scan line effect
        float scanLine = sin(v_textureCoordinates.y * 800.0) * 0.02 * u_intensity;
        nightColor += scanLine;
        
        // Add vignette effect
        float vignette = 1.0 - length(v_textureCoordinates - 0.5) * 0.5;
        nightColor *= vignette;
        
        // Add noise grain
        float noise = fract(sin(dot(v_textureCoordinates, vec2(12.9898, 78.233))) * 43758.5453);
        nightColor += (noise - 0.5) * 0.05 * u_intensity;
        
        gl_FragColor = vec4(nightColor, color.a);
      }
    `;

    const stage = new this.Cesium.PostProcessStage({
      fragmentShader,
      uniforms: {
        u_intensity: intensity,
      },
    });

    this.viewer.scene.postProcessStages.add(stage);
    this.currentStages.push(stage);
  }

  /**
   * Applies thermal vision shader effect
   * @private
   */
  private applyThermalVision(config: Partial<EffectConfig> = {}): void {
    const intensity = config.intensity ?? 1.0;

    const fragmentShader = `
      uniform float u_intensity;
      uniform sampler2D colorTexture;
      varying vec2 v_textureCoordinates;

      void main(void) {
        vec4 color = texture2D(colorTexture, v_textureCoordinates);
        
        // Calculate luminance
        float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        
        // Apply intensity modifier
        luminance = pow(luminance, 1.0 - u_intensity * 0.3);
        
        // Thermal color mapping
        vec3 thermalColor;
        if (luminance < 0.25) {
          thermalColor = mix(
            vec3(0.0, 0.0, 0.5),
            vec3(0.0, 0.5, 0.5),
            luminance * 4.0
          );
        } else if (luminance < 0.5) {
          thermalColor = mix(
            vec3(0.0, 0.5, 0.5),
            vec3(0.0, 1.0, 0.0),
            (luminance - 0.25) * 4.0
          );
        } else if (luminance < 0.75) {
          thermalColor = mix(
            vec3(0.0, 1.0, 0.0),
            vec3(1.0, 1.0, 0.0),
            (luminance - 0.5) * 4.0
          );
        } else {
          thermalColor = mix(
            vec3(1.0, 1.0, 0.0),
            vec3(1.0, 0.0, 0.0),
            (luminance - 0.75) * 4.0
          );
        }
        
        // Add slight edge enhancement
        float edge = 0.0;
        vec2 texelSize = vec2(1.0 / 1920.0, 1.0 / 1080.0);
        vec4 left = texture2D(colorTexture, v_textureCoordinates - vec2(texelSize.x, 0.0));
        vec4 right = texture2D(colorTexture, v_textureCoordinates + vec2(texelSize.x, 0.0));
        vec4 top = texture2D(colorTexture, v_textureCoordinates + vec2(0.0, texelSize.y));
        vec4 bottom = texture2D(colorTexture, v_textureCoordinates - vec2(0.0, texelSize.y));
        
        edge = abs(dot(color.rgb - left.rgb, vec3(0.299, 0.587, 0.114))) +
               abs(dot(color.rgb - right.rgb, vec3(0.299, 0.587, 0.114))) +
               abs(dot(color.rgb - top.rgb, vec3(0.299, 0.587, 0.114))) +
               abs(dot(color.rgb - bottom.rgb, vec3(0.299, 0.587, 0.114)));
        
        thermalColor += edge * 0.5 * u_intensity;
        
        gl_FragColor = vec4(thermalColor, color.a);
      }
    `;

    const stage = new this.Cesium.PostProcessStage({
      fragmentShader,
      uniforms: {
        u_intensity: intensity,
      },
    });

    this.viewer.scene.postProcessStages.add(stage);
    this.currentStages.push(stage);
  }

  /**
   * Applies wireframe effect shader
   * @private
   */
  private applyWireframeEffect(config: Partial<EffectConfig> = {}): void {
    const intensity = config.intensity ?? 1.0;

    const fragmentShader = `
      uniform float u_intensity;
      uniform sampler2D colorTexture;
      varying vec2 v_textureCoordinates;

      void main(void) {
        vec4 color = texture2D(colorTexture, v_textureCoordinates);
        
        // Convert to grayscale
        float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        
        // Create grid pattern
        vec2 grid = fract(v_textureCoordinates * 100.0);
        float lineWidth = 0.02 * u_intensity;
        float line = step(1.0 - lineWidth, grid.x) + step(1.0 - lineWidth, grid.y);
        
        // Add larger grid
        vec2 gridLarge = fract(v_textureCoordinates * 20.0);
        float lineWidthLarge = 0.01 * u_intensity;
        float lineLarge = step(1.0 - lineWidthLarge, gridLarge.x) + step(1.0 - lineWidthLarge, gridLarge.y);
        
        // Combine effects
        vec3 baseColor = vec3(0.05, 0.05, 0.1);
        vec3 gridColor = vec3(0.2, 0.6, 1.0);
        vec3 gridColorLarge = vec3(0.1, 0.3, 0.5);
        
        vec3 wireColor = mix(baseColor, gridColor, line);
        wireColor = mix(wireColor, gridColorLarge, lineLarge * 0.5);
        
        // Add subtle depth shading
        wireColor *= 0.7 + gray * 0.3;
        
        gl_FragColor = vec4(wireColor, color.a);
      }
    `;

    const stage = new this.Cesium.PostProcessStage({
      fragmentShader,
      uniforms: {
        u_intensity: intensity,
      },
    });

    this.viewer.scene.postProcessStages.add(stage);
    this.currentStages.push(stage);
  }

  /**
   * Applies a custom shader effect
   * @param fragmentShader - GLSL fragment shader code
   * @param uniforms - Custom uniform values
   */
  applyCustomShader(fragmentShader: string, uniforms: Record<string, any> = {}): void {
    if (!this.viewer || !this.Cesium) return;

    const stage = new this.Cesium.PostProcessStage({
      fragmentShader,
      uniforms,
    });

    this.viewer.scene.postProcessStages.add(stage);
    this.currentStages.push(stage);
  }

  /**
   * Enables or disables FXAA anti-aliasing
   * @param enabled - Whether to enable FXAA
   */
  setFXAA(enabled: boolean): void {
    if (!this.viewer) return;
    this.viewer.scene.postProcessStages.fxaa.enabled = enabled;
  }

  /**
   * Destroys the manager and cleans up resources
   */
  destroy(): void {
    this.clearStages();
  }
}

export default PostProcessing;
