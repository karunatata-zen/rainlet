// Wiring. Every module here is deliberately unaware of the others; this is
// the only place that knows how they fit together.

import "./styles/main.css";

import {
  APP_NAME,
  APP_TAGLINE,
  DEAD_DB_NAME,
  IDLE_AFTER_MS,
  TUNING,
} from "./config.js";
import {
  applyMode,
  prefersReducedMotion,
  resolveMode,
} from "./display-mode.js";
import { getSettings, setSetting } from "./settings/store.js";
import { createRain } from "./rain/engine.js";
import { createMascot } from "./ui/mascot.js";
import { hydrateIcons } from "./ui/icons.js";
import { createIdle } from "./ui/idle.js";
import { startDebug } from "./ui/debug.js";
import { createClock } from "./widgets/clock.js";
import { PHASE_RAIN, phaseAt, watchPhase } from "./scene/daylight.js";
import {
  CONDITION_COVERED,
  CONDITION_RAIN,
  conditionLabel,
  createWeather,
  parseCoords,
} from "./scene/weather.js";
import { createPetStage } from "./pets/stage.js";
import { PETS, PET_ORDER } from "./pets/sprites.js";
import {
  CUSTOM_PET_ID,
  customPet,
  deleteDrawing,
  emptyDrawing,
  loadDrawing,
  saveDrawing,
} from "./pets/custom.js";
import { createPetMaker } from "./pets/maker.js";
import {
  clearSharedRows,
  copyText,
  readSharedRows,
  shareUrl,
} from "./pets/share.js";

const el = (id) => document.getElementById(id);

