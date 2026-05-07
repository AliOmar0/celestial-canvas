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
} from "lucide-react";

interface Props {
  settings: GalaxySettings;
  onChange: (s: GalaxySettings) => void;
  onSnapshot?: () => void;
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

/* ---------- Collapsible Section ---------- */
// Supports BOTH uncontrolled (independent open/close) and controlled
// (accordion group via openId/setOpenId/sectionId — only one open at a
// time within a group) modes. Used to declutter the optional sections.
interface SectionProps {
  title: string;
  defaultOpen?: boolean;
  badge?: string;
  children: ReactNode;
  // Accordion group support
  sectionId?: string;
  openId?: string | null;
  setOpenId?: (id: string | null) => void;
}
function Section({
  title,
  defaultOpen = true,
  badge,
  children,
  sectionId,
  openId,
  setOpenId,
}: SectionProps) {
  const isControlled = sectionId !== undefined && setOpenId !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = isControlled ? openId === sectionId : uncontrolledOpen;
  const toggle = () => {
    if (isControlled) {
      setOpenId!(open ? null : sectionId!);
    } else {
      setUncontrolledOpen(!uncontrolledOpen);
    }
  };
  return (
    <section className="border border-white/5 rounded-lg overflow-hidden bg-white/[0.02]">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-[11px] uppercase tracking-widest text-white/55 font-semibold">
            {title}
          </h3>
          {badge && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/60 font-medium">
              {badge}
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp className="w-3.5 h-3.5 text-white/40" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-white/40" />
        )}
      </button>
      {open && <div className="px-2 pb-2 pt-1 space-y-2">{children}</div>}
    </section>
  );
}

interface ToggleRowProps {
  icon: ReactNode;
  label: string;
  active: boolean;
  onToggle: () => void;
  activeColor?: string;
  activeText?: string;
  inactiveText?: string;
}

