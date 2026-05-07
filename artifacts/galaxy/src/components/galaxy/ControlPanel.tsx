import { useState, useEffect, type ReactNode } from "react";
import { Slider } from "@/components/ui/slider";
import {
  COLOR_THEMES,
  DEFAULT_SETTINGS,
  GALAXY_PRESETS,
  type GalaxySettings,
} from "./types";
import {
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Shuffle,
  Pause,
  Play,
  Activity,
  Sparkles,
  Circle,
  Mountain,
  Camera,
  Volume2,
  Gauge,
  Tag,
  Wind,
  Sparkle,
  Stars,
  Download,
  Globe,
  Flame,
  Orbit,
  Palette,
  Minus,
  Scaling,
  Users,
  Eye,
  Link2,
  Check,
} from "lucide-react";

interface Props {
  settings: GalaxySettings;
  onChange: (s: GalaxySettings) => void;
  onSnapshot?: () => void;
  onShare?: () => Promise<boolean> | boolean;
}

function rgbCss(c: [number, number, number]) {
  return `rgb(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)})`;
}

const sliderClass =
  "[&_[role=slider]]:bg-white [&_[role=slider]]:border-white/30 [&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_.relative]:bg-white/10 [&_[data-orientation=horizontal]>.absolute]:bg-white/60";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

/* ---------- Toggle row (full-row clickable, with pill switch) ---------- */
interface ToggleRowProps {
  icon: ReactNode;
  label: string;
  active: boolean;
  onToggle: () => void;
  activeColor?: string;
}