function main() {
  hydrateIcons();

  let mode = applyMode(resolveMode());
  const reduced = prefersReducedMotion();

  // Set once the overlays exist, since idle has to know not to fire over one.
  // Everything that reacts to a tap checks it, so it is declared up here.
  let idle = null;

  document.title = `${APP_NAME} — ${APP_TAGLINE}`;

  // Toast ---------------------------------------------------------------
  const toastEl = el("toast");
  let toastTimer = null;
  function toast(message) {
    if (!message) return;
    toastEl.textContent = message;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.hidden = true;
    }, 2600);
  }

  // Time of day ----------------------------------------------------------
  // The scene follows the clock. The phase is on <html> so the stylesheet can
  // shift the palette without JS touching colours.
  let phase = phaseAt();
  document.documentElement.dataset.phase = phase;

  // Real weather, if it has been switched on and an answer has arrived. Null
  // means "we do not know", which is the same as the scene before weather
  // existed: it rains, and the sky follows the clock.
  let weatherState = null;
  const wetnessNow = () =>
    weatherState ? (CONDITION_RAIN[weatherState.condition] ?? 1) : 1;

  // Rain ------------------------------------------------------------------
  const rain = createRain(el("rain"));

  function applyRain() {
    const settings = getSettings();
    const wetness = wetnessNow();

    rain.setMode(mode);
    rain.setScene(settings.scene);
    rain.setIntensity((PHASE_RAIN[phase] || 1) * wetness);
    rain.freeze(reduced);
    // Clear outside means a dry screen. That is the point of asking, and it can
    // only happen when the real sky has deliberately been switched on.
    rain.setEnabled(wetness > 0);
  }

  // Mascot + clock -------------------------------------------------------
  const mascotEl = el("mascot");
  const mascot = createMascot(mascotEl);
  mascot.setState("idle", { animate: mode !== "paper" && !reduced });
  const PURRS = [
    "purrrr",
    "mrrp!",
    "the cat is pleased",
    "*happy tail*",
    "one (1) heart earned",
  ];
  mascotEl.addEventListener("click", () => {
    // The tap that woke the page only wakes it.
    if (idle && idle.justWoke) return;
    mascot.pet();
    toast(PURRS[Math.floor(Math.random() * PURRS.length)]);
  });
  createClock({ button: el("clock"), output: el("clock-time") });

  // Pet stage ------------------------------------------------------------
  const stageEl = el("pet-stage");
  const petHintEl = el("pet-hint");
  const petChipsEl = el("pet-chips");
  const stage = createPetStage(stageEl, { fps: TUNING.cozy.petFps });

  // The pet you drew yourself, if there is one. Kept beside the built-ins
  // rather than inside PETS so the shipped cast stays a constant.
  let custom = null;

  // A pet someone sent by link, held on the stage until it is kept or waved
  // off. Deliberately not saved on arrival: a link should not be able to
  // overwrite the animal you drew just by being opened.
  const GIFT_PET_ID = "gift";
  let gift = null;
  let giftRows = null;

  function petPreset(id) {
    if (id === CUSTOM_PET_ID) return custom;
    if (id === GIFT_PET_ID) return gift;
    return PETS[id];
  }

  function selectPet(requested, { save = true } = {}) {
    // A hand-edited or stale stored value falls back rather than leaving the
    // card with no animal selected.
    const id = petPreset(requested) ? requested : PET_ORDER[0];
    stage.setPet(id);
    petHintEl.textContent = petPreset(id).hint;
    for (const button of petChipsEl.children) {
      button.setAttribute("aria-pressed", String(button.dataset.pet === id));
    }
    if (save) setSetting("pet", id);
  }

  function petChip(id, preset, { pressable = true } = {}) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip chip--pet";
    if (id) button.dataset.pet = id;
    if (pressable) button.setAttribute("aria-pressed", "false");

    const emoji = document.createElement("span");
    emoji.className = "chip__emoji";
    emoji.textContent = preset.emoji;
    button.appendChild(emoji);

    const label = document.createElement("span");
    label.textContent = preset.label;
    button.appendChild(label);

    petChipsEl.appendChild(button);
    return button;
  }

  // Rebuilt rather than patched, because saving or deleting a custom pet adds
  // or removes a chip in the middle of the row.
  function renderPetChips() {
    petChipsEl.replaceChildren();
    for (const id of PET_ORDER) {
      petChip(id, PETS[id]).addEventListener("click", () => selectPet(id));
    }
    if (custom) {
      petChip(CUSTOM_PET_ID, custom).addEventListener("click", () =>
        selectPet(CUSTOM_PET_ID),
      );
    }
    petChip(
      null,
      { emoji: "\u002b", label: custom ? "Edit" : "Make" },
      {
        pressable: false,
      },
    ).addEventListener("click", openMaker);
  }

  const PATS = [
    "happy animal",
    "they liked that",
    "*content wiggle*",
    "friendship level up",
    "boop",
  ];
  stageEl.addEventListener("click", () => {
    if (idle && idle.justWoke) return;
    stage.pet();
    toast(PATS[Math.floor(Math.random() * PATS.length)]);
  });

  // Paper mode gets the scene in black and white and at the e-ink frame rate;
  // reduced-motion gets a single still frame.
  function applyStageMode() {
    const tuning = TUNING[mode] || TUNING.cozy;
    stage.configure({
      fps: tuning.petFps,
      animate: !reduced,
      colors: mode !== "paper",
    });
  }

  /**
   * Swaps in (or forgets) the hand-made pet everywhere at once: the stage, the
   * chip row, and what is on screen.
   * @param {string[] | null} rows
   */
  function setCustomPet(rows, { select = true } = {}) {
    custom = rows ? customPet(rows) : null;
    stage.setExtraPet(CUSTOM_PET_ID, custom);
    renderPetChips();
    // Deleting drops the stage back to a built-in, so re-read what it settled
    // on rather than assuming.
    selectPet(custom && select ? CUSTOM_PET_ID : stage.current, {
      save: select,
    });
  }

  // A pet that arrived in the URL -----------------------------------------
  const giftBar = el("gift-bar");

  function offerGift(rows) {
    giftRows = rows;
    gift = {
      ...customPet(rows),
      label: "Gift",
      hint: "Someone sent you this friend. Keep them?",
    };
    stage.setExtraPet(GIFT_PET_ID, gift);
    giftBar.hidden = false;
    selectPet(GIFT_PET_ID, { save: false });
  }

  function dismissGift() {
    gift = null;
    giftRows = null;
    // Puts the stage back on a built-in if the gift was the one showing.
    stage.setExtraPet(GIFT_PET_ID, null);
    giftBar.hidden = true;
    // Out of the address bar, so a reload does not offer the same pet twice.
    clearSharedRows();
  }

  el("gift-keep").addEventListener("click", () => {
    const rows = giftRows;
    if (!rows) return;
    if (custom && !window.confirm("Replace the friend you made?")) return;
    const stored = saveDrawing(rows);
    dismissGift();
    setCustomPet(rows);
    toast(stored ? "Yours now" : "Kept — but could not save");
  });

  // A link opened while the page is already loaded only changes the hash, so
  // the gift has to be picked up here as well as on boot.
  window.addEventListener("hashchange", () => {
    const rows = readSharedRows();
    if (rows) offerGift(rows);
  });

  el("gift-drop").addEventListener("click", () => {
    dismissGift();
    selectPet(getSettings().pet, { save: false });
  });

  // Pet maker --------------------------------------------------------------
  const makerOverlay = el("maker-panel");
  const makerDeleteEl = el("maker-delete");
  const makerFileEl = el("maker-file");
  const makerLinkRow = el("maker-link-row");
  const makerLinkEl = el("maker-link");
  const maker = createPetMaker({
    gridEl: el("maker-grid"),
    paletteEl: el("maker-palette"),
  });

  function openMaker() {
    // Always open on what is saved, so closing without saving really discards.
    maker.setRows(loadDrawing() || emptyDrawing());
    makerDeleteEl.hidden = !custom;
    makerLinkRow.hidden = true;
    openPanel(makerOverlay);
  }

  el("maker-clear").addEventListener("click", () => maker.clear());

  // The pet travels inside the link, so there is nothing to upload and no
  // server to keep it on.
  el("maker-share").addEventListener("click", () => {
    if (maker.blank) {
      toast("Draw something first");
      return;
    }
    const url = shareUrl(maker.rows);
    makerLinkEl.value = url;
    makerLinkRow.hidden = false;
    if (makerLinkEl.select) makerLinkEl.select();
    copyText(url).then((copied) => {
      toast(copied ? "Link copied — go show someone" : "Copy this link");
    });
  });

  makerFileEl.addEventListener("change", () => {
    const file = makerFileEl.files && makerFileEl.files[0];
    if (!file) return;
    maker
      .loadImage(file)
      .then(() => toast("Turned into pixels — tidy it up and save"))
      .catch((error) => toast(error.message))
      // Or picking the same file twice would not fire another change.
      .finally(() => {
        makerFileEl.value = "";
      });
  });

  el("maker-save").addEventListener("click", () => {
    if (maker.blank) {
      toast("Draw something first");
      return;
    }
    const rows = maker.rows;
    const stored = saveDrawing(rows);
    setCustomPet(rows);
    closePanel(makerOverlay);
    toast(stored ? "Say hello to your friend" : "Made — but could not save");
  });

  makerDeleteEl.addEventListener("click", () => {
    deleteDrawing();
    setCustomPet(null);
    maker.clear();
    closePanel(makerOverlay);
    toast("Friend put away");
  });

  // Real weather -----------------------------------------------------------
  // The scene asks what the sky is doing where you are, and follows it. It
  // never waits: the page is already drawn from the clock by the time this
  // gets an answer, and if no answer comes, that is what stays.
  function applyWeather() {
    stage.setWeather({
      wetness: wetnessNow(),
      covered: weatherState
        ? Boolean(CONDITION_COVERED[weatherState.condition])
        : false,
    });
    applyRain();
  }

  // A cached reading is published synchronously as this is constructed, which
  // is before the controls below exist. Boot applies whatever arrived; this
  // only handles what comes after.
  let booted = false;

  const weather = createWeather({
    enabled: getSettings().weather,
    coords: parseCoords(getSettings().weatherCoords),
    onChange(state) {
      weatherState = state;
      if (!booted) return;
      applyWeather();
      renderControls();
    },
  });

  // Controls ----------------------------------------------------------------
  // There used to be a settings panel here. On the Kindle the button did
  // nothing — an overlay is one more thing that can fail to open, and when it
  // fails there is no way in and no way to tell why. What survives of it are
  // the two switches worth having, sitting on the page where they cannot hide:
  // which display mode, and whether the scene follows the real sky. Everything
  // else it held (rain scene and intensity, the custom video background, the
  // 12/24 clock, a storage readout) is either gone or already elsewhere — the
  // clock toggles by tapping the clock.
  const modeButton = el("toggle-mode");
  const modeLabel = el("mode-label");
  const weatherButton = el("toggle-weather");
  const weatherLabel = el("weather-label");
  const coordsRow = el("coords-row");
  const coordsInput = el("coords");

  function renderControls() {
    const settings = getSettings();
    // The button says what tapping it will give you, not where you are. "Paper"
    // on a colour screen means "switch to Paper", which is the only reading
    // that makes sense on a device with no hover and no tooltip.
    modeLabel.textContent = mode === "paper" ? "Cozy" : "Paper";
    modeButton.setAttribute(
      "aria-label",
      mode === "paper" ? "Switch to Cozy mode" : "Switch to Paper mode",
    );

    weatherButton.setAttribute("aria-pressed", String(settings.weather));
    weatherLabel.textContent = !settings.weather
      ? "Real sky"
      : weather.state
        ? conditionLabel(weather.state.condition)
        : "Asking…";
    coordsRow.hidden = !settings.weather;
  }

  modeButton.addEventListener("click", () => {
    if (idle && idle.justWoke) return;
    // An explicit choice, not "auto". Someone reaching for this button has
    // already decided the automatic answer was wrong.
    setSetting("mode", mode === "paper" ? "cozy" : "paper");
    mode = applyMode(resolveMode());
    applyRain();
    applyStageMode();
    mascot.setState("idle", { animate: mode !== "paper" && !reduced });
    renderControls();
  });

  weatherButton.addEventListener("click", () => {
    if (idle && idle.justWoke) return;
    const next = !getSettings().weather;
    setSetting("weather", next);
    weather.setEnabled(next);
    if (!next) {
      weatherState = null;
      applyWeather();
    }
    renderControls();
    toast(next ? "Following the sky outside" : "Back to always raining");
  });

  el("coords-use").addEventListener("click", () => {
    const text = coordsInput.value.trim();
    if (!text) {
      setSetting("weatherCoords", "");
      weather.setCoords(null);
      toast("Back to asking your device");
      return;
    }
    const parsed = parseCoords(text);
    if (!parsed) {
      toast("Needs two numbers, like 51.5, -0.12");
      return;
    }
    setSetting("weatherCoords", text);
    weather.setCoords(parsed);
    toast("Looking at that sky instead");
  });

  coordsInput.value = getSettings().weatherCoords;

  // Overlays -------------------------------------------------------------

  function openPanel(panel, onOpen) {
    panel.hidden = false;
    document.body.classList.add("is-locked");
    if (onOpen) onOpen();
    const focusable = panel.querySelector("button, input, select");
    if (focusable) focusable.focus();
  }

  function closePanel(panel) {
    panel.hidden = true;
    document.body.classList.remove("is-locked");
  }

  el("close-maker").addEventListener("click", () => closePanel(makerOverlay));
  makerOverlay.addEventListener("click", (event) => {
    // Click the dimmed area, not the card, to dismiss.
    if (event.target === makerOverlay) closePanel(makerOverlay);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !makerOverlay.hidden)
      closePanel(makerOverlay);
  });

  // Idle ------------------------------------------------------------------
  // Left alone for a minute, the page stops being a page and becomes the
  // scene. Toasts are cleared on the way in so a stale "boop" is not the one
  // thing left floating over an otherwise empty screen.
  idle = createIdle({
    delay: IDLE_AFTER_MS,
    blocked: () => !makerOverlay.hidden,
    onChange(isIdle) {
      if (isIdle) toastEl.hidden = true;
    },
  });

  watchPhase((next) => {
    phase = next;
    document.documentElement.dataset.phase = next;
    stage.setPhase(next);
    applyRain();
  });

  // Boot -----------------------------------------------------------------
  booted = true;
  applyWeather();
  applyStageMode();
  renderControls();
  stage.setPhase(phase);
  setCustomPet(loadDrawing(), { select: false });
  selectPet(getSettings().pet, { save: false });
  const sharedRows = readSharedRows();
  if (sharedRows) offerGift(sharedRows);
  rain.resize();

  // The last thing that used IndexedDB was the custom backdrop, which went out
  // with the settings panel. A reader has little room to spare, so hand back
  // whatever an earlier build left behind rather than let it sit there forever.
  try {
    if (window.indexedDB) indexedDB.deleteDatabase(DEAD_DB_NAME);
  } catch {
    // Blocked, private mode, or no IndexedDB at all. Nothing depends on it.
  }

  // React to the OS flipping monochrome/reduced-motion under us.
  for (const query of ["(monochrome)", "(prefers-reduced-motion: reduce)"]) {
    try {
      const mql = matchMedia(query);
      const onChange = () => {
        mode = applyMode(resolveMode());
        applyRain();
        applyStageMode();
        renderControls();
      };
      if (mql.addEventListener) mql.addEventListener("change", onChange);
      else if (mql.addListener) mql.addListener(onChange);
    } catch {
      // Old browsers without matchMedia listeners simply stay as detected.
    }
  }
}

// Installed before main so it catches an error thrown during setup, which on
// a Kindle would otherwise be a blank page with nothing to go on.
const debug = startDebug();
try {
  main();
} catch (error) {
  if (debug) debug.fail(error);
  throw error;
}
