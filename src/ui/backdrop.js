// Custom video/GIF backdrop.
//
// Cozy mode only: a looping video on an e-ink panel is a slideshow that eats
// battery, so Paper mode falls back to the canvas rain and Settings says so.

import { getBackground, saveBackground, deleteBackground, requestPersistence } from "../media/store.js";

const MAX_BYTES = 60 * 1024 * 1024;

export function createBackdrop({ mediaEl, scrimEl }) {
  let objectUrl = null;
  let record = null;

  function clearElement() {
    mediaEl.innerHTML = "";
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
  }

  function paint({ enabled, scrim, mode }) {
    scrimEl.style.opacity = String(enabled && record ? scrim : 0);

    if (!record || !enabled || mode === "paper") {
      clearElement();
      return;
    }

    clearElement();
    objectUrl = URL.createObjectURL(record.blob);

    if ((record.mime || "").startsWith("video/")) {
      const video = document.createElement("video");
      video.src = objectUrl;
      video.loop = true;
      video.muted = true; // required for autoplay, and we have our own audio
      video.autoplay = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.addEventListener("error", () => clearElement());
      mediaEl.appendChild(video);
      const attempt = video.play();
      if (attempt && typeof attempt.catch === "function") {
        // Blocked autoplay leaves a still first frame, which is fine.
        attempt.catch(() => {});
      }
    } else {
      const img = document.createElement("img");
      img.src = objectUrl;
      img.alt = "";
      mediaEl.appendChild(img);
    }
  }

  return {
    async load() {
      try {
        record = (await getBackground()) || null;
      } catch {
        record = null;
      }
      return record;
    },
    get record() {
      return record;
    },
    apply: paint,
    async set(file) {
      if (!file) return { ok: false, reason: "no file" };
      const isVideo = (file.type || "").startsWith("video/");
      const isGif = file.type === "image/gif";
      if (!isVideo && !isGif) {
        return { ok: false, reason: "Only video files or GIFs, sorry" };
      }
      if (file.size > MAX_BYTES) {
        return { ok: false, reason: "That file is over 60MB — try a smaller clip" };
      }
      await requestPersistence();
      record = await saveBackground({
        name: file.name || "background",
        mime: file.type,
        size: file.size || 0,
        addedAt: Date.now(),
        blob: file,
      });
      return { ok: true };
    },
    async remove() {
      await deleteBackground();
      record = null;
      clearElement();
      scrimEl.style.opacity = "0";
    },
  };
}
