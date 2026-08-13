// Scene definitions. Each one is data, not code, so the engine stays one loop.
//
// speed/drift are in grid cells per second. spawn is drops per second at
// intensity 1. length is the droplet height in cells.

export const SCENES = {
  drizzle: {
    label: "Drizzle",
    hint: "Light and slow. The calm default.",
    colors: ["#A8C7E7", "#C3D9EE", "#DCE9F6"],
    background: null,
    speed: [14, 20],
    drift: [-0.4, 0.4],
    spawn: 14,
    length: [1, 3],
    width: 1,
    splash: true,
    settle: false,
    flash: false,
    shape: "drop",
  },
  downpour: {
    label: "Downpour",
    hint: "Dense and fast, with the odd lightning flash.",
    colors: ["#7FA9D4", "#A8C7E7", "#CBDDF0"],
    background: null,
    speed: [34, 52],
    drift: [-1.4, -0.2],
    spawn: 46,
    length: [2, 5],
    width: 1,
    splash: true,
    settle: false,
    flash: true,
    shape: "drop",
  },
  snow: {
    label: "Snow",
    hint: "Drifts sideways and settles at the bottom.",
    colors: ["#FFFFFF", "#EEF4FA", "#D8E5F0"],
    background: null,
    speed: [5, 11],
    drift: [-2.2, 2.2],
    spawn: 12,
    length: [1, 1],
    width: 1,
    splash: false,
    settle: true,
    flash: false,
    shape: "flake",
  },
  sakura: {
    label: "Sakura",
    hint: "Petals instead of rain.",
    colors: ["#F3B6CD", "#F7C9D8", "#FBDDE6"],
    background: null,
    speed: [6, 13],
    drift: [-2.6, 2.6],
    spawn: 9,
    length: [1, 2],
    width: 2,
    splash: false,
    settle: true,
    flash: false,
    shape: "petal",
  },
  stars: {
    label: "Stars",
    hint: "Falls upward, night palette. For evening reading.",
    colors: ["#FFF3C4", "#FFE9A8", "#FFFFFF"],
    background: "#1C1B2A",
    speed: [-16, -8], // negative rises
    drift: [-0.6, 0.6],
    spawn: 10,
    length: [1, 2],
    width: 1,
    splash: false,
    settle: false,
    flash: false,
    shape: "spark",
  },
};

export const SCENE_ORDER = ["drizzle", "downpour", "snow", "sakura", "stars"];

export function getScene(name) {
  return SCENES[name] || SCENES.drizzle;
}
