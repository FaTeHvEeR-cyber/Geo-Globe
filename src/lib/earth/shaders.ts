export const thermalShader = `
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
      `;
export const wireframeShader = `
        uniform sampler2D colorTexture;
        in vec2 v_textureCoordinates;
        
        void main() {
          vec4 color = texture(colorTexture, v_textureCoordinates);
          
          // Sobel edge detection with smaller kernel for sharper edges
          vec2 texelSize = 1.0 / vec2(textureSize(colorTexture, 0));
          
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
      `;
