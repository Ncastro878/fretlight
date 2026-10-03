/**
 * Plucked-string synthesizer (Karplus-Strong). Each pitch is rendered once
 * into an AudioBuffer and cached, then played back with a gain envelope.
 */
export class Synth {
  readonly ctx: AudioContext
  private readonly master: GainNode
  private readonly cache = new Map<number, AudioBuffer>()
  private voices = new Set<{ source: AudioBufferSourceNode; gain: GainNode }>()

  constructor(ctx: AudioContext) {
    this.ctx = ctx
    const tone = ctx.createBiquadFilter()
    tone.type = 'lowpass'
    tone.frequency.value = 5200
    tone.Q.value = 0.4
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -14
    comp.ratio.value = 4
    this.master = ctx.createGain()
    this.master.gain.value = 0.7
    this.master.connect(tone).connect(comp).connect(ctx.destination)
  }

  /** Schedule a pluck at `when` (AudioContext time). The note rings a little past `durationSec`. */
  pluck(midi: number, when: number, durationSec: number, velocity = 0.85): void {
    const buffer = this.bufferFor(midi)
    const source = this.ctx.createBufferSource()
    source.buffer = buffer
    const gain = this.ctx.createGain()
    const releaseAt = when + Math.max(durationSec, 0.2) + 0.5
    gain.gain.setValueAtTime(velocity, when)
    gain.gain.setValueAtTime(velocity, releaseAt)
    gain.gain.linearRampToValueAtTime(0, releaseAt + 0.25)
    source.connect(gain).connect(this.master)
    source.start(when)
    source.stop(releaseAt + 0.3)
    const voice = { source, gain }
    this.voices.add(voice)
    source.onended = () => {
      this.voices.delete(voice)
      gain.disconnect()
    }
  }

  /** Fade out every sounding and scheduled note. Used on pause, seek, and stop. */
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

  private bufferFor(midi: number): AudioBuffer {
    const cached = this.cache.get(midi)
    if (cached) return cached
    const buffer = renderPluck(this.ctx.sampleRate, 440 * Math.pow(2, (midi - 69) / 12))
    const audio = this.ctx.createBuffer(1, buffer.length, this.ctx.sampleRate)
    audio.copyToChannel(buffer, 0)
    this.cache.set(midi, audio)
    return audio
  }
}

function renderPluck(sampleRate: number, freq: number): Float32Array<ArrayBuffer> {
  const seconds = 3.5
  const length = Math.floor(sampleRate * seconds)
  const period = Math.max(2, Math.round(sampleRate / freq))
  const ring = new Float32Array(period)

  // Excite the string with filtered noise so high notes do not sound like static.
  let last = 0
  for (let i = 0; i < period; i++) {
    const noise = Math.random() * 2 - 1
    last = 0.5 * last + 0.5 * noise
    ring[i] = last
  }
  // Remove DC offset.
  let mean = 0
  for (let i = 0; i < period; i++) mean += ring[i]
  mean /= period
  for (let i = 0; i < period; i++) ring[i] -= mean

  // Lower strings ring longer; the decay per sample is tuned so each note
  // sustains around two to three seconds regardless of pitch.
  const decay = Math.pow(0.0005, 1 / (sampleRate * (freq < 200 ? 3.2 : freq < 500 ? 2.4 : 1.6)))
  const out = new Float32Array(new ArrayBuffer(length * 4))
  let idx = 0
  for (let i = 0; i < length; i++) {
    const next = (idx + 1) % period
    const sample = ring[idx]
    ring[idx] = decay * 0.5 * (sample + ring[next])
    out[i] = sample
    idx = next
  }

  // Short attack to soften the click, and normalize.
  const attack = Math.floor(sampleRate * 0.002)
  for (let i = 0; i < attack; i++) out[i] *= i / attack
  let peak = 0
  for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(out[i]))
  if (peak > 0) for (let i = 0; i < length; i++) out[i] /= peak
  return out
}
