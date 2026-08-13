// Sharing a hand-made pet as a link.
//
// The whole pet is 280 characters, which fits in a URL with room to spare, so
// there is no backend here and no upload: the drawing travels inside the link
// itself. Someone can post a pet in a forum thread and it opens as a pet.

import { DRAW_H, DRAW_W, EMPTY, decode, encode, isBlank } from "./custom.js";

const PARAM = "p";

/**
 * Run-length encodes the flat drawing. A drawing is mostly empty cells, so the
 * runs collapse it from 280 characters to a few dozen — short enough that the
 * link survives being pasted into a chat window that likes to wrap things.
 *
 * Counts are decimal and no ink character is a digit, so the two never blur.
 */
export function encodeShare(rows) {
  const flat = encode(rows);
  let out = "";
  let i = 0;
  while (i < flat.length) {
    const char = flat[i];
    let run = 1;
    while (i + run < flat.length && flat[i + run] === char) run += 1;
    out += run > 1 ? char + run : char;
    i += run;
  }
  return out;
}

/**
 * The inverse, and deliberately forgiving: a truncated or mangled link gives
 * you whatever survived rather than an error. Anything unrecognised is read as
 * an empty cell by decode().
 */
export function decodeShare(text) {
  if (typeof text !== "string") return null;
  const size = DRAW_W * DRAW_H;
  let flat = "";
  let i = 0;
  while (i < text.length && flat.length < size) {
    const char = text[i];
    i += 1;
    if (char >= "0" && char <= "9") continue; // stray count, no character
    let digits = "";
    while (i < text.length && text[i] >= "0" && text[i] <= "9") {
      digits += text[i];
      i += 1;
    }
    const run = digits ? Math.min(Number(digits), size) : 1;
    flat += char.repeat(run);
  }
  const rows = decode(flat.padEnd(size, EMPTY));
  return isBlank(rows) ? null : rows;
}

/** The link to hand to someone else. */
export function shareUrl(rows) {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#${PARAM}=${encodeShare(rows)}`;
}

/** The pet in the current URL, if the page was opened from a shared link. */
export function readSharedRows() {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return null;
  for (const part of hash.split("&")) {
    const [key, value] = part.split("=");
    if (key === PARAM && value) return decodeShare(decodeURIComponent(value));
  }
  return null;
}

/**
 * Drops the pet out of the address bar once it has been dealt with, so a
 * reload does not offer the same gift a second time. replaceState keeps it out
 * of history; the assignment is the fallback for browsers without it.
 */
export function clearSharedRows() {
  const { origin, pathname, search } = window.location;
  try {
    window.history.replaceState(null, "", `${origin}${pathname}${search}`);
  } catch {
    window.location.hash = "";
  }
}

/**
 * Puts text on the clipboard, by whichever route the browser has. Resolves
 * false rather than rejecting when there is no route at all — the Kindle's
 * browser has neither, and the caller shows the link to copy by hand.
 */
export function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).then(
      () => true,
      () => legacyCopy(text),
    );
  }
  return Promise.resolve(legacyCopy(text));
}

function legacyCopy(text) {
  try {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(field);
    return ok;
  } catch {
    return false;
  }
}
