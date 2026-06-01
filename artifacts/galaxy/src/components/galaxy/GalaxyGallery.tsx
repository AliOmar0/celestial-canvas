import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Telescope } from "lucide-react";
import { REAL_GALAXIES, type RealGalaxy } from "./realGalaxies";

interface GalaxyGalleryProps {
  open: boolean;
  activeId: string | null;
  onClose: () => void;
  onSelect: (galaxy: RealGalaxy) => void;
}

export function GalaxyGallery({ open, activeId, onClose, onSelect }: GalaxyGalleryProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="gallery"
          role="dialog"
          aria-modal="true"
          aria-label="Real galaxies gallery"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[55] flex flex-col bg-black/80 backdrop-blur-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 sm:px-8 py-4 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-fuchsia-500/25">
                <Telescope className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <h2 className="text-white text-base sm:text-lg font-semibold tracking-tight leading-tight">
                  Real Galaxies
                </h2>
                <p className="text-white/45 text-[11px] uppercase tracking-[0.16em] leading-tight mt-0.5">
                  Documented by NASA · pick one to travel there
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close gallery"
              className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-7xl mx-auto">
              {REAL_GALAXIES.map((g, i) => {
                const isActive = g.id === activeId;
                return (
                  <motion.button
                    key={g.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, type: "spring", stiffness: 260, damping: 26 }}
                    whileHover={{ y: -4 }}
                    onClick={() => onSelect(g)}
                    className={`group text-left rounded-xl overflow-hidden border bg-white/[0.03] transition-colors ${
                      isActive
                        ? "border-fuchsia-400/70 ring-1 ring-fuchsia-400/40"
                        : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-black">
                      <img
                        src={g.image}
                        alt={g.name}
                        loading="lazy"
                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <span className="absolute top-2 left-2 text-[10px] font-medium uppercase tracking-wider text-white/70 bg-black/50 backdrop-blur px-2 py-0.5 rounded">
                        {g.catalog.split(" · ")[0]}
                      </span>
                      {isActive && (
                        <span className="absolute top-2 right-2 text-[10px] font-semibold uppercase tracking-wider text-white bg-fuchsia-600/80 backdrop-blur px-2 py-0.5 rounded">
                          Viewing
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="text-white text-sm font-semibold tracking-tight leading-tight">
                        {g.name}
                      </h3>
                      <p className="text-white/40 text-[11px] mt-0.5">{g.type}</p>
                      <p className="text-white/55 text-[11.5px] leading-snug mt-2 line-clamp-2">
                        {g.funFact}
                      </p>
                      <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-indigo-300/80 group-hover:text-fuchsia-300 transition-colors">
                        <span>{isActive ? "Re-enter" : "Warp here"}</span>
                        <span className="transition-transform group-hover:translate-x-0.5">→</span>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