function ToggleRow({
  icon,
  label,
  active,
  onToggle,
  activeColor = "bg-emerald-600 hover:bg-emerald-500",
  activeText = "On",
  inactiveText = "Off",
}: ToggleRowProps) {
  return (
    <button
      onClick={onToggle}
      title={`${label} — ${active ? activeText : inactiveText}`}
      role="switch"
      aria-checked={active}
      className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-white/5 border border-white/5 hover:bg-white/[0.08] transition-colors text-left"
    >
      <span className="text-[12.5px] text-white/80 font-medium tracking-tight flex items-start gap-2 min-w-0 flex-1 leading-snug">
        <span className="shrink-0 text-white/50 pt-[1px]">{icon}</span>
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

/* ---------- LiveSlider declared at module scope so it doesn't remount on every parent render ---------- */
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
    <div className="space-y-2">
      <div className="flex justify-between text-sm text-white/70">
        <span>{label}</span>
        <span className="text-white/50">{formatter(value)}</span>
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

export function ControlPanel({ settings, onChange, onSnapshot }: Props) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(!isMobile);
  // Accordion state — only one optional section open at a time so the
  // panel never becomes a wall of toggles.
  const [openOpt, setOpenOpt] = useState<string | null>(null);

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

  // Count active toggles for header summary
  const activeFeatureCount = [
    settings.bloom,
    settings.softParticles,
    settings.particles3D,
    settings.openClusters,
    settings.blackHole,
    settings.nebulaBackground,
    settings.distantGalaxies,
    settings.regionLabels,
    settings.hiiRegions,
    settings.globularClusters,
    settings.stellarPopulations,
    settings.barStructure,
    settings.armAsymmetry,
    settings.companionGalaxy,
  ].filter(Boolean).length;

  const panelContent = (
    <div
      className="flex-1 min-h-0 flex flex-col gap-2 p-3 overflow-y-auto galaxy-scroll"
    >
      <div className="flex items-center gap-2 px-1">
        <Settings className="w-5 h-5 text-white/70" />
        <h2 className="text-white font-semibold text-lg tracking-tight">
          Galaxy Controls
        </h2>
      </div>

      {/* Quick Actions — always visible, not in a section */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={randomize}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white/10 text-white hover:bg-white/20 transition-all"
        >
          <Shuffle className="w-3.5 h-3.5" />
          Randomize
        </button>
        <button
          onClick={reset}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
        {onSnapshot && (
          <button
            onClick={onSnapshot}
            className="col-span-2 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white hover:from-indigo-500 hover:to-fuchsia-500 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Save Snapshot (PNG)
          </button>
        )}
      </div>

      <Section title="Shape Preset" defaultOpen>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(GALAXY_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => applyPreset(preset.partial)}
              className="px-3 py-2 rounded-lg text-xs font-medium bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-all"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Shape" defaultOpen>
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
      </Section>

      <Section title="Color Theme" defaultOpen>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(COLOR_THEMES).map(([key, theme]) => (
            <button
              key={key}
              onClick={() => update("theme", key)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                settings.theme === key
                  ? "bg-white/20 text-white ring-1 ring-white/40"
                  : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70"
              }`}
            >
              {theme.name}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Appearance" defaultOpen>
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
      </Section>

      <Section
        title="Galactic Structure"
        badge={[settings.barStructure, settings.armAsymmetry, settings.stellarPopulations].filter(Boolean).length || undefined ? `${[settings.barStructure, settings.armAsymmetry, settings.stellarPopulations].filter(Boolean).length} on` : undefined}
        defaultOpen={false}
        sectionId="galactic"
        openId={openOpt}
        setOpenId={setOpenOpt}
      >
        <ToggleRow
          icon={<Minus className="w-3.5 h-3.5" />}
          label="Bar Structure"
          active={settings.barStructure}
          onToggle={() => update("barStructure", !settings.barStructure)}
          activeColor="bg-amber-600 hover:bg-amber-500"
        />
        <ToggleRow
          icon={<Scaling className="w-3.5 h-3.5" />}
          label="Arm Asymmetry"
          active={settings.armAsymmetry}
          onToggle={() => update("armAsymmetry", !settings.armAsymmetry)}
          activeColor="bg-yellow-600 hover:bg-yellow-500"
        />
        <ToggleRow
          icon={<Palette className="w-3.5 h-3.5" />}
          label="Stellar Populations"
          active={settings.stellarPopulations}
          onToggle={() => update("stellarPopulations", !settings.stellarPopulations)}
          activeColor="bg-blue-600 hover:bg-blue-500"
        />
      </Section>

      <Section
        title="Disk Features"
        badge={[settings.openClusters, settings.hiiRegions, settings.particles3D, settings.softParticles].filter(Boolean).length || undefined ? `${[settings.openClusters, settings.hiiRegions, settings.particles3D, settings.softParticles].filter(Boolean).length} on` : undefined}
        defaultOpen={false}
        sectionId="disk"
        openId={openOpt}
        setOpenId={setOpenOpt}
      >
        <ToggleRow
          icon={<Sparkle className="w-3.5 h-3.5" />}
          label="Open Clusters"
          active={settings.openClusters}
          onToggle={() => update("openClusters", !settings.openClusters)}
          activeColor="bg-sky-500 hover:bg-sky-400"
        />
        <ToggleRow
          icon={<Flame className="w-3.5 h-3.5" />}
          label="HII Regions"
          active={settings.hiiRegions}
          onToggle={() => update("hiiRegions", !settings.hiiRegions)}
          activeColor="bg-pink-600 hover:bg-pink-500"
        />
        <ToggleRow
          icon={<Globe className="w-3.5 h-3.5" />}
          label="3D Particles"
          active={settings.particles3D}
          onToggle={() => update("particles3D", !settings.particles3D)}
          activeColor="bg-emerald-600 hover:bg-emerald-500"
        />
        <ToggleRow
          icon={<Wind className="w-3.5 h-3.5" />}
          label="Soft Particles"
          active={settings.softParticles}
          onToggle={() => update("softParticles", !settings.softParticles)}
          activeColor="bg-cyan-600 hover:bg-cyan-500"
        />
      </Section>

      <Section
        title="Halo & Companions"
        badge={[settings.globularClusters, settings.blackHole, settings.companionGalaxy].filter(Boolean).length || undefined ? `${[settings.globularClusters, settings.blackHole, settings.companionGalaxy].filter(Boolean).length} on` : undefined}
        defaultOpen={false}
        sectionId="halo"
        openId={openOpt}
        setOpenId={setOpenOpt}
      >
        <ToggleRow
          icon={<Orbit className="w-3.5 h-3.5" />}
          label="Globular Clusters"
          active={settings.globularClusters}
          onToggle={() => update("globularClusters", !settings.globularClusters)}
          activeColor="bg-yellow-600 hover:bg-yellow-500"
        />
        <ToggleRow
          icon={<Circle className="w-3.5 h-3.5" />}
          label="Black Hole"
          active={settings.blackHole}
          onToggle={() => update("blackHole", !settings.blackHole)}
          activeColor="bg-orange-600 hover:bg-orange-500"
        />
        <ToggleRow
          icon={<Users className="w-3.5 h-3.5" />}
          label="Companion Galaxy"
          active={settings.companionGalaxy}
          onToggle={() => update("companionGalaxy", !settings.companionGalaxy)}
          activeColor="bg-purple-600 hover:bg-purple-500"
        />
      </Section>

      <Section
        title="Deep Space"
        badge={[settings.nebulaBackground, settings.distantGalaxies, settings.regionLabels].filter(Boolean).length || undefined ? `${[settings.nebulaBackground, settings.distantGalaxies, settings.regionLabels].filter(Boolean).length} on` : undefined}
        defaultOpen={false}
        sectionId="deep"
        openId={openOpt}
        setOpenId={setOpenOpt}
      >
        <ToggleRow
          icon={<Mountain className="w-3.5 h-3.5" />}
          label="Nebula Background"
          active={settings.nebulaBackground}
          onToggle={() => update("nebulaBackground", !settings.nebulaBackground)}
          activeColor="bg-purple-600 hover:bg-purple-500"
        />
        <ToggleRow
          icon={<Stars className="w-3.5 h-3.5" />}
          label="Distant Galaxies"
          active={settings.distantGalaxies}
          onToggle={() => update("distantGalaxies", !settings.distantGalaxies)}
          activeColor="bg-violet-600 hover:bg-violet-500"
        />
        {settings.distantGalaxies && (
          <div className="pl-1">
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
          activeColor="bg-sky-600 hover:bg-sky-500"
        />
      </Section>

      <Section
        title="Atmosphere"
        badge={settings.bloom ? "1 on" : undefined}
        defaultOpen={false}
        sectionId="atmosphere"
        openId={openOpt}
        setOpenId={setOpenOpt}
      >
        <ToggleRow
          icon={<Sparkles className="w-3.5 h-3.5" />}
          label="Bloom Glow"
          active={settings.bloom}
          onToggle={() => update("bloom", !settings.bloom)}
          activeColor="bg-fuchsia-600 hover:bg-fuchsia-500"
        />
      </Section>

      <Section
        title="Camera & Audio"
        defaultOpen={false}
        sectionId="camera"
        openId={openOpt}
        setOpenId={setOpenOpt}
      >
        <ToggleRow
          icon={<Camera className="w-3.5 h-3.5" />}
          label="Fly-Through Tour"
          active={settings.flyThrough}
          onToggle={() => update("flyThrough", !settings.flyThrough)}
          activeColor="bg-rose-600 hover:bg-rose-500"
        />
        <ToggleRow
          icon={<Volume2 className="w-3.5 h-3.5" />}
          label="Ambient Sound"
          active={settings.ambientSound}
          onToggle={() => update("ambientSound", !settings.ambientSound)}
          activeColor="bg-teal-600 hover:bg-teal-500"
        />
        <ToggleRow
          icon={settings.autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          label="Auto-Rotate"
          active={settings.autoRotate}
          onToggle={() => update("autoRotate", !settings.autoRotate)}
        />
      </Section>

      <Section
        title="Engine"
        defaultOpen={false}
        sectionId="engine"
        openId={openOpt}
        setOpenId={setOpenOpt}
      >
        <ToggleRow
          icon={<Gauge className="w-3.5 h-3.5" />}
          label="Adaptive Quality"
          active={settings.adaptiveQuality}
          onToggle={() => update("adaptiveQuality", !settings.adaptiveQuality)}
          activeColor="bg-indigo-600 hover:bg-indigo-500"
        />
        <ToggleRow
          icon={<Activity className="w-3.5 h-3.5" />}
          label="FPS Counter"
          active={settings.showFPS}
          onToggle={() => update("showFPS", !settings.showFPS)}
        />
        <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5">
          <span className="text-sm text-white/70 font-medium tracking-tight">
            Render Engine
          </span>
          <button
            onClick={() => update("force2D", !settings.force2D)}
            className={`px-3 py-1.5 rounded-md text-[10px] uppercase tracking-wider transition-all font-black shadow-lg ${
              settings.force2D
                ? "bg-amber-500 text-white hover:bg-amber-400"
                : "bg-indigo-600 text-white hover:bg-indigo-500"
            }`}
          >
            {settings.force2D ? "2D Mode" : "3D Mode"}
          </button>
        </div>
      </Section>

      {activeFeatureCount > 0 && (
        <div className="text-[10px] text-white/30 text-center pt-1 pb-2">
          {activeFeatureCount} feature{activeFeatureCount === 1 ? "" : "s"} active
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
        <div className="pointer-events-auto bg-black/60 backdrop-blur-xl border-t border-white/10">
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
              open ? "max-h-[65vh]" : "max-h-0"
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
          open ? "w-[22rem]" : "w-0"
        }`}
      >
        <div className="h-full w-[22rem] bg-black/40 backdrop-blur-xl border-r border-white/10 flex flex-col overflow-hidden">
          {panelContent}
        </div>
      </div>

      <button
        onClick={() => setOpen(!open)}
        className="pointer-events-auto self-center -ml-px bg-black/40 backdrop-blur-xl border border-white/10 border-l-0 rounded-r-lg p-2 text-white/60 hover:text-white/90 transition-colors"
      >
        {open ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
    </div>
  );
}
