// Real weather, so the sky on screen is the sky outside.
//
// Until now the sun was on a clock and the rain never stopped, which meant a
// clear afternoon showed a sunshower every day. This asks open-meteo what it is
// actually doing where you are and lets that drive the scene.
//
// Three rules the whole file is built around:
//
//   1. Nothing here may ever block the page. The Kindle's browser is slow and
//      often offline; the scene renders from the clock first and only changes
//      if an answer arrives. There is no spinner and no error message.
//   2. No API key, no account, no backend — open-meteo is free and CORS-open,
//      which is the only reason this can exist in a static site.
//   3. The user can switch it off and get unconditional rain back. "Clear
//      outside means no rain" is honest, but a site called Rainlet that shows
//      no rain for a week is a bad trade to force on anyone.

import { STORAGE_PREFIX } from "../config.js";

const ENDPOINT = "https://api.open-meteo.com/v1/forecast";
const CACHE_KEY = `${STORAGE_PREFIX}weather`;

// Half an hour. Weather does not change faster than that in any way this
// scene can show, and a reader left on a desk should not poll all day.
const TTL_MS = 30 * 60 * 1000;

// Geolocation on a Kindle can sit there for a long time before failing. Give
// up quickly and fall back rather than leave the scene waiting on a permission
// dialog nobody is going to answer.
const GEO_TIMEOUT_MS = 8000;
const FETCH_TIMEOUT_MS = 10000;

/**
 * WMO weather codes, collapsed to the handful of skies we can actually draw.
 * The full table has 28 entries and this scene has four sprites, so drizzle,
 * rain and showers are all simply "rain".
 * @param {number} code
 */
export function conditionFor(code) {
  if (code === 0) return "clear";
  if (code <= 2) return "fair"; // mainly clear / partly cloudy
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 95) return "storm";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 51) return "rain"; // drizzle, freezing drizzle, rain, showers
  return "fair";
}

/**
 * How wet the scene is, as a multiplier on the rain. 0 stops it entirely.
 * Fair weather keeps a whisper of rain rather than none: the stage looks dead
 * without any movement at all, and a couple of drops reads as "just passed".
 */
export const CONDITION_RAIN = {
  clear: 0,
  fair: 0.15,
  cloudy: 0.35,
  fog: 0.25,
  rain: 1.15,
  snow: 0.5,
  storm: 1.6,
};

// Whether the sky is covered enough to hide the sun or moon. Fog counts: a
// visible sun in fog is a contradiction anyone can spot.
export const CONDITION_COVERED = {
  clear: false,
  fair: false,
  cloudy: true,
  fog: true,
  rain: true,
  snow: true,
  storm: true,
};

const LABELS = {
  clear: "clear",
  fair: "fair",
  cloudy: "cloudy",
  fog: "fog",
  rain: "rain",
  snow: "snow",
  storm: "a storm",
};

export function conditionLabel(condition) {
  return LABELS[condition] || condition;
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.at !== "number") return null;
    if (typeof parsed.condition !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(value) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(value));
  } catch {
    // Full or private storage. The scene works without a cache; it just asks
    // again next time.
  }
}

export function forgetWeather() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // Nothing to do.
  }
}

/**
 * Coarse position. Deliberately low-accuracy: this picks a sky, and asking for
 * GPS precision would cost battery and be a worse thing to ask permission for.
 * @returns {Promise<{ lat: number, lon: number }>}
 */
function locate() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("no geolocation"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        }),
      (error) => reject(error),
      {
        enableHighAccuracy: false,
        timeout: GEO_TIMEOUT_MS,
        // An hour-old fix is fine for "which sky".
        maximumAge: 60 * 60 * 1000,
      },
    );
  });
}

function withTimeout(url) {
  // AbortController is present on everything modern, but the Kindle browser is
  // not modern; without it the fetch simply runs to its own timeout.
  if (typeof AbortController !== "function") return fetch(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
}

/**
 * @param {{ lat: number, lon: number }} where
 */
async function fetchCurrent({ lat, lon }) {
  // Coordinates are rounded to two decimals — about a kilometre. Enough to get
  // the right sky, and less of your location to hand to anyone than the full
  // reading would be.
  const query = new URLSearchParams({
    latitude: lat.toFixed(2),
    longitude: lon.toFixed(2),
    current: "weather_code,is_day",
    timezone: "auto",
  });
  const response = await withTimeout(`${ENDPOINT}?${query}`);
  if (!response.ok) throw new Error(`weather ${response.status}`);
  const data = await response.json();
  const code = data && data.current && data.current.weather_code;
  if (typeof code !== "number") throw new Error("no weather code");
  return {
    condition: conditionFor(code),
    isDay: Boolean(data.current.is_day),
    at: Date.now(),
  };
}

/**
 * Parses "51.5, -0.12" into coordinates. Returns null for anything else, so a
 * half-typed value in the settings box does not fire a request per keystroke.
 * @param {string} text
 */
export function parseCoords(text) {
  if (typeof text !== "string") return null;
  const parts = text.split(/[ ,]+/).filter(Boolean);
  if (parts.length !== 2) return null;
  const lat = Number(parts[0]);
  const lon = Number(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}

/**
 * Starts a weather watcher. Returns immediately with whatever is cached (or
 * nothing), and calls back later if a fresh answer arrives.
 *
 * @param {{
 *   enabled: boolean,
 *   coords?: { lat: number, lon: number } | null,
 *   onChange: (state: { condition: string, isDay: boolean, source: string }) => void,
 * }} options
 */
export function createWeather({ enabled, coords = null, onChange }) {
  let current = null;
  let inFlight = false;

  function publish(state, source) {
    current = state ? { ...state, source } : null;
    onChange(current);
  }

  async function load({ force = false } = {}) {
    if (!enabled || inFlight) return;

    const cached = readCache();
    if (cached && !force && Date.now() - cached.at < TTL_MS) {
      publish(cached, "cache");
      return;
    }
    // Show the stale reading while the new one is on its way. Yesterday's sky
    // is a better guess than no sky, and it stops the scene flipping to the
    // clock-only default for the length of a slow request.
    if (cached) publish(cached, "stale");

    inFlight = true;
    try {
      const where = coords || (await locate());
      const fresh = await fetchCurrent(where);
      writeCache(fresh);
      publish(fresh, "live");
    } catch {
      // Offline, refused, blocked, or open-meteo having a bad day. The scene
      // keeps whatever it already had; if that is nothing, the caller's
      // clock-only default stands. This is the fallback path, not an error.
    } finally {
      inFlight = false;
    }
  }

  function setEnabled(next) {
    enabled = next;
    if (!enabled) publish(null, "off");
    else load();
  }

  function setCoords(next) {
    coords = next;
    // A new location makes the cached reading wrong, not stale.
    forgetWeather();
    if (enabled) load({ force: true });
  }

  load();

  // Re-check when the page comes back into view, which on a reader is the
  // moment the cover is opened. No polling: nothing here is worth a timer.
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) load();
  });

  return {
    get state() {
      return current;
    },
    refresh: () => load({ force: true }),
    setEnabled,
    setCoords,
  };
}
