import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, MousePointer2, Settings, X, Telescope } from "lucide-react";
import { GalaxyScene } from "@/components/galaxy/GalaxyScene";
import { ControlPanel } from "@/components/galaxy/ControlPanel";
import { NebulaBackground } from "@/components/galaxy/NebulaBackground";
import { AmbientSound } from "@/components/galaxy/AmbientSound";
import { GalaxyGallery } from "@/components/galaxy/GalaxyGallery";
import { GalaxyInfo } from "@/components/galaxy/GalaxyInfo";
import { WarpTransition } from "@/components/galaxy/WarpTransition";
import { REAL_GALAXIES, GALAXY_RESET, type RealGalaxy } from "@/components/galaxy/realGalaxies";
import { DEFAULT_SETTINGS, type GalaxySettings } from "@/components/galaxy/types";

const WELCOME_KEY = "galaxy-welcome-seen-v1";

function WelcomeOverlay({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto"
      style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.85) 100%)" }}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 6 }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
        className="relative max-w-md w-[88%] rounded-2xl bg-zinc-950/85 backdrop-blur-xl border border-white/10 p-7 shadow-[0_30px_120px_-20px_rgba(168,85,247,0.45)]"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-fuchsia-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-fuchsia-500/25">
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-white text-lg font-semibold tracking-tight leading-tight">
              Galaxy Explorer
            </h1>
            <p className="text-white/45 text-[11px] uppercase tracking-[0.18em] leading-tight mt-0.5">
              Procedural Cosmos
            </p>
          </div>
        </div>
        <p className="text-white/70 text-[13.5px] leading-relaxed mb-5">
          Build a galaxy from scratch — tweak its arms, stars, nebulae, and
          black hole, then share the link to your creation.
        </p>
        <ul className="space-y-2.5 mb-6">
          <li className="flex items-center gap-3 text-[12.5px] text-white/65">
            <span className="w-7 h-7 shrink-0 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-white/70">
              <MousePointer2 className="w-3.5 h-3.5" />
            </span>
            Drag to orbit · scroll to zoom
          </li>
          <li className="flex items-center gap-3 text-[12.5px] text-white/65">
            <span className="w-7 h-7 shrink-0 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-white/70">
              <Settings className="w-3.5 h-3.5" />
            </span>
            Five tabs of controls in the left panel
          </li>
          <li className="flex items-center gap-3 text-[12.5px] text-white/65">
            <span className="w-7 h-7 shrink-0 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-white/70">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
            Try a preset, or hit Random for inspiration
          </li>
          <li className="flex items-center gap-3 text-[12.5px] text-white/65">
            <span className="w-7 h-7 shrink-0 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-white/70">
              <Telescope className="w-3.5 h-3.5" />
            </span>
            Or warp to a real NASA galaxy — top center
          </li>
        </ul>
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white font-semibold text-sm tracking-tight transition-all shadow-lg shadow-fuchsia-600/20"
        >
          Begin Exploring
        </button>
      </motion.div>
    </motion.div>
  );
}

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
  const [showWelcome, setShowWelcome] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    if (window.location.hash) return false;
    try {
      return localStorage.getItem(WELCOME_KEY) !== "1";
    } catch {
      return true;
    }
  });
  const dismissWelcome = useCallback(() => {
    setShowWelcome(false);
    try {
      localStorage.setItem(WELCOME_KEY, "1");
    } catch {
      /* storage blocked, fine */
    }
  }, []);
  const snapshotFnRef = useRef<(() => string | null) | null>(null);

  // Real-galaxy gallery + warp state
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [warping, setWarping] = useState(false);
  const [activeGalaxy, setActiveGalaxy] = useState<RealGalaxy | null>(null);
  const [infoVisible, setInfoVisible] = useState(true);
  const warpTimers = useRef<number[]>([]);

  useEffect(() => {
    return () => warpTimers.current.forEach((t) => window.clearTimeout(t));
  }, []);

  const selectGalaxy = useCallback((galaxy: RealGalaxy) => {
    // Ignore re-selection mid-warp so the flash-synced settings swap can't desync.
    if (warping) return;
    warpTimers.current.forEach((t) => window.clearTimeout(t));
    warpTimers.current = [];
    setGalleryOpen(false);
    setWarping(true);
    // Swap the galaxy at the peak of the warp flash so regeneration stays hidden.
    warpTimers.current.push(
      window.setTimeout(() => {
        setSettings((prev) => ({ ...prev, ...GALAXY_RESET, ...galaxy.settings }));
        setActiveGalaxy(galaxy);
        setInfoVisible(true);
      }, 780)
    );
    warpTimers.current.push(window.setTimeout(() => setWarping(false), 1500));
  }, [warping]);

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
          realGalaxyImage={activeGalaxy?.image ?? null}
        />
      </div>
      <ControlPanel
        settings={settings}
        onChange={setSettings}
        onSnapshot={takeSnapshot}
        onShare={shareLink}
      />

      {/* Real-galaxy gallery launcher (top center) */}
      <motion.button
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        onClick={() => setGalleryOpen(true)}
        className="fixed top-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-full bg-zinc-950/70 backdrop-blur-xl border border-white/10 hover:border-white/30 pl-3 pr-4 py-2 text-white/85 hover:text-white transition-colors shadow-[0_10px_40px_-12px_rgba(168,85,247,0.5)]"
      >
        <Telescope className="w-4 h-4 text-fuchsia-300" />
        <span className="text-[12.5px] font-medium tracking-tight">Real Galaxies</span>
      </motion.button>

      <GalaxyGallery
        open={galleryOpen}
        activeId={activeGalaxy?.id ?? null}
        onClose={() => setGalleryOpen(false)}
        onSelect={selectGalaxy}
      />
      <GalaxyInfo
        galaxy={activeGalaxy}
        visible={infoVisible}
        onToggle={() => setInfoVisible((v) => !v)}
        onOpenGallery={() => setGalleryOpen(true)}
        onExit={() => {
          setActiveGalaxy(null);
          setInfoVisible(false);
        }}
      />
      <WarpTransition active={warping} />

      <AmbientSound active={settings.ambientSound} intensity={settings.rotationSpeed} />
      {/* Cinematic vignette */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)",
        }}
      />
      <AnimatePresence>
        {showWelcome && <WelcomeOverlay onClose={dismissWelcome} />}
      </AnimatePresence>
    </div>
  );
};

export default Index;
