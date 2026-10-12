import { useEffect, useRef } from 'react'
import { bendLabel, noteName } from '../model/song'
import type { Transport } from '../player/transport'
import { lowerBound } from '../player/transport'
import type { ChordLabel } from '../analysis/key'
import type { Song } from '../model/song'

interface Props {
  transport: Transport
  /** Detected chord names to print above the bars, or null when the overlay is off. */
  chords: ChordLabel[] | null
}

const PX_PER_BEAT = 72
/** Minimum room between consecutive note onsets so fret bubbles don't overlap. */
const MIN_NOTE_GAP_PX = 30
const PLAYHEAD_X = 150
// Plain tab: neutral notes, the playing note in the accent color. Finger colors stay on the 3D neck.
const NOTE_COLOR = '#c9d1dc'
const ACTIVE_COLOR = '#facc15'

/**
 * Maps beats to x like engraved notation: time is proportional, except each gap
 * between note onsets gets at least MIN_NOTE_GAP_PX. Fast runs spread out and
 * the strip scrolls quicker through them.
 */
class Spacing {
  private beats: number[] = [0]
  private xs: number[] = [0]

  constructor(song: Song) {
    for (const n of song.notes) {
      const last = this.beats[this.beats.length - 1]
      const gap = n.time - last
      if (gap <= 0.01) continue
      this.beats.push(n.time)
      this.xs.push(this.xs[this.xs.length - 1] + Math.max(gap * PX_PER_BEAT, MIN_NOTE_GAP_PX))
    }
  }

  /** Virtual x (from beat 0) for a beat. */
  x(beat: number): number {
    return interp(this.beats, this.xs, beat)
  }

  /** Beat at a virtual x. */
  beat(x: number): number {
    return interp(this.xs, this.beats, x, 1 / PX_PER_BEAT)
  }
}

/** Piecewise-linear lookup of `to` at `v` along ascending `from`; linear outside. */
function interp(from: number[], to: number[], v: number, outsideSlope = PX_PER_BEAT): number {
  const last = from.length - 1
  if (v <= from[0]) return to[0] + (v - from[0]) * outsideSlope
  if (v >= from[last]) return to[last] + (v - from[last]) * outsideSlope
  let lo = 0
  let hi = last
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (from[mid] <= v) lo = mid
    else hi = mid
  }
  return to[lo] + ((v - from[lo]) / (from[hi] - from[lo])) * (to[hi] - to[lo])
}

