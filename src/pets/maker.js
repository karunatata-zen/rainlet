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

  function put(r, c) {
    if (r < 0 || r >= DRAW_H || c < 0 || c >= DRAW_W) return;
    const char = erasing ? EMPTY : ink;
    if (rows[r][c] === char) return;
    rows[r] = rows[r].slice(0, c) + char + rows[r].slice(c + 1);
    paintCell(r, c);
    if (onChange) onChange(rows);
  }

  // One listener on the container, hit-tested from coordinates: dragging is the
  // whole point of a drawing grid, and per-cell listeners cannot follow a
  // finger that leaves the cell it started in.
  function cellAt(clientX, clientY) {
    const box = gridEl.getBoundingClientRect();
    const c = Math.floor(((clientX - box.left) / box.width) * DRAW_W);
    const r = Math.floor(((clientY - box.top) / box.height) * DRAW_H);
    return [r, c];
  }

  function pointerDown(x, y) {
    painting = true;
    put(...cellAt(x, y));
  }

  function pointerMove(x, y) {
    if (!painting) return;
    put(...cellAt(x, y));
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
  for (const name of ["mouseup", "mouseleave", "touchend", "touchcancel"]) {
    gridEl.addEventListener(name, () => {
      painting = false;
    });
  }
  document.addEventListener("mouseup", () => {
    painting = false;
  });

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
