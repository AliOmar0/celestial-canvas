import { useState, useEffect } from "react";
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
} from "lucide-react";

interface Props {
  settings: GalaxySettings;
  onChange: (s: GalaxySettings) => void;
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

interface ToggleRowProps {
  icon: React.ReactNode;
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
    <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5">
      <span className="text-sm text-white/70 font-medium tracking-tight flex items-center gap-2">
        {icon}
        {label}
      </span>
      <button
        onClick={onToggle}
        className={`px-3 py-1.5 rounded-md text-[10px] uppercase tracking-wider transition-all font-black shadow-lg ${
          active ? `${activeColor} text-white` : "bg-white/10 text-white/60 hover:bg-white/20"
        }`}
      >
        {active ? activeText : inactiveText}
      </button>
    </div>
  );
}

export function ControlPanel({ settings, onChange }: Props) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(!isMobile);

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

  const LiveSlider = ({
    label,
    value,
    min,
    max,
    step,
    onChange: onLiveChange,
    formatter = (v: number) => v.toString(),
  }: {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (v: number) => void;
    formatter?: (v: number) => string;
  }) => (
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

  const panelContent = (
    <div className="flex flex-col gap-6 p-6 overflow-y-auto h-full">
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5 text-white/70" />
        <h2 className="text-white font-semibold text-lg tracking-tight">
          Galaxy Controls
        </h2>
      </div>

      {/* Quick Actions */}
      <section className="grid grid-cols-2 gap-2">
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
      </section>

      {/* Presets */}
      <section className="space-y-3">
        <h3 className="text-xs uppercase tracking-widest text-white/40 font-medium">
          Shape Preset
        </h3>
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
      </section>

      {/* Shape */}
      <section className="space-y-4">
        <h3 className="text-xs uppercase tracking-widest text-white/40 font-medium">
          Shape
        </h3>

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

        <div className="space-y-2">
          <div className="flex justify-between text-sm text-white/70">
            <span>Rotation Speed</span>
            <span className="text-white/50">
              {settings.rotationSpeed.toFixed(2)}
            </span>
          </div>
          <Slider
            min={0}
            max={1}
            step={0.05}
            value={[settings.rotationSpeed]}
            onValueChange={([v]) => update("rotationSpeed", v)}
            className={sliderClass}
          />
        </div>

        <LiveSlider
          label="Dispersion"
          value={settings.dispersion}
          min={0.5}
          max={3.0}
          step={0.05}
          formatter={(v) => v.toFixed(2)}
          onChange={(v) => update("dispersion", v)}
        />

        <div className="space-y-2">
          <div className="flex justify-between text-sm text-white/70">
            <span>Tilt</span>
            <span className="text-white/50">
              {(settings.tilt * (180 / Math.PI)).toFixed(0)}°
            </span>
          </div>
          <Slider
            min={0}
            max={1.2}
            step={0.05}
            value={[settings.tilt]}
            onValueChange={([v]) => update("tilt", v)}
            className={sliderClass}
          />
        </div>
      </section>

      {/* Color Themes */}
      <section className="space-y-3">
        <h3 className="text-xs uppercase tracking-widest text-white/40 font-medium">
          Color Theme
        </h3>
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
      </section>

      {/* Appearance */}
      <section className="space-y-3">
        <h3 className="text-xs uppercase tracking-widest text-white/40 font-medium">
          Appearance
        </h3>

        <div className="space-y-2">
          <div className="flex justify-between text-sm text-white/70">
            <span>Brightness</span>
            <span className="text-white/50">
              {settings.brightness.toFixed(2)}
            </span>
          </div>
          <Slider
            min={0.1}
            max={1.0}
            step={0.05}
            value={[settings.brightness]}
            onValueChange={([v]) => update("brightness", v)}
            className={sliderClass}
          />
        </div>

        <LiveSlider
          label="Density"
          value={settings.particleCount}
          min={5000}
          max={150000}
          step={5000}
          formatter={(v) => (v / 1000).toFixed(0) + "K"}
          onChange={(v) => update("particleCount", v)}
        />
      </section>

      {/* Effects */}
      <section className="space-y-2">
        <h3 className="text-xs uppercase tracking-widest text-white/40 font-medium">
          Effects
        </h3>

        <ToggleRow
          icon={<Sparkles className="w-3.5 h-3.5" />}
          label="Bloom Glow"
          active={settings.bloom}
          onToggle={() => update("bloom", !settings.bloom)}
          activeColor="bg-fuchsia-600 hover:bg-fuchsia-500"
        />

        <ToggleRow
          icon={<Circle className="w-3.5 h-3.5" />}
          label="Black Hole"
          active={settings.blackHole}
          onToggle={() => update("blackHole", !settings.blackHole)}
          activeColor="bg-orange-600 hover:bg-orange-500"
        />

        <ToggleRow
          icon={<Mountain className="w-3.5 h-3.5" />}
          label="Nebula Background"
          active={settings.nebulaBackground}
          onToggle={() => update("nebulaBackground", !settings.nebulaBackground)}
          activeColor="bg-purple-600 hover:bg-purple-500"
        />

        <ToggleRow
          icon={<Tag className="w-3.5 h-3.5" />}
          label="Region Labels"
          active={settings.regionLabels}
          onToggle={() => update("regionLabels", !settings.regionLabels)}
          activeColor="bg-sky-600 hover:bg-sky-500"
        />
      </section>

      {/* Camera & Audio */}
      <section className="space-y-2">
        <h3 className="text-xs uppercase tracking-widest text-white/40 font-medium">
          Camera & Audio
        </h3>

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
      </section>

      {/* Engine */}
      <section className="space-y-2">
        <h3 className="text-xs uppercase tracking-widest text-white/40 font-medium">
          Engine
        </h3>

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
      </section>
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
            className={`overflow-hidden transition-all duration-300 ${
              open ? "max-h-[60vh]" : "max-h-0"
            }`}
          >
            {panelContent}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 h-full z-50 flex items-stretch pointer-events-none">
      <div
        className={`pointer-events-auto transition-all duration-300 ease-in-out overflow-hidden ${
          open ? "w-72" : "w-0"
        }`}
      >
        <div className="h-full w-72 bg-black/40 backdrop-blur-xl border-r border-white/10">
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
