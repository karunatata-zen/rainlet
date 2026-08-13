// Pixel icons drawn on a 16x16 grid as inline SVG rects. Inline keeps them
// crisp at any zoom, recolourable via currentColor, and free of extra requests.

const P = (cells) =>
  cells
    .map(([x, y, w = 1, h = 1]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`)
    .join("");

const wrap = (body) =>
  `<svg viewBox="0 0 16 16" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true">${body}</svg>`;

export const ICONS = {
  gear: wrap(P([[7, 1, 2, 2], [7, 13, 2, 2], [1, 7, 2, 2], [13, 7, 2, 2], [3, 3, 2, 2], [11, 3, 2, 2], [3, 11, 2, 2], [11, 11, 2, 2], [5, 5, 6, 6], [7, 7, 2, 2]])),
  close: wrap(P([[3, 3, 2, 2], [5, 5, 2, 2], [7, 7, 2, 2], [9, 9, 2, 2], [11, 11, 2, 2], [11, 3, 2, 2], [9, 5, 2, 2], [5, 9, 2, 2], [3, 11, 2, 2]])),
  play: wrap(P([[4, 2, 2, 12], [6, 4, 2, 8], [8, 6, 2, 4], [10, 7, 2, 2]])),
  pause: wrap(P([[4, 3, 3, 10], [9, 3, 3, 10]])),
  next: wrap(P([[3, 3, 2, 10], [5, 5, 2, 6], [7, 7, 2, 2], [11, 3, 2, 10]])),
  prev: wrap(P([[11, 3, 2, 10], [9, 5, 2, 6], [7, 7, 2, 2], [3, 3, 2, 10]])),
  shuffle: wrap(P([[2, 4, 3, 2], [5, 6, 2, 2], [7, 8, 2, 2], [9, 10, 2, 2], [11, 10, 3, 2], [12, 8, 2, 2], [12, 12, 2, 2], [2, 10, 3, 2], [5, 8, 2, 2], [9, 4, 2, 2], [11, 4, 3, 2], [12, 2, 2, 2], [12, 6, 2, 2]])),
  repeat: wrap(P([[3, 3, 10, 2], [3, 5, 2, 6], [11, 5, 2, 6], [3, 11, 10, 2], [1, 4, 2, 2], [13, 10, 2, 2]])),
  music: wrap(P([[6, 2, 7, 2], [11, 2, 2, 8], [9, 9, 4, 2], [4, 5, 2, 7], [2, 11, 4, 2]])),
  app: wrap(P([[3, 3, 10, 10], [5, 5, 6, 6]])),
  drop: wrap(P([[7, 2, 2, 2], [6, 4, 4, 2], [5, 6, 6, 3], [4, 9, 8, 3], [5, 12, 6, 2], [7, 8, 2, 2]])),
};

export function icon(name) {
  return ICONS[name] || ICONS.app;
}

// Replaces every <span data-icon="x"> in a container with its SVG.
export function hydrateIcons(root = document) {
  for (const node of root.querySelectorAll("[data-icon]")) {
    node.innerHTML = icon(node.dataset.icon);
  }
}
