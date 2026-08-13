// Idle mode: after a while untouched, the page stops being a page and becomes
// the scene. This is the whole point of leaving a Kindle propped on a desk —
// without it the site is a dashboard you visit rather than a thing you leave
// on.
//
// State lives in a class on <body>; the layout is CSS's business.

const ACTIVITY = ["pointerdown", "keydown", "wheel", "touchstart", "mousemove"];

// A mouse that twitches once a frame must not reset the timer once a frame.
const RESET_THROTTLE_MS = 500;

/**
 * @param {{
 *   delay?: number,
 *   blocked?: () => boolean,
 *   onChange?: (idle: boolean) => void,
 * }} options
 */
export function createIdle({ delay = 60000, blocked, onChange } = {}) {
  let timer = null;
  let idle = false;
  let lastReset = 0;
  let wokeAt = 0;

  function set(next) {
    if (idle === next) return;
    idle = next;
    if (!idle) wokeAt = Date.now();
    document.body.classList.toggle("is-idle", idle);
    if (onChange) onChange(idle);
  }

  function arm() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      // Never drop into idle over an open dialog: the settings you were
      // halfway through would vanish behind the pet.
      if (blocked && blocked()) {
        arm();
        return;
      }
      set(true);
    }, delay);
  }

  function poke(event) {
    // The gesture that wakes the page should only wake it. Otherwise the tap
    // meant to bring the UI back also lands on whatever was underneath.
    if (idle && event && event.cancelable) event.preventDefault();
    set(false);

    const now = Date.now();
    if (now - lastReset < RESET_THROTTLE_MS) return;
    lastReset = now;
    arm();
  }

  for (const type of ACTIVITY) {
    // Capture, so a handler that stops propagation cannot leave the page
    // asleep with no way back.
    window.addEventListener(type, poke, { capture: true, passive: false });
  }

  // A tab in the background is not "being watched", so do not count the time.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clearTimeout(timer);
    else arm();
  });

  arm();

  return {
    wake: () => poke(null),
    get idle() {
      return idle;
    },
    /**
     * True just after waking. preventDefault on a pointer event does not stop
     * the click that follows a mouse press, so whatever is under the waking
     * tap asks this before acting on it.
     */
    get justWoke() {
      return Date.now() - wokeAt < 400;
    },
  };
}
