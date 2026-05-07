import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const starVertexShader = `
  attribute float aSize;
  attribute vec3 aColor;
  varying vec3 vColor;
  uniform float uPixelRatio;

  void main() {
    vColor = aColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPixelRatio * (200.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const starFragmentShader = `
  varying vec3 vColor;
  uniform float uTime;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float dist = length(c);
    if (dist > 0.5) discard;

    // Twinkle effect
    float twinkle = sin(uTime * (1.0 + vColor.r * 5.0) + vColor.g * 100.0) * 0.2 + 0.8;
    
    // Core glow
    float glow = exp(-dist * dist * 30.0);
    
    // Diffraction spikes for brighter stars (higher vColor intensity)
    float spikes = 0.0;
    if (vColor.r + vColor.g + vColor.b > 2.5) {
      float pulse = 0.5 + 0.5 * sin(uTime * 0.5);
      float spike1 = exp(-abs(c.x) * 50.0) * exp(-abs(c.y) * 2.0);
      float spike2 = exp(-abs(c.y) * 50.0) * exp(-abs(c.x) * 2.0);
      spikes = (spike1 + spike2) * 0.4;
    }

    gl_FragColor = vec4(vColor, (glow + spikes) * twinkle);
  }
`;

export function Starfield() {
  const meshRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { positions, colors, sizes } = useMemo(() => {
    const count = 800;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const siz = new Float32Array(count);

    const spectralClasses: [number, number, number][] = [
      [0.6, 0.7, 1.0], // O/B - Blue
      [0.8, 0.9, 1.0], // A - White-blue
      [1.0, 1.0, 1.0], // F - White
      [1.0, 1.0, 0.8], // G - Yellow-white
      [1.0, 0.9, 0.6], // K - Orange
      [1.0, 0.6, 0.4], // M - Red
    ];

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      // Spherical distribution
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 30 + Math.random() * 70;

      pos[i3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i3 + 2] = r * Math.cos(phi);

      // Random spectral class
      const spec = spectralClasses[Math.floor(Math.random() * spectralClasses.length)];
      const intensity = Math.random() < 0.05 ? 1.0 : 0.6 + Math.random() * 0.4;
      
      col[i3] = spec[0] * intensity;
      col[i3 + 1] = spec[1] * intensity;
      col[i3 + 2] = spec[2] * intensity;

      // Some stars are exceptionally bright and large (get diffraction spikes)
      if (Math.random() < 0.02) {
        siz[i] = 4.0 + Math.random() * 4.0;
        col[i3] = 1.0; col[i3 + 1] = 1.0; col[i3 + 2] = 1.0; // Force white for brightest
      } else {
        siz[i] = 0.5 + Math.random() * 1.5;
      }
    }
    return { positions: pos, colors: col, sizes: siz };
  }, []);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aColor" args={[colors, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={starVertexShader}
        fragmentShader={starFragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uPixelRatio: { value: Math.min(window.devicePixelRatio, 1.0) },
        }}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
