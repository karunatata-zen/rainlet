// Small-value persistence. Every read falls back to a default rather than
// letting a corrupt or hand-edited value white-screen the page.

import { STORAGE_PREFIX } from "../config.js";

export const DEFAULT_SETTINGS = {
  mode: "auto", // auto | cozy | paper
  scene: "drizzle",
  pet: "cat",
  intensity: 1, // 0.25 .. 2
  reactive: true,
  clock24: true,
  bgEnabled: false,
  bgScrim: 0.45, // 0 .. 0.9
  bgRainOverlay: true,
};

const listeners = new Set();

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
  merged.intensity = clamp(merged.intensity, 0.25, 2);
  merged.bgScrim = clamp(merged.bgScrim, 0, 0.9);
  return merged;
}

export function setSetting(key, value) {
  if (!(key in DEFAULT_SETTINGS)) return getSettings();
  const next = { ...getSettings(), [key]: value };
  write("settings", next);
  for (const fn of listeners) fn(next, key);
  return next;
}

export function onSettingsChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function resetPreferences() {
  // "player" is dead but still cleared: an older build wrote it, and this is
  // the only place that would ever tidy it up.
  for (const key of ["settings", "player"]) {
    try {
      localStorage.removeItem(STORAGE_PREFIX + key);
    } catch {
      // Nothing useful to do if storage is unavailable.
    }
  }
  for (const fn of listeners) fn(getSettings(), "reset");
}

function clamp(n, min, max) {
  if (typeof n !== "number" || Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}