/** Scrolling tablature: upcoming notes slide toward the playhead on the left. */
export function TabStrip({ transport, chords }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const chordsRef = useRef(chords)
  chordsRef.current = chords

  useEffect(() => {
    const el = canvas.current
    if (!el) return
    const ctx = el.getContext('2d')
    if (!ctx) return
    let raf = 0
    let spacingSong: Song | null = null
    let spacing: Spacing | null = null

    const draw = () => {
      const { song, loop, loopEnabled } = transport.getSnapshot()
      if (song !== spacingSong || !spacing) {
        spacingSong = song
        spacing = new Spacing(song)
      }
      const sp = spacing
      const dpr = window.devicePixelRatio || 1
      const w = el.clientWidth
      const h = el.clientHeight
      if (el.width !== w * dpr || el.height !== h * dpr) {
        el.width = w * dpr
        el.height = h * dpr
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      const strings = song.tuning.length
      const top = 30
      const gap = (h - 46) / (strings - 1)
      const yOf = (s: number) => top + (strings - 1 - s) * gap
      const pos = transport.position()
      const posX = sp.x(pos)
      const xOf = (beat: number) => PLAYHEAD_X + sp.x(beat) - posX
      const firstBeat = sp.beat(posX - PLAYHEAD_X)
      const lastBeat = sp.beat(posX + w - PLAYHEAD_X)

      // Loop region
      if (loop && loopEnabled) {
        ctx.fillStyle = 'rgba(250, 204, 21, 0.08)'
        ctx.fillRect(xOf(loop.a), 0, xOf(loop.b) - xOf(loop.a), h)
      }

      // Bar lines
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'
      ctx.lineWidth = 1
      const startBar = Math.max(0, Math.floor(firstBeat / song.beatsPerBar))
      for (let b = startBar; b * song.beatsPerBar <= lastBeat; b++) {
        const x = Math.round(xOf(b * song.beatsPerBar)) + 0.5
        ctx.beginPath()
        ctx.moveTo(x, top - 6)
        ctx.lineTo(x, yOf(0) + 6)
        ctx.stroke()
        ctx.fillStyle = 'rgba(255,255,255,0.35)'
        ctx.font = '10px ui-monospace, Menlo, monospace'
        ctx.fillText(String(b + 1), x + 3, top - 8)
      }

      // Section names and chord labels along the top
      ctx.font = 'bold 10px ui-monospace, Menlo, monospace'
      for (const sec of song.sections ?? []) {
        if (sec.beat < firstBeat - 8 || sec.beat > lastBeat) continue
        const x = xOf(sec.beat)
        ctx.fillStyle = 'rgba(250, 204, 21, 0.85)'
        ctx.fillRect(x, 2, 2, h - 4)
        ctx.fillText(sec.name, x + 5, 11)
      }
      const chordList = chordsRef.current
      if (chordList) {
        ctx.font = 'bold 11px Inter, ui-sans-serif, system-ui, sans-serif'
        for (const c of chordList) {
          if (c.beat < firstBeat - 4 || c.beat > lastBeat) continue
          const x = xOf(c.beat)
          const active = c.beat <= pos
          ctx.fillStyle = active ? '#e6e9ef' : 'rgba(230,233,239,0.5)'
          ctx.fillText(c.name, x + 4, top - 18)
        }
      }

      // Strings
      for (let s = 0; s < strings; s++) {
        const y = yOf(s) + 0.5
        ctx.strokeStyle = 'rgba(255,255,255,0.22)'
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
        ctx.fillStyle = 'rgba(255,255,255,0.45)'
        ctx.font = '10px ui-monospace, Menlo, monospace'
        ctx.fillText(noteName(song.tuning[s], false), 6, y + 3)
      }

      // Notes
      const notes = song.notes
      const r = 8
      for (let i = lowerBound(notes, firstBeat - 2); i < notes.length && notes[i].time <= lastBeat; i++) {
        const n = notes[i]
        const x = xOf(n.time)
        const y = yOf(n.string)
        const active = n.time <= pos && n.time + Math.max(n.duration, 0.25) > pos
        const past = n.time + n.duration < pos
        const color = active ? ACTIVE_COLOR : NOTE_COLOR
        const durPx = Math.max(2, xOf(n.time + n.duration) - x - 3)
        ctx.globalAlpha = past ? 0.35 : 1

        // Duration bar
        ctx.fillStyle = active ? color : 'rgba(255,255,255,0.08)'
        ctx.globalAlpha = active ? 0.35 : past ? 0.35 : 1
        ctx.fillRect(x, y - 2, durPx, 4)
        ctx.globalAlpha = past ? 0.35 : 1

        // Hammer-on / pull-off arc from the previous fret
        if (n.hammerFromFret !== undefined) {
          let j = i - 1
          while (j >= 0 && (notes[j].string !== n.string || notes[j].time >= n.time)) j--
          if (j >= 0) {
            const x0 = xOf(notes[j].time)
            ctx.strokeStyle = color
            ctx.lineWidth = 1.2
            ctx.beginPath()
            ctx.moveTo(x0, y - r)
            ctx.quadraticCurveTo((x0 + x) / 2, y - r - 10, x, y - r)
            ctx.stroke()
          }
        }
        // Slide: sloped line toward the target fret
        if (n.slideTo !== undefined) {
          const dir = n.slideTo > n.fret ? -1 : 1
          ctx.strokeStyle = color
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.moveTo(x + r + 2, y + dir * 4)
          ctx.lineTo(x + durPx - 2, y - dir * 4)
          ctx.stroke()
          ctx.fillStyle = color
          ctx.font = '10px ui-monospace, Menlo, monospace'
          ctx.fillText(String(n.slideTo), x + durPx + 1, y + 3)
        }
        // Vibrato: squiggle over the duration
        if (n.vibrato) {
          ctx.strokeStyle = color
          ctx.lineWidth = 1.2
          ctx.beginPath()
          for (let px = x + r + 2; px < x + durPx; px += 2) {
            const yy = y - r - 6 + Math.sin((px - x) * 0.9) * 2.5
            if (px === x + r + 2) ctx.moveTo(px, yy)
            else ctx.lineTo(px, yy)
          }
          ctx.stroke()
        }
        // Bend: arrow up with the amount
        if (n.bend) {
          ctx.strokeStyle = color
          ctx.fillStyle = color
          ctx.lineWidth = 1.5
          const top = y - r - 12
          ctx.beginPath()
          ctx.moveTo(x + r, y - 2)
          ctx.quadraticCurveTo(x + r + 8, y - 2, x + r + 8, top + 3)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(x + r + 8, top - 1)
          ctx.lineTo(x + r + 4, top + 5)
          ctx.lineTo(x + r + 12, top + 5)
          ctx.closePath()
          ctx.fill()
          ctx.font = '9px ui-monospace, Menlo, monospace'
          ctx.fillText(bendLabel(n.bend.semitones) + (n.bend.release ? ' ↓' : ''), x + r + 14, top + 6)
        }
        if (n.palmMute) {
          ctx.fillStyle = 'rgba(255,255,255,0.5)'
          ctx.font = '9px ui-monospace, Menlo, monospace'
          ctx.fillText('PM', x - 6, y + r + 11)
        }

        // Fret bubble
        ctx.beginPath()
        ctx.arc(x, y, active ? 10 : r, 0, Math.PI * 2)
        ctx.fillStyle = active ? color : '#161b24'
        ctx.fill()
        ctx.strokeStyle = color
        ctx.lineWidth = active ? 2 : 1.2
        if (n.hammer || n.tap) ctx.setLineDash([2, 2])
        ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = active ? '#0b0f14' : '#e6e9ef'
        ctx.font = `${active ? 'bold ' : ''}11px ui-monospace, Menlo, monospace`
        ctx.textAlign = 'center'
        ctx.fillText(n.tap ? `T${n.fret}` : String(n.fret), x, y + 4)
        ctx.textAlign = 'left'
        ctx.globalAlpha = 1
      }

      // Playhead
      ctx.strokeStyle = '#facc15'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(PLAYHEAD_X, 4)
      ctx.lineTo(PLAYHEAD_X, h - 4)
      ctx.stroke()

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [transport])

  return <canvas ref={canvas} className="tabstrip" />
}
