import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface WarpStar {
  angle: number;
  radius: number;
  speed: number;
  len: number;
  hue: number;
}

/**
 * Full-screen "hyperspace" warp overlay rendered on a 2D canvas (outside the
 * R3F canvas). Radial star streaks accelerate outward and a white flash peaks
 * mid-transition — the moment to swap the galaxy underneath so the regeneration
 * pop stays hidden behind the light.
 */
export function WarpTransition({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const starsRef = useRef<WarpStar[]>([]);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize);

    const COUNT = 520;
    starsRef.current = Array.from({ length: COUNT }, () => ({
      angle: Math.random() * Math.PI * 2,
      radius: Math.random() * 120,
      speed: 2 + Math.random() * 6,
      len: 0.05 + Math.random() * 0.18,
      hue: 200 + Math.random() * 80,
    }));
    startRef.current = performance.now();

    const draw = (now: number) => {
      const t = Math.min((now - startRef.current) / 1500, 1);
      // Accelerate then ease out so the streaks feel like a jump to light-speed.
      const accel = t < 0.5 ? t / 0.5 : 1 - (t - 0.5) / 0.5;
      const boost = 1 + accel * accel * 14;

      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const maxR = Math.hypot(cx, cy);

      ctx.fillStyle = "rgba(0,0,0,0.32)";
      ctx.fillRect(0, 0, w, h);

      ctx.lineCap = "round";
      for (const s of starsRef.current) {
        s.radius += s.speed * boost * dpr;
        if (s.radius > maxR) {
          s.radius = Math.random() * 40;
          s.angle = Math.random() * Math.PI * 2;
        }
        const cos = Math.cos(s.angle);
        const sin = Math.sin(s.angle);
        const x1 = cx + cos * s.radius;
        const y1 = cy + sin * s.radius;
        const tailR = s.radius * (1 - s.len - 0.12 * accel);
        const x2 = cx + cos * tailR;
        const y2 = cy + sin * tailR;
        const alpha = Math.min(0.15 + (s.radius / maxR) * 0.85, 1);
        ctx.strokeStyle = `hsla(${s.hue}, 80%, ${70 + accel * 25}%, ${alpha})`;
        ctx.lineWidth = (0.6 + (s.radius / maxR) * 2.2 + accel * 1.5) * dpr;
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }

      if (active) rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="warp"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[60] pointer-events-none"
        >
          <canvas ref={canvasRef} className="w-full h-full" />
          {/* Light-speed flash at the midpoint of the jump */}
          <motion.div
            className="absolute inset-0"
            style={{ background: "radial-gradient(circle at center, #fff 0%, rgba(180,200,255,0.6) 35%, transparent 70%)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0, 0.85, 0] }}
            transition={{ duration: 1.5, times: [0, 0.35, 0.52, 0.85], ease: "easeInOut" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
