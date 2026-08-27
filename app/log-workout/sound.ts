/**
 * Combat Frame sound effects — synthesized via Web Audio, no audio files.
 * Ported from the interactive prototype (see RestCombatSpec.md, Part 2).
 *
 * One AudioContext + one master GainNode, created lazily on the first real
 * user gesture of the session (unlockAudio() — call this from inside a click
 * handler, never on page load; browsers block autoplay and iOS specifically
 * requires the unlock inside a gesture). The Sound toggle is a single gain
 * ramp on the master node rather than a conditional at every call site.
 *
 * Every function is defensive (try/catch, silent no-op) — a missing/blocked
 * AudioContext (Safari private mode, an old browser) must never break
 * logging a set. This module has no React dependency and is only ever
 * called imperatively from event handlers, never at module scope or during
 * render, so there's no SSR hazard.
 */

type AudioEngine = {
  ctx: AudioContext | null
  master: GainNode | null
}

const engine: AudioEngine = { ctx: null, master: null }
let enabled = true

export function unlockAudio(): void {
  if (engine.ctx) return
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext
    engine.ctx = new Ctx()
    engine.master = engine.ctx.createGain()
    engine.master.gain.value = enabled ? 0.9 : 0
    engine.master.connect(engine.ctx.destination)
  } catch {
    // no-op — sound is progressive enhancement, never load-bearing
  }
}

export function setSoundEnabled(on: boolean): void {
  enabled = on
  if (!engine.ctx || !engine.master) return
  try {
    const g = engine.master.gain
    g.cancelScheduledValues(engine.ctx.currentTime)
    g.linearRampToValueAtTime(on ? 0.9 : 0, engine.ctx.currentTime + 0.05)
  } catch {
    // no-op
  }
}

function tone(freq: number, offset: number, duration: number, type: OscillatorType, peakGain: number): void {
  if (!engine.ctx || !engine.master) return
  try {
    const ctx = engine.ctx
    const t0 = ctx.currentTime + offset
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t0)
    gain.gain.setValueAtTime(0.0001, t0)
    gain.gain.exponentialRampToValueAtTime(peakGain, t0 + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
    osc.connect(gain).connect(engine.master)
    osc.start(t0)
    osc.stop(t0 + duration + 0.02)
  } catch {
    // no-op
  }
}

/** Every logged set — the audio twin of the +XP float. Plays regardless of Combat Mode. */
export function playTick(): void {
  tone(1100, 0, 0.09, 'sine', 0.18)
}

/** Boss assigned — first hit of the session. */
export function playEngage(): void {
  tone(196, 0, 0.18, 'sawtooth', 0.1)
  tone(233.08, 0.09, 0.22, 'sawtooth', 0.12)
}

/** Normal hit vs. a heavy hit (>~12% of bossHpMax in one set). */
export function playHit(heavy: boolean): void {
  if (heavy) {
    tone(140, 0, 0.22, 'sine', 0.38)
    tone(320, 0, 0.12, 'triangle', 0.2)
  } else {
    tone(240, 0, 0.1, 'triangle', 0.2)
  }
}

/** The killing blow — hit thud, then an ascending triad. The one moment allowed to sound triumphant. */
export function playKillSequence(heavy: boolean): void {
  playHit(heavy)
  const koOffset = 0.16
  tone(523.25, koOffset, 0.16, 'triangle', 0.26)
  tone(659.25, koOffset + 0.1, 0.16, 'triangle', 0.26)
  tone(783.99, koOffset + 0.2, 0.32, 'triangle', 0.28)
}

/** Damage landed after the boss is already dead — quiet and muted on purpose. */
export function playOverkill(): void {
  tone(180, 0, 0.08, 'sine', 0.1)
}

/** Ending the session with the boss alive. Gentle — an escape must not sound like a penalty. */
export function playEscape(): void {
  tone(392, 0, 0.22, 'sine', 0.15)
  tone(311.13, 0.14, 0.3, 'sine', 0.13)
}

export function vibrate(pattern: number | number[]): void {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern)
  } catch {
    // no-op — silently no-ops on iOS Safari regardless
  }
}
