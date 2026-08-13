// Ticks once a minute, not once a second: seconds would force a needless
// e-ink panel refresh sixty times more often for no real benefit.

import { getSettings, setSetting } from "../settings/store.js";

export function createClock({ button, output, onChange }) {
  let timer = null;

  function format(date) {
    const { clock24 } = getSettings();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");

    if (clock24) return `${String(hours).padStart(2, "0")}:${minutes}`;

    const suffix = hours >= 12 ? "pm" : "am";
    hours = hours % 12 || 12;
    return `${hours}:${minutes}${suffix}`;
  }

  function render() {
    output.textContent = format(new Date());
  }

  function schedule() {
    clearTimeout(timer);
    const now = new Date();
    const msToNextMinute =
      (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    timer = setTimeout(() => {
      render();
      schedule();
    }, Math.max(1000, msToNextMinute));
  }

  button.addEventListener("click", () => {
    const { clock24 } = getSettings();
    setSetting("clock24", !clock24);
    render();
    if (onChange) onChange();
  });

  render();
  schedule();

  return { render };
}
