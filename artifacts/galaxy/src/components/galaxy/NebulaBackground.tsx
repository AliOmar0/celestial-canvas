import { COLOR_THEMES } from "./types";

interface Props {
  themeKey: string;
  active: boolean;
}

/**
 * Deep-space background inspired by Hubble Deep Field, Carina Nebula,
 * and Integrated Flux Nebulae (IFN — the cosmic cirrus visible in long
 * exposures of the night sky).
 *
 * Layers (back to front):
 *   1. Pure black base — the void of space.
 *   2. Soft color washes — distant emission/reflection nebulae, kept LOW
 *      opacity (0.10–0.20) and pushed to the corners so the galaxy stays
 *      the focal point.
 *   3. Subtle SVG turbulence — adds wispy "cosmic cirrus" texture across
 *      the whole field. Very low opacity (0.045) so it never reads as fog.
 *   4. A few tiny bright "hot spots" — distant H II regions / pinprick
 *      planetary nebulae for visual interest.
 */
export function NebulaBackground({ themeKey, active }: Props) {
  if (!active) return null;
  const theme = COLOR_THEMES[themeKey] || COLOR_THEMES.andromeda;

  const toRgb = (c: [number, number, number], a: number) =>
    `rgba(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)}, ${a})`;

  // Color washes — pushed to corners, low alpha
  const c1 = toRgb(theme.mid, 0.18);
  const c2 = toRgb(theme.outer, 0.16);
  const c3 = toRgb(theme.dust, 0.12);
  const c4 = toRgb(theme.core, 0.1);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Layer 1 — pure black void */}
      <div className="absolute inset-0 bg-black" />

      {/* Layer 2 — soft color washes (distant nebulae glow) */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 60% 50% at 12% 18%, ${c1} 0%, transparent 65%),
            radial-gradient(ellipse 55% 45% at 88% 82%, ${c2} 0%, transparent 65%),
            radial-gradient(ellipse 45% 35% at 82% 12%, ${c3} 0%, transparent 70%),
            radial-gradient(ellipse 50% 40% at 18% 88%, ${c4} 0%, transparent 70%)
          `,
        }}
      />

      {/* Layer 3 — cosmic cirrus (Integrated Flux Nebulae texture).
          SVG turbulence gives organic wispy structure. baseFrequency low
          so the swirls are large; opacity very low so it reads as texture
          not haze. */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.045] mix-blend-screen"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <filter id="cosmic-cirrus">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012 0.018"
              numOctaves="3"
              seed="7"
              stitchTiles="stitch"
            />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.55
                      0 0 0 0 0.65
                      0 0 0 0 0.95
                      0 0 0 1 0"
            />
          </filter>
        </defs>
        <rect width="100%" height="100%" filter="url(#cosmic-cirrus)" />
      </svg>

    </div>
  );
}
