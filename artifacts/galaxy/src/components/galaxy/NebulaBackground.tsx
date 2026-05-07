import { COLOR_THEMES } from "./types";

interface Props {
  themeKey: string;
  active: boolean;
}

export function NebulaBackground({ themeKey, active }: Props) {
  if (!active) return null;
  const theme = COLOR_THEMES[themeKey] || COLOR_THEMES.andromeda;

  const toRgb = (c: [number, number, number], a: number) =>
    `rgba(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)}, ${a})`;

  // Subtle, deep-space color — clean, not hazy
  const c1 = toRgb(theme.mid, 0.22);
  const c2 = toRgb(theme.outer, 0.18);
  const c3 = toRgb(theme.dust, 0.15);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Deep black base */}
      <div className="absolute inset-0 bg-black" />

      {/* Three large soft color clouds — positioned away from the galaxy center
          so the dust/arms region stays clear, but the outer corners get colored. */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 55% 45% at 15% 20%, ${c1} 0%, transparent 70%),
            radial-gradient(ellipse 50% 40% at 85% 80%, ${c2} 0%, transparent 70%),
            radial-gradient(ellipse 45% 35% at 80% 15%, ${c3} 0%, transparent 75%)
          `,
        }}
      />
    </div>
  );
}
