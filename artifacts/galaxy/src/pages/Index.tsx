import { useState, useRef, useCallback, useEffect } from "react";
import { GalaxyScene } from "@/components/galaxy/GalaxyScene";
import { ControlPanel } from "@/components/galaxy/ControlPanel";
import { NebulaBackground } from "@/components/galaxy/NebulaBackground";
import { AmbientSound } from "@/components/galaxy/AmbientSound";
import { DEFAULT_SETTINGS, type GalaxySettings } from "@/components/galaxy/types";

function encodeSettings(s: GalaxySettings): string {
  const diff: Record<string, unknown> = {};
  for (const k of Object.keys(s) as (keyof GalaxySettings)[]) {
    if (s[k] !== DEFAULT_SETTINGS[k]) diff[k] = s[k];
  }
  if (Object.keys(diff).length === 0) return "";
  try {
    return btoa(JSON.stringify(diff))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  } catch {
    return "";
  }
}

function decodeSettings(hash: string): GalaxySettings | null {
  if (!hash) return null;
  try {
    const padded = hash.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
    const diff = JSON.parse(json) as Partial<GalaxySettings>;
    return { ...DEFAULT_SETTINGS, ...diff };
  } catch {
    return null;
  }
}

const Index = () => {
  const [settings, setSettings] = useState<GalaxySettings>(() => {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    const fromHash = decodeSettings(window.location.hash.slice(1));
    return fromHash ?? DEFAULT_SETTINGS;
  });
  const snapshotFnRef = useRef<(() => string | null) | null>(null);

  // Sync settings → URL hash (debounced) so the URL is always shareable.
  useEffect(() => {
    const id = window.setTimeout(() => {
      const encoded = encodeSettings(settings);
      const newHash = encoded ? `#${encoded}` : "";
      if (window.location.hash !== newHash) {
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${newHash}`);
      }
    }, 250);
    return () => window.clearTimeout(id);
  }, [settings]);

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

  const shareLink = useCallback(async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      return false;
    }
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
      <ControlPanel
        settings={settings}
        onChange={setSettings}
        onSnapshot={takeSnapshot}
        onShare={shareLink}
      />
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
