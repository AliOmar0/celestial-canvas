import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Billboard } from "@react-three/drei";
import { GalaxyParticles } from "./GalaxyParticles";
import { Starfield } from "./Starfield";
import { Galaxy2D } from "./Galaxy2D";
import { COLOR_THEMES, type GalaxySettings } from "./types";
import {
  Component,
  ReactNode,
  useState,
  useEffect,
  useRef,
  useMemo,
} from "react";
import * as THREE from "three";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class WebGLErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center w-full h-full bg-black text-white p-6 text-center">
          <div className="max-w-md w-full space-y-4">
            <h2 className="text-2xl font-bold text-red-500 mb-2">3D Rendering Failed</h2>
            <p className="text-sm opacity-80">
              An unexpected error occurred while rendering the 3D scene.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-white text-black font-semibold rounded-md hover:bg-zinc-200 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function FPSCounter() {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    let frames = 0;
    let last = performance.now();
    let raf = 0;
    const tick = () => {
      frames++;
      const now = performance.now();
      if (now - last >= 1000) {
        setFps(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const color = fps >= 50 ? "text-green-400" : fps >= 30 ? "text-amber-400" : "text-red-400";
  return (
    <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-[11px] border border-white/10 pointer-events-none font-mono z-30">
      <span className="text-white/50">FPS </span>
      <span className={color}>{fps}</span>
    </div>
  );
}

/* ---------- BLACK HOLE — soft, theme-tinted, fits the particle aesthetic ---------- */

const billboardVertex = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const haloFragment = `
  varying vec2 vUv;
  uniform vec3 uColor;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    if (d > 1.0) discard;
    float halo = pow(1.0 - d, 2.6) * 0.55;
    float rim = smoothstep(0.18, 0.28, d) * (1.0 - smoothstep(0.28, 0.5, d)) * 0.5;
    float a = halo + rim;
    gl_FragColor = vec4(uColor, a);
  }
`;

function BlackHole({ themeKey }: { themeKey: string }) {
  const theme = COLOR_THEMES[themeKey] || COLOR_THEMES.andromeda;
  const haloRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const haloColor = useMemo(
    () => new THREE.Vector3(theme.core[0], theme.core[1], theme.core[2]),
    [theme]
  );

  useFrame(() => {
    if (haloRef.current) haloRef.current.lookAt(camera.position);
  });

  return (
    <group>
      {/* Soft theme-tinted halo, billboarded */}
      <mesh ref={haloRef} renderOrder={-1}>
        <planeGeometry args={[3.5, 3.5]} />
        <shaderMaterial
          vertexShader={billboardVertex}
          fragmentShader={haloFragment}
          uniforms={{ uColor: { value: haloColor } }}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Event horizon — pure black void */}
      <mesh>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshBasicMaterial color="#000" />
      </mesh>
    </group>
  );
}

/* ---------- DUST LANES — multiply-blended dark spiral filaments ---------- */

const dustVertex = billboardVertex;

// Inspired by real galactic dust: M51, NGC 1300, M83, Andromeda.
// Real dust lanes are FILAMENTARY networks with:
//  - multiple parallel sub-lanes per arm (not a single stripe)
//  - fractal noise breaking them into clumps and tendrils
//  - variable opacity (some sections opaque, some thin gaps)
//  - branching, organic structure
// This shader uses fBm noise modulating multiple offset bands per arm.
const dustFragment = `
  varying vec2 vUv;
  uniform float uArms;
  uniform float uTightness;
  uniform float uPlaneSize;

  // ---- Noise primitives (value noise + fBm) ----
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p *= 2.07;
      a *= 0.5;
    }
    return v;
  }

  // Single arm-following band: phase offset, width, opacity multiplier.
  // The band is sharp where pow exponent is high.
  float armBand(float armPhase, float offset, float width, float opacity) {
    float c = cos(armPhase + offset);
    return pow(max(0.0, c), width) * opacity;
  }

  void main() {
    vec2 worldPos = (vUv - 0.5) * uPlaneSize;
    float r = length(worldPos);
    if (r < 0.8 || r > 14.5) discard;
    // Plane is rotated [-PI/2, 0, 0] — negate Y to recover true particle angle.
    float theta = atan(-worldPos.y, worldPos.x);

    float t = uTightness * 4.0 + 0.5;
    float armPhase = (theta - r * t) * uArms;

    // ---- MULTIPLE PARALLEL SUB-LANES per arm ----
    // Real galaxies have a dominant dust lane on the leading edge plus
    // secondary tendrils. We sum 4 bands at different offsets/widths.
    float dust = 0.0;
    dust += armBand(armPhase,  0.55, 18.0, 1.00); // primary leading lane (sharp)
    dust += armBand(armPhase,  0.30,  8.0, 0.45); // soft inner shoulder
    dust += armBand(armPhase,  0.85, 30.0, 0.55); // thin trailing wisp
    dust += armBand(armPhase, -1.20, 24.0, 0.35); // far trailing fragment

    // ---- FRACTAL BREAKUP — turns smooth bands into a filamentary network ----
    // Sample fBm in arm-following coordinates so the noise drifts WITH the arm,
    // not perpendicular to it (which would just create blobs).
    vec2 armCoord = vec2(armPhase * 0.35, log(r + 0.5) * 1.8);
    float bigClumps = fbm(armCoord * 1.2);              // 0..1 large clumps
    float smallDetail = fbm(armCoord * 4.5 + 13.7);     // 0..1 fine grain
    float clumpiness = bigClumps * 0.7 + smallDetail * 0.3;

    // Apply clumpiness as a multiplier with deep gaps:
    // 0.45 minimum keeps lanes connected, 1.55 peak makes some sections darker.
    dust *= 0.45 + clumpiness * 1.10;

    // Carve OUT bright gaps where noise is very low (real dust has holes
    // where blue star clusters punch through).
    float gaps = smoothstep(0.18, 0.05, smallDetail);
    dust *= 1.0 - gaps * 0.7;

    // ---- BRANCHING TENDRILS — perpendicular noise warps band edges ----
    // Add a small angular wobble so straight arms get wavy edges.
    float wobble = (fbm(vec2(r * 0.8, theta * 4.0)) - 0.5) * 0.25;
    float wobbledPhase = armPhase + wobble * uArms;
    dust += armBand(wobbledPhase, 0.55, 22.0, 0.6) * (0.5 + 0.5 * smallDetail);

    // ---- RADIAL FADE — clean core, fade past disk edge ----
    float radialFade = smoothstep(1.2, 3.0, r) * (1.0 - smoothstep(10.0, 14.5, r));
    dust *= radialFade;

    // ---- OUTPUT ----
    if (dust < 0.025) discard;
    // Real cosmic dust is reddish-brown (silicate + carbon grains absorb blue
    // light preferentially, leaving warm tones). Dense clumps are deep brown,
    // thinner edges glow slightly warmer where back-scattered starlight bleeds
    // through. Modulating color by clumpiness gives organic variation.
    vec3 dustDense = vec3(0.025, 0.015, 0.008);  // deep brown, opaque core
    vec3 dustEdge  = vec3(0.18,  0.10,  0.05);   // warm amber, thin edges
    vec3 dustColor = mix(dustEdge, dustDense, clumpiness);
    // Cap alpha at 0.78 so the densest dust still lets a hint of background
    // through — pure black blocks look painted, real dust is semi-translucent.
    gl_FragColor = vec4(dustColor, clamp(dust * 0.85, 0.0, 0.78));
  }
`;

function DustLanes({
  arms,
  tightness,
  rotationSpeed,
}: {
  arms: number;
  tightness: number;
  rotationSpeed: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.z += delta * rotationSpeed * 0.1;
  });
  const planeSize = 32;
  return (
    <group ref={groupRef} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh renderOrder={3}>
        <planeGeometry args={[planeSize, planeSize]} />
        <shaderMaterial
          vertexShader={dustVertex}
          fragmentShader={dustFragment}
          uniforms={{
            uArms: { value: arms },
            uTightness: { value: tightness },
            uPlaneSize: { value: planeSize },
          }}
          transparent
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </mesh>
    </group>
  );
}

/* ---------- DISTANT GALAXIES — faint smudges in deep space ---------- */

const distantGalaxyFragment = `
  varying vec2 vUv;
  uniform vec3 uColor;
  uniform float uAspect;
  void main() {
    vec2 p = vUv - 0.5;
    p.y *= uAspect;
    float d = length(p) * 2.0;
    if (d > 1.0) discard;
    float core = pow(1.0 - d, 4.0) * 1.0;
    float halo = pow(1.0 - d, 1.5) * 0.25;
    float a = clamp(core + halo, 0.0, 1.0) * 0.6;
    gl_FragColor = vec4(uColor, a);
  }
`;

function DistantGalaxies({ count }: { count: number }) {
  const galaxies = useMemo(() => {
    const arr: Array<{
      pos: [number, number, number];
      size: number;
      aspect: number;
      color: [number, number, number];
    }> = [];
    // Deterministic-ish pseudo random so they don't reroll on re-render
    let seed = 1337;
    const rng = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let i = 0; i < count; i++) {
      const phi = rng() * Math.PI * 2;
      const theta = Math.acos(rng() * 2 - 1);
      const r = 80 + rng() * 70;
      const palette: Array<[number, number, number]> = [
        [1.0, 0.9, 0.7],
        [0.7, 0.8, 1.0],
        [1.0, 0.6, 0.7],
        [0.6, 0.9, 0.9],
        [0.9, 0.7, 1.0],
        [1.0, 0.75, 0.5],
        [0.85, 0.95, 0.85],
        [0.95, 0.6, 0.95],
      ];
      arr.push({
        pos: [
          r * Math.sin(theta) * Math.cos(phi),
          r * Math.cos(theta),
          r * Math.sin(theta) * Math.sin(phi),
        ],
        size: 3 + rng() * 7,
        aspect: 1.2 + rng() * 1.8,
        color: palette[Math.floor(rng() * palette.length)],
      });
    }
    return arr;
  }, [count]);

  return (
    <>
      {galaxies.map((g, i) => (
        <Billboard key={i} position={g.pos}>
          <mesh>
            <planeGeometry args={[g.size, g.size]} />
            <shaderMaterial
              vertexShader={billboardVertex}
              fragmentShader={distantGalaxyFragment}
              uniforms={{
                uColor: { value: new THREE.Vector3(...g.color) },
                uAspect: { value: g.aspect },
              }}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </Billboard>
      ))}
    </>
  );
}

