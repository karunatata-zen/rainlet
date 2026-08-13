// A pet you made yourself: drawn by hand, or an image quantised down to the
// same pixels. Everything here is data — the editor UI lives in maker.js.
//
// The drawing grid is deliberately coarser than the stage grid. Forty columns
// across a Kindle's screen is a 9px target, which no finger can hit; twenty is
// twice that, and every drawn cell becomes a 2x2 block on the stage, which also
// happens to match the chunk size of the built-in art.

import { GROUND_ROW, STAGE_H, STAGE_W } from "./sprites.js";
import { STORAGE_PREFIX } from "../config.js";

export const DRAW_W = 20;
export const DRAW_H = 14;

export const CUSTOM_PET_ID = "mine";

// Empty cell. Kept distinct from the palette characters so a saved drawing is
// readable as text.
export const EMPTY = ".";

// The subset of the shared palette worth handing someone: enough to draw an
// outlined animal with a face, no more. Each entry keeps a swatch colour for
// the editor, because the CSS variables collapse to black and white in Paper
// mode and a palette of identical squares would be useless.
export const INKS = [
  { char: "O", label: "Outline", swatch: "#3a2f2a" },
  { char: "F", label: "Body", swatch: "#f0c9a8" },
  { char: "f", label: "Shade", swatch: "#e0a88f" },
  { char: "W", label: "Cream", swatch: "#fffdf8" },
  { char: "E", label: "Eyes", swatch: "#2f2a2e" },
  { char: "w", label: "Glint", swatch: "#ffffff" },
  { char: "B", label: "Blush", swatch: "#f7b7bd" },
  { char: "P", label: "Pink", swatch: "#f6c3ce" },
  { char: "N", label: "Nose", swatch: "#e58a95" },
  { char: "Y", label: "Gold", swatch: "#f6d06b" },
  { char: "S", label: "Green", swatch: "#7fa872" },
];

const INK_CHARS = new Set(INKS.map((ink) => ink.char));

const STORAGE_KEY = `${STORAGE_PREFIX}custom-pet`;

/** @returns {string[]} DRAW_H rows of DRAW_W empty cells. */
export function emptyDrawing() {
  return Array.from({ length: DRAW_H }, () => EMPTY.repeat(DRAW_W));
}

/** True if anything at all has been drawn. */
export function isBlank(rows) {
  return rows.every((row) => [...row].every((ch) => !INK_CHARS.has(ch)));
}

/**
 * Rows are stored as one newline-free string: 20x14 is 280 characters, which
 * localStorage handles without complaint and a human can eyeball.
 */
export function encode(rows) {
  return rows.map((row) => row.padEnd(DRAW_W, EMPTY).slice(0, DRAW_W)).join("");
}

/** Tolerates any garbage: a bad value gives you a blank grid, not a crash. */
export function decode(text) {
  const rows = emptyDrawing();
  if (typeof text !== "string") return rows;
  for (let r = 0; r < DRAW_H; r += 1) {
    let out = "";
    for (let c = 0; c < DRAW_W; c += 1) {
      const ch = text[r * DRAW_W + c];
      out += INK_CHARS.has(ch) ? ch : EMPTY;
    }
    rows[r] = out;
  }
  return rows;
}

export function loadDrawing() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const rows = decode(raw);
    return isBlank(rows) ? null : rows;
  } catch {
    return null;
  }
}

export function saveDrawing(rows) {
  try {
    localStorage.setItem(STORAGE_KEY, encode(rows));
    return true;
  } catch {
    // Private mode, or a full quota. The pet still works this session.
    return false;
  }
}

export function deleteDrawing() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing useful to do if storage is unavailable.
  }
}

// --- drawing -> stage -------------------------------------------------------

/**
 * Blows the drawing up 2x and drops it onto the stage grid, sitting on the
 * ground rather than floating at the top.
 * @param {string[]} rows
 * @param {number} lift rows to raise the whole animal by, for the bob frame
 */
