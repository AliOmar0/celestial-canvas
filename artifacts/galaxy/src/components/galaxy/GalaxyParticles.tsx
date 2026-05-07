import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { COLOR_THEMES, type GalaxySettings } from "./types";

const vertexShader = `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aBrightness;
  attribute float aType; // 0: Star, 1: Gas, 2: Dust
  varying vec3 vColor;
  varying float vBrightness;
  varying float vType;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uBrightness;
  uniform float uDensityFactor;
  uniform float uParticle3D;

  void main() {
    vColor = aColor;
    vBrightness = aBrightness;
    vType = aType;
    
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPixelRatio * (330.0 / -mvPosition.z);
    
    if (vType == 1.0) gl_PointSize *= 2.5; // Gas is larger
    if (vType == 2.0) gl_PointSize *= 4.0; // Dust lanes are very large
    
    // 3D mode: enlarge sprites so the lit-sphere shading is actually visible
    if (uParticle3D > 0.5) gl_PointSize *= 2.2;
    
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vBrightness;
  varying float vType;
  uniform float uTime;
  uniform float uDensityFactor;
  uniform float uBrightness;
  uniform float uBloom;
  uniform float uSoft;
  uniform float uParticle3D;

  void main() {
    float dist = length(gl_PointCoord - 0.5);
    float finalBrightness = vBrightness * uDensityFactor * uBrightness * uBloom;
    
    // Smooth alpha mask instead of discard for better performance
    // Wider falloff when soft particles are enabled — fuzzier glow
    float falloffStart = mix(0.45, 0.05, uSoft);
    float alphaMask = smoothstep(0.5, falloffStart, dist);
    if (alphaMask < 0.001) discard;

    // 3D Particles: fake a lit-sphere shading from a fixed light direction.
    // Shade is normalized so peak brightness == 1.0 (no overall brightening),
    // but the lit pole stays full-intensity while the shaded side dims to ~5%.
    // Total energy is preserved — particles just look volumetric, not glowing.
    if (uParticle3D > 0.5) {
      vec2 n = (gl_PointCoord - 0.5) * 2.0;
      float r2 = dot(n, n);
      if (r2 <= 1.0) {
        float z = sqrt(1.0 - r2);
        vec3 normal = vec3(n.x, -n.y, z);
        vec3 light = normalize(vec3(-0.55, 0.55, 0.7));
        float ndl = max(0.0, dot(normal, light));
        // Pure diffuse falloff — peaks at 1.0, never above
        float shade = 0.05 + 0.95 * ndl;
        finalBrightness *= shade;
      } else {
        finalBrightness = 0.0;
      }
    }

    if (vType < 0.5) {
      // STAR RENDERING
      // Optimized falloff: combination of a sharp peak and a soft aura
      float intensity = (exp(-dist * 12.0) * 0.8 + exp(-dist * 4.0) * 0.2) * alphaMask;
      vec3 col = mix(vColor, vec3(1.0), exp(-dist * 20.0) * 0.9);
      // Color-shift bloom: hot pixels warmer, dim pixels cooler (mimics overexposed cameras)
      float bloomT = (uBloom - 1.0);
      if (bloomT > 0.0) {
        vec3 warmTint = vec3(1.0, 0.85, 0.65);
        vec3 coolTint = vec3(0.7, 0.85, 1.1);
        vec3 shift = mix(coolTint, warmTint, smoothstep(0.0, 0.6, intensity * vBrightness));
        col = mix(col, col * shift, clamp(bloomT * 0.5, 0.0, 0.6));
      }
      gl_FragColor = vec4(col, intensity * finalBrightness);
    } else if (vType < 1.5) {
      // GAS/NEBULA RENDERING (HII Regions)
      // Faster quadratic falloff
      float intensity = max(0.0, 0.25 - dist * 0.5) * alphaMask;
      gl_FragColor = vec4(vColor, intensity * finalBrightness * 0.4);
    } else {
      // DUST RENDERING (Dark absorption)
      float intensity = max(0.0, 0.2 - dist * 0.4) * alphaMask;
      gl_FragColor = vec4(vColor * 0.15, intensity * finalBrightness * 0.5);
    }
  }
`;

interface Props {
  settings: GalaxySettings;
}

