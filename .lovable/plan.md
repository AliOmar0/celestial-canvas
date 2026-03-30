
## Galaxy Particle Simulator

### Overview
A full-page immersive 3D galaxy simulation using Three.js (React Three Fiber) with a sleek overlay control panel. The galaxy will render tens of thousands of particles forming a realistic Milky Way-style spiral.

### Galaxy Rendering
- **Spiral arm structure**: Multiple spiral arms with configurable arm count and tightness using logarithmic spiral math
- **Particle system**: 50,000–150,000 particles using Three.js `Points` with custom shaders for soft, glowing star appearance
- **Depth and realism**: Varying particle sizes, brightness falloff from center, subtle color variation (blue-white core → warm amber edges), dust lane simulation with darker regions
- **Slow auto-rotation** with gentle camera orbit for a cinematic feel
- **Central bulge**: Brighter, denser cluster at the galaxy core with bloom-like glow

### Control Panel
A collapsible glass-morphism sidebar (translucent, blurred background) with:

1. **Galaxy Shape**
   - Number of spiral arms (2–6 slider)
   - Arm tightness/spread
   - Rotation speed
   - Galaxy tilt angle

2. **Color Themes**
   - Preset buttons: Classic Milky Way, Nebula (purple/pink), Ice (blue/cyan), Ember (orange/red), Monochrome
   - Each theme adjusts the full color gradient of the particles

3. **Particle Density**
   - Slider from 20K to 150K particles
   - Real-time update on release

### Visual Quality
- Custom point sprites with soft gaussian glow texture
- Additive blending for realistic star overlap
- Background starfield (distant tiny particles) for depth
- Subtle post-processing bloom effect on the core
- Dark space background (#000)

### Tech
- React Three Fiber + Three.js for 3D rendering
- `@react-three/drei` for camera controls and effects
- All state managed with React hooks, no backend needed
