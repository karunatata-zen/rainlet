// Settings panel. Rebuilt from scratch on every open, which is cheaper to
// reason about than patching a dozen controls in place, and there is no save
// button: each control writes immediately and the change applies live.

import { SCENES, SCENE_ORDER } from "../rain/scenes.js";
import { getSettings, setSetting } from "./store.js";
import { estimateUsage } from "../media/store.js";
import { detectMode } from "../display-mode.js";
import { APP_NAME, BACKGROUND_MIME_HINT } from "../config.js";

const BYTE_UNITS = ["B", "KB", "MB", "GB"];

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  // Whole numbers past kilobytes: "148 MB" is easier to read than "148.3 MB".
  return `${value < 10 && unit > 0 ? value.toFixed(1) : Math.round(value)} ${BYTE_UNITS[unit]}`;
}

function field(label, hint) {
  const wrap = document.createElement("div");
  wrap.className = "field";

  const labelEl = document.createElement("span");
  labelEl.className = "field__label";
  labelEl.textContent = label;
  wrap.appendChild(labelEl);

  if (hint) {
    const hintEl = document.createElement("span");
    hintEl.className = "field__hint";
    hintEl.textContent = hint;
    wrap.appendChild(hintEl);
  }
  return wrap;
}

function segmented(options, value, onPick) {
  const row = document.createElement("div");
  row.className = "segmented";
  for (const option of options) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = option.label;
    button.setAttribute("aria-pressed", String(option.value === value));
    button.addEventListener("click", () => onPick(option.value));
    row.appendChild(button);
  }
  return row;
}

function toggle(label, checked, onChange) {
  const wrap = document.createElement("label");
  wrap.className = "switch";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = checked;
  input.addEventListener("change", () => onChange(input.checked));
  wrap.appendChild(input);
  const text = document.createElement("span");
  text.textContent = label;
  wrap.appendChild(text);
  return wrap;
}

function slider({ min, max, step, value, onInput, ariaLabel }) {
  const input = document.createElement("input");
  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.setAttribute("aria-label", ariaLabel);
  input.addEventListener("input", () => onInput(Number(input.value)));
  return input;
}

