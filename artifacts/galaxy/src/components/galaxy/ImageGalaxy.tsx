import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * ImageGalaxy renders a real galaxy by sampling its actual NASA/Hubble photo
 * into a 3D point cloud — every particle takes its colour from a pixel, so the
 * result matches the photograph far more closely than any procedural spiral.
 *
 * Why this looks right:
 *  - Dust lanes (Sombrero, Black Eye) appear naturally as the *absence* of
 *    bright pixels — no special dark-lane trick needed.
 *  - Star-forming knots, asymmetric arms and colour gradients come straight
 *    from the real data.
 *  - A luminance-driven depth "relief" (bright regions dome toward the viewer)
 *    plus a gentle sway gives a 2.5D parallax feel when orbiting, without ever
 *    rotating the flat photo edge-on where it would vanish.
 *
 * It is also cheaper than the procedural engine: ~40-90k lightweight points and
 * none of the extra structural components, so the Real Galaxies tab runs
 * noticeably smoother.
 */

const vertexShader = `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aBrightness;
  varying vec3 vColor;
  varying float vBrightness;
  uniform float uPixelRatio;
  void main() {
    vColor = aColor;
    vBrightness = aBrightness;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPixelRatio * (330.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vBrightness;
  uniform float uBrightness;
  uniform float uDensityFactor;
  uniform float uBloom;
  void main() {
    float dist = length(gl_PointCoord - 0.5);
    float alphaMask = smoothstep(0.5, 0.08, dist);
    if (alphaMask < 0.001) discard;
    float intensity = (exp(-dist * 9.0) * 0.78 + exp(-dist * 3.5) * 0.24);
    vec3 col = mix(vColor, vec3(1.0), exp(-dist * 18.0) * 0.55);
    float finalBrightness = vBrightness * uDensityFactor * uBrightness * uBloom;
    gl_FragColor = vec4(col, intensity * alphaMask * finalBrightness);
  }
`;

interface GeomData {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  brightnesses: Float32Array;
  count: number;
}

interface Props {
  src: string;
  brightness: number;
  rotationSpeed: number;
  bloom: boolean;
}

const SPAN = 28; // world units across the longest edge of the photo
const MAX_DIM = 320; // sampling resolution along the longest edge
const HARD_CAP = 120000;

export function ImageGalaxy({ src, brightness, rotationSpeed, bloom }: Props) {
  const swayRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const [geom, setGeom] = useState<GeomData | null>(null);

  useEffect(() => {
    let cancelled = false;
    setGeom(null);
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      if (cancelled) return;
      const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, w, h);

      let px: Uint8ClampedArray;
      try {
        px = ctx.getImageData(0, 0, w, h).data;
      } catch {
        return; // tainted canvas — shouldn't happen for same-origin bundled assets
      }

      const cx = w / 2;
      const cy = h / 2;
      const pxToWorld = SPAN / Math.max(w, h);

      const positionsArr: number[] = [];
      const colorsArr: number[] = [];
      const sizesArr: number[] = [];
      const briArr: number[] = [];

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const r = px[idx] / 255;
          const g = px[idx + 1] / 255;
          const b = px[idx + 2] / 255;
          const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          if (lum < 0.05) continue; // dark sky / dust → no particle (reads as void)

          // Brighter pixels are sampled more densely; faint disk stays sparse.
          const incl = Math.min(1, lum * 1.7 + 0.1);
          if (Math.random() > incl) continue;

          // Cores and bright clusters get a couple of overlapping particles so
          // they read as luminous, blown-out highlights like in the photos.
          const reps = lum > 0.78 ? 3 : lum > 0.55 ? 2 : 1;
          for (let rep = 0; rep < reps; rep++) {
            const wx = (x + (Math.random() - 0.5) - cx) * pxToWorld;
            const wy = -(y + (Math.random() - 0.5) - cy) * pxToWorld; // flip → upright
            // Depth relief: bright regions dome toward the camera (+Z) for parallax.
            const dome = Math.pow(lum, 1.3) * 3.2;
            const wz = dome + (Math.random() - 0.5) * (0.4 + lum * 0.9);

            positionsArr.push(wx, wy, wz);
            colorsArr.push(
              Math.min(1, r * 1.08 + 0.02),
              Math.min(1, g * 1.05 + 0.02),
              Math.min(1, b * 1.12 + 0.03),
            );
            sizesArr.push(lum > 0.75 ? 2.0 + Math.random() * 2.4 : 0.75 + Math.random() * 1.4);
            briArr.push(0.32 + lum * 0.68);
          }
          if (positionsArr.length / 3 >= HARD_CAP) break;
        }
        if (positionsArr.length / 3 >= HARD_CAP) break;
      }

      const count = positionsArr.length / 3;
      if (count === 0 || cancelled) return;

      setGeom({
        positions: new Float32Array(positionsArr),
        colors: new Float32Array(colorsArr),
        sizes: new Float32Array(sizesArr),
        brightnesses: new Float32Array(briArr),
        count,
      });
    };

    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (swayRef.current) {
      // Gentle parallax sway — never a full spin, so the flat photo can't turn
      // edge-on and disappear.
      const speed = 0.1 + rotationSpeed * 0.18;
      swayRef.current.rotation.y = Math.sin(t * speed) * 0.28;
      swayRef.current.rotation.x = 0.12 + Math.sin(t * speed * 0.6) * 0.05;
    }
    if (matRef.current && geom) {
      matRef.current.uniforms.uBrightness.value = brightness;
      matRef.current.uniforms.uDensityFactor.value = 55000 / geom.count;
      matRef.current.uniforms.uBloom.value = bloom ? 2.4 : 1.2;
    }
  });

  if (!geom) return null;

  return (
    <group ref={swayRef}>
      <points>
        <bufferGeometry key={src}>
          <bufferAttribute attach="attributes-position" args={[geom.positions, 3]} />
          <bufferAttribute attach="attributes-aColor" args={[geom.colors, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[geom.sizes, 1]} />
          <bufferAttribute attach="attributes-aBrightness" args={[geom.brightnesses, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={matRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={{
            uPixelRatio: { value: Math.min(window.devicePixelRatio, 1.0) },
            uBrightness: { value: brightness },
            uDensityFactor: { value: 1.0 },
            uBloom: { value: bloom ? 2.4 : 1.2 },
          }}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}
