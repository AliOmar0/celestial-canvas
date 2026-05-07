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
};

export interface GalaxySettings {
  arms: number;
  tightness: number;
  rotationSpeed: number;
  tilt: number;
  particleCount: number;
  theme: string;
}

export const DEFAULT_SETTINGS: GalaxySettings = {
  arms: 4,
  tightness: 0.5,
  rotationSpeed: 0.3,
  tilt: 0.4,
  particleCount: 80000,
  theme: "milkyway",
};
