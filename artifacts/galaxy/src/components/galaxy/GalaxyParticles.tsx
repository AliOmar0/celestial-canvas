import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { COLOR_THEMES, type GalaxySettings, type GalaxyMorphology } from "./types";

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

// ---- DUST LANE LAYER (multiply blending = genuine dark absorption) ----
// Additive blending physically cannot darken what is behind it, so it can never
// produce a dark dust lane. This separate layer uses MultiplyBlending: each
// sprite multiplies the bright galaxy behind it toward a dark brown at its
// center and toward white (no change) at its edges — exactly how a real dust
// lane absorbs starlight.
const dustVertexShader = `
  attribute float aSize;
  uniform float uPixelRatio;
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPixelRatio * (330.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const dustFragmentShader = `
  uniform vec3 uDustColor;
  uniform float uStrength;
  void main() {
    float dist = length(gl_PointCoord - 0.5);
    float mask = smoothstep(0.5, 0.0, dist); // 1 at center -> 0 at edge
    // White where faint (multiply by 1 = no change), dark brown at the core.
    vec3 col = mix(vec3(1.0), uDustColor, mask * uStrength);
    gl_FragColor = vec4(col, 1.0);
  }
`;

interface Props {
  settings: GalaxySettings;
}

// Cheap approximate normal distribution in [-1, 1] (sum of 3 uniforms).
function gaussian(): number {
  return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
}

function hasDustLane(m: GalaxyMorphology): boolean {
  return m === "edgeOn" || m === "dustLane";
}

export function GalaxyParticles({ settings }: Props) {
  const pointsRef = useRef<THREE.Points>(null);
  const dustRef = useRef<THREE.Points>(null);
  const spinRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const morphology = settings.morphology;

  const { positions, colors, sizes, brightnesses, types } = useMemo(() => {
    // Capping at 150k for better stability across all hardware
    const count = Math.max(1, Math.min(settings.particleCount, 150000));
    const theme = COLOR_THEMES[settings.theme] || COLOR_THEMES.andromeda;
    const arms = Math.max(1, Math.floor(settings.arms));
    const tightness = settings.tightness * 4 + 0.5;

    const isEdgeOn = morphology === "edgeOn";
    const isStarburst = morphology === "starburst";
    const isFlocculent = morphology === "flocculent";
    const isGrand = morphology === "grandDesign";

    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const siz = new Float32Array(count);
    const bri = new Float32Array(count);
    const typ = new Float32Array(count);

    const radialLimit = 15;
    const invRadialLimit = 1 / radialLimit;

    // ---- ARM ASYMMETRY: per-arm radial scale + density weight ----
    const armScales: number[] = [];
    const armWeights: number[] = [];
    if (settings.armAsymmetry) {
      let s = 1234 + arms * 17;
      const rng = () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
      };
      for (let a = 0; a < arms; a++) {
        armScales.push(0.65 + rng() * 0.55);
        armWeights.push(0.55 + rng() * 0.85);
      }
    }

    // ---- FLOCCULENT SPURS: many short, scattered arc fragments ----
    // Real flocculent galaxies (M63, M101, M33) have no clean grand arms — just
    // dozens of patchy, feathery spurs. We pre-seed a fixed bank of spurs so the
    // shape is stable across re-renders.
    const SPUR_COUNT = 24 + arms * 5;
    const spurR: number[] = [];
    const spurA: number[] = [];
    const spurLen: number[] = [];
    const spurWidth: number[] = [];
    if (isFlocculent) {
      let fs = 7777 + arms * 31;
      const frng = () => {
        fs = (fs * 9301 + 49297) % 233280;
        return fs / 233280;
      };
      for (let k = 0; k < SPUR_COUNT; k++) {
        spurR.push(1.5 + frng() * (radialLimit - 2.0));
        spurA.push(frng() * Math.PI * 2);
        spurLen.push(0.25 + frng() * 0.8);
        spurWidth.push(0.4 + frng() * 0.9);
      }
    }

    // ---- STELLAR POPULATIONS: warm bulge → cool arms tint ----
    const popI = [0.55, 0.7, 1.15];
    const popII = [1.15, 0.95, 0.7];

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // ---- Particle composition (star / gas / dust) is morphology-aware ----
      let gasCut = 0.88;
      let dustCut = 0.12;
      if (isStarburst) gasCut = 0.74; // lots of glowing gas
      if (isEdgeOn) dustCut = 0.04; // dark lane handled by the multiply layer

      const randType = Math.random();
      let pType = 0.0;
      if (randType > gasCut) pType = 1.0;
      else if (randType < dustCut) pType = 2.0;

      let px = 0;
      let py = 0;
      let pz = 0;
      let finalR = 0;
      let isCoreBulge = false;
      let armWeight = 1.0;
      let isOutflow = false;

      if (isStarburst) {
        // ---- M82: an elongated cigar with bipolar gas plumes ----
        if (pType === 1.0 && Math.random() < 0.55) {
          // Hot hydrogen blown out perpendicular to the long (X) axis.
          isOutflow = true;
          const side = Math.random() < 0.5 ? 1 : -1;
          const h = Math.pow(Math.random(), 0.7) * 7.0;
          const spread = 0.5 + h * 0.22;
          px = (Math.random() - 0.5) * spread * 1.6;
          py = side * (0.8 + h);
          pz = (Math.random() - 0.5) * spread;
          finalR = Math.hypot(px, pz);
        } else {
          const along = (Math.random() * 2 - 1);
          const longR = Math.sign(along) * Math.pow(Math.abs(along), 0.9) * 7.5;
          const taper = 1.0 - Math.min(1, Math.abs(along)) * 0.6;
          px = longR + (Math.random() - 0.5) * 0.6;
          py = (Math.random() - 0.5) * 1.5 * taper;
          pz = (Math.random() - 0.5) * 2.2 * taper;
          finalR = Math.hypot(px, pz);
          isCoreBulge = Math.abs(along) < 0.18;
        }
      } else if (isEdgeOn) {
        // ---- M104: a big spherical bulge + a thin, wide disk ----
        const inBulge = Math.random() < 0.5;
        if (inBulge) {
          const br = Math.pow(Math.random(), 0.55) * 3.4;
          const u = Math.random() * Math.PI * 2;
          const v = Math.acos(Math.random() * 2 - 1);
          px = br * Math.sin(v) * Math.cos(u);
          py = br * Math.cos(v) * 0.85;
          pz = br * Math.sin(v) * Math.sin(u);
          finalR = br;
          isCoreBulge = true;
        } else {
          // Thin disk, ring-weighted toward the outer edge.
          const rr = 2.5 + Math.pow(Math.random(), 0.8) * (radialLimit - 2.5);
          const ang = Math.random() * Math.PI * 2;
          px = Math.cos(ang) * rr;
          pz = Math.sin(ang) * rr;
          py = (Math.random() - 0.5) * 0.45;
          finalR = rr;
        }
      } else if (isFlocculent) {
        // ---- M63 / M101 / M33: patchy spur fragments + smooth disk floor ----
        if (Math.random() < 0.7) {
          const k = (Math.random() * SPUR_COUNT) | 0;
          const da = (Math.random() - 0.5) * spurLen[k];
          const rr = Math.max(0.5, spurR[k] + (Math.random() - 0.5) * spurWidth[k] + da * 2.0);
          const ang = spurA[k] + da + rr * tightness * 0.18;
          px = Math.cos(ang) * rr;
          pz = Math.sin(ang) * rr;
          py = (Math.random() - 0.5) * (0.28 + rr * 0.035);
          finalR = rr;
        } else {
          const rr = Math.pow(Math.random(), 1.3) * radialLimit;
          const ang = Math.random() * Math.PI * 2;
          px = Math.cos(ang) * rr;
          pz = Math.sin(ang) * rr;
          py = (Math.random() - 0.5) * (0.28 + rr * 0.035);
          finalR = rr;
          isCoreBulge = Math.random() < 0.12 && rr < 2.0;
        }
      } else {
        // ---- SPIRAL FAMILY: spiral / grandDesign / dustLane ----
        const armIndex = i % arms;
        const angleOffset = (armIndex / arms) * Math.PI * 2;
        const armScale = settings.armAsymmetry ? armScales[armIndex] : 1.0;
        armWeight = settings.armAsymmetry ? armWeights[armIndex] : 1.0;

        const r = Math.pow(Math.random(), 1.4) * radialLimit * armScale;
        isCoreBulge = Math.random() < 0.15 && r < 2.5;
        const spiralAngle = r * tightness + angleOffset;

        // Grand-design arms are tight and high-contrast: most stars hug the arm
        // centerline (small gaussian spread) with only a thin inter-arm floor.
        const interArm = isGrand ? 0.16 : 0.4;
        const armSigma = isGrand ? 0.32 : 1.0;
        const noiseAmp =
          (pType === 2.0 ? 2.5 : pType === 1.0 ? 1.8 : 1.2) * settings.dispersion * armSigma;

        let angle: number;
        if (isCoreBulge) {
          angle = Math.random() * Math.PI * 2;
        } else if (Math.random() < interArm) {
          angle = Math.random() * Math.PI * 2; // smooth disk between arms
        } else {
          angle = spiralAngle + gaussian() * noiseAmp / (Math.pow(r, 0.4) + 1.0);
        }

        const radialNoise = (Math.random() - 0.5) * settings.dispersion * 0.4;
        finalR = Math.max(0, r + (isCoreBulge ? 0 : radialNoise));

        const diskWarp = Math.sin(finalR * 0.2) * 0.4;
        const verticalSpread = isCoreBulge
          ? 1.2
          : (pType === 0.0 ? 0.35 + finalR * 0.05 : 1.2) * settings.dispersion;
        py = (Math.random() - 0.5) * verticalSpread * Math.exp(-finalR * (isCoreBulge ? 0.25 : 0.05)) + diskWarp;

        px = Math.cos(angle) * finalR;
        pz = Math.sin(angle) * finalR;

        // ---- BAR STRUCTURE: stretch inner particles into an elongated bar ----
        if (settings.barStructure && finalR < 4.0) {
          const barFalloff = 1.0 - Math.min(1.0, finalR / 4.0);
          const barStrength = barFalloff * barFalloff;
          px *= 1.0 + 0.85 * barStrength;
          pz *= 1.0 - 0.55 * barStrength;
        }
      }

      typ[i] = pType;
      pos[i3] = px;
      pos[i3 + 1] = py;
      pos[i3 + 2] = pz;

      const radialFactor = 0.15 + Math.pow(finalR * invRadialLimit, 1.3) * 1.25;

      let bRgb: [number, number, number];
      if (finalR < 2.5 || isCoreBulge) {
        const mixRatio = Math.min(1, finalR / 2.5);
        bRgb = [
          theme.core[0] * (1 - mixRatio) + theme.mid[0] * mixRatio,
          theme.core[1] * (1 - mixRatio) + theme.mid[1] * mixRatio,
          theme.core[2] * (1 - mixRatio) + theme.mid[2] * mixRatio,
        ];
      } else {
        const mixRatio = Math.min(1, (finalR - 2.5) / 12.5);
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

      // Starburst gas (especially the bipolar plume) glows red H-alpha.
      if (isStarburst && pType === 1.0) {
        bRgb = isOutflow ? [1.0, 0.3, 0.2] : [1.0, 0.45, 0.3];
      }

      const colorVariance = Math.random();
      let sFactor = radialFactor;
      if (pType === 2.0) sFactor *= 0.5;

      let wMix = 0.0;
      const hShift = (Math.random() - 0.5) * 0.15;
      if (colorVariance > 0.9 && pType === 0.0) {
        wMix = Math.random() * 0.3 * radialFactor;
        sFactor *= 1.1;
      }

      let cR = bRgb[0] * sFactor + wMix + hShift * 0.2;
      let cG = bRgb[1] * sFactor + wMix - hShift * 0.1;
      let cB = bRgb[2] * sFactor + wMix + hShift * 0.3;

      // ---- STELLAR POPULATIONS — radial Pop II (yellow) → Pop I (blue) tint ----
      if (settings.stellarPopulations && pType === 0.0) {
        const popMix = Math.min(1.0, Math.max(0.0, (finalR - 1.0) / 11.0));
        const tintR = popII[0] * (1 - popMix) + popI[0] * popMix;
        const tintG = popII[1] * (1 - popMix) + popI[1] * popMix;
        const tintB = popII[2] * (1 - popMix) + popI[2] * popMix;
        const strength = 0.6;
        cR = cR * (1 - strength) + cR * tintR * strength;
        cG = cG * (1 - strength) + cG * tintG * strength;
        cB = cB * (1 - strength) + cB * tintB * strength;
      }

      col[i3] = Math.min(1.0, Math.max(0, cR));
      col[i3 + 1] = Math.min(1.0, Math.max(0, cG));
      col[i3 + 2] = Math.min(1.0, Math.max(0, cB));

      const coreDim = isCoreBulge ? 0.35 : 1.0;
      if (pType === 1.0) {
        siz[i] = (isOutflow ? 2.4 : 1.8) + Math.random() * 2.5;
        bri[i] = (0.15 + Math.random() * 0.25) * coreDim * armWeight * (isOutflow ? 1.4 : 1.0);
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
    morphology,
  ]);

  // ---- Dark dust-lane geometry (multiply layer) ----
  const dust = useMemo(() => {
    if (!hasDustLane(morphology)) return null;
    const isEdgeOn = morphology === "edgeOn";
    const n = Math.min(Math.floor(settings.particleCount * 0.22), 24000);
    const dpos = new Float32Array(n * 3);
    const dsiz = new Float32Array(n);
    const radialLimit = 15;

    for (let i = 0; i < n; i++) {
      const i3 = i * 3;
      if (isEdgeOn) {
        // Thin equatorial ring — edge-on this becomes the Sombrero's dark band.
        const rr = 3.0 + Math.pow(Math.random(), 0.7) * (radialLimit - 3.0);
        const ang = Math.random() * Math.PI * 2;
        dpos[i3] = Math.cos(ang) * rr;
        dpos[i3 + 1] = (Math.random() - 0.5) * 0.22;
        dpos[i3 + 2] = Math.sin(ang) * rr;
        dsiz[i] = 4.0 + Math.random() * 4.5;
      } else {
        // dustLane (M64): a dense crescent sweeping across the near side of the
        // bright bulge, plus a faint outer disk veil.
        if (Math.random() < 0.7) {
          const rr = 1.0 + Math.pow(Math.random(), 0.8) * 3.0;
          const ang = -1.1 + Math.random() * 2.2; // arc across the front (+Z)
          dpos[i3] = Math.sin(ang) * rr;
          dpos[i3 + 1] = (Math.random() - 0.5) * 0.3 + 0.15;
          dpos[i3 + 2] = Math.abs(Math.cos(ang)) * rr * 0.9 + 0.4;
          dsiz[i] = 3.5 + Math.random() * 4.0;
        } else {
          const rr = 2.0 + Math.random() * (radialLimit - 2.0);
          const ang = Math.random() * Math.PI * 2;
          dpos[i3] = Math.cos(ang) * rr;
          dpos[i3 + 1] = (Math.random() - 0.5) * 0.5;
          dpos[i3 + 2] = Math.sin(ang) * rr;
          dsiz[i] = 2.5 + Math.random() * 3.0;
        }
      }
    }
    return { dpos, dsiz, strength: isEdgeOn ? 0.92 : 0.8 };
  }, [morphology, settings.particleCount]);

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

  useEffect(() => {
    if (dustRef.current && dust) {
      const geo = dustRef.current.geometry;
      geo.setAttribute("position", new THREE.BufferAttribute(dust.dpos, 3));
      geo.setAttribute("aSize", new THREE.BufferAttribute(dust.dsiz, 1));
    }
  }, [dust]);

  useFrame((state, delta) => {
    if (spinRef.current) {
      spinRef.current.rotation.y += delta * settings.rotationSpeed * 0.1;
    }
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      const count = Math.max(1, settings.particleCount);
      materialRef.current.uniforms.uDensityFactor.value = 60000 / count;
      materialRef.current.uniforms.uBrightness.value = settings.brightness;
      materialRef.current.uniforms.uBloom.value = settings.bloom ? 2.4 : 1.0;
      materialRef.current.uniforms.uSoft.value = settings.softParticles ? 1.0 : 0.0;
      materialRef.current.uniforms.uParticle3D.value = settings.particles3D ? 1.0 : 0.0;
    }
  });

  return (
    <group rotation={[settings.tilt, 0, 0]}>
      <group ref={spinRef}>
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

        {dust && (
          <points ref={dustRef} renderOrder={10}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[dust.dpos, 3]} />
              <bufferAttribute attach="attributes-aSize" args={[dust.dsiz, 1]} />
            </bufferGeometry>
            <shaderMaterial
              vertexShader={dustVertexShader}
              fragmentShader={dustFragmentShader}
              uniforms={{
                uPixelRatio: { value: Math.min(window.devicePixelRatio, 1.0) },
                uDustColor: { value: new THREE.Color(0.22, 0.13, 0.08) },
                uStrength: { value: dust.strength },
              }}
              transparent
              depthWrite={false}
              depthTest={false}
              blending={THREE.MultiplyBlending}
            />
          </points>
        )}
      </group>
    </group>
  );
}
