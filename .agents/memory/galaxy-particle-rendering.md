---
name: Galaxy particle rendering (artifacts/galaxy)
description: Non-obvious rendering constraints and the morphology system for matching real galaxy photos.
---

# Galaxy particle rendering

## Dark dust lanes can't be done with additive blending
The main star/gas/dust point cloud (`GalaxyParticles.tsx`) uses `THREE.AdditiveBlending`,
which can only ADD light — it physically cannot draw a dark absorption lane (Sombrero/Black Eye).
**Why:** additive frag output only brightens the framebuffer.
**How to apply:** real dark lanes are a SEPARATE `<points>` layer using `THREE.MultiplyBlending`,
`depthTest={false}`, `renderOrder={10}` (so it composites after the additive pass). Its sprite
fragment must lerp from `white` at the edges (multiply by 1 = no change → no dark squares) to a
dark brown at the center (`mix(vec3(1.0), uDustColor, mask*uStrength)`). Only enabled for
`edgeOn` + `dustLane` morphologies.

## Per-galaxy shape = `morphology` field, not just colors
All galaxies previously shared ONE generic log-spiral generator; only colors/arm-count differed,
so they didn't resemble their photos. `GalaxySettings.morphology`
(spiral/grandDesign/flocculent/edgeOn/starburst/dustLane) branches the placement math:
flocculent = many short seeded spur arcs; edgeOn = big spherical bulge + thin wide disk;
starburst = elongated cigar body + bipolar gas plume; grandDesign = tight arms (small gaussian
spread + low inter-arm floor). Presets assign it in `realGalaxies.ts`.
**How to apply:** both the star useMemo and the dust useMemo must list `morphology` in deps.

## Both star + dust layers share one inner spin group
Galaxy Y-rotation lives on an inner `<group ref={spinRef}>` (rotated in useFrame), NOT on the
star `points` — otherwise the dust lane wouldn't rotate with the stars. Outer group keeps the
static `tilt`.

## Real galaxies: sample the photo into points instead of simulating
The "Real Galaxies" tab does NOT use the procedural engine. It samples each galaxy's bundled
NASA photo into a point cloud (`ImageGalaxy.tsx`): colors/dust lanes/arms come straight from the
pixels, which matches the photo far better than any procedural spiral AND is cheaper (no
BlackHole/clusters/HII/AdaptiveQuality components run in this mode).
**Why two non-obvious constraints drive its design:**
- A photo is flat. Never apply a full Y-spin (autoRotate off in image mode) — it would turn the
  plane edge-on and vanish. Use gentle bounded sway + a luminance depth "dome" (+Z) for 2.5D
  parallax instead.
- Dark dust/sky needs NO special trick here: pixels below a luminance threshold are simply
  skipped, so absorption lanes read as the absence of points (additive can't darken — see top).
**How to apply:** the renderer is selected by GalaxyScene's `realGalaxyImage` prop (set from
`activeGalaxy.image`); when set it branches to ImageGalaxy and skips ALL procedural feature
components. Geometry is declarative `<bufferAttribute>` only — do NOT also `setAttribute`
imperatively (double buffers leak GPU memory); force a clean remount via `key={src}` plus the
`setGeom(null)`-on-src-change reset so R3F disposes the old geometry. Shape sliders no-op in this
mode, so there must always be an exit back to the builder (clears `activeGalaxy`).
