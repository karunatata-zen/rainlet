// The pet stage: a looping pixel scene of one animal in the rain.
//
// Drawn as SVG rather than canvas. The art is a handful of solid rectangles, so
// SVG stays crisp at any size without a devicePixelRatio dance, scales with the
// card in CSS, and — the reason that actually matters here — an e-ink browser
// repaints it as one flat region instead of a bitmap it has to dither.

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

// Rain and ground are the same for every pet, so they live here rather than in
// five copies of the same pixels.
function backdropGrid(frame) {
  const rows = blankGrid();

  // Deterministic streaks: a fixed set of columns, each falling at its own
  // speed. Random per repaint would shimmer, which on e-ink looks like grit.
  const columns = [1, 4, 7, 11, 16, 20, 24, 28, 32, 35, 38];
  for (let i = 0; i < columns.length; i += 1) {
    const col = columns[i];
    const speed = 3 + (i % 3);
    const y = (frame * speed + i * 5) % (GROUND_ROW + 2);
    paint(rows, [y - 1, col, "R"]);
    paint(rows, [y, col, "R"]);
  }

  paint(rows, [GROUND_ROW, 0, "G".repeat(STAGE_W)]);
  paint(rows, [GROUND_ROW + 1, 0, "G".repeat(STAGE_W)]);

  // Two puddles that widen and narrow, so the ground is not a dead bar.
  const wobble = frame % 2;
  paint(rows, [GROUND_ROW, 2, "D".repeat(6 + wobble)]);
  paint(rows, [GROUND_ROW, 29, "D".repeat(7 - wobble)]);
  paint(rows, [GROUND_ROW + 2, 0, "D".repeat(STAGE_W)]);

  return rows;
}

function compose(petFrames, frame, hearts) {
  const rows = backdropGrid(frame);
  const pet = petFrames[frame % petFrames.length];
  for (let r = 0; r < pet.length; r += 1) {
    paint(rows, [r, 0, pet[r].padEnd(STAGE_W, ".")]);
  }
  if (hearts) for (const patch of HEARTS) paint(rows, patch);
  return rows;
}

/**
 * The composed scene as a character grid, for anything that needs the picture
 * without the DOM — the screensaver export draws from this, so what you save
 * is the same scene you are looking at rather than a second drawing of it.
 * @param {string[][]} petFrames
 * @param {number} frame
 */
export function sceneGrid(petFrames, frame = 0) {
  return compose(petFrames, frame, false);
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
  let timer = null;
  let heartTimer = null;

  function petFor(id) {
    return extras[id] || PETS[id];
  }

  function render() {
    element.innerHTML = toSvg(compose(petFor(petId).frames, frame, hearts));
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
    configure,
    pet: petIt,
    get current() {
      return petId;
    },
  };
}
