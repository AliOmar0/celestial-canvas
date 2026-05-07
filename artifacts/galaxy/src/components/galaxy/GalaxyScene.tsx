import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { GalaxyParticles } from "./GalaxyParticles";
import { Starfield } from "./Starfield";
import { Galaxy2D } from "./Galaxy2D";
import type { GalaxySettings } from "./types";
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

const accretionVertex = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const accretionFragment = `
  varying vec2 vUv;
  uniform float uTime;
  void main() {
    float r = vUv.x;
    float ang = vUv.y * 6.28318;
    float swirl = sin(ang * 6.0 + uTime * 1.2 + r * 18.0) * 0.5 + 0.5;
    swirl = mix(0.6, 1.0, swirl);
    float inner = smoothstep(0.0, 0.18, r);
    float outer = 1.0 - smoothstep(0.55, 1.0, r);
    float bright = inner * outer;
    vec3 hot = vec3(1.0, 0.95, 0.7);
    vec3 mid = vec3(1.0, 0.55, 0.15);
    vec3 cool = vec3(0.65, 0.15, 0.05);
    vec3 col = mix(hot, mid, smoothstep(0.0, 0.35, r));
    col = mix(col, cool, smoothstep(0.45, 1.0, r));
    col *= swirl;
    float alpha = bright * 0.95;
    gl_FragColor = vec4(col, alpha);
  }
`;

const haloFragment = `
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float a = 1.0 - smoothstep(0.0, 1.0, d);
    a = pow(a, 2.5) * 0.6;
    vec3 col = mix(vec3(1.0, 0.6, 0.2), vec3(0.4, 0.1, 0.05), d);
    gl_FragColor = vec4(col, a);
  }
`;

function BlackHole() {
  const diskRef = useRef<THREE.Mesh>(null);
  const diskMatRef = useRef<THREE.ShaderMaterial>(null);
  const photonRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const haloRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (diskRef.current) diskRef.current.rotation.z += delta * 0.4;
    if (photonRef.current) photonRef.current.rotation.z -= delta * 0.8;
    if (diskMatRef.current) diskMatRef.current.uniforms.uTime.value += delta;
    if (haloRef.current) haloRef.current.lookAt(camera.position);
  });

  return (
    <group>
      {/* Soft halo billboard behind everything */}
      <mesh ref={haloRef} renderOrder={-1}>
        <planeGeometry args={[5, 5]} />
        <shaderMaterial
          vertexShader={accretionVertex}
          fragmentShader={haloFragment}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Event horizon — pure black sphere */}
      <mesh>
        <sphereGeometry args={[0.55, 64, 64]} />
        <meshBasicMaterial color="#000" />
      </mesh>

      {/* Accretion disk — shader-based radial gradient ring */}
      <mesh ref={diskRef} rotation={[Math.PI / 2.3, 0, 0]}>
        <ringGeometry args={[0.7, 2.4, 128, 1]} />
        <shaderMaterial
          ref={diskMatRef}
          vertexShader={accretionVertex}
          fragmentShader={accretionFragment}
          uniforms={{ uTime: { value: 0 } }}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Photon ring — thin bright torus near the horizon */}
      <mesh ref={photonRef} rotation={[Math.PI / 2.3, 0, 0]}>
        <torusGeometry args={[0.68, 0.012, 16, 128]} />
        <meshBasicMaterial color="#fff5cc" toneMapped={false} transparent opacity={0.95} />
      </mesh>
    </group>
  );
}

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
        const next = Math.max(5000, Math.floor(currentCount * 0.7 / 1000) * 1000);
        if (next < currentCount) {
          lastReductionRef.current = now;
          onChange(next);
        }
      }
    }
  });
  return null;
}

interface Props {
  settings: GalaxySettings;
  onAdaptiveDensityChange: (n: number) => void;
}

export function GalaxyScene({ settings, onAdaptiveDensityChange }: Props) {
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
          }}
          style={{ background: "transparent" }}
          dpr={dpr}
        >
          <GalaxyParticles settings={settings} />
          <Starfield />
          {settings.blackHole && (
            <group rotation={[settings.tilt, 0, 0]}>
              <BlackHole />
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
