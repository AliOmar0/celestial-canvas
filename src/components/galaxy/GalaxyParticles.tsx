import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { COLOR_THEMES, type GalaxySettings } from "./types";

const vertexShader = `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aBrightness;
  varying vec3 vColor;
  varying float vBrightness;
  uniform float uTime;
  uniform float uPixelRatio;

  void main() {
    vColor = aColor;
    vBrightness = aBrightness;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPixelRatio * (300.0 / -mvPosition.z);
    gl_PointSize = max(gl_PointSize, 0.5);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vBrightness;

  void main() {
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    if (dist > 0.5) discard;

    float glow = exp(-dist * dist * 8.0);
    float core = exp(-dist * dist * 32.0);
    float alpha = (glow * 0.6 + core * 0.4) * vBrightness;

    vec3 col = vColor * (1.0 + core * 1.5);
    gl_FragColor = vec4(col, alpha);
  }
`;

interface Props {
  settings: GalaxySettings;
}

export function GalaxyParticles({ settings }: Props) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { positions, colors, sizes, brightnesses } = useMemo(() => {
    const count = settings.particleCount;
    const theme = COLOR_THEMES[settings.theme] || COLOR_THEMES.milkyway;
    const arms = settings.arms;
    const tightness = settings.tightness * 3 + 0.5;

    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const siz = new Float32Array(count);
    const bri = new Float32Array(count);

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

      // Color based on distance from center
      const t = Math.min(r / 12, 1);
      let baseColor: [number, number, number];
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

      // Add slight random variation
      col[i3] = baseColor[0] + (Math.random() - 0.5) * 0.1;
      col[i3 + 1] = baseColor[1] + (Math.random() - 0.5) * 0.1;
      col[i3 + 2] = baseColor[2] + (Math.random() - 0.5) * 0.1;

      // Size — larger near center, some random big stars
      const isBigStar = Math.random() > 0.995;
      siz[i] = isBigStar ? 3 + Math.random() * 4 : (1 - t * 0.5) * 1.5 + Math.random() * 0.5;

      // Brightness — brighter near center
      bri[i] = isBigStar ? 1.0 : (1 - t * 0.6) * 0.8 + Math.random() * 0.3;
    }

    return { positions: pos, colors: col, sizes: siz, brightnesses: bri };
  }, [settings.particleCount, settings.theme, settings.arms, settings.tightness]);

  useEffect(() => {
    if (pointsRef.current) {
      const geo = pointsRef.current.geometry;
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geo.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
      geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
      geo.setAttribute("aBrightness", new THREE.BufferAttribute(brightnesses, 1));
    }
  }, [positions, colors, sizes, brightnesses]);

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