export function GalaxyParticles({ settings }: Props) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { positions, colors, sizes, brightnesses, types } = useMemo(() => {
    // Capping at 150k for better stability across all hardware
    const count = Math.min(settings.particleCount, 150000);
    const theme = COLOR_THEMES[settings.theme] || COLOR_THEMES.andromeda;
    const arms = settings.arms;
    const tightness = settings.tightness * 4 + 0.5;

    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const siz = new Float32Array(count);
    const bri = new Float32Array(count);
    const typ = new Float32Array(count);

    // Pre-calculate common factors for performance
    const radialLimit = 15;
    const invRadialLimit = 1 / radialLimit;

    // ---- ARM ASYMMETRY: per-arm radial scale + density weight ----
    // Real galaxies aren't perfectly symmetric — one arm often dominates.
    // Deterministic per-arm values so toggling doesn't reroll randomly.
    const armScales: number[] = [];
    const armWeights: number[] = [];
    if (settings.armAsymmetry) {
      // Seeded LCG so it's stable across renders
      let s = 1234 + arms * 17;
      const rng = () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
      };
      for (let a = 0; a < arms; a++) {
        armScales.push(0.65 + rng() * 0.55);   // 0.65–1.20 length variation
        armWeights.push(0.55 + rng() * 0.85);  // 0.55–1.40 brightness variation
      }
    }

    // ---- STELLAR POPULATIONS: warm bulge → cool arms tint ----
    // Pop II (old) stars in the bulge are red/yellow; Pop I (young) stars
    // in the arms are hot blue. Mixing these tints with the theme color
    // creates the realistic radial color gradient seen in Hubble images.
    const popI = [0.55, 0.7, 1.15];   // blue tint for young arm stars
    const popII = [1.15, 0.95, 0.7];  // warm yellow tint for old bulge stars

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      const randType = Math.random();
      let pType = 0.0; 
      if (randType > 0.88) pType = 1.0; // Gas
      else if (randType < 0.12) pType = 2.0; // Dust
      typ[i] = pType;

      const armIndex = i % arms;
      const angleOffset = (armIndex / arms) * Math.PI * 2;

      // Asymmetry: per-arm radial scale (1.0 if disabled)
      const armScale = settings.armAsymmetry ? armScales[armIndex] : 1.0;

      const r = Math.pow(Math.random(), 1.4) * radialLimit * armScale;
      const isCoreBulge = Math.random() < 0.15 && r < 2.5;

      const spiralAngle = r * tightness + angleOffset;
      // Increased noise impact and added radial dispersion
      const noiseAmp = (pType === 2.0 ? 2.5 : (pType === 1.0 ? 1.8 : 1.2)) * settings.dispersion;
      const angle = isCoreBulge 
        ? Math.random() * Math.PI * 2 
        : spiralAngle + (Math.random() - 0.5) * noiseAmp / (Math.pow(r, 0.4) + 1.0);

      // Radial dispersion
      const radialNoise = (Math.random() - 0.5) * settings.dispersion * 0.4;
      const finalR = Math.max(0, r + (isCoreBulge ? 0 : radialNoise));

      // ENHANCED 3D DEPTH: Variable vertical spread and disk warp
      // Disk warp creates a subtle 'integral' shape
      const diskWarp = Math.sin(finalR * 0.2) * 0.4;
      const verticalSpread = isCoreBulge 
        ? 1.2 // More spherical core
        : (pType === 0.0 ? 0.35 + (finalR * 0.05) : 1.2) * settings.dispersion; // Dispersion also affects height
      
      const diskHeight = (Math.random() - 0.5) * verticalSpread * Math.exp(-finalR * (isCoreBulge ? 0.25 : 0.05)) + diskWarp;

      let px = Math.cos(angle) * finalR;
      const py = diskHeight;
      let pz = Math.sin(angle) * finalR;

      // ---- BAR STRUCTURE: stretch inner particles into an elongated bar ----
      // Real barred spirals (NGC 1300, NGC 1365) have a flat dense bar in the
      // center where stars on radial orbits pile up. We achieve this by
      // remapping the inner ~3.5 unit region into an elongated ellipse along
      // the X axis: stretch X by 1.8x, squash Z by 0.45x, with smooth falloff
      // so it blends into the spiral arms.
      if (settings.barStructure && finalR < 4.0) {
        const barFalloff = 1.0 - Math.min(1.0, finalR / 4.0);
        const barStrength = barFalloff * barFalloff; // 0..1, smooth
        const stretchX = 1.0 + 0.85 * barStrength;
        const squashZ = 1.0 - 0.55 * barStrength;
        px *= stretchX;
        pz *= squashZ;
      }

      pos[i3] = px;
      pos[i3 + 1] = py;
      pos[i3 + 2] = pz;

      const radialFactor = 0.15 + Math.pow(r * invRadialLimit, 1.3) * 1.25;

      let bRgb: [number, number, number];
      if (r < 2.5 || isCoreBulge) {
        const mixRatio = r / 2.5;
        bRgb = [
          theme.core[0] * (1 - mixRatio) + theme.mid[0] * mixRatio,
          theme.core[1] * (1 - mixRatio) + theme.mid[1] * mixRatio,
          theme.core[2] * (1 - mixRatio) + theme.mid[2] * mixRatio,
        ];
      } else {
        const mixRatio = (r - 2.5) / 12.5;
        if (pType === 1.0) bRgb = [0.95, 0.2, 0.6];
        else if (pType === 2.0) bRgb = [0.2, 0.15, 0.1];
        else {
          bRgb = [
            theme.mid[0] * (1 - mixRatio) + theme.outer[0] * mixRatio,
            theme.mid[1] * (1 - mixRatio) + theme.outer[1] * mixRatio,
            theme.mid[2] * (1 - mixRatio) + theme.outer[2] * mixRatio,
          ];
        }
      }

      // Shading and Hue Variance
      const colorVariance = Math.random();
      let sFactor = radialFactor;
      if (pType === 2.0) sFactor *= 0.5;

      let wMix = 0.0;
      let hShift = (Math.random() - 0.5) * 0.15;

      if (colorVariance > 0.9 && pType === 0.0) {
        wMix = Math.random() * 0.3 * radialFactor;
        sFactor *= 1.1;
      }

      let cR = bRgb[0] * sFactor + wMix + hShift * 0.2;
      let cG = bRgb[1] * sFactor + wMix - hShift * 0.1;
      let cB = bRgb[2] * sFactor + wMix + hShift * 0.3;

      // ---- STELLAR POPULATIONS — radial Pop II (yellow bulge) → Pop I (blue arm) tint ----
      // Only applied to STAR particles (gas/dust keep their natural colors).
      if (settings.stellarPopulations && pType === 0.0) {
        // 0 at center → 1 at outer disk
        const popMix = Math.min(1.0, Math.max(0.0, (finalR - 1.0) / 11.0));
        // Tint vector smoothly interpolates from warm yellow → cool blue
        const tintR = popII[0] * (1 - popMix) + popI[0] * popMix;
        const tintG = popII[1] * (1 - popMix) + popI[1] * popMix;
        const tintB = popII[2] * (1 - popMix) + popI[2] * popMix;
        // Apply at 60% strength so theme colors still come through
        const strength = 0.6;
        cR = cR * (1 - strength) + cR * tintR * strength;
        cG = cG * (1 - strength) + cG * tintG * strength;
        cB = cB * (1 - strength) + cB * tintB * strength;
      }

      col[i3] = Math.min(1.0, Math.max(0, cR));
      col[i3 + 1] = Math.min(1.0, Math.max(0, cG));
      col[i3 + 2] = Math.min(1.0, Math.max(0, cB));

      // Individual Brightness
      const coreDim = isCoreBulge ? 0.35 : 1.0;
      // Asymmetry: per-arm brightness weight
      const armWeight = settings.armAsymmetry ? armWeights[armIndex] : 1.0;
      if (pType === 1.0) {
        siz[i] = 1.8 + Math.random() * 2.5;
        bri[i] = (0.15 + Math.random() * 0.25) * coreDim * armWeight;
      } else if (pType === 2.0) {
        siz[i] = 3.0 + Math.random() * 5.0;
        bri[i] = (0.2 + Math.random() * 0.3) * coreDim * armWeight;
      } else {
        const isBrightStar = Math.random() < 0.008;
        siz[i] = isBrightStar ? 3.5 + Math.random() * 4.0 : 0.7 + Math.random() * 1.5;
        bri[i] = (isBrightStar ? 0.8 + Math.random() * 0.2 : 0.4 + Math.random() * 0.55) * coreDim * armWeight;
      }
    }

    return { positions: pos, colors: col, sizes: siz, brightnesses: bri, types: typ };
  }, [
    settings.particleCount,
    settings.theme,
    settings.arms,
    settings.tightness,
    settings.dispersion,
    settings.barStructure,
    settings.armAsymmetry,
    settings.stellarPopulations,
  ]);

  useEffect(() => {
    if (pointsRef.current) {
      const geo = pointsRef.current.geometry;
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geo.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
      geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
      geo.setAttribute("aBrightness", new THREE.BufferAttribute(brightnesses, 1));
      geo.setAttribute("aType", new THREE.BufferAttribute(types, 1));
    }
  }, [positions, colors, sizes, brightnesses, types]);

  useFrame((state, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * settings.rotationSpeed * 0.1;
    }
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      const count = settings.particleCount;
      // Linear normalization works much better for additive blending
      // Keeps total luminosity roughly constant across density levels
      materialRef.current.uniforms.uDensityFactor.value = 60000 / count;
      materialRef.current.uniforms.uBrightness.value = settings.brightness;
      materialRef.current.uniforms.uBloom.value = settings.bloom ? 2.4 : 1.0;
      materialRef.current.uniforms.uSoft.value = settings.softParticles ? 1.0 : 0.0;
      materialRef.current.uniforms.uParticle3D.value = settings.particles3D ? 1.0 : 0.0;
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
          <bufferAttribute attach="attributes-aType" args={[types, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={materialRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={{
            uTime: { value: 0 },
            uPixelRatio: { value: Math.min(window.devicePixelRatio, 1.0) },
            uDensityFactor: { value: 1.0 },
            uBrightness: { value: 1.0 },
            uBloom: { value: 1.0 },
            uSoft: { value: 0.0 },
            uParticle3D: { value: 0.0 },
          }}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

function exp(x: number) { return Math.exp(x); }
