import type { Articulation } from '../model/song'
import type { Instrument, InstrumentDef } from './instrument'

const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
const LOWEST = 36
const HIGHEST = 93

function noteFile(midi: number): string {
  return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}.mp3`
}

function curve(fn: (x: number) => number, n = 2048): Float32Array<ArrayBuffer> {
  const out = new Float32Array(new ArrayBuffer(n * 4))
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1
    out[i] = fn(x)
  }
  return out
}

/**
 * Plays sampled guitar notes (one mp3 per pitch, self-hosted under /sf) with
 * the same envelope and pitch-bend tricks as the synth. Optionally runs the
 * samples through a small amp simulation for crunch and lead tones.
 */
export class Sampler implements Instrument {
  private readonly ctx: AudioContext
  private readonly def: InstrumentDef
  private readonly input: GainNode
  private readonly master: GainNode
  private buffers = new Map<number, AudioBuffer>()
  private loading = new Map<number, Promise<AudioBuffer | null>>()
  private voices = new Set<{ source: AudioBufferSourceNode; gain: GainNode }>()

  constructor(ctx: AudioContext, def: InstrumentDef) {
    this.ctx = ctx
    this.def = def
    this.input = ctx.createGain()
    this.master = ctx.createGain()
    // The GM samples are quiet compared with the synth; the compressor keeps peaks sane.
    this.master.gain.value = def.amp ? 0.9 : 3.2
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -12
    comp.ratio.value = 4
    comp.attack.value = 0.003
    comp.release.value = 0.15

    if (def.amp) {
      // A compact version of Tone Lab's drive, amp, and cabinet.
      const lead = def.amp === 'lead'
      const hp = ctx.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.value = lead ? 110 : 90
      const pre = ctx.createGain()
      pre.gain.value = lead ? 9 : 3.5
      const shaper = ctx.createWaveShaper()
      shaper.oversample = '4x'
      const k = lead ? 14 : 4
      shaper.curve = lead ? curve((x) => Math.max(-0.85, Math.min(0.85, Math.tanh(k * x) * 1.08)) / 0.85) : curve((x) => Math.tanh(k * x) / Math.tanh(k))
      const mid = ctx.createBiquadFilter()
      mid.type = 'peaking'
      mid.frequency.value = lead ? 900 : 750
      mid.Q.value = 0.9
      mid.gain.value = lead ? 3 : 2
      const lowBump = ctx.createBiquadFilter()
      lowBump.type = 'peaking'
      lowBump.frequency.value = 110
      lowBump.Q.value = 1.1
      lowBump.gain.value = 3
      const pres = ctx.createBiquadFilter()
      pres.type = 'peaking'
      pres.frequency.value = 2600
      pres.Q.value = 1.3
      pres.gain.value = 2.5
      const cab1 = ctx.createBiquadFilter()
      cab1.type = 'lowpass'
      cab1.frequency.value = lead ? 4800 : 5200
      cab1.Q.value = 0.9
      const cab2 = ctx.createBiquadFilter()
      cab2.type = 'lowpass'
      cab2.frequency.value = 6000
      const post = ctx.createGain()
      post.gain.value = lead ? 0.17 : 0.34
      this.input.connect(hp).connect(pre).connect(shaper).connect(mid).connect(lowBump).connect(pres).connect(cab1).connect(cab2).connect(post).connect(comp)
    } else {
      this.input.connect(comp)
    }
    comp.connect(this.master).connect(ctx.destination)
  }

  private url(midi: number): string {
    return `${import.meta.env.BASE_URL}sf/${this.def.samples}/${noteFile(midi)}`
  }

  /** Nearest sampled pitch and the semitone offset to play it at. */
  private nearest(midi: number): { base: number; shift: number } {
    const base = Math.max(LOWEST, Math.min(HIGHEST, midi))
    return { base, shift: midi - base }
  }

  private load(midi: number): Promise<AudioBuffer | null> {
    const hit = this.buffers.get(midi)
    if (hit) return Promise.resolve(hit)
    const pending = this.loading.get(midi)
    if (pending) return pending
    const p = fetch(this.url(midi))
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${r.status}`))))
      .then((data) => this.ctx.decodeAudioData(data))
      .then((buf) => {
        this.buffers.set(midi, buf)
        this.loading.delete(midi)
        return buf
      })
      .catch(() => {
        this.loading.delete(midi)
        return null
      })
    this.loading.set(midi, p)
    return p
  }

  async prepare(midis: number[]): Promise<void> {
    const wanted = [...new Set(midis.map((m) => this.nearest(m).base))]
    await Promise.all(wanted.map((m) => this.load(m)))
  }

  pluck(midi: number, when: number, durationSec: number, velocity = 0.85, art?: Articulation): void {
    const { base, shift } = this.nearest(midi)
    const buffer = this.buffers.get(base)
    if (!buffer) {
      // Not loaded yet: fetch for next time and play nothing rather than late.
      void this.load(base)
      return
    }
    const source = this.ctx.createBufferSource()
    source.buffer = buffer
    const gain = this.ctx.createGain()
    const held = Math.max(durationSec, 0.2)
    let tail = 0.35
    if (art?.palmMute) tail = 0.04
    if (art?.letRing) tail = 1.4
    const releaseAt = when + (art?.palmMute ? Math.min(held, 0.16) : held) + tail
    const level = (art?.hammer ? velocity * 0.65 : velocity) * (this.def.amp ? 0.9 : 1)
    gain.gain.setValueAtTime(level, when)
    gain.gain.setValueAtTime(level, releaseAt)
    gain.gain.linearRampToValueAtTime(0, releaseAt + 0.2)

    const rate = source.playbackRate
    const baseRate = Math.pow(2, shift / 12)
    rate.setValueAtTime(baseRate, when)
    if (art?.bend) {
      const peak = baseRate * Math.pow(2, art.bend.semitones / 12)
      const rise = Math.min(0.35, durationSec * 0.4)
      rate.linearRampToValueAtTime(peak, when + rise)
      if (art.bend.release) {
        const fall = when + Math.max(rise + 0.08, durationSec * 0.75)
        rate.setValueAtTime(peak, Math.max(when + rise, fall - 0.2))
        rate.linearRampToValueAtTime(baseRate, fall)
      }
    } else if (art?.slide) {
      const target = baseRate * Math.pow(2, art.slide / 12)
      const start = when + Math.min(0.12, durationSec * 0.3)
      rate.setValueAtTime(baseRate, start)
      rate.linearRampToValueAtTime(target, when + Math.max(start - when + 0.05, durationSec * 0.85))
    }
    let lfo: OscillatorNode | null = null
    if (art?.vibrato) {
      lfo = this.ctx.createOscillator()
      lfo.frequency.value = 5.5
      const depth = this.ctx.createGain()
      depth.gain.setValueAtTime(0, when)
      depth.gain.linearRampToValueAtTime(0.014 * baseRate, when + 0.25)
      lfo.connect(depth).connect(rate)
      lfo.start(when)
      lfo.stop(releaseAt + 0.3)
    }
    // Palm mutes get a darker, shorter sound.
    if (art?.palmMute) {
      const lp = this.ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 1200
      source.connect(lp).connect(gain).connect(this.input)
    } else {
      source.connect(gain).connect(this.input)
    }
    source.start(when)
    source.stop(releaseAt + 0.25)
    const voice = { source, gain }
    this.voices.add(voice)
    source.onended = () => {
      this.voices.delete(voice)
      gain.disconnect()
      lfo?.disconnect()
    }
  }

  click(when: number, accent: boolean): void {
    const osc = this.ctx.createOscillator()
    osc.type = 'square'
    osc.frequency.value = accent ? 1760 : 1320
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(accent ? 0.35 : 0.22, when)
    g.gain.exponentialRampToValueAtTime(0.001, when + 0.045)
    osc.connect(g).connect(this.master)
    osc.start(when)
    osc.stop(when + 0.06)
  }

  silence(): void {
    const now = this.ctx.currentTime
    for (const v of this.voices) {
      try {
        v.gain.gain.cancelScheduledValues(now)
        v.gain.gain.setValueAtTime(v.gain.gain.value, now)
        v.gain.gain.linearRampToValueAtTime(0, now + 0.05)
        v.source.stop(now + 0.06)
      } catch {
        // Already stopped.
      }
    }
    this.voices.clear()
  }

  dispose(): void {
    this.silence()
    this.master.disconnect()
  }
}
