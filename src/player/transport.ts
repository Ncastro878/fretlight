import { useSyncExternalStore } from 'react'
import { Synth } from '../audio/synth'
import { midiOf, songLength, type Song, type SongNote } from '../model/song'

export interface LoopRange {
  a: number
  b: number
}

export interface TransportState {
  song: Song
  playing: boolean
  speed: number
  loop: LoopRange | null
  loopEnabled: boolean
  length: number
}

const LOOKAHEAD_SEC = 0.15
const TICK_MS = 25

/**
 * Song clock and note scheduler. Beats are the unit of position; the
 * AudioContext clock drives timing so audio and visuals stay in step.
 */
export class Transport {
  private song: Song
  private speed = 1
  private playing = false
  private loop: LoopRange | null = null
  private loopEnabled = false

  private ctx: AudioContext | null = null
  private synth: Synth | null = null
  private anchorBeat = 0
  private anchorTime = 0
  private pausedBeat = 0
  private scheduledUntil = 0
  private wrappedUntil = 0
  private timer: number | null = null

  private listeners = new Set<() => void>()
  private snapshot: TransportState

  constructor(song: Song) {
    this.song = song
    this.snapshot = this.buildSnapshot()
  }

  // ----- React integration -----

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = (): TransportState => this.snapshot

  private emit(): void {
    this.snapshot = this.buildSnapshot()
    for (const l of this.listeners) l()
  }

  private buildSnapshot(): TransportState {
    return {
      song: this.song,
      playing: this.playing,
      speed: this.speed,
      loop: this.loop,
      loopEnabled: this.loopEnabled,
      length: songLength(this.song),
    }
  }

  // ----- Clock -----

  private beatsPerSecond(): number {
    return (this.song.tempo * this.speed) / 60
  }

  /** Current position in beats. Safe to call every frame. */
  position(): number {
    if (!this.playing || !this.ctx) return this.pausedBeat
    const pos = this.anchorBeat + (this.ctx.currentTime - this.anchorTime) * this.beatsPerSecond()
    return Math.max(0, pos)
  }

  /** Beats from now until an absolute song beat, honoring playback speed. */
  secondsUntil(beat: number): number {
    return (beat - this.position()) / this.beatsPerSecond()
  }

  // ----- Controls -----

  setSong(song: Song): void {
    this.pause()
    this.song = song
    this.pausedBeat = 0
    this.loop = null
    this.loopEnabled = false
    this.emit()
  }

