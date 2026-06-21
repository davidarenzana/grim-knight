import { bus } from '@shared/events'
import type { SoundName } from '@core/app'

/**
 * Tiny procedural audio engine (Web Audio) — an output adapter. All SFX and the
 * background music are synthesized at runtime, so the game ships no audio files
 * (and stays "original IP, no external assets"). The app talks to it only
 * through `playSfx`/`startMusic`/`stopMusic` and the `ui:audio` bus command for
 * the on/off toggle.
 *
 * The AudioContext is created lazily on the first sound (browsers require a user
 * gesture — the first play happens after the START click), and a master gain
 * node implements mute.
 */

let ctx: AudioContext | null = null
let master: GainNode | null = null
let muted = false
const VOLUME = 0.4

// Keep the mute flag in sync even before the context exists (the store emits the
// persisted preference at boot, possibly before the first gesture).
bus.on('ui:audio', (e) => setMuted(!e.on))

const ensure = (): AudioContext | null => {
  if (typeof window === 'undefined' || !window.AudioContext) return null
  if (!ctx) {
    ctx = new window.AudioContext()
    master = ctx.createGain()
    master.gain.value = muted ? 0 : VOLUME
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export const setMuted = (m: boolean): void => {
  muted = m
  if (ctx && master) master.gain.setTargetAtTime(m ? 0 : VOLUME, ctx.currentTime, 0.015)
}

/** A short oscillator note with a quick attack + exponential decay envelope. */
const tone = (
  freq: number,
  dur: number,
  type: OscillatorType,
  vol = 0.4,
  slideTo?: number,
  delay = 0,
): void => {
  const c = ctx
  if (!c || !master) return
  const t = c.currentTime + delay
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.006)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g)
  g.connect(master)
  osc.start(t)
  osc.stop(t + dur + 0.03)
}

/** A decaying white-noise burst (explosions / impacts). */
const noise = (dur: number, vol = 0.4): void => {
  const c = ctx
  if (!c || !master) return
  const t = c.currentTime
  const buffer = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
  const src = c.createBufferSource()
  src.buffer = buffer
  const g = c.createGain()
  g.gain.value = vol
  src.connect(g)
  g.connect(master)
  src.start(t)
}

/** Play a gameplay sound cue (no-op until the context can be created). */
export const playSfx = (name: SoundName): void => {
  if (!ensure()) return
  switch (name) {
    case 'throw':
      tone(520, 0.12, 'square', 0.3, 180)
      break
    case 'jump':
      tone(300, 0.14, 'square', 0.3, 660)
      break
    case 'hit':
      tone(880, 0.06, 'square', 0.25)
      break
    case 'kill':
      noise(0.22, 0.4)
      tone(140, 0.24, 'sawtooth', 0.35, 50)
      break
    case 'hurt':
      tone(220, 0.2, 'square', 0.4, 90)
      break
    case 'die':
      tone(320, 0.7, 'sawtooth', 0.45, 60)
      break
    case 'pickup':
      tone(660, 0.07, 'square', 0.3)
      tone(988, 0.12, 'square', 0.3, undefined, 0.07)
      break
    case 'stage-clear':
      ;[523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.35, undefined, i * 0.12))
      break
  }
}

// --- Background music: a slow, low arpeggio loop (deliberately subtle). -------
const MUSIC_NOTES = [110, 138.59, 164.81, 130.81] // A2 minor-ish walk
let musicTimer: ReturnType<typeof setInterval> | null = null
let musicStep = 0

export const startMusic = (): void => {
  if (musicTimer !== null) return // already playing (idempotent across scene restarts)
  ensure()
  musicTimer = setInterval(() => {
    tone(MUSIC_NOTES[musicStep % MUSIC_NOTES.length]!, 0.5, 'triangle', 0.07)
    musicStep++
  }, 430)
}

export const stopMusic = (): void => {
  if (musicTimer !== null) {
    clearInterval(musicTimer)
    musicTimer = null
  }
}
