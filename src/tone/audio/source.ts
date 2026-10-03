/**
 * What goes into the chain: built-in riffs played by a plucked-string synth,
 * or the microphone. Kept separate from the Fretlight code on purpose so
 * Tone Lab can be split out later.
 */

export interface RiffNote {
  /** Beats from the riff start. */
  t: number
  /** MIDI pitch. */
  m: number
  /** Beats. */
  d: number
  /** Palm muted: short and dull. */
  pm?: boolean
}

export interface Riff {
  id: string
  name: string
  bpm: number
  /** Loop length in beats. */
  length: number
  notes: RiffNote[]
  blurb: string
}

// Helpers for writing riffs compactly. Pitches: E2=40 A2=45 D3=50 G3=55 B3=59 E4=64.
const seq = (start: number, step: number, pitches: number[], d = step, pm = false): RiffNote[] =>
  pitches.map((m, i) => ({ t: start + i * step, m, d, pm }))
const chord = (t: number, pitches: number[], d: number, strum = 0.02): RiffNote[] => pitches.map((m, i) => ({ t: t + i * strum, m, d }))

export const RIFFS: Riff[] = [
  {
    id: 'clean-arp',
    name: 'Clean arpeggios (Am F C G)',
    bpm: 96,
    length: 16,
    blurb: 'Open-chord arpeggios. Hear modulation, delay, and reverb clearly.',
    notes: [
      ...seq(0, 0.5, [45, 52, 57, 60, 64, 60, 57, 52]),
      ...seq(4, 0.5, [41, 48, 53, 57, 65, 57, 53, 48]),
      ...seq(8, 0.5, [48, 52, 55, 60, 64, 60, 55, 52]),
      ...seq(12, 0.5, [43, 47, 50, 55, 59, 55, 50, 47]),
    ],
  },
  {
    id: 'power-chug',
    name: 'Power chords (E5 G5 A5)',
    bpm: 120,
    length: 8,
    blurb: 'Palm-muted chugs and open power chords. The test for drive and cabinet settings.',
    notes: [
      ...seq(0, 0.5, [40, 40, 40], 0.3, true),
      ...chord(1.5, [40, 47], 1),
      ...seq(2.5, 0.5, [40, 40, 40], 0.3, true),
      ...chord(4, [43, 50], 1),
      ...seq(5, 0.5, [40, 40], 0.3, true),
      ...chord(6, [45, 52], 1.5),
      ...seq(7.5, 0.5, [40], 0.3, true),
    ].flatMap((n) => (n.pm ? [n, { ...n, m: n.m + 7 }] : [n])),
  },
  {
    id: 'blues-lick',
    name: 'Blues lick in A',
    bpm: 84,
    length: 8,
    blurb: 'Single-note bends and slides. Where overdrive, compression, and slapback delay shine.',
    notes: [
      { t: 0, m: 72, d: 1 },
      { t: 1, m: 69, d: 0.5 },
      { t: 1.5, m: 67, d: 0.5 },
      { t: 2, m: 64, d: 0.5 },
      { t: 2.5, m: 62, d: 0.5 },
      { t: 3, m: 60, d: 1 },
      { t: 4, m: 57, d: 2 },
      { t: 6, m: 60, d: 0.5 },
      { t: 6.5, m: 62, d: 0.5 },
      { t: 7, m: 64, d: 1 },
    ],
  },
  {
    id: 'funk',
    name: 'Funk stabs (E9)',
    bpm: 104,
    length: 8,
    blurb: 'Short chord stabs with space between them. Try wah, compressor, and a phaser.',
    notes: [
      ...chord(0, [52, 56, 62, 66, 71], 0.3),
      ...chord(0.75, [52, 56, 62, 66, 71], 0.2),
      ...chord(1.5, [52, 56, 62, 66, 71], 0.3),
      ...chord(2.5, [52, 56, 62, 66, 71], 0.2),
      ...chord(3, [52, 56, 62, 66, 71], 0.5),
      ...chord(4, [52, 56, 62, 66, 71], 0.3),
      ...chord(4.75, [52, 56, 62, 66, 71], 0.2),
      ...chord(5.5, [50, 54, 60, 64, 69], 0.3),
      ...chord(6.5, [52, 56, 62, 66, 71], 0.8),
    ],
  },
  {
    id: 'melody',
    name: 'Slow melody (high strings)',
    bpm: 72,
    length: 8,
    blurb: 'Long single notes. Listen to sustain, reverb tails, and how gain changes the attack.',
    notes: seq(0, 1, [71, 74, 76, 74, 71, 69, 71, 67], 1.6),
  },
  {
    id: 'gallop',
    name: 'Metal gallop (E)',
    bpm: 150,
    length: 8,
    blurb: 'Fast muted low E with chord hits. Tests tightness: too much low end turns to mud.',
    notes: [
      ...[0, 2, 4, 6].flatMap((b) => [
        { t: b, m: 40, d: 0.3, pm: true },
        { t: b + 0.5, m: 40, d: 0.2, pm: true },
        { t: b + 0.75, m: 40, d: 0.2, pm: true },
        { t: b + 1, m: 40, d: 0.3, pm: true },
        { t: b + 1.5, m: 40, d: 0.2, pm: true },
        { t: b + 1.75, m: 40, d: 0.2, pm: true },
      ]),
      ...chord(3.5, [43, 50], 0.5),
      ...chord(7.5, [46, 53], 0.5),
    ].sort((a, b) => a.t - b.t),
  },
]