function ToggleRow({
  icon,
  label,
  active,
  onToggle,
  activeColor = "bg-emerald-600",
}: ToggleRowProps) {
  return (
    <button
      onClick={onToggle}
      title={`${label} — ${active ? "On" : "Off"}`}
      role="switch"
      aria-checked={active}
      className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-md bg-white/5 hover:bg-white/[0.09] transition-colors text-left"
    >
      <span className="text-[13px] text-white/85 font-medium tracking-tight flex items-center gap-2 min-w-0 flex-1 leading-snug">
        <span className="shrink-0 text-white/55">{icon}</span>
        <span className="break-words">{label}</span>
      </span>
      <span
        className={`shrink-0 relative w-9 h-5 rounded-full transition-colors ${
          active ? activeColor : "bg-white/15"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
            active ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

/* ---------- LiveSlider at module scope to avoid remount-on-render bug ---------- */
interface LiveSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  formatter?: (v: number) => string;
}

function LiveSlider({
  label,
  value,
  min,
  max,
  step,
  onChange: onLiveChange,
  formatter = (v: number) => v.toString(),
}: LiveSliderProps) {
  return (
    <div className="space-y-1.5 px-1 py-1">
      <div className="flex justify-between text-[12.5px] text-white/75">
        <span>{label}</span>
        <span className="text-white/45">{formatter(value)}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onLiveChange(v)}
        className={sliderClass}
      />
    </div>
  );
}

/* ---------- Tab definitions ---------- */
const TABS = [
  { id: "style", label: "Style", icon: Palette },
  { id: "shape", label: "Shape", icon: Scaling },
  { id: "stars", label: "Stars", icon: Sparkles },
  { id: "scene", label: "Scene", icon: Globe },
  { id: "system", label: "System", icon: Settings },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function ControlPanel({ settings, onChange, onSnapshot, onShare }: Props) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(!isMobile);
  const [tab, setTab] = useState<TabId>("system");
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (!onShare) return;
    const ok = await onShare();
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  };

  useEffect(() => {
    setOpen(!isMobile);
  }, [isMobile]);

  const update = (key: keyof GalaxySettings, value: number | string | boolean) =>
    onChange({ ...settings, [key]: value } as GalaxySettings);

  const applyPreset = (partial: Partial<GalaxySettings>) =>
    onChange({ ...settings, ...partial });

  const randomize = () => {
    const themes = Object.keys(COLOR_THEMES);
    onChange({
      ...settings,
      arms: 2 + Math.floor(Math.random() * 5),
      tightness: 0.1 + Math.random() * 0.7,
      dispersion: 0.5 + Math.random() * 2.0,
      tilt: Math.random() * 1.0,
      theme: themes[Math.floor(Math.random() * themes.length)],
      particleCount: 15000 + Math.floor(Math.random() * 4) * 10000,
    });
  };

  const reset = () => onChange({ ...DEFAULT_SETTINGS });

  // Per-tab active count for badges
  const activeByTab: Record<TabId, number> = {
    style: settings.bloom ? 1 : 0,
    shape: [settings.barStructure, settings.armAsymmetry].filter(Boolean).length,
    stars: [
      settings.stellarPopulations,
      settings.hiiRegions,
      settings.openClusters,
      settings.globularClusters,
      settings.particles3D,
      settings.softParticles,
    ].filter(Boolean).length,
    scene: [
      settings.blackHole,
      settings.companionGalaxy,
      settings.nebulaBackground,
      settings.distantGalaxies,
      settings.regionLabels,
    ].filter(Boolean).length,
    system: [
      settings.autoRotate,
      settings.flyThrough,
      settings.ambientSound,
      settings.adaptiveQuality,
      settings.showFPS,
    ].filter(Boolean).length,
  };

  /* ---------- Tab content renderers ---------- */
  const renderStyle = () => (
    <div className="space-y-3">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1.5 px-1">Preset</div>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(GALAXY_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => applyPreset(preset.partial)}
              className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-white/5 text-white/75 hover:bg-white/10 hover:text-white transition-all"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1.5 px-1">Color theme</div>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(COLOR_THEMES).map(([key, theme]) => (
            <button
              key={key}
              onClick={() => update("theme", key)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                settings.theme === key
                  ? "bg-white/20 text-white ring-1 ring-white/40"
                  : "bg-white/5 text-white/55 hover:bg-white/10 hover:text-white/80"
              }`}
            >
              <span className="flex shrink-0 -space-x-1">
                <span
                  className="w-2.5 h-2.5 rounded-full ring-1 ring-black/40"
                  style={{ background: rgbCss(theme.core) }}
                />
                <span
                  className="w-2.5 h-2.5 rounded-full ring-1 ring-black/40"
                  style={{ background: rgbCss(theme.mid) }}
                />
                <span
                  className="w-2.5 h-2.5 rounded-full ring-1 ring-black/40"
                  style={{ background: rgbCss(theme.outer) }}
                />
              </span>
              <span className="truncate">{theme.name}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1 px-1">Appearance</div>
        <LiveSlider
          label="Brightness"
          value={settings.brightness}
          min={0.1}
          max={1.0}
          step={0.05}
          formatter={(v) => v.toFixed(2)}
          onChange={(v) => update("brightness", v)}
        />
        <LiveSlider
          label="Density"
          value={settings.particleCount}
          min={5000}
          max={150000}
          step={5000}
          formatter={(v) => (v / 1000).toFixed(0) + "K"}
          onChange={(v) => update("particleCount", v)}
        />
        <ToggleRow
          icon={<Sparkles className="w-3.5 h-3.5" />}
          label="Bloom Glow"
          active={settings.bloom}
          onToggle={() => update("bloom", !settings.bloom)}
          activeColor="bg-fuchsia-600"
        />
      </div>
    </div>
  );

  const renderShape = () => (
    <div className="space-y-2">
      <LiveSlider
        label="Spiral Arms"
        value={settings.arms}
        min={2}
        max={6}
        step={1}
        onChange={(v) => update("arms", v)}
      />
      <LiveSlider
        label="Arm Tightness"
        value={settings.tightness}
        min={0.1}
        max={1}
        step={0.05}
        formatter={(v) => v.toFixed(2)}
        onChange={(v) => update("tightness", v)}
      />
      <LiveSlider
        label="Rotation Speed"
        value={settings.rotationSpeed}
        min={0}
        max={1}
        step={0.05}
        formatter={(v) => v.toFixed(2)}
        onChange={(v) => update("rotationSpeed", v)}
      />
      <LiveSlider
        label="Dispersion"
        value={settings.dispersion}
        min={0.5}
        max={3.0}
        step={0.05}
        formatter={(v) => v.toFixed(2)}
        onChange={(v) => update("dispersion", v)}
      />
      <LiveSlider
        label="Tilt"
        value={settings.tilt}
        min={0}
        max={1.2}
        step={0.05}
        formatter={(v) => `${(v * (180 / Math.PI)).toFixed(0)}°`}
        onChange={(v) => update("tilt", v)}
      />
      <div className="pt-1 space-y-1.5">
        <ToggleRow
          icon={<Minus className="w-3.5 h-3.5" />}
          label="Bar Structure"
          active={settings.barStructure}
          onToggle={() => update("barStructure", !settings.barStructure)}
          activeColor="bg-amber-600"
        />
        <ToggleRow
          icon={<Scaling className="w-3.5 h-3.5" />}
          label="Arm Asymmetry"
          active={settings.armAsymmetry}
          onToggle={() => update("armAsymmetry", !settings.armAsymmetry)}
          activeColor="bg-yellow-600"
        />
      </div>
    </div>
  );

  const renderStars = () => (
    <div className="space-y-1.5">
      <ToggleRow
        icon={<Palette className="w-3.5 h-3.5" />}
        label="Stellar Populations"
        active={settings.stellarPopulations}
        onToggle={() => update("stellarPopulations", !settings.stellarPopulations)}
        activeColor="bg-blue-600"
      />
      <ToggleRow
        icon={<Flame className="w-3.5 h-3.5" />}
        label="HII Regions"
        active={settings.hiiRegions}
        onToggle={() => update("hiiRegions", !settings.hiiRegions)}
        activeColor="bg-pink-600"
      />
      <ToggleRow
        icon={<Sparkle className="w-3.5 h-3.5" />}
        label="Open Clusters"
        active={settings.openClusters}
        onToggle={() => update("openClusters", !settings.openClusters)}
        activeColor="bg-sky-500"
      />
      <ToggleRow
        icon={<Orbit className="w-3.5 h-3.5" />}
        label="Globular Clusters"
        active={settings.globularClusters}
        onToggle={() => update("globularClusters", !settings.globularClusters)}
        activeColor="bg-yellow-600"
      />
      <ToggleRow
        icon={<Globe className="w-3.5 h-3.5" />}
        label="3D Particles"
        active={settings.particles3D}
        onToggle={() => update("particles3D", !settings.particles3D)}
        activeColor="bg-emerald-600"
      />
      <ToggleRow
        icon={<Wind className="w-3.5 h-3.5" />}
        label="Soft Particles"
        active={settings.softParticles}
        onToggle={() => update("softParticles", !settings.softParticles)}
        activeColor="bg-cyan-600"
      />
    </div>
  );

  const renderScene = () => (
    <div className="space-y-1.5">
      <ToggleRow
        icon={<Circle className="w-3.5 h-3.5" />}
        label="Black Hole"
        active={settings.blackHole}
        onToggle={() => update("blackHole", !settings.blackHole)}
        activeColor="bg-orange-600"
      />
      <ToggleRow
        icon={<Users className="w-3.5 h-3.5" />}
        label="Companion Galaxy"
        active={settings.companionGalaxy}
        onToggle={() => update("companionGalaxy", !settings.companionGalaxy)}
        activeColor="bg-purple-600"
      />
      <ToggleRow
        icon={<Mountain className="w-3.5 h-3.5" />}
        label="Nebula Background"
        active={settings.nebulaBackground}
        onToggle={() => update("nebulaBackground", !settings.nebulaBackground)}
        activeColor="bg-purple-600"
      />
      <ToggleRow
        icon={<Stars className="w-3.5 h-3.5" />}
        label="Distant Galaxies"
        active={settings.distantGalaxies}
        onToggle={() => update("distantGalaxies", !settings.distantGalaxies)}
        activeColor="bg-violet-600"
      />
      {settings.distantGalaxies && (
        <div className="pl-2">
          <LiveSlider
            label="Galaxy Count"
            value={settings.distantGalaxyCount}
            min={5}
            max={120}
            step={5}
            onChange={(v) => update("distantGalaxyCount", v)}
          />
        </div>
      )}
      <ToggleRow
        icon={<Tag className="w-3.5 h-3.5" />}
        label="Region Labels"
        active={settings.regionLabels}
        onToggle={() => update("regionLabels", !settings.regionLabels)}
        activeColor="bg-sky-600"
      />
    </div>
  );

  const renderSystem = () => (
    <div className="space-y-1.5">
      <ToggleRow
        icon={settings.autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        label="Auto-Rotate"
        active={settings.autoRotate}
        onToggle={() => update("autoRotate", !settings.autoRotate)}
      />
      <ToggleRow
        icon={<Camera className="w-3.5 h-3.5" />}
        label="Fly-Through Tour"
        active={settings.flyThrough}
        onToggle={() => update("flyThrough", !settings.flyThrough)}
        activeColor="bg-rose-600"
      />
      <ToggleRow
        icon={<Volume2 className="w-3.5 h-3.5" />}
        label="Ambient Sound"
        active={settings.ambientSound}
        onToggle={() => update("ambientSound", !settings.ambientSound)}
        activeColor="bg-teal-600"
      />
      <ToggleRow
        icon={<Gauge className="w-3.5 h-3.5" />}
        label="Adaptive Quality"
        active={settings.adaptiveQuality}
        onToggle={() => update("adaptiveQuality", !settings.adaptiveQuality)}
        activeColor="bg-indigo-600"
      />
      {settings.adaptiveQuality && (
        <div className="mx-1 -mt-0.5 px-2.5 py-1.5 rounded-md bg-indigo-500/10 border border-indigo-400/20 text-[11px] leading-snug text-indigo-200/80">
          Adaptive Quality is on — if you raise the star density and your frame
          rate drops, particles will auto-thin until the scene runs smoothly.
        </div>
      )}
      <ToggleRow
        icon={<Activity className="w-3.5 h-3.5" />}
        label="FPS Counter"
        active={settings.showFPS}
        onToggle={() => update("showFPS", !settings.showFPS)}
      />
      <button
        onClick={() => update("force2D", !settings.force2D)}
        className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-md bg-white/5 hover:bg-white/[0.09] transition-colors text-left"
      >
        <span className="text-[13px] text-white/85 font-medium flex items-center gap-2">
          <Eye className="w-3.5 h-3.5 text-white/55" />
          Render Engine
        </span>
        <span
          className={`shrink-0 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold ${
            settings.force2D ? "bg-amber-500 text-white" : "bg-indigo-600 text-white"
          }`}
        >
          {settings.force2D ? "2D" : "3D"}
        </span>
      </button>
    </div>
  );

  const tabContent = () => {
    switch (tab) {
      case "style": return renderStyle();
      case "shape": return renderShape();
      case "stars": return renderStars();
      case "scene": return renderScene();
      case "system": return renderSystem();
    }
  };

  const totalActive = Object.values(activeByTab).reduce((a, b) => a + b, 0);

  /* ---------- Panel content ---------- */
  const panelContent = (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Header (fixed) */}
      <div className="px-3 pt-3 pb-2 border-b border-white/5">
        <div className="flex items-center gap-2 mb-2.5">
          <Settings className="w-4 h-4 text-white/65" />
          <h2 className="text-white font-semibold text-[15px] tracking-tight">
            Galaxy Controls
          </h2>
        </div>
        <div className="grid grid-cols-4 gap-1">
          <button
            onClick={randomize}
            title="Randomize settings"
            className="flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-md text-[11px] font-medium bg-white/10 text-white hover:bg-white/20 transition-all"
          >
            <Shuffle className="w-3 h-3" />
            Random
          </button>
          <button
            onClick={reset}
            title="Reset to defaults"
            className="flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-md text-[11px] font-medium bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-all"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
          {onShare ? (
            <button
              onClick={handleShare}
              title="Copy a shareable link to this exact galaxy"
              className={`flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                copied
                  ? "bg-emerald-600 text-white"
                  : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {copied ? <Check className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
              {copied ? "Copied" : "Link"}
            </button>
          ) : (
            <div />
          )}
          {onSnapshot ? (
            <button
              onClick={onSnapshot}
              title="Save snapshot as PNG"
              className="flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-md text-[11px] font-medium bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white hover:from-indigo-500 hover:to-fuchsia-500 transition-all"
            >
              <Download className="w-3 h-3" />
              Save
            </button>
          ) : (
            <div />
          )}
        </div>
      </div>

      {/* Tab pills (fixed) */}
      <div className="px-2 pt-2 pb-1.5 border-b border-white/5">
        <div className="flex items-center gap-0.5 bg-white/5 rounded-md p-0.5">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            const count = activeByTab[t.id];
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                title={`${t.label}${count > 0 ? ` — ${count} active` : ""}`}
                className={`flex-1 relative flex flex-col items-center justify-center gap-0.5 py-1.5 rounded transition-all ${
                  isActive
                    ? "bg-white/15 text-white"
                    : "text-white/55 hover:text-white/85 hover:bg-white/5"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="text-[10px] font-semibold tracking-tight leading-none">
                  {t.label}
                </span>
                {count > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] flex items-center justify-center text-[9px] font-bold bg-fuchsia-500 text-white rounded-full px-1">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content (scrollable) */}
      <div className="flex-1 min-h-0 overflow-y-auto galaxy-scroll px-2.5 py-3">
        {tabContent()}
      </div>

      {/* Footer (fixed) */}
      {totalActive > 0 && (
        <div className="border-t border-white/5 px-3 py-1.5 text-center text-[10px] text-white/35">
          {totalActive} feature{totalActive === 1 ? "" : "s"} active
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
        <div className="pointer-events-auto bg-black/70 backdrop-blur-xl border-t border-white/10 flex flex-col">
          <button
            onClick={() => setOpen(!open)}
            className="w-full flex items-center justify-center gap-2 py-2 text-white/70 hover:text-white transition-colors"
          >
            {open ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            <span className="text-xs uppercase tracking-widest">
              {open ? "Hide Controls" : "Show Controls"}
            </span>
          </button>
          <div
            className={`flex flex-col overflow-hidden transition-[max-height] duration-300 ${
              open ? "max-h-[70vh]" : "max-h-0"
            }`}
          >
            {panelContent}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 h-screen z-50 flex items-stretch pointer-events-none">
      <div
        className={`pointer-events-auto h-full transition-[width] duration-300 ease-in-out overflow-hidden ${
          open ? "w-72" : "w-0"
        }`}
      >
        <div className="h-full w-72 bg-black/45 backdrop-blur-xl border-r border-white/10 flex flex-col overflow-hidden">
          {panelContent}
        </div>
      </div>

      <button
        onClick={() => setOpen(!open)}
        className="pointer-events-auto self-center -ml-px bg-black/45 backdrop-blur-xl border border-white/10 border-l-0 rounded-r-lg p-2 text-white/60 hover:text-white/90 transition-colors"
        title={open ? "Hide controls" : "Show controls"}
      >
        {open ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
    </div>
  );
}
