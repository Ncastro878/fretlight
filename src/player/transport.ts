import { useSyncExternalStore } from 'react'
import { Synth } from '../audio/synth'
import { articulationOf, midiOf, songLength, type Song, type SongNote } from '../model/song'

export interface LoopRange {
  a: number
  b: number
}

/** Speed trainer: each time the loop wraps, add `stepBpm` until `maxBpm`. */
export interface Ramp {
  stepBpm: number
  maxBpm: number
}

export interface TransportState {
  song: Song
  playing: boolean
  speed: number
  /** Effective tempo in beats per minute (song tempo times speed). */
  bpm: number
  loop: LoopRange | null
  loopEnabled: boolean
  length: number
  metronome: boolean
  countIn: boolean
  ramp: Ramp | null
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
  private metronome = false
  private countIn = false
  private ramp: Ramp | null = null

  private ctx: AudioContext | null = null
  private synth: Synth | null = null
  private anchorBeat = 0
  private anchorTime = 0
  private pausedBeat = 0
  private scheduledUntil = 0
  private wrappedUntil = 0
  /** Speed to switch to when the loop next wraps (set by the ramp). */
  private pendingSpeed: number | null = null
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
      bpm: Math.round(this.song.tempo * this.speed),
      loop: this.loop,
      loopEnabled: this.loopEnabled,
      length: songLength(this.song),
      metronome: this.metronome,
      countIn: this.countIn,
      ramp: this.ramp,
    }
  }

  // ----- Clock -----

  private beatsPerSecond(speed = this.speed): number {
    return (this.song.tempo * speed) / 60
  }

  /** Current position in beats. Negative during a count-in. Safe to call every frame. */
  position(): number {
    if (!this.playing || !this.ctx) return this.pausedBeat
    return this.anchorBeat + (this.ctx.currentTime - this.anchorTime) * this.beatsPerSecond()
  }

  // ----- Controls -----

  setSong(song: Song, opts: { loopAll?: boolean } = {}): void {
    this.pause()
    this.song = song
    this.pausedBeat = 0
    this.loop = opts.loopAll ? { a: 0, b: songLength(song) } : null
    this.loopEnabled = this.loop !== null
    this.pendingSpeed = null
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
    if (this.countIn) {
      const bar = this.song.beatsPerBar
      const beatSec = 1 / this.beatsPerSecond()
      this.anchorTime += bar * beatSec
      for (let k = 0; k < bar; k++) this.synth?.click(this.anchorTime - (bar - k) * beatSec, k === 0)
    }
    this.scheduledUntil = this.pausedBeat
    this.wrappedUntil = this.loop ? this.loop.a : 0
    this.pendingSpeed = null
    this.playing = true
    this.timer = window.setInterval(() => this.tick(), TICK_MS)
    this.tick()
    this.emit()
  }

  pause(): void {
    if (!this.playing) return
    this.pausedBeat = Math.max(0, this.position())
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
      this.pendingSpeed = null
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
      this.pendingSpeed = null
    }
    this.speed = speed
    this.emit()
  }

  /** Set the effective tempo directly, in beats per minute. */
  setBpm(bpm: number): void {
    this.setSpeed(Math.max(10, bpm) / this.song.tempo)
  }

  setLoop(loop: LoopRange | null): void {
    if (loop && loop.b - loop.a < 0.25) loop = null
    this.loop = loop
    this.loopEnabled = loop !== null
    this.wrappedUntil = loop ? loop.a : 0
    this.pendingSpeed = null
    this.emit()
  }

  setLoopEnabled(enabled: boolean): void {
    this.loopEnabled = enabled && this.loop !== null
    this.wrappedUntil = this.loop ? this.loop.a : 0
    this.pendingSpeed = null
    this.emit()
  }

  setMetronome(on: boolean): void {
    this.metronome = on
    this.emit()
  }

  setCountIn(on: boolean): void {
    this.countIn = on
    this.emit()
  }

  setRamp(ramp: Ramp | null): void {
    this.ramp = ramp
    this.pendingSpeed = null
    this.emit()
  }

  // ----- Scheduling -----

  private endBeat(): number {
    if (this.loopEnabled && this.loop) return this.loop.b
    return songLength(this.song)
  }

  private tick(): void {
    if (!this.playing || !this.ctx || !this.synth) return
    let bps = this.beatsPerSecond()
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
      const loopStartTime = this.anchorTime + (end - this.anchorBeat) / bps
      if (this.pendingSpeed !== null) {
        this.speed = this.pendingSpeed
        this.pendingSpeed = null
        bps = this.beatsPerSecond()
        this.emit()
      }
      this.anchorTime = loopStartTime
      this.anchorBeat = loop.a
      this.scheduledUntil = Math.max(loop.a, this.wrappedUntil)
      this.wrappedUntil = loop.a
      pos = this.anchorBeat + (now - this.anchorTime) * bps
    }

    const horizon = pos + LOOKAHEAD_SEC * bps
    const upTo = Math.min(horizon, end)
    if (upTo > this.scheduledUntil) {
      this.scheduleRange(this.scheduledUntil, upTo, bps, (beat) => this.anchorTime + (beat - this.anchorBeat) / bps)
      this.scheduledUntil = upTo
    }

    if (looping && horizon > end) {
      const loop = this.loop as LoopRange
      const loopStartTime = this.anchorTime + (end - this.anchorBeat) / bps
      if (this.pendingSpeed === null) {
        this.pendingSpeed = this.ramp
          ? Math.min(this.ramp.maxBpm / this.song.tempo, this.speed + this.ramp.stepBpm / this.song.tempo)
          : this.speed
      }
      const nextBps = this.beatsPerSecond(this.pendingSpeed)
      const wrapTo = loop.a + ((horizon - end) / bps) * nextBps
      if (wrapTo > this.wrappedUntil) {
        this.scheduleRange(this.wrappedUntil, wrapTo, nextBps, (beat) => loopStartTime + (beat - loop.a) / nextBps)
        this.wrappedUntil = wrapTo
      }
    }
  }

  private scheduleRange(from: number, to: number, bps: number, timeOf: (beat: number) => number): void {
    const synth = this.synth
    if (!synth) return
    const notes = this.song.notes
    let i = lowerBound(notes, from)
    for (; i < notes.length && notes[i].time < to; i++) {
      const n = notes[i]
      synth.pluck(midiOf(this.song, n), timeOf(n.time), n.duration / bps, velocityFor(n), articulationOf(n))
    }
    if (this.metronome) {
      const bar = this.song.beatsPerBar
      for (let beat = Math.ceil(from - 1e-9); beat < to; beat++) {
        if (beat < from) continue
        synth.click(timeOf(beat), Math.abs((beat / bar) % 1) < 1e-6)
      }
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
