import { useState, useRef, useCallback } from "react";
import { GalaxyScene } from "@/components/galaxy/GalaxyScene";
import { ControlPanel } from "@/components/galaxy/ControlPanel";
import { NebulaBackground } from "@/components/galaxy/NebulaBackground";
import { AmbientSound } from "@/components/galaxy/AmbientSound";
import { DEFAULT_SETTINGS, type GalaxySettings } from "@/components/galaxy/types";

const Index = () => {
  const [settings, setSettings] = useState<GalaxySettings>(DEFAULT_SETTINGS);
  const snapshotFnRef = useRef<(() => string | null) | null>(null);

  const registerSnapshot = useCallback((fn: () => string | null) => {
    snapshotFnRef.current = fn;
  }, []);

  const takeSnapshot = useCallback(() => {
    const fn = snapshotFnRef.current;
    if (!fn) return;
    const dataUrl = fn();
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `galaxy-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      <NebulaBackground themeKey={settings.theme} active={settings.nebulaBackground} />
      <div className="absolute inset-0">
        <GalaxyScene
          settings={settings}
          onAdaptiveDensityChange={(n) =>
            setSettings((prev) => ({ ...prev, particleCount: n }))
          }
          registerSnapshot={registerSnapshot}
        />
      </div>
      <ControlPanel settings={settings} onChange={setSettings} onSnapshot={takeSnapshot} />
      <AmbientSound active={settings.ambientSound} intensity={settings.rotationSpeed} />
      {/* Cinematic vignette */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </div>
  );
};

export default Index;
