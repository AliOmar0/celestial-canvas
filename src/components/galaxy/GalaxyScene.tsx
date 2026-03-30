import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { GalaxyParticles } from "./GalaxyParticles";
import { Starfield } from "./Starfield";
import type { GalaxySettings } from "./types";

interface Props {
  settings: GalaxySettings;
}

export function GalaxyScene({ settings }: Props) {
  return (
    <Canvas
      camera={{ position: [0, 8, 18], fov: 55 }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      }}
      style={{ background: "#000" }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.1} />
      <GalaxyParticles settings={settings} />
      <Starfield />
      <OrbitControls
        enablePan={false}
        minDistance={5}
        maxDistance={50}
        autoRotate
        autoRotateSpeed={0.3}
        enableDamping
        dampingFactor={0.05}
      />
    </Canvas>
  );
}
