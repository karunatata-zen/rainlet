// Single place for branding and the device-tuning numbers.

export const APP_NAME = "Rainlet";
export const APP_TAGLINE = "your kindle, but cozy";

export const STORAGE_PREFIX = "rainlet:";
// Nothing is stored in IndexedDB any more — the music, the videos and finally
// the custom backdrop all went. The name is kept only so boot can delete the
// database anyone who ran an earlier build is still carrying around.
export const DEAD_DB_NAME = "rainlet-media";

// Per-mode render tuning. Paper values are deliberately grouped here so they
// can be adjusted against a physical Kindle without hunting through the code.
export const TUNING = {
  cozy: {
    fps: 30,
    maxDrops: 300,
    cell: 8, // pixel grid size, px
    layers: 3,
    splash: true,
    sparkleChance: 1 / 200,
    transitions: true,
    petFps: 4,
  },
  paper: {
    // Tuned against a Kindle 11th gen. Its panel takes a partial refresh
    // faster than the older readers this was first set for, so 2fps holds
    // without visible ghost trails. Drop back to 1 if a slower reader smears.
    fps: 2,
    maxDrops: 60,
    cell: 8,
    layers: 1,
    splash: false,
    sparkleChance: 0, // ghosting makes small flashes look like dirt
    transitions: false,
    // One pose a second: the pet is the thing you actually look at, and a
    // frame that lingers reads as a deliberate pose rather than as a stutter.
    petFps: 1,
  },
};

// How long the page waits, untouched, before it drops the chrome and becomes
// just the scene. Long enough not to interrupt someone fiddling with the
// controls, short enough that a reader put down on a desk gets there by itself.
export const IDLE_AFTER_MS = 60000;