// ----- Plucked string (Karplus-Strong) rendered into cached buffers -----

function renderPluck(sampleRate: number, freq: number, muted: boolean): Float32Array<ArrayBuffer> {
  const seconds = muted ? 0.6 : 3
  const length = Math.floor(sampleRate * seconds)
  const period = Math.max(2, Math.round(sampleRate / freq))
  const ring = new Float32Array(period)
  let last = 0
  for (let i = 0; i < period; i++) {
    const noise = Math.random() * 2 - 1
    last = 0.5 * last + 0.5 * noise
    ring[i] = last
  }
  let mean = 0
  for (let i = 0; i < period; i++) mean += ring[i]
  mean /= period
  for (let i = 0; i < period; i++) ring[i] -= mean
  const sustain = muted ? 0.25 : freq < 200 ? 3.2 : freq < 500 ? 2.4 : 1.6
  const decay = Math.pow(0.0005, 1 / (sampleRate * sustain))
  const out = new Float32Array(new ArrayBuffer(length * 4))
  let idx = 0
  for (let i = 0; i < length; i++) {
    const next = (idx + 1) % period
    const sample = ring[idx]
    ring[idx] = decay * 0.5 * (sample + ring[next])
    out[i] = sample
    idx = next
  }
  const attack = Math.floor(sampleRate * 0.002)
  for (let i = 0; i < attack; i++) out[i] *= i / attack
  let peak = 0
  for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(out[i]))
  if (peak > 0) for (let i = 0; i < length; i++) out[i] /= peak
  return out
}

export class RiffPlayer {
  private cache = new Map<string, AudioBuffer>()
  private timer: number | null = null
  private voices = new Set<AudioBufferSourceNode>()
  private startTime = 0
  private scheduledUntil = 0
  riff: Riff | null = null
  playing = false
  /** Pickup voicing: a gentle lowpass so the synth sounds like a guitar signal, not a harpsichord. */
  private readonly pickup: BiquadFilterNode
  private readonly level: GainNode
  private ctx: AudioContext

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx
    this.pickup = ctx.createBiquadFilter()
    this.pickup.type = 'lowpass'
    this.pickup.frequency.value = 4200
    this.level = ctx.createGain()
    this.level.gain.value = 0.5
    this.pickup.connect(this.level).connect(destination)
  }

  private bufferFor(midi: number, muted: boolean): AudioBuffer {
    const key = `${midi}-${muted ? 'm' : 'o'}`
    const hit = this.cache.get(key)
    if (hit) return hit
    const data = renderPluck(this.ctx.sampleRate, 440 * Math.pow(2, (midi - 69) / 12), muted)
    const buf = this.ctx.createBuffer(1, data.length, this.ctx.sampleRate)
    buf.copyToChannel(data, 0)
    this.cache.set(key, buf)
    return buf
  }

  play(riff: Riff): void {
    this.stop()
    this.riff = riff
    this.playing = true
    this.startTime = this.ctx.currentTime + 0.05
    this.scheduledUntil = 0
    this.timer = window.setInterval(() => this.tick(), 40)
    this.tick()
  }

  stop(): void {
    if (this.timer !== null) window.clearInterval(this.timer)
    this.timer = null
    this.playing = false
    const now = this.ctx.currentTime
    for (const v of this.voices) {
      try {
        v.stop(now + 0.02)
      } catch {
        // already stopped
      }
    }
    this.voices.clear()
  }

  private tick(): void {
    const riff = this.riff
    if (!riff) return
    const bps = riff.bpm / 60
    const now = this.ctx.currentTime
    const horizonBeats = (now - this.startTime) * bps + 0.3 * bps
    while (this.scheduledUntil < horizonBeats) {
      const loopStart = Math.floor(this.scheduledUntil / riff.length) * riff.length
      const inLoop = this.scheduledUntil - loopStart
      // Schedule notes in [inLoop, inLoop + step) of this loop iteration.
      const step = 0.25
      for (const n of riff.notes) {
        if (n.t >= inLoop && n.t < inLoop + step) {
          const when = this.startTime + (loopStart + n.t) / bps
          const src = this.ctx.createBufferSource()
          src.buffer = this.bufferFor(n.m, !!n.pm)
          const g = this.ctx.createGain()
          const dur = n.d / bps
          g.gain.setValueAtTime(n.pm ? 0.9 : 0.8, when)
          g.gain.setValueAtTime(n.pm ? 0.9 : 0.8, when + dur)
          g.gain.linearRampToValueAtTime(0, when + dur + (n.pm ? 0.03 : 0.25))
          src.connect(g).connect(this.pickup)
          src.start(when)
          src.stop(when + dur + 0.3)
          this.voices.add(src)
          src.onended = () => {
            this.voices.delete(src)
            g.disconnect()
          }
        }
      }
      this.scheduledUntil += step
    }
  }
}

/** Live guitar through the browser: a mic or an audio interface input. */
export async function openMic(ctx: AudioContext, destination: AudioNode): Promise<{ stop: () => void }> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, latency: 0 } as MediaTrackConstraints,
  })
  const src = ctx.createMediaStreamSource(stream)
  src.connect(destination)
  return {
    stop: () => {
      src.disconnect()
      stream.getTracks().forEach((t) => t.stop())
    },
  }
}
