import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { COLOR_THEMES, type GalaxySettings } from "./types";

const vertexShader = `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aBrightness;
  attribute float aTemperature;
  varying vec3 vColor;
  varying float vBrightness;
  varying float vTemperature;
  uniform float uTime;
  uniform float uPixelRatio;

  void main() {
    vColor = aColor;
    vBrightness = aBrightness;
    vTemperature = aTemperature;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPixelRatio * (350.0 / -mvPosition.z);
    gl_PointSize = max(gl_PointSize, 0.5);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vBrightness;
  varying float vTemperature;

  void main() {
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    if (dist > 0.5) discard;

    // Multi-layered glow for 3D sphere-like appearance
    float hardCore = exp(-dist * dist * 80.0);
    float softCore = exp(-dist * dist * 20.0);
    float outerGlow = exp(-dist * dist * 5.0);
    float haze = exp(-dist * dist * 2.0);

    // Combine layers for depth
    float intensity = hardCore * 0.5 + softCore * 0.3 + outerGlow * 0.15 + haze * 0.05;
    float alpha = intensity * vBrightness;

    // Hot white core fading to color at edges — simulates stellar atmosphere
    vec3 hotWhite = vec3(1.0, 0.98, 0.95);
    vec3 col = mix(vColor, hotWhite, hardCore * 0.8 + softCore * 0.3);

    // Slight chromatic fringe at the edge for realism
    col.r += outerGlow * 0.05 * vTemperature;
    col.b += outerGlow * 0.05 * (1.0 - vTemperature);

    // Boost brightness for the core
    col *= (1.0 + hardCore * 2.0 + softCore * 0.5);

    gl_FragColor = vec4(col, alpha);
  }
`;

interface Props {
  settings: GalaxySettings;
}

// Diverse color palette for Milky Way — stars have varied spectral classes
const MILKYWAY_ACCENT_COLORS: [number, number, number][] = [
  [0.6, 0.7, 1.0],   // Blue-white hot stars
  [0.9, 0.85, 0.7],  // Warm yellow giants
  [1.0, 0.5, 0.3],   // Orange-red dwarfs
  [0.5, 0.6, 1.0],   // Cool blue
  [1.0, 0.9, 0.5],   // Golden
  [0.8, 0.5, 0.9],   // Faint purple nebula regions
  [0.4, 0.9, 0.8],   // Teal emission nebula
  [1.0, 0.35, 0.5],  // Rose HII regions
  [0.95, 0.95, 1.0], // Pure white
];

