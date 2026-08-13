// Canvas pixel rain.
//
// One requestAnimationFrame loop, throttled to the mode's target fps. Droplets
// live in a fixed-size pool so there is no allocation churn during playback.
// Everything snaps to an 8px grid, which is what makes it read as pixel art
// rather than as thin vector lines.

import { TUNING } from "../config.js";
import { getScene } from "./scenes.js";

const SPARKLE_SHAPES = {
  heart: [
    [0, 0],
    [2, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
    [2, 1],
    [3, 1],
    [0, 2],
    [1, 2],
    [2, 2],
    [1, 3],
  ],
  star: [
    [1, 0],
    [0, 1],
    [1, 1],
    [2, 1],
    [1, 2],
  ],
};

export function createRain(canvas) {
  const ctx = canvas.getContext("2d", { alpha: true });

  let mode = "cozy";
  let tuning = TUNING.cozy;
  let scene = getScene("drizzle");
  let intensity = 1;
  let reactive = true;
  let frozen = false;
  let enabled = true;

  let width = 0;
  let height = 0;
  let cell = tuning.cell;
  let columns = 0;
  let rows = 0;

  let drops = [];
  let splashes = [];
  let settled = null; // per-column settled height, in cells
  let flashUntil = 0;

  let levels = { bass: 0, mid: 0, treble: 0 };
  let rafId = null;
  let lastFrame = 0;
  let lastTick = 0;
  let spawnCarry = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const cssWidth = Math.max(1, Math.floor(rect.width || window.innerWidth));
    const cssHeight = Math.max(1, Math.floor(rect.height || window.innerHeight));

    // Cap the backing store at 1x on Paper mode: the extra pixels cost CPU and
    // an e-ink panel cannot show them anyway.
    const dpr =
      mode === "paper" ? 1 : Math.min(2, window.devicePixelRatio || 1);

    width = cssWidth;
    height = cssHeight;
    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;

    cell = tuning.cell;
    columns = Math.max(1, Math.ceil(width / cell));
    rows = Math.max(1, Math.ceil(height / cell));
    settled = new Uint16Array(columns);
    drops = [];
    splashes = [];
    draw();
  }

  function spawn() {
    if (drops.length >= tuning.maxDrops) return;
    const layer = Math.floor(Math.random() * tuning.layers);
    // Nearer layers fall faster and draw more opaquely.
    const depth = tuning.layers === 1 ? 1 : 1 - layer / tuning.layers;
    const speed = rand(scene.speed[0], scene.speed[1]) * (0.55 + depth * 0.65);
    const rising = speed < 0;

    let sparkle = null;
    if (tuning.sparkleChance > 0 && Math.random() < tuning.sparkleChance) {
      sparkle = Math.random() < 0.5 ? "heart" : "star";
    }

    drops.push({
      col: Math.floor(Math.random() * columns),
      y: rising ? rows + 1 : -rand(1, 4),
      speed,
      drift: rand(scene.drift[0], scene.drift[1]),
      driftAcc: 0,
      length: Math.round(rand(scene.length[0], scene.length[1])),
      layer,
      depth,
      sparkle,
      flash: 0,
    });
  }

  function update(dt) {
    // Audio nudges the rain: bass on fall speed, mids on spawn rate.
    const bass = reactive ? levels.bass : 0;
    const mid = reactive ? levels.mid : 0;
    const speedScale = 1 + bass * 0.8;
    const spawnScale = intensity * (1 + mid * 1.1);

    spawnCarry += scene.spawn * spawnScale * dt;
    while (spawnCarry >= 1) {
      spawn();
      spawnCarry -= 1;
    }

    if (reactive && levels.treble > 0.72 && drops.length) {
      const victim = drops[Math.floor(Math.random() * drops.length)];
      victim.flash = 0.18;
    }

    for (let i = drops.length - 1; i >= 0; i -= 1) {
      const drop = drops[i];
      drop.y += drop.speed * speedScale * dt;
      drop.driftAcc += drop.drift * dt;
      if (Math.abs(drop.driftAcc) >= 1) {
        const step = Math.trunc(drop.driftAcc);
        drop.col = wrap(drop.col + step, columns);
        drop.driftAcc -= step;
      }
      if (drop.flash > 0) drop.flash -= dt;

      const floor = rows - (settled ? settled[drop.col] : 0);
      const rising = drop.speed < 0;

      if (rising) {
        if (drop.y + drop.length < 0) drops.splice(i, 1);
        continue;
      }

      if (drop.y >= floor) {
        if (scene.settle && settled && settled[drop.col] < rows - 2) {
          settled[drop.col] += 1;
        } else if (scene.splash && tuning.splash) {
          splashes.push({ col: drop.col, y: floor, life: 0.18 });
        }
        drops.splice(i, 1);
      }
    }

    for (let i = splashes.length - 1; i >= 0; i -= 1) {
      splashes[i].life -= dt;
      if (splashes[i].life <= 0) splashes.splice(i, 1);
    }

    if (scene.flash && mode !== "paper" && Math.random() < dt * 0.08) {
      flashUntil = performance.now() + 90;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    if (scene.background && mode !== "paper") {
      ctx.fillStyle = scene.background;
      ctx.fillRect(0, 0, width, height);
    }

    if (flashUntil > performance.now()) {
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillRect(0, 0, width, height);
    }

    const paper = mode === "paper";

    for (const drop of drops) {
      const x = drop.col * cell;
      const y = Math.floor(drop.y) * cell;

      if (drop.sparkle) {
        ctx.fillStyle = paper ? "#000" : scene.colors[0];
        for (const [dx, dy] of SPARKLE_SHAPES[drop.sparkle]) {
          ctx.fillRect(x + dx * cell * 0.5, y + dy * cell * 0.5, cell * 0.5, cell * 0.5);
        }
        continue;
      }

      if (drop.flash > 0 && !paper) {
        ctx.fillStyle = "#FFFFFF";
      } else if (paper) {
        ctx.fillStyle = "#000000";
      } else {
        ctx.fillStyle = scene.colors[drop.layer % scene.colors.length];
        ctx.globalAlpha = 0.45 + drop.depth * 0.55;
      }

      const w = cell * (scene.width || 1);
      if (scene.shape === "petal") {
        // Two offset cells read as a tumbling petal.
        ctx.fillRect(x, y, cell, cell);
        ctx.fillRect(x + cell, y + cell, cell, cell);
      } else {
        ctx.fillRect(x, y, w, cell * drop.length);
      }
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = paper ? "#000000" : scene.colors[0];

    for (const splash of splashes) {
      const x = splash.col * cell;
      const y = splash.y * cell;
      ctx.fillRect(x - cell, y, cell, cell);
      ctx.fillRect(x + cell, y, cell, cell);
    }

    if (scene.settle && settled) {
      for (let col = 0; col < columns; col += 1) {
        const stack = settled[col];
        if (!stack) continue;
        ctx.fillStyle = paper ? "#000000" : scene.colors[2] || scene.colors[0];
        ctx.fillRect(col * cell, (rows - stack) * cell, cell, stack * cell);
      }
    }
  }

  function frame(now) {
    rafId = requestAnimationFrame(frame);
    if (!enabled) return;

    const interval = 1000 / tuning.fps;
    if (now - lastFrame < interval) return;
    lastFrame = now;

    // Clamp dt so a backgrounded tab does not teleport every droplet on return.
    const dt = Math.min(0.25, (now - lastTick) / 1000 || interval / 1000);
    lastTick = now;

    update(dt);
    draw();
  }

  function start() {
    if (rafId !== null) return;
    lastTick = performance.now();
    lastFrame = 0;
    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    if (rafId === null) return;
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  function renderStill() {
    // A single populated frame, so a frozen backdrop still looks intentional.
    drops = [];
    splashes = [];
    const target = Math.min(tuning.maxDrops, Math.floor(columns * 0.6));
    for (let i = 0; i < target; i += 1) {
      spawn();
      const drop = drops[drops.length - 1];
      if (drop) drop.y = Math.random() * rows;
    }
    draw();
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else if (!frozen && enabled) start();
  });

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  return {
    resize,
    setMode(next) {
      mode = next;
      tuning = TUNING[next] || TUNING.cozy;
      resize();
    },
    setScene(name) {
      scene = getScene(name);
      if (settled) settled.fill(0);
      drops = [];
      splashes = [];
      if (frozen) renderStill();
    },
    setIntensity(value) {
      intensity = value;
    },
    setReactive(value) {
      reactive = value;
      if (!value) levels = { bass: 0, mid: 0, treble: 0 };
    },
    setLevels(next) {
      levels = next;
    },
    setEnabled(value) {
      enabled = value;
      if (!value) {
        stop();
        ctx.clearRect(0, 0, width, height);
      } else if (frozen) {
        renderStill();
      } else {
        start();
      }
    },
    freeze(value) {
      frozen = value;
      if (value) {
        stop();
        renderStill();
      } else if (enabled) {
        start();
      }
    },
    start,
    stop,
    get scene() {
      return scene;
    },
  };
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function wrap(value, size) {
  return ((value % size) + size) % size;
}
