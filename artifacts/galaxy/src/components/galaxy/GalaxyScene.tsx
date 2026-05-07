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

const dustFragment = `
  varying vec2 vUv;
  uniform float uArms;
  uniform float uTightness;
  void main() {
    vec2 p = vUv - 0.5;
    float r = length(p) * 2.0;
    if (r < 0.08 || r > 0.95) { gl_FragColor = vec4(1.0); return; }
    float theta = atan(p.y, p.x);
    float spiral = theta + log(r * 6.0 + 0.5) * uTightness * 2.0;
    float band = sin(spiral * uArms);
    float dust = smoothstep(0.35, 0.95, band);
    // Add some asymmetric noise via second harmonic
    dust *= 0.7 + 0.3 * sin(spiral * uArms * 2.0 + 1.7);
    float radialFalloff = smoothstep(0.08, 0.22, r) * (1.0 - smoothstep(0.6, 0.95, r));
    dust *= radialFalloff * 0.55; // max darkening ~55%
    vec3 col = vec3(1.0 - dust);
    gl_FragColor = vec4(col, 1.0);
  }
`;

function DustLanes({ arms, tightness }: { arms: number; tightness: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
      <planeGeometry args={[34, 34]} />
      <shaderMaterial
        vertexShader={dustVertex}
        fragmentShader={dustFragment}
        uniforms={{
          uArms: { value: arms },
          uTightness: { value: tightness },
        }}
        transparent
        depthWrite={false}
        blending={THREE.MultiplyBlending}
      />
    </mesh>
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

function DistantGalaxies() {
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
    for (let i = 0; i < 9; i++) {
      const phi = rng() * Math.PI * 2;
      const theta = Math.acos(rng() * 2 - 1);
      const r = 90 + rng() * 50;
      const palette: Array<[number, number, number]> = [
        [1.0, 0.9, 0.7],
        [0.7, 0.8, 1.0],
        [1.0, 0.6, 0.7],
        [0.6, 0.9, 0.9],
        [0.9, 0.7, 1.0],
      ];
      arr.push({
        pos: [
          r * Math.sin(theta) * Math.cos(phi),
          r * Math.cos(theta),
          r * Math.sin(theta) * Math.sin(phi),
        ],
        size: 4 + rng() * 6,
        aspect: 1.4 + rng() * 1.6,
        color: palette[Math.floor(rng() * palette.length)],
      });
    }
    return arr;
  }, []);

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
          {settings.distantGalaxies && <DistantGalaxies />}
          {settings.dustLanes && (
            <group rotation={[settings.tilt, 0, 0]}>
              <DustLanes arms={settings.arms} tightness={settings.tightness} />
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
