import type { GalaxySettings } from "./types";

import m31 from "@/assets/galaxies/m31_andromeda.jpg";
import m51 from "@/assets/galaxies/m51_whirlpool.jpg";
import m104 from "@/assets/galaxies/m104_sombrero.jpg";
import m101 from "@/assets/galaxies/m101_pinwheel.jpg";
import m33 from "@/assets/galaxies/m33_triangulum.jpg";
import m63 from "@/assets/galaxies/m63_sunflower.jpg";
import m81 from "@/assets/galaxies/m81_bode.jpg";
import m82 from "@/assets/galaxies/m82_cigar.jpg";
import m64 from "@/assets/galaxies/m64_blackeye.jpg";

export interface RealGalaxy {
  id: string;
  name: string;
  catalog: string;
  type: string;
  constellation: string;
  distance: string;
  diameter: string;
  image: string;
  /** One-to-two sentence NASA-style description. */
  description: string;
  /** A single attention-grabbing fact. */
  funFact: string;
  /** Engine settings tuned to resemble the real galaxy. */
  settings: Partial<GalaxySettings>;
}

/**
 * Baseline applied before each galaxy preset so switching galaxies starts from
 * a clean slate (all structural/feature toggles off). User system preferences
 * (auto-rotate, sound, FPS, adaptive quality, render engine) are preserved by
 * merging this and the galaxy preset on top of the current settings.
 */
export const GALAXY_RESET: Partial<GalaxySettings> = {
  barStructure: false,
  armAsymmetry: false,
  companionGalaxy: false,
  hiiRegions: false,
  globularClusters: false,
  stellarPopulations: false,
  openClusters: false,
  blackHole: false,
  distantGalaxies: false,
  nebulaBackground: false,
  regionLabels: false,
  particles3D: false,
  softParticles: false,
  flyThrough: false,
};