/* ---------- HII REGIONS — pink star-forming knots along the arms ----------
   Inspired by M83, NGC 1672. Real spiral arms have bright pink/magenta
   blobs where new stars are born — these are HII regions (ionized hydrogen
   glowing in H-alpha). They cluster on the arms, not in the bulge. */

const hiiFragment = `
  varying vec2 vUv;
  uniform vec3 uColor;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    if (d > 1.0) discard;
    float core = pow(1.0 - d, 3.5) * 1.0;
    float halo = pow(1.0 - d, 1.2) * 0.35;
    float a = clamp(core + halo, 0.0, 1.0) * 0.85;
    gl_FragColor = vec4(uColor, a);
  }
`;

function HIIRegions({
  arms,
  tightness,
}: {
  arms: number;
  tightness: number;
}) {
  const regions = useMemo(() => {
    const arr: Array<{ pos: [number, number, number]; size: number; color: [number, number, number] }> = [];
    let seed = 4242;
    const rng = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    const palette: Array<[number, number, number]> = [
      [1.0, 0.35, 0.55], // hot pink (H-alpha + dust)
      [1.0, 0.45, 0.7],  // magenta-pink
      [0.95, 0.55, 0.8], // soft pink
      [1.0, 0.6, 0.45],  // warm pink-orange (older HII)
    ];
    for (let i = 0; i < 50; i++) {
      const armIdx = i % arms;
      const armOffset = (armIdx / arms) * Math.PI * 2;
      const r = 2.8 + rng() * 9.0;
      const t = tightness * 4.0 + 0.5;
      const angle = -(r * t + armOffset) + (rng() - 0.5) * 0.35;
      const y = (rng() - 0.5) * 0.4;
      arr.push({
        pos: [Math.cos(angle) * r, y, Math.sin(angle) * r],
        size: 0.45 + rng() * 0.7,
        color: palette[Math.floor(rng() * palette.length)],
      });
    }
    return arr;
  }, [arms, tightness]);

  return (
    <>
      {regions.map((rg, i) => (
        <Billboard key={i} position={rg.pos}>
          <mesh>
            <planeGeometry args={[rg.size, rg.size]} />
            <shaderMaterial
              vertexShader={billboardVertex}
              fragmentShader={hiiFragment}
              uniforms={{ uColor: { value: new THREE.Vector3(...rg.color) } }}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </Billboard>
      ))}
    </>
  );
}

