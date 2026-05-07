import React, { useEffect, useRef, useMemo } from "react";
import { COLOR_THEMES, type GalaxySettings } from "./types";

interface Props {
  settings: GalaxySettings;
}

export function Galaxy2D({ settings }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const timeRef = useRef(0);

  // Generate logical particle positions and properties
  const { particles, stars } = useMemo(() => {
    // Reduce count slightly for better clarity and less over-saturation
    const count = Math.min(settings.particleCount, 18000);
    const theme = COLOR_THEMES[settings.theme] || COLOR_THEMES.andromeda;
    const arms = settings.arms;
    const tightness = settings.tightness * 4 + 0.5;

    const arr = [];
    for (let i = 0; i < count; i++) {
      const isGas = Math.random() < 0.25;
      const armIndex = i % arms;
      const angleOffset = (armIndex / arms) * Math.PI * 2;

      const r = Math.pow(Math.random(), 1.2) * 250;
      const isCoreBulge = Math.random() < 0.15 && r < 50;

      const spiralAngle = (r / 25) * tightness + angleOffset;
      const noise = (Math.random() - 0.5) * (isGas ? 65 : 28) * settings.dispersion / (r / 25 + 1);
      const angle = isCoreBulge ? Math.random() * Math.PI * 2 : spiralAngle + noise;

      // Vertical spread for 3D depth
      const verticalSpread = isCoreBulge ? 35 : (isGas ? 20 : 10);
      const h = (Math.random() - 0.5) * verticalSpread;

      // Color logic
      let rgb: [number, number, number];
      if (r < 50 || isCoreBulge) {
        const mixRatio = r / 50;
        rgb = [
          theme.core[0] * (1 - mixRatio) + theme.mid[0] * mixRatio,
          theme.core[1] * (1 - mixRatio) + theme.mid[1] * mixRatio,
          theme.core[2] * (1 - mixRatio) + theme.mid[2] * mixRatio,
        ];
      } else {
        const mixRatio = (r - 45) / 205;
        if (isGas && Math.random() < 0.3) {
          rgb = theme.dust;
        } else {
          rgb = [
            theme.mid[0] * (1 - mixRatio) + theme.outer[0] * mixRatio,
            theme.mid[1] * (1 - mixRatio) + theme.outer[1] * mixRatio,
            theme.mid[2] * (1 - mixRatio) + theme.outer[2] * mixRatio,
          ];
        }
      }

      // Add color diversity
      const jitter = (Math.random() - 0.5) * 0.12;
      const r_val = Math.floor(Math.max(0, Math.min(255, (rgb[0] + jitter) * 255)));
      const g_val = Math.floor(Math.max(0, Math.min(255, (rgb[1] + jitter) * 255)));
      const b_val = Math.floor(Math.max(0, Math.min(255, (rgb[2] + jitter) * 255)));

      // Lower base brightness specifically for the core to prevent white-out
      const coreDimmer = isCoreBulge ? 0.4 : 1.0;
      const size = isGas ? 1.5 + Math.random() * 2 : 0.6 + Math.random() * 1.2;
      const brightness = (isGas ? 0.08 + Math.random() * 0.1 : 0.15 + Math.random() * 0.25) * coreDimmer;

      arr.push({
        r,
        baseAngle: angle,
        h,
        size,
        colorBase: `${r_val}, ${g_val}, ${b_val}`,
        brightness,
        isGas
      });
    }

    // Static background stars
    const starArr = [];
    for (let i = 0; i < 1200; i++) {
      starArr.push({
        x: Math.random() * 2 - 1,
        y: Math.random() * 2 - 1,
        size: Math.random() * 1.2 + 0.2,
        opacity: Math.random() * 0.3 + 0.05
      });
    }

    return { particles: arr, stars: starArr };
  }, [settings.particleCount, settings.theme, settings.arms, settings.tightness, settings.dispersion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    };

    window.addEventListener("resize", resize);
    resize();

    const focalLength = 700;

    const render = (now: number) => {
      timeRef.current = now * 0.001;
      const rotation = timeRef.current * settings.rotationSpeed * 0.2;

      // True black background
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      // Stars
      ctx.globalCompositeOperation = "source-over";
      stars.forEach(s => {
        ctx.fillStyle = `rgba(255, 255, 255, ${s.opacity})`;
        ctx.fillRect(centerX + s.x * window.innerWidth * 0.8, centerY + s.y * window.innerHeight * 0.8, s.size, s.size);
      });

      // Galaxy Particles
      // Using 'lighter' but with extremely suppressed alpha to avoid white-out
      ctx.globalCompositeOperation = "lighter";

      const tilt = settings.tilt;
      const cosTilt = Math.cos(tilt);
      const sinTilt = Math.sin(tilt);

      particles.forEach((p) => {
        const angle = p.baseAngle + rotation;
        const x3 = Math.cos(angle) * p.r;
        const z3 = Math.sin(angle) * p.r;
        const y3 = p.h;

        const ty = y3 * cosTilt - z3 * sinTilt;
        const tz = y3 * sinTilt + z3 * cosTilt;

        const zScale = focalLength / (focalLength + tz + 350);
        const screenX = centerX + x3 * zScale;
        const screenY = centerY + ty * zScale;

        const finalSize = p.size * zScale;
        // Exponential falloff for brightness based on distance and core density
        // Apply UI brightness setting
        const opacity = p.brightness * Math.pow(zScale, 1.5) * settings.brightness;

        ctx.fillStyle = `rgba(${p.colorBase}, ${opacity})`;

        if (p.isGas) {
          ctx.beginPath();
          ctx.arc(screenX, screenY, finalSize * 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(screenX, screenY, finalSize, finalSize);
        }
      });

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);
    return () => {
      window.removeEventListener("resize", resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [particles, stars, settings.rotationSpeed, settings.tilt, settings.brightness]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      style={{ background: "#000" }}
    />
  );
}
