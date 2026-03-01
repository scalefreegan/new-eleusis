import { Renderer, Program, Mesh, Triangle, type OGLRenderingContext } from 'ogl';

export const vertexShader = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0, 1);
  }
`;

export const fragmentShader = `
  precision highp float;
  uniform float uTime;
  uniform vec2 uResolution;

  // Noise function
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  float fbm(vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 0.0;

    for (int i = 0; i < 6; i++) {
      value += amplitude * noise(st);
      st *= 2.0;
      amplitude *= 0.5;
    }

    return value;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution;

    // Animated noise
    vec2 noiseCoord = uv * 3.0 + uTime * 0.1;
    float n = fbm(noiseCoord);

    // Balatro-inspired gradient (purple to blue)
    vec3 color1 = vec3(0.102, 0.059, 0.184); // Deep purple (#1a0f2e)
    vec3 color2 = vec3(0.176, 0.106, 0.306); // Purple (#2d1b4e)
    vec3 color3 = vec3(0.118, 0.227, 0.373); // Blue (#1e3a5f)

    // Vertical gradient with noise
    float gradientMix = uv.y + n * 0.3;
    vec3 gradient = mix(color1, color2, smoothstep(0.0, 0.5, gradientMix));
    gradient = mix(gradient, color3, smoothstep(0.5, 1.0, gradientMix));

    // Add subtle moving waves
    float wave = sin(uv.x * 10.0 + uTime * 0.5) * 0.02;
    wave += sin(uv.y * 8.0 - uTime * 0.3) * 0.02;

    // Add glow effect
    float glow = smoothstep(0.4, 0.6, uv.y + wave);
    vec3 glowColor = vec3(0.541, 0.169, 0.886); // Purple accent (#8a2be2)
    gradient = mix(gradient, glowColor, glow * 0.1);

    // Vignette
    float vignette = smoothstep(0.7, 0.3, length(uv - 0.5));
    gradient *= vignette * 0.7 + 0.3;

    gl_FragColor = vec4(gradient, 1.0);
  }
`;

export interface BackgroundShaderProps {
  canvas: HTMLCanvasElement;
  onReady?: () => void;
}

export class BackgroundShader {
  private renderer: Renderer;
  private gl: OGLRenderingContext;
  private program: Program;
  private mesh: Mesh;
  private animationId: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    // Create renderer
    this.renderer = new Renderer({
      canvas,
      alpha: true,
      width: window.innerWidth,
      height: window.innerHeight,
      dpr: Math.min(window.devicePixelRatio, 2)
    });

    this.gl = this.renderer.gl;

    // Create shader program
    this.program = new Program(this.gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: [window.innerWidth, window.innerHeight] }
      }
    });

    // Create fullscreen triangle
    const geometry = new Triangle(this.gl);
    this.mesh = new Mesh(this.gl, { geometry, program: this.program });

    // Handle resize
    window.addEventListener('resize', this.handleResize);
    this.handleResize();

    // Start animation
    this.animate(0);
  }

  private handleResize = () => {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    if (this.program.uniforms.uResolution) {
      this.program.uniforms.uResolution.value = [window.innerWidth, window.innerHeight];
    }
  };

  private animate = (time: number) => {
    this.animationId = requestAnimationFrame(this.animate);

    if (this.program.uniforms.uTime) {
      this.program.uniforms.uTime.value = time * 0.001; // Convert to seconds
    }

    this.renderer.render({ scene: this.mesh });
  };

  public destroy() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', this.handleResize);
  }
}

export function createBackgroundShader(canvas: HTMLCanvasElement): BackgroundShader | null {
  try {
    return new BackgroundShader(canvas);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('WebGL') || msg.includes('context')) {
      console.warn('[BackgroundShader] WebGL unavailable, using CSS fallback:', msg);
    } else {
      console.error('[BackgroundShader] Unexpected shader init error:', msg, e);
    }
    return null;
  }
}