export function GalaxyParticles({ settings }: Props) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { positions, colors, sizes, brightnesses, temperatures } = useMemo(() => {
    const count = settings.particleCount;
    const theme = COLOR_THEMES[settings.theme] || COLOR_THEMES.milkyway;
    const arms = settings.arms;
    const tightness = settings.tightness * 3 + 0.5;
    const isMilkyWay = settings.theme === "milkyway";

    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const siz = new Float32Array(count);
    const bri = new Float32Array(count);
    const temp = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const armIndex = i % arms;
      const armAngle = (armIndex / arms) * Math.PI * 2;

      // Radius with exponential distribution favoring center
      const r = Math.pow(Math.random(), 1.5) * 15;

      // Spiral angle
      const spiralAngle = r * tightness + armAngle;

      // Spread increases with distance
      const spread = r * 0.15 + 0.1;
      const offX = (Math.random() - 0.5) * spread * 2;
      const offY = (Math.random() - 0.5) * spread * 0.4;
      const offZ = (Math.random() - 0.5) * spread * 2;

      pos[i3] = Math.cos(spiralAngle) * r + offX;
      pos[i3 + 1] = offY * (1 - r / 20);
      pos[i3 + 2] = Math.sin(spiralAngle) * r + offZ;

      // Normalized distance
      const t = Math.min(r / 12, 1);

      // Temperature (0 = cool/red, 1 = hot/blue)
      const starTemp = Math.random();
      temp[i] = starTemp;

      let baseColor: [number, number, number];

      if (isMilkyWay) {
        // Rich, diverse coloring for Milky Way
        // Base gradient from core to outer
        let gradient: [number, number, number];
        if (t < 0.2) {
          const lt = t / 0.2;
          gradient = [
            1.0 * (1 - lt) + 0.7 * lt,
            0.92 * (1 - lt) + 0.75 * lt,
            0.7 * (1 - lt) + 0.95 * lt,
          ];
        } else if (t < 0.5) {
          const lt = (t - 0.2) / 0.3;
          gradient = [
            0.7 * (1 - lt) + 0.85 * lt,
            0.75 * (1 - lt) + 0.65 * lt,
            0.95 * (1 - lt) + 0.5 * lt,
          ];
        } else {
          const lt = (t - 0.5) / 0.5;
          gradient = [
            0.85 * (1 - lt) + 0.6 * lt,
            0.65 * (1 - lt) + 0.4 * lt,
            0.5 * (1 - lt) + 0.3 * lt,
          ];
        }

        // Mix in a random accent color for diversity
        const accent = MILKYWAY_ACCENT_COLORS[Math.floor(Math.random() * MILKYWAY_ACCENT_COLORS.length)];
        const accentMix = Math.random() * 0.5; // up to 50% accent blend
        baseColor = [
          gradient[0] * (1 - accentMix) + accent[0] * accentMix,
          gradient[1] * (1 - accentMix) + accent[1] * accentMix,
          gradient[2] * (1 - accentMix) + accent[2] * accentMix,
        ];
      } else {
        // Other themes use the standard gradient
        if (t < 0.3) {
          const lt = t / 0.3;
          baseColor = [
            theme.core[0] * (1 - lt) + theme.mid[0] * lt,
            theme.core[1] * (1 - lt) + theme.mid[1] * lt,
            theme.core[2] * (1 - lt) + theme.mid[2] * lt,
          ];
        } else {
          const lt = (t - 0.3) / 0.7;
          baseColor = [
            theme.mid[0] * (1 - lt) + theme.outer[0] * lt,
            theme.mid[1] * (1 - lt) + theme.outer[1] * lt,
            theme.mid[2] * (1 - lt) + theme.outer[2] * lt,
          ];
        }
      }

      // Random color jitter
      col[i3] = Math.max(0, Math.min(1, baseColor[0] + (Math.random() - 0.5) * 0.15));
      col[i3 + 1] = Math.max(0, Math.min(1, baseColor[1] + (Math.random() - 0.5) * 0.15));
      col[i3 + 2] = Math.max(0, Math.min(1, baseColor[2] + (Math.random() - 0.5) * 0.15));

      // Size — larger near center, some random big/bright stars
      const isBigStar = Math.random() > 0.993;
      siz[i] = isBigStar
        ? 4 + Math.random() * 5
        : (1 - t * 0.4) * 2.0 + Math.random() * 0.8;

      // Brightness — brighter near center, with variation
      bri[i] = isBigStar
        ? 0.9 + Math.random() * 0.1
        : (1 - t * 0.5) * 0.7 + Math.random() * 0.4;
    }

    return { positions: pos, colors: col, sizes: siz, brightnesses: bri, temperatures: temp };
  }, [settings.particleCount, settings.theme, settings.arms, settings.tightness]);

  useEffect(() => {
    if (pointsRef.current) {
      const geo = pointsRef.current.geometry;
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geo.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
      geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
      geo.setAttribute("aBrightness", new THREE.BufferAttribute(brightnesses, 1));
      geo.setAttribute("aTemperature", new THREE.BufferAttribute(temperatures, 1));
    }
  }, [positions, colors, sizes, brightnesses, temperatures]);

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * settings.rotationSpeed * 0.1;
    }
  });

  return (
    <group rotation={[settings.tilt, 0, 0]}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-aColor" args={[colors, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
          <bufferAttribute attach="attributes-aBrightness" args={[brightnesses, 1]} />
          <bufferAttribute attach="attributes-aTemperature" args={[temperatures, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={materialRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={{
            uTime: { value: 0 },
            uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
          }}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}
