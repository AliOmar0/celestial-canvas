import { useId } from "react";
import { COLOR_THEMES } from "./types";

interface Props {
  themeKey: string;
  active: boolean;
}

export function NebulaBackground({ themeKey, active }: Props) {
  const turbId = useId().replace(/:/g, "");
  if (!active) return null;
  const theme = COLOR_THEMES[themeKey] || COLOR_THEMES.andromeda;

  const toRgb = (c: [number, number, number], a: number) =>
    `rgba(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)}, ${a})`;

  // Bright nebula clouds spread across the whole viewport (not just around the galaxy)
  const c1 = toRgb(theme.mid, 0.55);
  const c2 = toRgb(theme.outer, 0.45);
  const c3 = toRgb(theme.dust, 0.35);
  const c4 = toRgb(theme.core, 0.4);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Deep space base color */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, #050314 0%, #02010a 70%, #000000 100%)",
        }}
      />

      {/* Color clouds — spread across the whole scene */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 45% 35% at 12% 18%, ${c1} 0%, transparent 70%),
            radial-gradient(ellipse 35% 30% at 88% 22%, ${c2} 0%, transparent 65%),
            radial-gradient(ellipse 40% 35% at 78% 82%, ${c4} 0%, transparent 70%),
            radial-gradient(ellipse 50% 40% at 18% 78%, ${c3} 0%, transparent 75%),
            radial-gradient(ellipse 30% 25% at 50% 8%, ${c2} 0%, transparent 80%),
            radial-gradient(ellipse 30% 25% at 50% 95%, ${c1} 0%, transparent 80%)
          `,
        }}
      />

      {/* Cloudy turbulence texture overlay — gives the nebula real wispy structure */}
      <svg
        className="absolute inset-0 w-full h-full opacity-70 mix-blend-screen"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <filter id={`nebula-noise-${turbId}`} x="0" y="0" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012 0.018"
              numOctaves="4"
              seed="7"
            />
            {/* Boost contrast and bias toward darker so we get clumps of brightness */}
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 1
                      0 0 0 0 1
                      0 0 0 0 1
                      0 0 0 1.6 -0.7"
            />
            {/* Re-tint the white turbulence with the theme mid color */}
            <feFlood
              floodColor={toRgb(theme.mid, 1)}
              floodOpacity="1"
              result="tint"
            />
            <feComposite in="tint" in2="SourceGraphic" operator="in" />
          </filter>
          <filter id={`nebula-noise2-${turbId}`} x="0" y="0" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.025 0.03"
              numOctaves="3"
              seed="23"
            />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 1
                      0 0 0 0 1
                      0 0 0 0 1
                      0 0 0 1.2 -0.6"
            />
            <feFlood floodColor={toRgb(theme.outer, 1)} floodOpacity="1" result="tint" />
            <feComposite in="tint" in2="SourceGraphic" operator="in" />
          </filter>
        </defs>
        <rect width="100%" height="100%" filter={`url(#nebula-noise-${turbId})`} />
        <rect
          width="100%"
          height="100%"
          filter={`url(#nebula-noise2-${turbId})`}
          opacity="0.6"
        />
      </svg>
    </div>
  );
}
