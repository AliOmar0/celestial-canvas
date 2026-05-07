import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { GalaxyParticles } from "./GalaxyParticles";
import { Starfield } from "./Starfield";
import { Galaxy2D } from "./Galaxy2D";
import type { GalaxySettings } from "./types";
import React, { Component, ReactNode, useState, useEffect } from "react";

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
    <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-[11px] border border-white/10 pointer-events-none font-mono">
      <span className="text-white/50">FPS </span>
      <span className={color}>{fps}</span>
    </div>
  );
}

interface Props {
  settings: GalaxySettings;
}

export function GalaxyScene({ settings }: Props) {
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
          alpha: false,
          stencil: false,
          depth: true,
        }}
        style={{ background: "#000" }}
        dpr={[1, 1.5]}
        frameloop="always"
      >
        <GalaxyParticles settings={settings} />
        <Starfield />
        <OrbitControls
          enablePan={false}
          minDistance={5}
          maxDistance={50}
          autoRotate={settings.autoRotate}
          autoRotateSpeed={0.3}
          enableDamping
          dampingFactor={0.05}
        />
      </Canvas>
      {settings.showFPS && <FPSCounter />}
      </div>
    </WebGLErrorBoundary>
  );
}
