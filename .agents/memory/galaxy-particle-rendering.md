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
