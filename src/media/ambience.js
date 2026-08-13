// Built-in rain sounds, generated rather than downloaded.
//
// Every one of these is filtered noise: a couple of seconds of white noise on
// a loop, shaped by filters and a slow gain wobble so it never sounds like a
// stuck sample. That buys us a whole shelf of ambience for about 3KB, with no
// files to sideload, no licence to honour, and nothing to fetch when the
// Kindle is offline — which is most of the time.

const NOISE_SECONDS = 3;

// Each preset is data: filter shape, how much it breathes, and what kind of
// one-off events (thunder rumbles, fire crackles) sit on top.
export const AMBIENCES = {
  drizzle: {
    label: "Gentle rain",
    emoji: "🌧",
    hint: "Soft, steady, on a window.",
    lowpass: 2400,
    highpass: 500,
    gain: 0.5,
    breathe: { depth: 0.16, seconds: 11 },
    thunder: 0,
    crackle: 0,
  },
  downpour: {
    label: "Big storm",
    emoji: "⛈",
    hint: "Heavy rain, with far-off thunder.",
    lowpass: 5200,
    highpass: 260,
    gain: 0.72,
    breathe: { depth: 0.24, seconds: 7 },
    thunder: 0.04, // chance per second
    crackle: 0,
  },
  ocean: {
    label: "Seaside",
    emoji: "🌊",
    hint: "Long waves, slow and low.",
    lowpass: 900,
    highpass: 90,
    gain: 0.62,
    breathe: { depth: 0.72, seconds: 13 },
    thunder: 0,
    crackle: 0,
  },
  creek: {
    label: "Little creek",
    emoji: "💧",
    hint: "Water over stones, bright and busy.",
    lowpass: 7000,
    highpass: 1400,
    gain: 0.4,
    breathe: { depth: 0.1, seconds: 5 },
    thunder: 0,
    crackle: 0,
  },
  fire: {
    label: "Fireplace",
    emoji: "🔥",
    hint: "Low roar and the odd pop.",
    lowpass: 1100,
    highpass: 60,
    gain: 0.5,
    breathe: { depth: 0.3, seconds: 4 },
    thunder: 0,
    crackle: 2.6, // pops per second
  },
};

export const AMBIENCE_ORDER = ["drizzle", "downpour", "ocean", "creek", "fire"];

function fillNoise(buffer) {
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    let last = 0;
    for (let i = 0; i < data.length; i += 1) {
      // Slightly brown-tinted noise: pure white is hissy and fatiguing, and
      // real rain has more energy down low.
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
  }
}

/**
 * @param {(state: {id: string, playing: boolean, volume: number}) => void} onState
 */