  async play(): Promise<void> {
    if (this.playing) return
    if (!this.ctx) {
      this.ctx = new AudioContext()
      this.synth = new Synth(this.ctx)
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume()
    const end = this.endBeat()
    if (this.pausedBeat >= end - 1e-6) this.pausedBeat = this.loopEnabled && this.loop ? this.loop.a : 0
    this.anchorBeat = this.pausedBeat
    this.anchorTime = this.ctx.currentTime + 0.05
    this.scheduledUntil = this.pausedBeat
    this.wrappedUntil = this.loop ? this.loop.a : 0
    this.playing = true
    this.timer = window.setInterval(() => this.tick(), TICK_MS)
    this.tick()
    this.emit()
  }

  pause(): void {
    if (!this.playing) return
    this.pausedBeat = this.position()
    this.playing = false
    if (this.timer !== null) window.clearInterval(this.timer)
    this.timer = null
    this.synth?.silence()
    this.emit()
  }

  toggle(): void {
    if (this.playing) this.pause()
    else void this.play()
  }

  stop(): void {
    this.pause()
    this.pausedBeat = this.loopEnabled && this.loop ? this.loop.a : 0
    this.emit()
  }

  seek(beat: number): void {
    const clamped = Math.max(0, Math.min(beat, songLength(this.song)))
    if (this.playing && this.ctx) {
      this.synth?.silence()
      this.anchorBeat = clamped
      this.anchorTime = this.ctx.currentTime
      this.scheduledUntil = clamped
      this.wrappedUntil = this.loop ? this.loop.a : 0
    } else {
      this.pausedBeat = clamped
    }
    this.emit()
  }

  setSpeed(speed: number): void {
    if (this.playing && this.ctx) {
      // Re-anchor so the position does not jump when the rate changes.
      const pos = this.position()
      this.synth?.silence()
      this.anchorBeat = pos
      this.anchorTime = this.ctx.currentTime
      this.scheduledUntil = pos
      this.wrappedUntil = this.loop ? this.loop.a : 0
    }
    this.speed = speed
    this.emit()
  }

  setLoop(loop: LoopRange | null): void {
    if (loop && loop.b - loop.a < 0.25) loop = null
    this.loop = loop
    this.loopEnabled = loop !== null
    this.wrappedUntil = loop ? loop.a : 0
    this.emit()
  }

  setLoopEnabled(enabled: boolean): void {
    this.loopEnabled = enabled && this.loop !== null
    this.wrappedUntil = this.loop ? this.loop.a : 0
    this.emit()
  }

  // ----- Scheduling -----

  private endBeat(): number {
    if (this.loopEnabled && this.loop) return this.loop.b
    return songLength(this.song)
  }

  private tick(): void {
    if (!this.playing || !this.ctx || !this.synth) return
    const bps = this.beatsPerSecond()
    const now = this.ctx.currentTime
    let pos = this.anchorBeat + (now - this.anchorTime) * bps
    const end = this.endBeat()
    const looping = this.loopEnabled && this.loop !== null

    if (pos >= end) {
      if (!looping) {
        // Let the last notes ring, then stop at the end.
        if (pos >= end + 0.5) {
          this.playing = false
          if (this.timer !== null) window.clearInterval(this.timer)
          this.timer = null
          this.pausedBeat = end
          this.emit()
        }
        return
      }
      const loop = this.loop as LoopRange
      this.anchorTime = this.anchorTime + (end - this.anchorBeat) / bps
      this.anchorBeat = loop.a
      this.scheduledUntil = Math.max(loop.a, this.wrappedUntil)
      this.wrappedUntil = loop.a
      pos = this.anchorBeat + (now - this.anchorTime) * bps
    }

    const horizon = pos + LOOKAHEAD_SEC * bps
    const upTo = Math.min(horizon, end)
    if (upTo > this.scheduledUntil) {
      this.scheduleRange(this.scheduledUntil, upTo, (beat) => this.anchorTime + (beat - this.anchorBeat) / bps)
      this.scheduledUntil = upTo
    }

    if (looping && horizon > end) {
      const loop = this.loop as LoopRange
      const loopStartTime = this.anchorTime + (end - this.anchorBeat) / bps
      const wrapTo = loop.a + (horizon - end)
      if (wrapTo > this.wrappedUntil) {
        this.scheduleRange(this.wrappedUntil, wrapTo, (beat) => loopStartTime + (beat - loop.a) / bps)
        this.wrappedUntil = wrapTo
      }
    }
  }

  private scheduleRange(from: number, to: number, timeOf: (beat: number) => number): void {
    const synth = this.synth
    if (!synth) return
    const bps = this.beatsPerSecond()
    const notes = this.song.notes
    let i = lowerBound(notes, from)
    for (; i < notes.length && notes[i].time < to; i++) {
      const n = notes[i]
      synth.pluck(midiOf(this.song, n), timeOf(n.time), n.duration / bps, velocityFor(n))
    }
  }
}

function velocityFor(n: SongNote): number {
  // Bass strings a touch quieter so melodies sit on top.
  return n.string <= 1 ? 0.7 : 0.85
}

/** Index of the first note with time >= beat. Notes must be sorted by time. */
export function lowerBound(notes: SongNote[], beat: number): number {
  let lo = 0
  let hi = notes.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (notes[mid].time < beat) lo = mid + 1
    else hi = mid
  }
  return lo
}

export function useTransportState(t: Transport): TransportState {
  return useSyncExternalStore(t.subscribe, t.getSnapshot, t.getSnapshot)
}