export const REAL_GALAXIES: RealGalaxy[] = [
  {
    id: "andromeda",
    name: "Andromeda Galaxy",
    catalog: "M31 · NGC 224",
    type: "Barred spiral (SA(s)b)",
    constellation: "Andromeda",
    distance: "2.5 million light-years",
    diameter: "~152,000 light-years",
    image: m31,
    description:
      "The nearest large galaxy to the Milky Way and the most distant object visible to the naked eye. On a collision course with our own galaxy, the two will merge in about 4.5 billion years.",
    funFact: "Home to roughly one trillion stars — more than double the Milky Way.",
    settings: {
      arms: 2,
      tightness: 0.28,
      tilt: 1.0,
      theme: "andromeda",
      brightness: 0.55,
      dispersion: 0.7,
      particleCount: 60000,
      stellarPopulations: true,
      globularClusters: true,
      companionGalaxy: true,
      hiiRegions: true,
      blackHole: true,
      bloom: true,
    },
  },
  {
    id: "whirlpool",
    name: "Whirlpool Galaxy",
    catalog: "M51 · NGC 5194",
    type: "Grand-design spiral (SA(s)bc)",
    constellation: "Canes Venatici",
    distance: "31 million light-years",
    diameter: "~76,000 light-years",
    image: m51,
    description:
      "The classic 'grand-design' spiral, seen face-on with two bold, well-defined arms. Its arms are being tugged by the small companion galaxy NGC 5195 locked in a gravitational dance.",
    funFact: "The first galaxy ever recognized to have a spiral structure, in 1845.",
    settings: {
      arms: 2,
      tightness: 0.22,
      tilt: 0.15,
      theme: "ice",
      brightness: 0.6,
      dispersion: 0.6,
      particleCount: 55000,
      companionGalaxy: true,
      hiiRegions: true,
      openClusters: true,
      stellarPopulations: true,
      blackHole: true,
      bloom: true,
    },
  },
  {
    id: "sombrero",
    name: "Sombrero Galaxy",
    catalog: "M104 · NGC 4594",
    type: "Lenticular / spiral (SA(s)a)",
    constellation: "Virgo",
    distance: "29 million light-years",
    diameter: "~49,000 light-years",
    image: m104,
    description:
      "Famous for its brilliant white bulge and a near edge-on dust lane that gives it the look of a wide-brimmed hat. It harbors one of the most massive black holes measured in any nearby galaxy.",
    funFact: "Surrounded by a swarm of nearly 2,000 globular star clusters.",
    settings: {
      arms: 2,
      tightness: 0.6,
      tilt: 1.2,
      theme: "sombrero",
      brightness: 0.5,
      dispersion: 0.5,
      particleCount: 50000,
      globularClusters: true,
      stellarPopulations: true,
      blackHole: true,
      bloom: true,
    },
  },
  {
    id: "pinwheel",
    name: "Pinwheel Galaxy",
    catalog: "M101 · NGC 5457",
    type: "Spiral (SAB(rs)cd)",
    constellation: "Ursa Major",
    distance: "21 million light-years",
    diameter: "~170,000 light-years",
    image: m101,
    description:
      "A giant face-on spiral nearly twice the size of the Milky Way, with sprawling, asymmetric arms studded with pink star-forming regions. Its lopsided shape comes from past gravitational encounters.",
    funFact: "Contains an estimated one trillion stars across its enormous disk.",
    settings: {
      arms: 5,
      tightness: 0.15,
      tilt: 0.1,
      theme: "ice",
      brightness: 0.55,
      dispersion: 0.9,
      particleCount: 65000,
      armAsymmetry: true,
      hiiRegions: true,
      openClusters: true,
      stellarPopulations: true,
      bloom: true,
    },
  },
  {
    id: "triangulum",
    name: "Triangulum Galaxy",
    catalog: "M33 · NGC 598",
    type: "Spiral (SA(s)cd)",
    constellation: "Triangulum",
    distance: "2.7 million light-years",
    diameter: "~60,000 light-years",
    image: m33,
    description:
      "The third-largest member of our Local Group and a flocculent spiral with patchy, feathery arms. It is a hotbed of star formation packed with glowing nebulae.",
    funFact: "Home to NGC 604, one of the largest known star-forming nebulae.",
    settings: {
      arms: 3,
      tightness: 0.18,
      tilt: 0.35,
      theme: "ice",
      brightness: 0.5,
      dispersion: 1.1,
      particleCount: 40000,
      hiiRegions: true,
      openClusters: true,
      stellarPopulations: true,
      bloom: true,
    },
  },
  {
    id: "sunflower",
    name: "Sunflower Galaxy",
    catalog: "M63 · NGC 5055",
    type: "Flocculent spiral (SA(rs)bc)",
    constellation: "Canes Venatici",
    distance: "29 million light-years",
    diameter: "~98,000 light-years",
    image: m63,
    description:
      "A flocculent spiral whose many short, golden arms swirl like sunflower petals. Faint stellar streams around it are the shredded remains of a smaller galaxy it consumed.",
    funFact: "Its arms glow gold from countless newly-formed blue-white star clusters.",
    settings: {
      arms: 6,
      tightness: 0.5,
      tilt: 0.5,
      theme: "sunflower",
      brightness: 0.5,
      dispersion: 0.7,
      particleCount: 55000,
      stellarPopulations: true,
      openClusters: true,
      bloom: true,
    },
  },
  {
    id: "bodes",
    name: "Bode's Galaxy",
    catalog: "M81 · NGC 3031",
    type: "Grand-design spiral (SA(s)ab)",
    constellation: "Ursa Major",
    distance: "12 million light-years",
    diameter: "~90,000 light-years",
    image: m81,
    description:
      "A textbook grand-design spiral with sweeping, symmetric arms and a bright yellow core. Its tidy structure was sculpted by interactions with its neighbor, the Cigar Galaxy.",
    funFact: "Its central supermassive black hole is about 70 million solar masses.",
    settings: {
      arms: 2,
      tightness: 0.3,
      tilt: 0.45,
      theme: "milkyway",
      brightness: 0.55,
      dispersion: 0.6,
      particleCount: 55000,
      stellarPopulations: true,
      hiiRegions: true,
      blackHole: true,
      bloom: true,
    },
  },
  {
    id: "cigar",
    name: "Cigar Galaxy",
    catalog: "M82 · NGC 3034",
    type: "Starburst irregular (I0)",
    constellation: "Ursa Major",
    distance: "12 million light-years",
    diameter: "~37,000 light-years",
    image: m82,
    description:
      "A starburst galaxy seen edge-on, blazing with star formation triggered by a brush with Bode's Galaxy. Red plumes of hydrogen gas erupt from its center in a galactic superwind.",
    funFact: "Forms new stars 10 times faster than the entire Milky Way.",
    settings: {
      arms: 2,
      tightness: 0.9,
      tilt: 1.2,
      theme: "starburst",
      brightness: 0.6,
      dispersion: 1.6,
      particleCount: 35000,
      hiiRegions: true,
      bloom: true,
    },
  },
  {
    id: "blackeye",
    name: "Black Eye Galaxy",
    catalog: "M64 · NGC 4826",
    type: "Spiral (SA(rs)ab)",
    constellation: "Coma Berenices",
    distance: "17 million light-years",
    diameter: "~54,000 light-years",
    image: m64,
    description:
      "Named for the spectacular dark band of dust sweeping in front of its bright core. Its inner and outer regions rotate in opposite directions — a sign of a past galactic merger.",
    funFact: "Its gas spins backwards relative to its stars, fueling fierce star birth.",
    settings: {
      arms: 2,
      tightness: 0.55,
      tilt: 0.7,
      theme: "ember",
      brightness: 0.5,
      dispersion: 0.6,
      particleCount: 45000,
      stellarPopulations: true,
      blackHole: true,
      bloom: true,
    },
  },
];
