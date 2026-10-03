import { useEffect, useRef } from 'react'
import { noteName } from '../model/song'
import type { Transport } from '../player/transport'
import { lowerBound } from '../player/transport'
import { FINGER_COLORS } from '../scene/geometry'

interface Props {
  transport: Transport
}

const PX_PER_BEAT = 72
const PLAYHEAD_X = 150

/** Scrolling tablature: upcoming notes slide toward the playhead on the left. */
export function TabStrip({ transport }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const el = canvas.current
    if (!el) return
    const ctx = el.getContext('2d')
    if (!ctx) return
    let raf = 0

    const draw = () => {
      const { song, loop, loopEnabled } = transport.getSnapshot()
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
      const top = 18
      const gap = (h - 36) / (strings - 1)
      const yOf = (s: number) => top + (strings - 1 - s) * gap
      const pos = transport.position()
      const xOf = (beat: number) => PLAYHEAD_X + (beat - pos) * PX_PER_BEAT
      const firstBeat = pos - PLAYHEAD_X / PX_PER_BEAT
      const lastBeat = pos + (w - PLAYHEAD_X) / PX_PER_BEAT

      // Loop region
      if (loop && loopEnabled) {
        ctx.fillStyle = 'rgba(250, 204, 21, 0.08)'
        ctx.fillRect(xOf(loop.a), 0, (loop.b - loop.a) * PX_PER_BEAT, h)
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
      for (let i = lowerBound(notes, firstBeat - 2); i < notes.length && notes[i].time <= lastBeat; i++) {
        const n = notes[i]
        const x = xOf(n.time)
        const y = yOf(n.string)
        const active = n.time <= pos && n.time + Math.max(n.duration, 0.25) > pos
        const past = n.time + n.duration < pos
        const color = FINGER_COLORS[n.fret === 0 ? 0 : (n.finger ?? 1)]
        // Duration bar
        ctx.fillStyle = active ? color : 'rgba(255,255,255,0.08)'
        ctx.globalAlpha = active ? 0.35 : 1
        ctx.fillRect(x, y - 2, Math.max(2, n.duration * PX_PER_BEAT - 3), 4)
        ctx.globalAlpha = past ? 0.35 : 1
        // Fret bubble
        ctx.beginPath()
        ctx.arc(x, y, active ? 10 : 8, 0, Math.PI * 2)
        ctx.fillStyle = active ? color : '#161b24'
        ctx.fill()
        ctx.strokeStyle = color
        ctx.lineWidth = active ? 2 : 1.2
        ctx.stroke()
        ctx.fillStyle = active ? '#0b0f14' : '#e6e9ef'
        ctx.font = `${active ? 'bold ' : ''}11px ui-monospace, Menlo, monospace`
        ctx.textAlign = 'center'
        ctx.fillText(String(n.fret), x, y + 4)
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
