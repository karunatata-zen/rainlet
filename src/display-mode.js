// Decides between Cozy and Paper. Guessing wrong is cheap: Settings has an
// explicit override, so this only needs to be right often enough to be useful.

import { getSettings } from "./settings/store.js";

const EREADER_HINTS = [
  "kindle",
  "silk",
  "kobo",
  "boox",
  "onyx",
  "remarkable",
  "pocketbook",
  "nook",
  "e-ink",
  "eink",
];

export function detectMode() {
  const ua = (navigator.userAgent || "").toLowerCase();
  if (EREADER_HINTS.some((hint) => ua.includes(hint))) return "paper";

  // A monochrome display is a strong signal regardless of user agent.
  if (matches("(monochrome)")) return "paper";

  // Some e-readers report a very low colour depth instead.
  if (screen && typeof screen.colorDepth === "number" && screen.colorDepth <= 8) {
    return "paper";
  }

  return "cozy";
}

export function resolveMode() {
  const { mode } = getSettings();
  return mode === "auto" ? detectMode() : mode;
}

export function prefersReducedMotion() {
  return matches("(prefers-reduced-motion: reduce)");
}

export function applyMode(mode) {
  const root = document.documentElement;
  root.dataset.mode = mode;
  root.dataset.reducedMotion = prefersReducedMotion() ? "true" : "false";
  return mode;
}

function matches(query) {
  try {
    return typeof matchMedia === "function" && matchMedia(query).matches;
  } catch {
    return false;
  }
}
