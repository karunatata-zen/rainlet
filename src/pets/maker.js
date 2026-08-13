// The pet maker: a chunky drawing grid, a palette, and an image slot.
//
// Built from plain elements rather than a canvas, because a canvas would need
// its own hit-testing and would blur on a Kindle's non-integer device ratio,
// and 280 divs is not enough DOM to matter.

import {
  DRAW_H,
  DRAW_W,
  EMPTY,
  INKS,
  drawingFromImage,
  emptyDrawing,
  isBlank,
} from "./custom.js";

const TRANSPARENT = "transparent";

/**
 * @param {{
 *   gridEl: HTMLElement,
 *   paletteEl: HTMLElement,
 *   onChange?: (rows: string[]) => void,
 * }} options
 */
export function createPetMaker({ gridEl, paletteEl, onChange }) {
  let rows = emptyDrawing();
  let ink = INKS[0].char;
  let erasing = false;
  let painting = false;

  const cells = [];

  // --- grid ---------------------------------------------------------------
  gridEl.style.setProperty("--draw-cols", String(DRAW_W));
  gridEl.style.setProperty("--draw-rows", String(DRAW_H));
  gridEl.setAttribute("role", "grid");
  gridEl.setAttribute("aria-label", "Drawing grid");

  for (let r = 0; r < DRAW_H; r += 1) {
    for (let c = 0; c < DRAW_W; c += 1) {
      const cell = document.createElement("span");
      cell.className = "draw__cell";
      cell.dataset.row = String(r);
      cell.dataset.col = String(c);
      gridEl.appendChild(cell);
      cells.push(cell);
    }
  }

  function swatch(char) {
    const entry = INKS.find((item) => item.char === char);
    return entry ? entry.swatch : TRANSPARENT;
  }

  function paintCell(r, c) {
    const cell = cells[r * DRAW_W + c];
    const char = rows[r][c];
    cell.style.background = char === EMPTY ? TRANSPARENT : swatch(char);
    cell.dataset.ink = char;
  }

  function repaint() {
    for (let r = 0; r < DRAW_H; r += 1) {
      for (let c = 0; c < DRAW_W; c += 1) paintCell(r, c);
    }
  }

  // Set while a stroke is in progress, so the whole drag reports once instead
  // of once per cell. The preview that listens to onChange redraws the animal,
  // and doing that thirty times mid-drag is what makes a slow screen lag
  // behind the finger.
  let changedDuringStroke = false;

  function put(r, c) {
    if (r < 0 || r >= DRAW_H || c < 0 || c >= DRAW_W) return;
    const char = erasing ? EMPTY : ink;
    if (rows[r][c] === char) return;
    rows[r] = rows[r].slice(0, c) + char + rows[r].slice(c + 1);
    paintCell(r, c);
    if (painting) changedDuringStroke = true;
    else if (onChange) onChange(rows);
  }

  // Fills in the cells between two samples. A finger moves faster than the
  // touch events describing it — on a Kindle far faster — so consecutive
  // points can be several cells apart, and painting only where they land
  // leaves a dotted line. Bresenham, so a diagonal is a diagonal.
  function putLine(r0, c0, r1, c1) {
    const dr = Math.abs(r1 - r0);
    const dc = Math.abs(c1 - c0);
    const stepR = r0 < r1 ? 1 : -1;
    const stepC = c0 < c1 ? 1 : -1;
    let error = dc - dr;
    let r = r0;
    let c = c0;
    // Bounded by the grid: a stray coordinate cannot spin here forever.
    for (let guard = 0; guard < DRAW_W * DRAW_H; guard += 1) {
      put(r, c);
      if (r === r1 && c === c1) return;
      const doubled = error * 2;
      if (doubled > -dr) {
        error -= dr;
        c += stepC;
      }
      if (doubled < dc) {
        error += dc;
        r += stepR;
      }
    }
  }

  // One listener on the container, hit-tested from coordinates: dragging is the
  // whole point of a drawing grid, and per-cell listeners cannot follow a
  // finger that leaves the cell it started in.
  let box = null;
  let last = null;

  function cellAt(clientX, clientY) {
    // Measured once per stroke. getBoundingClientRect forces layout, and doing
    // that on every touchmove costs exactly the frames the drag needs.
    const bounds = box || gridEl.getBoundingClientRect();
    const c = Math.floor(((clientX - bounds.left) / bounds.width) * DRAW_W);
    const r = Math.floor(((clientY - bounds.top) / bounds.height) * DRAW_H);
    return [r, c];
  }

  function pointerDown(x, y) {
    box = gridEl.getBoundingClientRect();
    painting = true;
    changedDuringStroke = false;
    last = cellAt(x, y);
    put(last[0], last[1]);
  }

  function pointerMove(x, y) {
    if (!painting) return;
    const next = cellAt(x, y);
    if (last && (next[0] !== last[0] || next[1] !== last[1])) {
      putLine(last[0], last[1], next[0], next[1]);
    } else {
      put(next[0], next[1]);
    }
    last = next;
  }

  function pointerUp() {
    painting = false;
    box = null;
    last = null;
    if (changedDuringStroke) {
      changedDuringStroke = false;
      if (onChange) onChange(rows);
    }
  }

  gridEl.addEventListener("mousedown", (event) => {
    event.preventDefault();
    pointerDown(event.clientX, event.clientY);
  });
  gridEl.addEventListener("mousemove", (event) =>
    pointerMove(event.clientX, event.clientY),
  );
  gridEl.addEventListener("touchstart", (event) => {
    // Otherwise the reader scrolls the panel instead of drawing.
    event.preventDefault();
    const touch = event.touches[0];
    if (touch) pointerDown(touch.clientX, touch.clientY);
  });
  gridEl.addEventListener("touchmove", (event) => {
    event.preventDefault();
    const touch = event.touches[0];
    if (touch) pointerMove(touch.clientX, touch.clientY);
  });
  // Every ending goes through pointerUp, including the ones that look like
  // giving up. Clearing `painting` on its own would leave `last` pointing at
  // the end of the previous stroke, and the next drag would open with a line
  // drawn back to wherever the finger was last time.
  for (const name of ["mouseup", "mouseleave", "touchend", "touchcancel"]) {
    gridEl.addEventListener(name, pointerUp);
  }
  document.addEventListener("mouseup", pointerUp);

  // --- palette ------------------------------------------------------------
  const swatchButtons = [];

  function selectInk(char) {
    ink = char;
    erasing = false;
    syncPalette();
  }

  function setErasing(on) {
    erasing = on;
    syncPalette();
  }

  function syncPalette() {
    for (const button of swatchButtons) {
      const isEraser = button.dataset.ink === EMPTY;
      const active = isEraser
        ? erasing
        : !erasing && button.dataset.ink === ink;
      button.setAttribute("aria-pressed", String(active));
    }
  }

  for (const entry of [...INKS, { char: EMPTY, label: "Eraser" }]) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "swatch";
    button.dataset.ink = entry.char;
    button.title = entry.label;
    button.setAttribute("aria-label", entry.label);
    button.setAttribute("aria-pressed", "false");

    const dot = document.createElement("span");
    dot.className = "swatch__dot";
    if (entry.char === EMPTY) {
      dot.classList.add("swatch__dot--eraser");
    } else {
      dot.style.background = swatch(entry.char);
    }
    button.appendChild(dot);

    button.addEventListener("click", () => {
      if (entry.char === EMPTY) setErasing(true);
      else selectInk(entry.char);
    });
    paletteEl.appendChild(button);
    swatchButtons.push(button);
  }

  syncPalette();
  repaint();

  // --- public -------------------------------------------------------------

  function setRows(next) {
    rows = next.slice();
    repaint();
    if (onChange) onChange(rows);
  }

  function clear() {
    setRows(emptyDrawing());
  }

  /**
   * Turns a picked file into a drawing. Rejects rather than silently doing
   * nothing, so the caller can say why.
   * @param {File} file
   */
  function loadImage(file) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type)) {
        reject(new Error("That is not an image"));
        return;
      }
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        try {
          setRows(drawingFromImage(image));
          resolve(rows);
        } catch (error) {
          reject(error);
        } finally {
          URL.revokeObjectURL(url);
        }
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("That image would not open"));
      };
      image.src = url;
    });
  }

  return {
    setRows,
    clear,
    loadImage,
    get rows() {
      return rows.slice();
    },
    get blank() {
      return isBlank(rows);
    },
  };
}