export function createSettingsPanel({ bodyEl, aboutEl, backdrop, onChange, onToast, getMode }) {
  async function render() {
    const settings = getSettings();
    const mode = getMode();
    bodyEl.innerHTML = "";

    // Display mode ------------------------------------------------------
    const modeField = field(
      "Display mode",
      settings.mode === "auto"
        ? `Auto — detected ${detectMode() === "paper" ? "an e-reader (Paper)" : "a colour screen (Cozy)"}`
        : "Manual override",
    );
    modeField.appendChild(
      segmented(
        [
          { label: "Auto", value: "auto" },
          { label: "Cozy", value: "cozy" },
          { label: "Paper", value: "paper" },
        ],
        settings.mode,
        (value) => {
          setSetting("mode", value);
          onChange();
          render();
        },
      ),
    );
    bodyEl.appendChild(modeField);

    // Rain scene --------------------------------------------------------
    const sceneField = field("Rain scene", SCENES[settings.scene].hint);
    const select = document.createElement("select");
    for (const id of SCENE_ORDER) {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = SCENES[id].label;
      option.selected = id === settings.scene;
      select.appendChild(option);
    }
    select.addEventListener("change", () => {
      setSetting("scene", select.value);
      onChange();
      render();
    });
    sceneField.appendChild(select);
    bodyEl.appendChild(sceneField);

    // Intensity ---------------------------------------------------------
    const intensityField = field(
      "Rain intensity",
      `${Math.round(settings.intensity * 100)}% of the scene's normal density`,
    );
    intensityField.appendChild(
      slider({
        min: 0.25,
        max: 2,
        step: 0.25,
        value: settings.intensity,
        ariaLabel: "Rain intensity",
        onInput: (value) => {
          setSetting("intensity", value);
          onChange();
        },
      }),
    );
    bodyEl.appendChild(intensityField);

    // Reactivity --------------------------------------------------------
    const reactiveField = field(
      "Sound reactivity",
      mode === "paper"
        ? "Off in Paper mode — e-ink cannot keep up with the sound."
        : "The rain moves with whichever rain sound is playing.",
    );
    reactiveField.appendChild(
      toggle("React to the rain sounds", settings.reactive, (value) => {
        setSetting("reactive", value);
        onChange();
        render();
      }),
    );
    bodyEl.appendChild(reactiveField);

    // Custom background -------------------------------------------------
    const bgRecord = backdrop.record;
    const bgField = field(
      "Custom background",
      mode === "paper"
        ? "Cozy mode only — Paper mode keeps the canvas rain instead."
        : "A looping video or GIF behind everything. Stays on your device.",
    );

    const bgRow = document.createElement("div");
    bgRow.className = "field__row";

    const pick = document.createElement("button");
    pick.type = "button";
    pick.className = "btn";
    pick.textContent = bgRecord ? "Replace file" : "Choose file";
    const bgInput = document.createElement("input");
    bgInput.type = "file";
    bgInput.accept = BACKGROUND_MIME_HINT;
    bgInput.className = "visually-hidden";
    bgInput.addEventListener("change", async () => {
      const file = bgInput.files && bgInput.files[0];
      const result = await backdrop.set(file);
      bgInput.value = "";
      if (!result.ok) {
        onToast(result.reason);
        return;
      }
      setSetting("bgEnabled", true);
      onChange();
      onToast("Background saved");
      render();
    });
    pick.addEventListener("click", () => bgInput.click());
    bgRow.appendChild(pick);
    bgRow.appendChild(bgInput);

    if (bgRecord) {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "btn btn--quiet";
      remove.textContent = "Remove";
      remove.addEventListener("click", async () => {
        await backdrop.remove();
        setSetting("bgEnabled", false);
        onChange();
        onToast("Background removed");
        render();
      });
      bgRow.appendChild(remove);
    }
    bgField.appendChild(bgRow);

    if (bgRecord) {
      const name = document.createElement("span");
      name.className = "field__hint";
      name.textContent = `${bgRecord.name} · ${formatBytes(bgRecord.size)}`;
      bgField.appendChild(name);

      bgField.appendChild(
        toggle("Show background", settings.bgEnabled, (value) => {
          setSetting("bgEnabled", value);
          onChange();
          render();
        }),
      );
      bgField.appendChild(
        toggle("Keep rain on top", settings.bgRainOverlay, (value) => {
          setSetting("bgRainOverlay", value);
          onChange();
        }),
      );

      const scrimLabel = document.createElement("span");
      scrimLabel.className = "field__hint";
      scrimLabel.textContent = `Dim behind text: ${Math.round(settings.bgScrim * 100)}%`;
      bgField.appendChild(scrimLabel);
      bgField.appendChild(
        slider({
          min: 0,
          max: 0.9,
          step: 0.05,
          value: settings.bgScrim,
          ariaLabel: "Background dimming",
          onInput: (value) => {
            setSetting("bgScrim", value);
            scrimLabel.textContent = `Dim behind text: ${Math.round(value * 100)}%`;
            onChange();
          },
        }),
      );
    }
    bodyEl.appendChild(bgField);

    // Clock -------------------------------------------------------------
    const clockField = field("Clock");
    clockField.appendChild(
      segmented(
        [
          { label: "24 hour", value: true },
          { label: "12 hour", value: false },
        ],
        settings.clock24,
        (value) => {
          setSetting("clock24", value);
          onChange();
          render();
        },
      ),
    );
    bodyEl.appendChild(clockField);

    // Storage -----------------------------------------------------------
    const storageField = field("Storage", "Checking…");
    bodyEl.appendChild(storageField);
    const storageHint = storageField.querySelector(".field__hint");
    const { usage, quota, ratio } = await estimateUsage();
    if (!quota) {
      storageHint.textContent =
        "This browser will not report a quota. Rainlet only stores your settings and, if you added one, your background file.";
    } else {
      storageHint.textContent = `${formatBytes(usage)} of about ${formatBytes(quota)} used (${Math.round(ratio * 100)}%). Only your settings and your background file live here — keep the original.`;
      if (ratio > 0.8) {
        storageHint.textContent += " Running low: try a smaller background.";
      }
    }

    aboutEl.textContent = `${APP_NAME} · everything stays on this device`;
  }

  return { render };
}