/* ---------- GLOBULAR CLUSTERS — old yellow clusters in the halo ----------
   Andromeda has 460+ globular clusters. They orbit OUTSIDE the disk plane
   in a roughly spherical halo, contain ancient (Pop II) stars, and look
   like tight pale yellow fuzzballs. */

const globularFragment = `
  varying vec2 vUv;
  uniform vec3 uColor;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    if (d > 1.0) discard;
    float core = pow(1.0 - d, 5.0) * 1.2;     // very tight bright core
    float halo = pow(1.0 - d, 1.6) * 0.18;    // soft outer fuzz
    float a = clamp(core + halo, 0.0, 1.0) * 0.7;
    gl_FragColor = vec4(uColor, a);
  }
`;

function GlobularClusters() {
  const clusters = useMemo(() => {
    const arr: Array<{ pos: [number, number, number]; size: number; color: [number, number, number] }> = [];
    let seed = 9173;
    const rng = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    // Old-population colors: warm cream → pale yellow → faintly orange
    const palette: Array<[number, number, number]> = [
      [1.0, 0.92, 0.7],
      [1.0, 0.85, 0.55],
      [0.95, 0.88, 0.65],
      [1.0, 0.78, 0.5],
    ];
    for (let i = 0; i < 80; i++) {
      // Spherical halo distribution, biased toward inner radii
      const r = 4 + Math.pow(rng(), 0.8) * 18;
      const phi = rng() * Math.PI * 2;
      const cosTheta = rng() * 2 - 1;
      const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);
      arr.push({
        pos: [
          r * sinTheta * Math.cos(phi),
          r * cosTheta * 0.7, // slightly flattened halo
          r * sinTheta * Math.sin(phi),
        ],
        size: 0.18 + rng() * 0.25,
        color: palette[Math.floor(rng() * palette.length)],
      });
    }
    return arr;
  }, []);

  return (
    <>
      {clusters.map((c, i) => (
        <Billboard key={i} position={c.pos}>
          <mesh>
            <planeGeometry args={[c.size, c.size]} />
            <shaderMaterial
              vertexShader={billboardVertex}
              fragmentShader={globularFragment}
              uniforms={{ uColor: { value: new THREE.Vector3(...c.color) } }}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </Billboard>
      ))}
    </>
  );
}

