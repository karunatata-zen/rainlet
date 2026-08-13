// The pet stage: a looping pixel scene of one animal in the rain.
//
// Drawn as SVG rather than canvas. The art is a handful of solid rectangles, so
// SVG stays crisp at any size without a devicePixelRatio dance, scales with the
// card in CSS, and — the reason that actually matters here — an e-ink browser
// repaints it as one flat region instead of a bitmap it has to dither.

import { skyHalo, skyPatches, sleepPatches } from "../scene/daylight.js";
import {
  GROUND_ROW,
  HEARTS,
  PALETTE,
  PETS,
  PET_COLOR_KEYS,
  PET_ORDER,
  STAGE_H,
  STAGE_W,
} from "./sprites.js";

const HEART_MS = 1800;

function blankGrid() {
  return Array.from({ length: STAGE_H }, () => " ".repeat(STAGE_W));
}

function paint(rows, [r, c, text]) {
  if (r < 0 || r >= STAGE_H) return;
  const row = rows[r].padEnd(STAGE_W, " ");
  let out = row.slice(0, c);
  for (let i = 0; i < text.length; i += 1) {
    out += text[i] === "." ? row[c + i] || " " : text[i];
  }
  rows[r] = (out + row.slice(c + text.length)).slice(0, STAGE_W);
}

// Deterministic streaks: a fixed set of columns, each falling at its own
// speed. Random per repaint would shimmer, which on e-ink looks like grit.
const RAIN_COLUMNS = [1, 4, 7, 11, 16, 20, 24, 28, 32, 35, 38];

// Which columns survive as the rain thins out, in the order they are kept.
// Interleaved rather than left-to-right, so light rain is spread across the
// stage instead of huddled down one side.
const RAIN_PRIORITY = [0, 6, 3, 9, 1, 7, 4, 10, 2, 8, 5];

// Rain and ground are the same for every pet, so they live here rather than in
// five copies of the same pixels.
function backdropGrid(frame, phase, twinkle, wetness, covered) {
  const rows = blankGrid();

  // Sky first, then rain routed around it.
  const sky = skyPatches(phase, frame, { twinkle, covered });
  for (const patch of sky) paint(rows, patch);
  const halo = skyHalo(sky);

  // How many of the streaks are actually falling. Real weather sets this: a
  // clear afternoon outside gets none, and the scene is a dry one.
  const keep = Math.round(
    RAIN_COLUMNS.length * Math.min(1, Math.max(0, wetness)),
  );
  const active = new Set(RAIN_PRIORITY.slice(0, keep));

  for (let i = 0; i < RAIN_COLUMNS.length; i += 1) {
    if (!active.has(i)) continue;
    const col = RAIN_COLUMNS[i];
    const speed = 3 + (i % 3);
    const y = (frame * speed + i * 5) % (GROUND_ROW + 2);
    if (halo.has(`${y - 1},${col}`) || halo.has(`${y},${col}`)) continue;
    paint(rows, [y - 1, col, "R"]);
    paint(rows, [y, col, "R"]);
  }

  paint(rows, [GROUND_ROW, 0, "G".repeat(STAGE_W)]);
  paint(rows, [GROUND_ROW + 1, 0, "G".repeat(STAGE_W)]);

  // Two puddles that widen and narrow, so the ground is not a dead bar. They
  // shrink with the rain and go entirely when it is dry outside — a puddle
  // under a clear sky is the sort of detail that makes the rest look painted
  // on rather than observed.
  if (wetness > 0.05) {
    const wobble = frame % 2;
    const size = Math.min(1, wetness);
    paint(rows, [
      GROUND_ROW,
      2,
      "D".repeat(Math.max(1, Math.round((6 + wobble) * size))),
    ]);
    paint(rows, [
      GROUND_ROW,
      29,
      "D".repeat(Math.max(1, Math.round((7 - wobble) * size))),
    ]);
    paint(rows, [GROUND_ROW + 2, 0, "D".repeat(STAGE_W)]);
  }

  return rows;
}

function compose(petFrames, frame, hearts, phase, twinkle, wetness, covered) {
  const rows = backdropGrid(frame, phase, twinkle, wetness, covered);
  const pet = petFrames[frame % petFrames.length];
  for (let r = 0; r < pet.length; r += 1) {
    // A space inside a sprite row is empty air, not an eraser. Painted as-is
    // it wiped the whole backdrop — rain and sky both — everywhere the pet's
    // own rows reached, which is the entire scene above the ground.
    paint(rows, [r, 0, pet[r].padEnd(STAGE_W, " ").replace(/ /g, ".")]);
  }
  for (const patch of sleepPatches(phase, frame)) paint(rows, patch);
  if (hearts) for (const patch of HEARTS) paint(rows, patch);
  return rows;
}

