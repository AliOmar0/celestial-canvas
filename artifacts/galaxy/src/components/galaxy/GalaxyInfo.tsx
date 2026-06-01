import { motion, AnimatePresence } from "framer-motion";
import { Info, X, Telescope } from "lucide-react";
import type { RealGalaxy } from "./realGalaxies";

interface GalaxyInfoProps {
  galaxy: RealGalaxy | null;
  visible: boolean;
  onToggle: () => void;
  onOpenGallery: () => void;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-white/35 text-[10px] uppercase tracking-wider">{label}</span>
      <span className="text-white/85 text-[12.5px] font-medium leading-tight mt-0.5">{value}</span>
    </div>
  );
}

export function GalaxyInfo({ galaxy, visible, onToggle, onOpenGallery }: GalaxyInfoProps) {
  if (!galaxy) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2 max-w-[calc(100vw-2rem)]">
      <AnimatePresence mode="wait">
        {visible && (
          <motion.div
            key={galaxy.id}
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="w-[320px] max-w-full rounded-2xl overflow-hidden bg-zinc-950/80 backdrop-blur-xl border border-white/10 shadow-[0_24px_80px_-24px_rgba(168,85,247,0.4)]"
          >
            <div className="relative h-28 overflow-hidden">
              <img src={galaxy.image} alt={galaxy.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />
              <button
                onClick={onToggle}
                aria-label="Hide info"
                className="absolute top-2 right-2 p-1.5 rounded-md text-white/60 hover:text-white bg-black/40 backdrop-blur hover:bg-black/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-2 left-3 right-3">
                <h3 className="text-white text-base font-semibold tracking-tight leading-tight">
                  {galaxy.name}
                </h3>
                <p className="text-white/55 text-[11px]">{galaxy.catalog}</p>
              </div>
            </div>

            <div className="p-4">
              <p className="text-white/70 text-[12.5px] leading-relaxed">{galaxy.description}</p>

              <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-4">
                <Stat label="Type" value={galaxy.type} />
                <Stat label="Constellation" value={galaxy.constellation} />
                <Stat label="Distance" value={galaxy.distance} />
                <Stat label="Diameter" value={galaxy.diameter} />
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-lg bg-white/[0.04] border border-white/5 px-3 py-2">
                <Sparkle />
                <p className="text-white/65 text-[11.5px] leading-snug">{galaxy.funFact}</p>
              </div>

              <button
                onClick={onOpenGallery}
                className="mt-4 w-full py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/80 text-[12.5px] font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Telescope className="w-3.5 h-3.5" />
                Travel to another galaxy
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={onToggle}
          className="flex items-center gap-2 rounded-full bg-zinc-950/80 backdrop-blur-xl border border-white/10 pl-2 pr-3.5 py-2 text-white/80 hover:text-white hover:border-white/25 transition-colors shadow-lg"
        >
          <span className="w-6 h-6 rounded-full overflow-hidden border border-white/15 shrink-0">
            <img src={galaxy.image} alt="" className="w-full h-full object-cover" />
          </span>
          <span className="text-[12.5px] font-medium">{galaxy.name}</span>
          <Info className="w-3.5 h-3.5 text-white/50" />
        </motion.button>
      )}
    </div>
  );
}

function Sparkle() {
  return (
    <svg className="w-3.5 h-3.5 mt-0.5 shrink-0 text-fuchsia-400" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l1.6 6.4L20 10l-6.4 1.6L12 18l-1.6-6.4L4 10l6.4-1.6z" />
    </svg>
  );
}
