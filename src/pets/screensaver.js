// The scene as a picture you can put on the reader itself.
//
// Drawn from the same character grid the stage renders, so what you save is
// the scene you were looking at rather than a second drawing of it that drifts
// out of step with the first.

import { STAGE_H, STAGE_W } from "./sprites.js";
import { sceneGrid } from "./stage.js";

// Kindle 11th gen: 6", 300ppi. The picture is made at the panel's own
// resolution so nothing is resampled on the way in.
export const SCREEN_W = 1072;
export const SCREEN_H = 1448;

/**
 * Palette character -> lightness, 0 black to 1 white. Colour is no use here:
 * the panel has none, and letting the device work out its own greys from a
 * colour PNG gives muddier results than choosing them.
 */
const GREY = {
  O: 0.0, // outline
  E: 0.0, // eyes
  N: 0.42, // nose
  f: 0.55, // shaded fur
  S: 0.55, // stem
  a: 0.55, // accent, dark
  H: 0.58, // heart
  R: 0.62, // rain
  Y: 0.66, // gold
  A: 0.7, // accent
  F: 0.74, // fur
  B: 0.78, // blush
  P: 0.82, // pink
  G: 0.86, // ground
  D: 0.9, // puddle
  W: 1.0, // cream
  w: 1.0, // glint
};

// Ordered dithering, so a mid grey becomes a stable texture rather than a flat
// tone the reader will dither for itself — differently, and usually worse.
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/**
 * Renders the scene into a canvas at the reader's resolution.
 * @param {string[][]} petFrames
 * @param {{ frame?: number, width?: number, height?: number }} options
 */
export function renderScreensaver(
  petFrames,
  { frame = 0, width = SCREEN_W, height = SCREEN_H } = {},
) {
  const rows = sceneGrid(petFrames, frame);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  const image = ctx.createImageData(width, height);
  const data = image.data;

  // The scene is wider than it is tall and the screen is the other way round,
  // so width is what runs out first. Whole pixels only: a fractional cell
  // would put a seam through art made of squares.
  const cell = Math.floor(width / STAGE_W);
  const artW = cell * STAGE_W;
  const artH = cell * STAGE_H;
  const left = Math.floor((width - artW) / 2);
  // Sits a little above centre, the way a picture is hung.
  const top = Math.floor((height - artH) * 0.42);

  for (let y = 0; y < height; y += 1) {
    const r = Math.floor((y - top) / cell);
    for (let x = 0; x < width; x += 1) {
      const c = Math.floor((x - left) / cell);
      let level = 1;
      if (r >= 0 && r < STAGE_H && c >= 0 && c < STAGE_W) {
        const char = (rows[r] || "")[c];
        const grey = GREY[char];
        if (typeof grey === "number") level = grey;
      }

      const threshold = (BAYER[y & 3][x & 3] + 0.5) / 16;
      const value = level > threshold ? 255 : 0;

      const i = (y * width + x) * 4;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
  return canvas;
}

/**
 * Saves the picture. Resolves false when the browser has no way to hand a file
 * over — the Kindle's own browser cannot download, which is fine, because the
 * file has to reach the reader over USB from a computer anyway.
 * @param {string[][]} petFrames
 * @param {string} name
 */
export function saveScreensaver(petFrames, name = "rainlet") {
  const canvas = renderScreensaver(petFrames);
  const filename = `${name}-${SCREEN_W}x${SCREEN_H}.png`;

  return new Promise((resolve) => {
    const finish = (url) => {
      if (!url) {
        resolve(false);
        return;
      }
      const link = document.createElement("a");
      if (!("download" in link)) {
        // No download attribute: open it instead and let them save it by hand.
        window.open(url, "_blank");
        resolve(true);
        return;
      }
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Revoked late: Safari reads the blob after the click returns.
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      resolve(true);
    };

    if (canvas.toBlob) {
      canvas.toBlob((blob) => finish(blob ? URL.createObjectURL(blob) : null));
      return;
    }
    try {
      finish(canvas.toDataURL("image/png"));
    } catch {
      resolve(false);
    }
  });
}
