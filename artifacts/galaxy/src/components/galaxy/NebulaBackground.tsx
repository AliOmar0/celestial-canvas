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
  const c1 = toRgb(theme.mid, 0.18);
  const c2 = toRgb(theme.outer, 0.12);
  const c3 = toRgb(theme.dust, 0.08);
  return (
    <div
      className="absolute inset-0 pointer-events-none transition-opacity duration-700"
      style={{
        background: `
          radial-gradient(ellipse 60% 50% at 30% 30%, ${c1} 0%, transparent 60%),
          radial-gradient(ellipse 70% 50% at 70% 70%, ${c2} 0%, transparent 65%),
          radial-gradient(ellipse 100% 80% at 50% 50%, ${c3} 0%, transparent 80%),
          #000
        `,
      }}
    />
  );
}