// Merge each run of identical characters into one rect: about a fifth as many
// nodes as one rect per pixel, which the Kindle's browser appreciates.
function toSvg(rows) {
  let out = "";
  for (let r = 0; r < rows.length; r += 1) {
    const row = rows[r];
    let c = 0;
    while (c < row.length) {
      const char = row[c];
      if (char === " " || char === "." || !PALETTE[char]) {
        c += 1;
        continue;
      }
      let end = c;
      while (end + 1 < row.length && row[end + 1] === char) end += 1;
      const width = end - c + 1;
      out += `<rect x="${c}" y="${r}" width="${width}" height="1" fill="${PALETTE[char]}"/>`;
      c = end + 1;
    }
  }
  return `<svg viewBox="0 0 ${STAGE_W} ${STAGE_H}" shape-rendering="crispEdges" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${out}</svg>`;
}

/**
 * @param {HTMLElement} element
 * @param {{ fps?: number }} options
 */
export function createPetStage(element, { fps = 4 } = {}) {
  let petId = "cat";
  // Pets that are not built in — currently just the one you drew yourself.
  const extras = {};
  let frame = 0;
  let interval = Math.round(1000 / fps);
  let animate = true;
  let useColors = true;
  let hearts = false;
  let phase = "day";
  // Defaults are the scene as it was before the weather existed: it always
  // rains, and the sky is whatever the clock says. Weather only ever narrows
  // that, so an offline reader gets the old behaviour and no empty stage.
  let wetness = 1;
  let covered = false;
  let timer = null;
  let heartTimer = null;

  function petFor(id) {
    return extras[id] || PETS[id];
  }

  function render() {
    element.innerHTML = toSvg(
      compose(
        petFor(petId).frames,
        frame,
        hearts,
        phase,
        useColors,
        wetness,
        covered,
      ),
    );
  }

  function stop() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  function start() {
    stop();
    render();
    if (!animate) return;
    timer = setInterval(() => {
      frame += 1;
      render();
    }, interval);
  }

  function setPet(id) {
    const pet = petFor(id);
    if (!pet) return;
    petId = id;
    frame = 0;

    // Per-pet colours are inline so one palette serves every animal. Clear the
    // whole set, not just this animal's keys, or a var the previous pet set and
    // this one does not — the duck's orange beak, say — would stay behind. They
    // are cleared entirely in Paper mode, where the stylesheet's black and
    // white has to win.
    for (const key of PET_COLOR_KEYS) {
      element.style.removeProperty(key);
    }
    if (useColors) {
      for (const [key, value] of Object.entries(pet.colors)) {
        element.style.setProperty(key, value);
      }
    }
    start();
  }

  /**
   * @param {{ fps?: number, animate?: boolean, colors?: boolean }} options
   */
  function configure({ fps: nextFps, animate: nextAnimate, colors } = {}) {
    if (typeof nextFps === "number" && nextFps > 0) {
      interval = Math.round(1000 / nextFps);
    }
    if (typeof nextAnimate === "boolean") animate = nextAnimate;
    if (typeof colors === "boolean") useColors = colors;
    setPet(petId);
  }

  /**
   * Registers or replaces a non-built-in pet. Passing null forgets it, and
   * falls back to the first built-in if that pet was the one on screen.
   * @param {string} id
   * @param {{ frames: string[][], colors: Record<string, string> } | null} pet
   */
  function setExtraPet(id, pet) {
    if (pet) extras[id] = pet;
    else delete extras[id];
    if (petId === id) setPet(pet ? id : PET_ORDER[0]);
  }

  /**
   * dawn | day | dusk | night. Only repaints if it actually changed, since on
   * e-ink a needless repaint is a visible flash.
   * @param {string} next
   */
  function setPhase(next) {
    if (next === phase) return;
    phase = next;
    render();
  }

  /**
   * How wet the scene is and whether the sky is covered. Set from the real
   * weather when that is switched on, and left at the defaults when it is not.
   * @param {{ wetness?: number, covered?: boolean }} next
   */
  function setWeather({ wetness: nextWet, covered: nextCovered } = {}) {
    let changed = false;
    if (typeof nextWet === "number" && nextWet !== wetness) {
      wetness = nextWet;
      changed = true;
    }
    if (typeof nextCovered === "boolean" && nextCovered !== covered) {
      covered = nextCovered;
      changed = true;
    }
    if (changed) render();
  }

  function petIt() {
    hearts = true;
    render();
    clearTimeout(heartTimer);
    heartTimer = setTimeout(() => {
      hearts = false;
      render();
    }, HEART_MS);
  }

  setPet(petId);

  return {
    setPet,
    setExtraPet,
    setPhase,
    setWeather,
    configure,
    pet: petIt,
    get current() {
      return petId;
    },
  };
}
