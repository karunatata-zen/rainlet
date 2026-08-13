// A readout for a device I cannot open developer tools on.
//
// The Kindle's browser has no console, no inspector and no way to report a
// failure, so when something works here and not there the only honest options
// are guessing or asking the device. Open the site with ?debug on the end and
// it prints what it actually is — size, pixel ratio, which modern CSS it
// understands — plus any error that killed the script, which would otherwise
// leave a blank page and no explanation.
//
// Deliberately dependency-free and built with the oldest DOM calls available,
// because it has to survive whatever broke everything else.

function supportsCss(property, value) {
  try {
    if (window.CSS && window.CSS.supports)
      return window.CSS.supports(property, value);
  } catch (error) {
    return "?";
  }
  // No CSS.supports means a browser old enough that the answer is probably no.
  return "?";
}

export function startDebug() {
  if (window.location.search.indexOf("debug") === -1) return null;

  const box = document.createElement("pre");
  box.style.cssText =
    "margin:0;padding:8px;background:#fff;color:#000;border-bottom:2px solid #000;" +
    "font:12px/1.4 monospace;white-space:pre-wrap;word-break:break-all;position:relative;z-index:99";
  const lines = [];

  function draw() {
    box.textContent = lines.join("\n");
  }

  function add(line) {
    lines.push(line);
    draw();
  }

  function place() {
    if (document.body && !box.parentNode) {
      document.body.insertBefore(box, document.body.firstChild);
    }
  }

  add("rainlet debug");
  add(
    "window " +
      window.innerWidth +
      "x" +
      window.innerHeight +
      "  screen " +
      (window.screen ? window.screen.width + "x" + window.screen.height : "?") +
      "  dpr " +
      (window.devicePixelRatio || 1),
  );
  add(
    "css  inset:" +
      supportsCss("inset", "0") +
      "  aspect-ratio:" +
      supportsCss("aspect-ratio", "5/4") +
      "  flex-gap:" +
      supportsCss("gap", "1px") +
      "  vh:" +
      supportsCss("height", "50vh"),
  );
  add("ua " + navigator.userAgent);

  // The important one. A script error on this device is otherwise invisible.
  window.onerror = function (message, source, line) {
    place();
    add(
      "ERROR " + message + " @ " + String(source).split("/").pop() + ":" + line,
    );
    return false;
  };

  if (document.body) place();
  else document.addEventListener("DOMContentLoaded", place);

  return {
    note: add,
    fail(error) {
      place();
      add("FAILED " + (error && error.message ? error.message : String(error)));
    },
  };
}
