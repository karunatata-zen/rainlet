// The mascot: a cat under an umbrella, on a 24x24 pixel grid.
//
// Shapes are listed as flat rects. Each body shape is drawn twice — once
// expanded by 1px in the line colour, then again at true size in the fill
// colour — which gives a chunky pixel outline without hand-plotting one.
// Colours come from CSS vars so Paper mode can flatten them to black/white.

const CANOPY = [
  [10, 2, 4, 1],
  [8, 3, 8, 1],
  [6, 4, 12, 1],
  [4, 5, 16, 1],
  [3, 6, 18, 1],
  // scalloped hem
  [3, 7, 4, 1],
  [8, 7, 4, 1],
  [13, 7, 4, 1],
  [18, 7, 3, 1],
];

const HANDLE = [[11, 7, 2, 7]];

const HEAD = [
  [8, 11, 2, 2], // left ear
  [15, 11, 2, 2], // right ear
  [8, 12, 9, 6],
];

const BODY = [
  [7, 17, 11, 4],
  [8, 21, 2, 1], // paws
  [15, 21, 2, 1],
];

// Two tail positions, alternated while music plays.
const TAIL_FRAMES = [
  [
    [18, 19, 3, 1],
    [20, 17, 1, 2],
  ],
  [
    [18, 20, 3, 1],
    [20, 18, 1, 2],
  ],
];

// Ears perk up on the second frame.
const EARS_UP = [
  [8, 10, 2, 1],
  [15, 10, 2, 1],
];

const FACE = {
  // Dozing: closed eyes as flat dashes.
  idle: [
    [10, 15, 2, 1],
    [13, 15, 2, 1],
  ],
  // Awake: round open eyes.
  playing: [
    [10, 14, 2, 2],
    [13, 14, 2, 2],
  ],
  // Caught mid-blink.
  paused: [
    [10, 15, 2, 1],
    [13, 14, 2, 2],
  ],
  // Petted: happy ^ ^ eyes.
  happy: [
    [10, 15, 1, 1],
    [11, 14, 1, 1],
    [12, 15, 1, 1],
    [13, 15, 1, 1],
    [14, 14, 1, 1],
    [15, 15, 1, 1],
  ],
};

// A sleepy "z" that drifts up beside the idle cat, on the second frame only.
const SLEEP_Z = [
  [
    [19, 12, 3, 1],
    [21, 13, 1, 1],
    [20, 14, 1, 1],
    [19, 15, 3, 1],
  ],
  [
    [19, 10, 3, 1],
    [21, 11, 1, 1],
    [20, 12, 1, 1],
    [19, 13, 3, 1],
  ],
];

// Two little hearts, popped when the cat is petted.
const HEARTS = [
  [
    [4, 12, 1, 1],
    [6, 12, 1, 1],
    [4, 13, 3, 1],
    [5, 14, 1, 1],
  ],
  [
    [18, 9, 1, 1],
    [20, 9, 1, 1],
    [18, 10, 3, 1],
    [19, 11, 1, 1],
  ],
];

const NOSE = [
  [12, 17, 1, 1],
  [11, 18, 3, 1],
];

const WHISKERS = [
  [6, 16, 2, 1],
  [17, 16, 2, 1],
];

function rects(list, fill) {
  return list
    .map(
      ([x, y, w, h]) =>
        `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`,
    )
    .join("");
}

// Expand each rect by 1px on every side to fake an outline pass.
function outline(list, fill) {
  return rects(
    list.map(([x, y, w, h]) => [x - 1, y - 1, w + 2, h + 2]),
    fill,
  );
}

const LINE = "var(--mascot-line, #3A3238)";
const FUR = "var(--mascot-fur, #F7C9B8)";
const UMBRELLA = "var(--mascot-umbrella, #A8C7E7)";
const HEART = "var(--mascot-heart, #E8A0BF)";

/**
 * @param {"idle"|"playing"|"paused"|"happy"} state
 * @param {number} frame 0 or 1, for the two-frame animations
 */
export function mascotSvg(state = "idle", frame = 0) {
  const face = FACE[state] || FACE.idle;
  const animated = state === "playing" || state === "happy";
  const tail = TAIL_FRAMES[animated ? frame % 2 : 0];
  const ears = animated && frame % 2 === 1 ? EARS_UP : [];
  // The cat only dozes when nothing is loaded; a paused track means awake.
  const zzz = state === "idle" ? SLEEP_Z[frame % 2] : [];
  const hearts = state === "happy" ? [...HEARTS[0], ...HEARTS[1]] : [];

  const body = [
    // Outline pass first, so fills sit on top of it.
    outline(CANOPY, LINE),
    outline(HANDLE, LINE),
    outline([...HEAD, ...ears], LINE),
    outline(BODY, LINE),
    outline(tail, LINE),
    // Fill pass.
    rects(CANOPY, UMBRELLA),
    rects(HANDLE, LINE),
    rects([...HEAD, ...ears], FUR),
    rects(BODY, FUR),
    rects(tail, FUR),
    // Details.
    rects(face, LINE),
    rects(NOSE, LINE),
    rects(WHISKERS, LINE),
    rects(zzz, LINE),
    rects(hearts, HEART),
  ].join("");

  return `<svg viewBox="0 0 24 24" shape-rendering="crispEdges" aria-hidden="true">${body}</svg>`;
}

/**
 * Mounts the mascot and returns a small controller.
 * Animation is opt-in: Paper mode and reduced-motion callers pass animate:false.
 */
export function createMascot(element) {
  // `base` is what the player asked for; `state` is what is on screen right
  // now, which petting borrows for a moment before handing back.
  let base = "idle";
  let state = "idle";
  let frame = 0;
  let animate = true;
  let timer = null;
  let petTimer = null;

  function render() {
    element.innerHTML = mascotSvg(state, frame);
  }

  function stop() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  // Each state has its own cadence: a tail flick reads as alive at 600ms, a
  // drifting sleep "z" wants to be much slower or it looks agitated.
  function beat() {
    if (state === "playing" || state === "happy") return 600;
    if (state === "idle") return 2200;
    return 0;
  }

  function show(next) {
    state = next;
    frame = 0;
    stop();
    render();
    const interval = animate ? beat() : 0;
    if (!interval) return;
    timer = setInterval(() => {
      frame = (frame + 1) % 2;
      render();
    }, interval);
  }

  render();

  return {
    setState(next, options = {}) {
      const wantsAnimation = options.animate !== false;
      if (next === base && wantsAnimation === animate) return;
      base = next;
      animate = wantsAnimation;
      // Don't stomp on a pet in progress; it hands back to `base` on its own.
      if (petTimer === null) show(base);
    },
    /** A tap on the cat: happy face and hearts, then back to whatever it was. */
    pet() {
      clearTimeout(petTimer);
      show("happy");
      petTimer = setTimeout(() => {
        petTimer = null;
        show(base);
      }, 1600);
    },
    destroy() {
      stop();
      clearTimeout(petTimer);
    },
  };
}
