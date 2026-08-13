// Time of day. The scene follows the clock: a sun in the morning, stars and a
// moon at night, and the pet dozing in the small hours.
//
// This is the replacement for the ambience that was cut. On a device with no
// sound and no file access, the only thing left that can make the scene feel
// alive is that it is not the same scene every time you look at it.
//
// Everything here is pure: a phase from a Date, and patches for the stage grid
// to paint. Nothing schedules a repaint on its own except watchPhase.

export const PHASES = ["dawn", "day", "dusk", "night"];

/**
 * Local hour buckets. Deliberately wide and fixed rather than computed from
 * sunrise tables — that needs a location, and being an hour out is invisible
 * when the whole effect is "the sky looks like evening".
 * @param {Date} date
 */
export function phaseAt(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 8) return "dawn";
  if (hour >= 8 && hour < 17) return "day";
  if (hour >= 17 && hour < 21) return "dusk";
  return "night";
}

// Rain leans lighter at night and in the early morning, heavier at dusk, so
// the same scene reads differently across a day without changing scenes.
export const PHASE_RAIN = {
  dawn: 0.8,
  day: 1,
  dusk: 1.15,
  night: 0.65,
};

// Celestial bodies sit in the top-left corner, which every pet leaves empty.
// Outlined, not solid, and for the same reason the animals are: in Paper mode
// every colour collapses to black, and a filled disc there is a blob that runs
// into the rain and the cat's heart puff beside it. An "O" ring with the fill
// inside reads as a sun on both panels. "." is transparent — a space would
// erase the rain behind it.
const SUN = [".OOO.", "OuuuO", "OuuuO", "OuuuO", ".OOO."];

// Opening to the right, so it reads as a crescent rather than a bitten disc.
const MOON = [".OOO.", "OmmO.", "Omm..", "OmmO.", ".OOO."];

// Drawn when the real sky is covered. Outlined for the same reason the sun is:
// in Paper mode a solid cloud is a black brick in the corner. Kept to the same
// seven columns the sun and its rays use — a wider one ran into the cat's ear,
// and in Paper mode, where both are black, the two became one shape.
// Lopsided on purpose: a symmetrical rounded box in the corner reads as a hat,
// which is what the first even-sided attempt looked like in Paper mode.
const CLOUD = ["...OO..", "..OccOO", ".OccccO", "OccccO.", ".OOOO.."];

// Detached, one clear cell off the ring. Drawn in the outline colour because
// the fill goes white in Paper mode, which would make gold rays vanish.
// Nothing here may reach row 5: rows 7+ are the cat's heart puff, and one
// blank row between the two is not enough separation at reading size.
const SUN_RAYS = [
  [2, 0, "O"],
  [2, 8, "O"],
];

// Fixed positions in the corners the animals do not use. Fixed, not random:
// a star that moves between repaints looks like dirt on an e-ink panel.
const STARS = [
  [0, 33],
  [2, 37],
  [6, 38],
  [0, 8],
  [1, 29],
  [3, 39],
];

// A drifting "z" beside a sleeping animal. Two positions, alternating.
const SLEEP_Z = [
  [
    [3, 33, "OOO"],
    [4, 34, "O"],
    [5, 33, "OOO"],
  ],
  [
    [1, 34, "OOO"],
    [2, 35, "O"],
    [3, 34, "OOO"],
  ],
];

function place(art, row, col, char) {
  const out = [];
  for (let r = 0; r < art.length; r += 1) {
    out.push([row + r, col, art[r].replace(/[umc]/g, char)]);
  }
  return out;
}

/**
 * Sky decoration for the stage grid, as [row, col, text] patches.
 * @param {string} phase
 * @param {number} frame
 * @param {{ twinkle?: boolean, covered?: boolean }} options twinkle is off on
 *   e-ink, where a pixel that blinks reads as a fault rather than as a star.
 *   covered is set when the real weather outside is overcast — the sun and the
 *   stars are then simply not there, which is the whole point of asking.
 */
export function skyPatches(phase, frame, { twinkle = true, covered } = {}) {
  if (covered) {
    // One cloud, drifting a single cell between frames so the sky is not a
    // still image. No stars behind it and no sun through it.
    return place(CLOUD, 0, 1 + (frame % 2), "c");
  }

  if (phase === "day") {
    // High sun, with rays that alternate so the sky is not perfectly still.
    const rays = frame % 2 === 0 ? SUN_RAYS : [];
    return [...place(SUN, 0, 2, "u"), ...rays];
  }

  if (phase === "dawn") {
    // Same sun, no rays yet, and one star that has not gone out.
    return [...place(SUN, 0, 2, "u"), [0, 36, "s"]];
  }

  if (phase === "dusk") {
    return [...place(MOON, 0, 2, "m"), [0, 33, "s"], [2, 37, "s"]];
  }

  // Night: moon plus the full set of stars.
  const stars = STARS.filter(
    (_, i) => !twinkle || (frame + i * 3) % 8 !== 0,
  ).map(([r, c]) => [r, c, "s"]);
  return [...place(MOON, 0, 2, "m"), ...stars];
}

/**
 * The cells the sky occupies, plus a one-cell margin, as a "row,col" set. The
 * rain uses it to leave the sun and moon alone: drops drawn straight through
 * them merged into one shape on an e-ink panel, which is what a reader
 * actually sees rather than the layered scene the code intends.
 * @param {Array<[number, number, string]>} patches
 */
export function skyHalo(patches) {
  const cells = new Set();
  for (const [row, col, text] of patches) {
    for (let i = 0; i < text.length; i += 1) {
      if (text[i] === ".") continue;
      for (let dr = -1; dr <= 1; dr += 1) {
        for (let dc = -1; dc <= 1; dc += 1) {
          cells.add(`${row + dr},${col + i + dc}`);
        }
      }
    }
  }
  return cells;
}

/**
 * The pet is asleep at night, which is shown with a "z" rather than by
 * redrawing every animal with its eyes shut — the drawings are the user's,
 * including ones we have never seen.
 * @param {string} phase
 * @param {number} frame
 */
export function sleepPatches(phase, frame) {
  if (phase !== "night") return [];
  return SLEEP_Z[frame % SLEEP_Z.length];
}

/**
 * Calls back whenever the phase changes, checked on the minute. Scheduled to
 * the next minute boundary rather than on an interval, so it does not drift,
 * and it never fires a repaint for a minute that changed nothing.
 * @param {(phase: string) => void} onChange
 */
export function watchPhase(onChange) {
  let current = phaseAt();
  let timer = null;

  function tick() {
    const next = phaseAt();
    if (next !== current) {
      current = next;
      onChange(next);
    }
    schedule();
  }

  function schedule() {
    const now = new Date();
    const ms = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    clearTimeout(timer);
    timer = setTimeout(tick, Math.max(1000, ms));
  }

  schedule();
  return {
    get phase() {
      return current;
    },
    stop: () => clearTimeout(timer),
  };
}
