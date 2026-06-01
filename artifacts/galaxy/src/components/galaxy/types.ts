export interface ColorTheme {
  name: string;
  core: [number, number, number];
  mid: [number, number, number];
  outer: [number, number, number];
  dust: [number, number, number];
}

export const COLOR_THEMES: Record<string, ColorTheme> = {
  milkyway: {
    name: "Milky Way",
    core: [1.0, 0.95, 0.8],
    mid: [0.7, 0.8, 1.0],
    outer: [0.9, 0.7, 0.4],
    dust: [0.3, 0.2, 0.1],
  },
  nebula: {
    name: "Nebula",
    core: [1.0, 0.8, 1.0],
    mid: [0.7, 0.3, 0.9],
    outer: [0.9, 0.4, 0.6],
    dust: [0.2, 0.1, 0.3],
  },
  ice: {
    name: "Ice",
    core: [0.9, 0.95, 1.0],
    mid: [0.4, 0.7, 1.0],
    outer: [0.2, 0.9, 0.9],
    dust: [0.1, 0.15, 0.25],
  },
  ember: {
    name: "Ember",
    core: [1.0, 1.0, 0.7],
    mid: [1.0, 0.5, 0.1],
    outer: [0.8, 0.15, 0.05],
    dust: [0.3, 0.1, 0.0],
  },
  mono: {
    name: "Monochrome",
    core: [1.0, 1.0, 1.0],
    mid: [0.7, 0.7, 0.7],
    outer: [0.4, 0.4, 0.4],
    dust: [0.15, 0.15, 0.15],
  },
  andromeda: {
    name: "Andromeda",
    core: [1.0, 0.98, 0.9],
    mid: [0.5, 0.6, 1.0],
    outer: [0.8, 0.3, 0.7],
    dust: [1.0, 0.2, 0.6],
  },
  sombrero: {
    name: "Sombrero",
    core: [1.0, 0.96, 0.82],
    mid: [0.95, 0.85, 0.62],
    outer: [0.7, 0.55, 0.38],
    dust: [0.25, 0.18, 0.12],
  },
  sunflower: {
    name: "Sunflower",
    core: [1.0, 0.97, 0.78],
    mid: [1.0, 0.82, 0.4],
    outer: [0.95, 0.62, 0.25],
    dust: [0.3, 0.2, 0.08],
  },
  starburst: {
    name: "Starburst",
    core: [1.0, 0.95, 0.85],
    mid: [1.0, 0.55, 0.35],
    outer: [0.85, 0.2, 0.15],
    dust: [0.35, 0.1, 0.08],
  },
};

/**
 * Particle generation mode. Each value drives a different placement algorithm
 * in GalaxyParticles so real galaxies can match their photographed shape rather
 * than all being the same generic spiral.
 */
export type GalaxyMorphology =
  | "spiral" // generic sandbox spiral
  | "grandDesign" // two bold, tightly-defined arms (M51, M81)
  | "flocculent" // many short, feathery spur segments (M63, M101, M33)
  | "edgeOn" // thin disk + big bulge seen edge-on with a dust lane (M104)
  | "starburst" // elongated cigar body with bipolar gas outflow (M82)
  | "dustLane"; // smooth disk crossed by a dark dust lane (M64)

export interface GalaxySettings {
  morphology: GalaxyMorphology;
  arms: number;
  tightness: number;
  rotationSpeed: number;
  tilt: number;
  particleCount: number;
  theme: string;
  brightness: number;
  dispersion: number;
  force2D: boolean;
  autoRotate: boolean;
  showFPS: boolean;
  bloom: boolean;
  blackHole: boolean;
  nebulaBackground: boolean;
  flyThrough: boolean;
  ambientSound: boolean;
  adaptiveQuality: boolean;
  regionLabels: boolean;
  softParticles: boolean;
  openClusters: boolean;
  distantGalaxies: boolean;
  distantGalaxyCount: number;
  particles3D: boolean;
  // Real-galaxy inspired features
  hiiRegions: boolean;          // Pink star-forming knots along arms (M83 style)
  globularClusters: boolean;    // Old yellow clusters in the halo (Andromeda style)
  stellarPopulations: boolean;  // Yellow bulge → blue arms radial color gradient
  barStructure: boolean;        // Central bar (NGC 1300 style)
  armAsymmetry: boolean;        // Each arm has different length / weight
  companionGalaxy: boolean;     // Small companion off to the side (M51's NGC 5195)
}

export const DEFAULT_SETTINGS: GalaxySettings = {
  morphology: "spiral",
  arms: 2,
  tightness: 0.1,
  rotationSpeed: 0.0,
  tilt: 0.3,
  particleCount: 15000,
  theme: "andromeda",
  brightness: 0.1,
  dispersion: 0.5,
  force2D: false,
  autoRotate: true,
  showFPS: false,
  bloom: false,
  blackHole: false,
  nebulaBackground: false,
  flyThrough: false,
  ambientSound: false,
  adaptiveQuality: true,
  regionLabels: false,
  softParticles: false,
  openClusters: false,
  distantGalaxies: false,
  distantGalaxyCount: 32,
  particles3D: false,
  hiiRegions: false,
  globularClusters: false,
  stellarPopulations: false,
  barStructure: false,
  armAsymmetry: false,
  companionGalaxy: false,
};

export type GalaxyPresetKey = "spiral" | "barred" | "compact" | "sparse";

export const GALAXY_PRESETS: Record<GalaxyPresetKey, { name: string; partial: Partial<GalaxySettings> }> = {
  spiral: {
    name: "Spiral",
    partial: { arms: 4, tightness: 0.2, dispersion: 0.6, particleCount: 25000, tilt: 0.3 },
  },
  barred: {
    name: "Barred",
    partial: { arms: 2, tightness: 0.45, dispersion: 1.0, particleCount: 30000, tilt: 0.5 },
  },
  compact: {
    name: "Compact",
    partial: { arms: 6, tightness: 0.7, dispersion: 0.5, particleCount: 35000, tilt: 0.2 },
  },
  sparse: {
    name: "Sparse",
    partial: { arms: 3, tightness: 0.15, dispersion: 1.5, particleCount: 12000, tilt: 0.4 },
  },
};
