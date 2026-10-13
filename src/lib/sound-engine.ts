"use client";

// Sound engine for alarm notifications.
// Uses Web Audio API to synthesize distinct tones — no audio files needed.
// Each event type (entry/SL/TP/custom) gets a distinct tone pattern.

export type AlarmSoundType = "entry" | "stopLoss" | "takeProfit" | "custom" | "error";

interface SoundProfile {
  freqs: number[];        // frequencies in Hz to play in sequence
  duration: number;       // ms per tone
  gap: number;            // ms gap between tones
  waveform: OscillatorType;
}

const SOUND_PROFILES: Record<AlarmSoundType, SoundProfile> = {
  // Entry hit: ascending two-tone (alert + confirm)
  entry: {
    freqs: [523.25, 659.25, 783.99], // C5, E5, G5 — major triad ascending
    duration: 180,
    gap: 60,
    waveform: "sine",
  },
  // Stop loss hit: harsh descending tone (alarm)
  stopLoss: {
    freqs: [440, 349.23, 261.63], // A4, F4, C4 — descending
    duration: 250,
    gap: 80,
    waveform: "sawtooth",
  },
  // Take profit hit: bright ascending arpeggio (celebration)
  takeProfit: {
    freqs: [523.25, 659.25, 783.99, 1046.5], // C5, E5, G5, C6 — full octave arpeggio
    duration: 150,
    gap: 50,
    waveform: "triangle",
  },
  // Custom price alert: gentle chime
  custom: {
    freqs: [659.25, 880], // E5, A5 — perfect fifth
    duration: 220,
    gap: 100,
    waveform: "sine",
  },
  // Error: low buzz
  error: {
    freqs: [220, 220, 220],
    duration: 100,
    gap: 80,
    waveform: "square",
  },
};

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtx = new Ctx();
    } catch {
      return null;
    }
  }
  // Resume if suspended (browsers require user gesture)
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Play a synthesized alarm tone.
 * @param type which event triggered the sound
 * @param volume 0..1 (default 0.5)
 */
export function playAlarmSound(
  type: AlarmSoundType,
  volume: number = 0.5
): Promise<void> {
  return new Promise((resolve) => {
    const ctx = getAudioContext();
    if (!ctx) {
      resolve();
      return;
    }
    const profile = SOUND_PROFILES[type];
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.value = volume;
    masterGain.connect(ctx.destination);

    let t = now;
    profile.freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = profile.waveform;
      osc.frequency.value = freq;

      // Envelope: quick attack, sustain, quick release
      const dur = profile.duration / 1000;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(1, t + 0.01);
      gain.gain.linearRampToValueAtTime(0.7, t + dur * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + dur);

      t += dur + profile.gap / 1000;
      // Unused index var to satisfy lint
      void i;
    });

    // Resolve when last tone finishes
    const totalMs = (profile.freqs.length * (profile.duration + profile.gap));
    window.setTimeout(() => resolve(), totalMs);
  });
}

/** Test the sound system (used by settings panel). */
export async function testSound(type: AlarmSoundType): Promise<void> {
  await playAlarmSound(type, 0.6);
}

/** Pre-warm the audio context (call on first user gesture). */
export function primeAudioContext(): void {
  getAudioContext();
}