/* ---------- COMPANION GALAXY — a small elliptical off to the side ----------
   Inspired by M51's NGC 5195, the small companion locked in tidal embrace
   with the Whirlpool. Rendered as a dense Gaussian blob of particles offset
   from the main galaxy. */

const companionVertex = `
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

const companionFragment = `
  varying vec3 vColor;
  varying float vBrightness;
  uniform float uBrightness;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float intensity = exp(-d * 10.0) * 0.9 + exp(-d * 3.0) * 0.15;
    vec3 col = mix(vColor, vec3(1.0), exp(-d * 18.0) * 0.7);
    gl_FragColor = vec4(col, intensity * vBrightness * uBrightness);
  }
`;

function CompanionGalaxy({ themeKey, brightness }: { themeKey: string; brightness: number }) {
  const theme = COLOR_THEMES[themeKey] || COLOR_THEMES.andromeda;
  const pointsRef = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const { positions, colors, sizes, brightnesses } = useMemo(() => {
    const count = 4000;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const siz = new Float32Array(count);
    const bri = new Float32Array(count);
    let seed = 7777;
    const rng = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    // Gaussian-ish distribution: pow(rng, 1.8) clusters toward center
    for (let i = 0; i < count; i++) {
      const r = Math.pow(rng(), 1.8) * 2.2;
      const phi = rng() * Math.PI * 2;
      const cosTheta = rng() * 2 - 1;
      const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);
      // Slightly flattened spheroid (elliptical)
      pos[i * 3] = r * sinTheta * Math.cos(phi) * 1.2;
      pos[i * 3 + 1] = r * cosTheta * 0.65;
      pos[i * 3 + 2] = r * sinTheta * Math.sin(phi);

      // Color: warm bulge tones (old population, like a real elliptical)
      const tFade = r / 2.2;
      const c0 = theme.core[0] * (1 - tFade) + theme.outer[0] * tFade;
      const c1 = theme.core[1] * (1 - tFade) + theme.outer[1] * tFade;
      const c2 = theme.core[2] * (1 - tFade) + theme.outer[2] * tFade;
      col[i * 3] = Math.min(1, c0);
      col[i * 3 + 1] = Math.min(1, c1);
      col[i * 3 + 2] = Math.min(1, c2);

      siz[i] = 0.8 + rng() * 1.4;
      // Brighter at center, dim at edges
      bri[i] = (0.4 + rng() * 0.3) * (1 - tFade * 0.6);
    }
    return { positions: pos, colors: col, sizes: siz, brightnesses: bri };
  }, [theme]);

  useEffect(() => {
    if (pointsRef.current) {
      const geo = pointsRef.current.geometry;
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geo.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
      geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
      geo.setAttribute("aBrightness", new THREE.BufferAttribute(brightnesses, 1));
    }
  }, [positions, colors, sizes, brightnesses]);

  useFrame(() => {
    if (matRef.current) matRef.current.uniforms.uBrightness.value = brightness;
  });

  return (
    <group position={[18, 4, -6]}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-aColor" args={[colors, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
          <bufferAttribute attach="attributes-aBrightness" args={[brightnesses, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={matRef}
          vertexShader={companionVertex}
          fragmentShader={companionFragment}
          uniforms={{
            uPixelRatio: { value: Math.min(window.devicePixelRatio, 1.0) },
            uBrightness: { value: brightness },
          }}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

/* ---------- REGION LABELS ---------- */

function RegionLabels() {
  const labels: Array<{ pos: [number, number, number]; text: string }> = [
    { pos: [0, 1.2, 0], text: "Galactic Core" },
    { pos: [9, 0.5, 0], text: "Outer Arm" },
    { pos: [0, 0.5, -9], text: "Spiral Branch" },
    { pos: [-7, 3, 4], text: "Halo" },
  ];
  return (
    <group>
      {labels.map((l, i) => (
        <Html key={i} position={l.pos} center distanceFactor={18} zIndexRange={[10, 0]}>
          <div className="text-[9px] uppercase tracking-[0.2em] text-white/80 px-2 py-0.5 rounded bg-black/50 border border-white/15 backdrop-blur-sm whitespace-nowrap pointer-events-none select-none">
            {l.text}
          </div>
        </Html>
      ))}
    </group>
  );
}

/* ---------- FLY THROUGH ---------- */

function FlyThrough({ active }: { active: boolean }) {
  const { camera } = useThree();
  const tRef = useRef(0);
  const savedRef = useRef<{ pos: THREE.Vector3; quat: THREE.Quaternion } | null>(null);

  useEffect(() => {
    if (active) {
      savedRef.current = {
        pos: camera.position.clone(),
        quat: camera.quaternion.clone(),
      };
      tRef.current = 0;
    } else if (savedRef.current) {
      camera.position.copy(savedRef.current.pos);
      camera.quaternion.copy(savedRef.current.quat);
      savedRef.current = null;
    }
  }, [active, camera]);

  useFrame((_, delta) => {
    if (!active) return;
    tRef.current += delta * 0.12;
    const t = tRef.current;
    const r = 14 + Math.sin(t * 0.7) * 6;
    const y = 4 + Math.sin(t * 0.4) * 5;
    camera.position.set(Math.cos(t) * r, y, Math.sin(t) * r);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

/* ---------- ADAPTIVE QUALITY ---------- */

interface AdaptiveProps {
  enabled: boolean;
  currentCount: number;
  onChange: (newCount: number) => void;
}

function AdaptiveQuality({ enabled, currentCount, onChange }: AdaptiveProps) {
  const framesRef = useRef(0);
  const lastCheckRef = useRef(performance.now());
  const lastReductionRef = useRef(0);
  useFrame(() => {
    if (!enabled) return;
    framesRef.current++;
    const now = performance.now();
    const elapsed = now - lastCheckRef.current;
    if (elapsed >= 2000) {
      const fps = (framesRef.current * 1000) / elapsed;
      framesRef.current = 0;
      lastCheckRef.current = now;
      if (fps < 25 && currentCount > 5000 && now - lastReductionRef.current > 3000) {
        const next = Math.max(5000, Math.floor((currentCount * 0.7) / 1000) * 1000);
        if (next < currentCount) {
          lastReductionRef.current = now;
          onChange(next);
        }
      }
    }
  });
  return null;
}

/* ---------- SNAPSHOT BRIDGE ---------- */

function SnapshotBridge({ register }: { register: (fn: () => string | null) => void }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    register(() => {
      try {
        gl.render(scene, camera);
        return gl.domElement.toDataURL("image/png");
      } catch {
        return null;
      }
    });
    return () => register(() => null);
  }, [gl, scene, camera, register]);
  return null;
}

/* ---------- MAIN SCENE ---------- */

interface Props {
  settings: GalaxySettings;
  onAdaptiveDensityChange: (n: number) => void;
  registerSnapshot?: (fn: () => string | null) => void;
}

export function GalaxyScene({ settings, onAdaptiveDensityChange, registerSnapshot }: Props) {
  const [isWebGLAvailable, setIsWebGLAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    const checkWebGL = () => {
      try {
        const canvas = document.createElement("canvas");
        const available = !!(
          window.WebGLRenderingContext &&
          (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
        );
        setIsWebGLAvailable(available);
      } catch (e) {
        setIsWebGLAvailable(false);
      }
    };
    checkWebGL();
  }, []);

  const dpr = useMemo<[number, number]>(() => [1, 1], []);

  if (isWebGLAvailable === null) return <div className="w-full h-full bg-black" />;

  const shouldUse2D = !isWebGLAvailable || settings.force2D;

  if (shouldUse2D) {
    return (
      <div className="relative w-full h-full">
        <Galaxy2D settings={settings} />
        <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-[10px] text-white/50 border border-white/10 uppercase tracking-widest pointer-events-none">
          {settings.force2D ? "2D Mode Enabled" : "2D Fallback Mode"}
        </div>
      </div>
    );
  }

  return (
    <WebGLErrorBoundary>
      <div className="relative w-full h-full">
        <Canvas
          camera={{ position: [0, 8, 18], fov: 55 }}
          gl={{
            antialias: false,
            powerPreference: "high-performance",
            alpha: true,
            stencil: false,
            depth: true,
            preserveDrawingBuffer: true,
          }}
          style={{ background: "transparent" }}
          dpr={dpr}
        >
          <GalaxyParticles settings={settings} />
          <Starfield />
          {settings.distantGalaxies && (
            <DistantGalaxies count={settings.distantGalaxyCount} />
          )}
          {settings.globularClusters && (
            <group rotation={[settings.tilt, 0, 0]}>
              <GlobularClusters />
            </group>
          )}
          {settings.companionGalaxy && (
            <group rotation={[settings.tilt, 0, 0]}>
              <CompanionGalaxy themeKey={settings.theme} brightness={settings.brightness} />
            </group>
          )}
          {settings.hiiRegions && (
            <group rotation={[settings.tilt, 0, 0]}>
              <HIIRegions arms={settings.arms} tightness={settings.tightness} />
            </group>
          )}
          {settings.dustLanes && (
            <group rotation={[settings.tilt, 0, 0]}>
              <DustLanes
                arms={settings.arms}
                tightness={settings.tightness}
                rotationSpeed={settings.rotationSpeed}
              />
            </group>
          )}
          {settings.blackHole && (
            <group rotation={[settings.tilt, 0, 0]}>
              <BlackHole themeKey={settings.theme} />
            </group>
          )}
          {settings.regionLabels && (
            <group rotation={[settings.tilt, 0, 0]}>
              <RegionLabels />
            </group>
          )}
          <FlyThrough active={settings.flyThrough} />
          <AdaptiveQuality
            enabled={settings.adaptiveQuality}
            currentCount={settings.particleCount}
            onChange={onAdaptiveDensityChange}
          />
          {registerSnapshot && <SnapshotBridge register={registerSnapshot} />}
          {!settings.flyThrough && (
            <OrbitControls
              enablePan={false}
              minDistance={5}
              maxDistance={50}
              autoRotate={settings.autoRotate}
              autoRotateSpeed={0.3}
              enableDamping
              dampingFactor={0.05}
            />
          )}
        </Canvas>
        {settings.showFPS && <FPSCounter />}
      </div>
    </WebGLErrorBoundary>
  );
}
