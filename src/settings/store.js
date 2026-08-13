// Small-value persistence. Every read falls back to a default rather than
// letting a corrupt or hand-edited value white-screen the page.

import { STORAGE_PREFIX } from "../config.js";

export const DEFAULT_SETTINGS = {
  mode: "auto", // auto | cozy | paper
  scene: "drizzle",
  pet: "cat",
  clock24: true,
  // Off by default. Turning it on asks for your location, and a page that
  // throws a permission dialog at you before you have decided you like it is
  // a page you close. It is opt-in, from the button under the stage.
  weather: false,
  weatherCoords: "", // "51.5, -0.12" — typed in when geolocation is refused
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== typeof fallback) return fallback;
    if (Array.isArray(fallback) !== Array.isArray(parsed)) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    // Private mode or a full quota. Settings are a nicety, so carry on.
  }
}

export function getSettings() {
  const stored = read("settings", {});
  const merged = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    const value = stored[key];
    if (value === undefined) continue;
    if (typeof value !== typeof DEFAULT_SETTINGS[key]) continue;
    merged[key] = value;
  }
  return merged;
}

export function setSetting(key, value) {
  if (!(key in DEFAULT_SETTINGS)) return getSettings();
  const next = { ...getSettings(), [key]: value };
  write("settings", next);
  return next;
}