function toStageGrid(rows, lift = 0) {
  const grid = Array.from({ length: STAGE_H }, () => EMPTY.repeat(STAGE_W));
  const height = DRAW_H * 2;
  const top = GROUND_ROW - height - lift;
  const left = Math.floor((STAGE_W - DRAW_W * 2) / 2);

  for (let r = 0; r < DRAW_H; r += 1) {
    let line = "";
    for (let c = 0; c < DRAW_W; c += 1) {
      const ch = rows[r][c];
      line += (INK_CHARS.has(ch) ? ch : EMPTY).repeat(2);
    }
    for (const half of [0, 1]) {
      const y = top + r * 2 + half;
      if (y < 0 || y >= STAGE_H) continue;
      const row = grid[y];
      grid[y] = (row.slice(0, left) + line + row.slice(left + line.length))
        .padEnd(STAGE_W, EMPTY)
        .slice(0, STAGE_W);
    }
  }
  return grid;
}

/**
 * Wraps a drawing as a pet the stage can play. There is no way to know where
 * someone drew the eyes, so it cannot blink; instead the whole animal breathes
 * — up a pixel, down a pixel — which reads as alive and costs two frames.
 * @param {string[]} rows
 */
export function customPet(rows) {
  return {
    label: "Mine",
    icon: "pencil",
    hint: "The one you made. Tap Edit to change them.",
    frames: [toStageGrid(rows, 0), toStageGrid(rows, 1)],
    // No overrides: a hand-drawn pet uses the shared palette as-is, which is
    // also what lets Paper mode turn it into a line drawing for free.
    colors: {},
  };
}

// --- image -> drawing ------------------------------------------------------

function parseHex(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

// Match against the editor swatches rather than the CSS variables: the
// variables are whatever the current mode says, and in Paper mode they are all
// two colours, which would quantise every photo to a black-and-white smear.
const INK_RGB = INKS.map((ink) => ({
  char: ink.char,
  rgb: parseHex(ink.swatch),
}));

function nearestInk(r, g, b) {
  let best = INK_RGB[0];
  let bestDistance = Infinity;
  for (const ink of INK_RGB) {
    const [ir, ig, ib] = ink.rgb;
    // Weighted for how the eye reads the channels, so a photo's greens do not
    // all land on the outline.
    const distance =
      2 * (r - ir) * (r - ir) +
      4 * (g - ig) * (g - ig) +
      3 * (b - ib) * (b - ib);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = ink;
    }
  }
  return best.char;
}

/**
 * Reduces an image to a DRAW_W x DRAW_H drawing.
 *
 * The image is fitted rather than stretched, and each destination cell is the
 * average of the pixels under it — averaging first is what turns a photo into
 * something that survives being 20 pixels wide, instead of a field of noise.
 * Mostly-transparent cells stay empty, so a PNG cut-out keeps its shape.
 *
 * @param {HTMLImageElement} image
 * @returns {string[]}
 */
export function drawingFromImage(image) {
  const canvas = document.createElement("canvas");
  canvas.width = DRAW_W;
  canvas.height = DRAW_H;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return emptyDrawing();

  const scale = Math.min(
    DRAW_W / (image.naturalWidth || DRAW_W),
    DRAW_H / (image.naturalHeight || DRAW_H),
  );
  const width = Math.max(1, Math.round((image.naturalWidth || DRAW_W) * scale));
  const height = Math.max(
    1,
    Math.round((image.naturalHeight || DRAW_H) * scale),
  );
  context.imageSmoothingEnabled = true;
  context.drawImage(
    image,
    Math.floor((DRAW_W - width) / 2),
    Math.floor((DRAW_H - height) / 2),
    width,
    height,
  );

  const { data } = context.getImageData(0, 0, DRAW_W, DRAW_H);
  const rows = [];
  for (let r = 0; r < DRAW_H; r += 1) {
    let line = "";
    for (let c = 0; c < DRAW_W; c += 1) {
      const i = (r * DRAW_W + c) * 4;
      const alpha = data[i + 3];
      line +=
        alpha < 110 ? EMPTY : nearestInk(data[i], data[i + 1], data[i + 2]);
    }
    rows.push(line);
  }
  return rows;
}