export function createAmbience({ onState }) {
  let context = null;
  let noiseBuffer = null;
  let master = null;
  let analyser = null;
  let analyserData = null;
  let nodes = null; // the currently sounding graph
  let currentId = "";
  let volume = 0.6;
  let eventTimer = null;
  let failed = false;

  function emit() {
    onState({ id: currentId, playing: Boolean(nodes), volume });
  }

  // Built on the first tap, not at load: a context created before a user
  // gesture starts suspended and some browsers never let it recover.
  function ensure() {
    if (context) return true;
    if (failed) return false;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) throw new Error("no WebAudio");
      context = new Ctx();

      noiseBuffer = context.createBuffer(
        1,
        context.sampleRate * NOISE_SECONDS,
        context.sampleRate,
      );
      fillNoise(noiseBuffer);

      master = context.createGain();
      master.gain.value = volume;

      analyser = context.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.85;
      analyserData = new Uint8Array(analyser.frequencyBinCount);

      master.connect(analyser);
      master.connect(context.destination);
      return true;
    } catch {
      // Ambience is decorative. If WebAudio is missing we simply offer none.
      failed = true;
      context = null;
      return false;
    }
  }

  function buildGraph(preset) {
    const source = context.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    const highpass = context.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = preset.highpass;

    const lowpass = context.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = preset.lowpass;

    const gain = context.createGain();
    gain.gain.value = 0;

    // The slow swell that keeps a loop from sounding like a loop.
    const lfo = context.createOscillator();
    lfo.frequency.value = 1 / preset.breathe.seconds;
    const lfoGain = context.createGain();
    lfoGain.gain.value = preset.gain * preset.breathe.depth;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);

    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(master);

    source.start();
    lfo.start();

    // Fade in: an abrupt start of broadband noise sounds like a fault.
    const now = context.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(preset.gain, now + 1.2);

    return { source, gain, lfo, preset };
  }

  // Thunder and fire pops are the same trick: a short noise burst through a
  // steep filter, with an envelope that decides whether it reads as a distant
  // rumble or a nearby crack.
  function burst({ duration, frequency, peak, type = "lowpass" }) {
    const source = context.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    const filter = context.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;

    const gain = context.createGain();
    const now = context.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peak, now + duration * 0.18);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(now);
    source.stop(now + duration + 0.05);
  }

  function scheduleEvents() {
    clearInterval(eventTimer);
    if (!nodes) return;
    const { preset } = nodes;
    if (!preset.thunder && !preset.crackle) return;

    eventTimer = setInterval(() => {
      if (!nodes || !context) return;
      if (preset.thunder && Math.random() < preset.thunder) {
        burst({
          duration: 2.5 + Math.random() * 2,
          frequency: 120 + Math.random() * 140,
          peak: 0.5 + Math.random() * 0.4,
        });
      }
      if (preset.crackle && Math.random() < preset.crackle) {
        burst({
          duration: 0.05 + Math.random() * 0.08,
          frequency: 1800 + Math.random() * 2600,
          peak: 0.12 + Math.random() * 0.2,
          type: "bandpass",
        });
      }
    }, 1000);
  }

  function stopGraph({ fade = true } = {}) {
    clearInterval(eventTimer);
    eventTimer = null;
    if (!nodes) return;
    const { source, gain, lfo } = nodes;
    nodes = null;

    if (!fade) {
      try {
        source.stop();
        lfo.stop();
      } catch {
        // Already stopped.
      }
      return;
    }

    const now = context.currentTime;
    const stopAt = now + 0.6;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0.0001, stopAt);
    try {
      source.stop(stopAt + 0.05);
      lfo.stop(stopAt + 0.05);
    } catch {
      // Some old implementations refuse a scheduled stop; the fade still holds.
    }
  }

  return {
    get id() {
      return currentId;
    },
    get playing() {
      return Boolean(nodes);
    },
    /** Tapping the sound that is already playing turns it off. */
    toggle(id) {
      const preset = AMBIENCES[id];
      if (!preset) return;

      if (currentId === id && nodes) {
        stopGraph();
        currentId = "";
        emit();
        return;
      }
      if (!ensure()) {
        currentId = "";
        emit();
        return;
      }
      if (context.state === "suspended") context.resume().catch(() => {});

      stopGraph();
      currentId = id;
      nodes = buildGraph(preset);
      scheduleEvents();
      emit();
    },
    stop() {
      stopGraph();
      currentId = "";
      emit();
    },
    setVolume(value) {
      volume = Math.max(0, Math.min(1, value));
      if (master && context) {
        master.gain.setTargetAtTime(volume, context.currentTime, 0.05);
      }
      emit();
    },
    get volume() {
      return volume;
    },
    /** Same three-band shape the music analyser returns, so the rain can
        take either source without caring which is playing. */
    read() {
      if (!nodes || !analyser || !analyserData) {
        return { bass: 0, mid: 0, treble: 0 };
      }
      analyser.getByteFrequencyData(analyserData);
      const third = Math.floor(analyserData.length / 3);
      const average = (from, to) => {
        let total = 0;
        for (let i = from; i < to; i += 1) total += analyserData[i];
        return total / Math.max(1, to - from) / 255;
      };
      return {
        bass: average(0, third),
        mid: average(third, third * 2),
        treble: average(third * 2, analyserData.length),
      };
    },
  };
}
