// Hand-placed pixel icons as inline SVG. Drawn on a 16x16 grid so they stay
// crisp at any zoom, recolourable via currentColor, and free of extra requests.
//
// These exist because the Kindle has no emoji font. The animal chips used to
// say 🐱🐶🦆🐰🐸 and on the device every one of them came out as a question
// mark, which is worse than no icon at all. A drawn glyph cannot be missing.

const P = (cells) =>
  cells
    .map(
      ([x, y, w = 1, h = 1]) =>
        `<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`,
    )
    .join("");

// The animals are easier to read — and to correct — as pictures than as
// coordinates, so they are written out as 16 rows of 16 characters and turned
// into one rect per horizontal run.
const G = (rows) => {
  const cells = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (row[x] === "#") {
        let width = 1;
        while (row[x + width] === "#") width += 1;
        cells.push([x, y, width, 1]);
        x += width;
      } else {
        x += 1;
      }
    }
  });
  return P(cells);
};

const wrap = (body) =>
  `<svg viewBox="0 0 16 16" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true">${body}</svg>`;

export const ICONS = {
  close: wrap(
    P([
      [3, 3, 2, 2],
      [5, 5, 2, 2],
      [7, 7, 2, 2],
      [9, 9, 2, 2],
      [11, 11, 2, 2],
      [11, 3, 2, 2],
      [9, 5, 2, 2],
      [5, 9, 2, 2],
      [3, 11, 2, 2],
    ]),
  ),
  plus: wrap(
    P([
      [7, 3, 2, 10],
      [3, 7, 10, 2],
    ]),
  ),
  pencil: wrap(
    P([
      [10, 2, 4, 2],
      [9, 4, 4, 2],
      [7, 6, 4, 2],
      [5, 8, 4, 2],
      [3, 10, 4, 2],
      [2, 12, 3, 2],
      [2, 12, 2, 1],
    ]),
  ),
  cat: wrap(
    G([
      "................",
      "...#........#...",
      "...##......##...",
      "...#.#....#.#...",
      "...#..####..#...",
      "...#........#...",
      "..#..........#..",
      "..#..#....#..#..",
      "..#..#....#..#..",
      "..#..........#..",
      "..#...####...#..",
      "..#..........#..",
      "...#........#...",
      "....########....",
      "................",
      "................",
    ]),
  ),
  dog: wrap(
    G([
      "................",
      "....########....",
      "..##........##..",
      ".#.#........#.#.",
      "#..#........#..#",
      "#..#.#....#.#..#",
      "#..#........#..#",
      ".#.#........#.#.",
      "..##........##..",
      "...#........#...",
      "...#...##...#...",
      "...#..#..#..#...",
      "...#...##...#...",
      "....########....",
      "................",
      "................",
    ]),
  ),
  duck: wrap(
    G([
      "................",
      "....######......",
      "...#......#.....",
      "..#........#....",
      "..#........#....",
      "..#..#..#..#....",
      "..#........#####",
      "..#............#",
      "..#........#####",
      "..#........#....",
      "...#......#.....",
      "....######......",
      "................",
      "................",
      "................",
      "................",
    ]),
  ),
  bunny: wrap(
    G([
      "....###..###....",
      "....#.#..#.#....",
      "....#.#..#.#....",
      "....#.#..#.#....",
      "...##########...",
      "..#..........#..",
      "..#..#....#..#..",
      "..#..#....#..#..",
      "..#..........#..",
      "..#...####...#..",
      "...#........#...",
      "....########....",
      "................",
      "................",
      "................",
      "................",
    ]),
  ),
  frog: wrap(
    G([
      "..##......##....",
      ".#..#....#..#...",
      ".#.#.#..#.#.#...",
      ".#..#....#..#...",
      "..##########....",
      ".#..........#...",
      "#............#..",
      "#............#..",
      "#...#....#...#..",
      "#....####....#..",
      ".#..........#...",
      "..##########....",
      "................",
      "................",
      "................",
      "................",
    ]),
  ),
  app: wrap(
    P([
      [3, 3, 10, 10],
      [5, 5, 6, 6],
    ]),
  ),
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
