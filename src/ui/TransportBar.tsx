import { useEffect, useRef, useState } from 'react'
import type { Transport } from '../player/transport'
import { useTransportState } from '../player/transport'
import { formatBeat, formatClock } from './format'

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5]

interface Props {
  transport: Transport
}

export function TransportBar({ transport }: Props) {
  const state = useTransportState(transport)
  const { song, playing, speed, loop, loopEnabled, length } = state
  const [pos, setPos] = useState(0)
  const dragging = useRef(false)
  const rail = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let raf = 0
    const loop = () => {
      if (!dragging.current) setPos(transport.position())
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [transport])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.code === 'Space') {
        e.preventDefault()
        transport.toggle()
      } else if (e.key === 'ArrowLeft') transport.seek(transport.position() - song.beatsPerBar)
      else if (e.key === 'ArrowRight') transport.seek(transport.position() + song.beatsPerBar)
      else if (e.key === 'Home') transport.seek(0)
      else if (e.key === 'a' || e.key === 'A') setA()
      else if (e.key === 'b' || e.key === 'B') setB()
      else if (e.key === 'l' || e.key === 'L') transport.setLoopEnabled(!transport.getSnapshot().loopEnabled)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const beatFromEvent = (e: React.PointerEvent | PointerEvent) => {
    const el = rail.current
    if (!el) return 0
    const r = el.getBoundingClientRect()
    const t = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))
    return t * length
  }

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    setPos(beatFromEvent(e))
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragging.current) setPos(beatFromEvent(e))
  }
  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragging.current) return
    dragging.current = false
    transport.seek(beatFromEvent(e))
  }

  const snap = (b: number) => Math.round(b / song.beatsPerBar) * song.beatsPerBar
  const setA = () => {
    const a = snap(transport.position())
    const b = transport.getSnapshot().loop?.b ?? Math.min(length, a + 4 * song.beatsPerBar)
    transport.setLoop({ a, b: b > a ? b : Math.min(length, a + 2 * song.beatsPerBar) })
  }
  const setB = () => {
    const b = Math.min(length, snap(transport.position()) || song.beatsPerBar)
    const a = transport.getSnapshot().loop?.a ?? Math.max(0, b - 4 * song.beatsPerBar)
    transport.setLoop({ a: a < b ? a : Math.max(0, b - 2 * song.beatsPerBar), b })
  }

  const pct = (b: number) => `${(b / Math.max(length, 1e-6)) * 100}%`

  return (
    <div className="transport">
      <div className="transport-row">
        <button className="btn primary" onClick={() => transport.toggle()} title="Space">
          {playing ? '❚❚ Pause' : '▶ Play'}
        </button>
        <button className="btn" onClick={() => transport.stop()} title="Back to start">
          ■
        </button>
        <div className="seg">
          {SPEEDS.map((s) => (
            <button key={s} className={`seg-btn ${speed === s ? 'on' : ''}`} onClick={() => transport.setSpeed(s)}>
              {s}×
            </button>
          ))}
        </div>
        <div className="clock mono">
          <span>{formatClock(song, pos, speed)}</span>
          <span className="dim"> / {formatClock(song, length, speed)}</span>
          <span className="dim"> · bar </span>
          <span>{formatBeat(song, pos)}</span>
        </div>
        <div className="spacer" />
        <div className="loop-controls">
          <button className="btn" onClick={setA} title="Set loop start at this bar (A)">
            Set A
          </button>
          <button className="btn" onClick={setB} title="Set loop end at this bar (B)">
            Set B
          </button>
          <button
            className={`btn ${loopEnabled ? 'on' : ''}`}
            disabled={!loop}
            onClick={() => transport.setLoopEnabled(!loopEnabled)}
            title="Toggle loop (L)"
          >
            ⟲ Loop {loop ? `${formatBeat(song, loop.a)}–${formatBeat(song, loop.b)}` : ''}
          </button>
          <button className="btn ghost" disabled={!loop} onClick={() => transport.setLoop(null)}>
            Clear
          </button>
        </div>
      </div>
      <div className="rail" ref={rail} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
        {loop && <div className={`rail-loop ${loopEnabled ? 'on' : ''}`} style={{ left: pct(loop.a), width: pct(loop.b - loop.a) }} />}
        {Array.from({ length: Math.floor(length / song.beatsPerBar) }, (_, i) => (
          <div key={i} className="rail-bar" style={{ left: pct((i + 1) * song.beatsPerBar) }} />
        ))}
        <div className="rail-fill" style={{ width: pct(pos) }} />
        <div className="rail-head" style={{ left: pct(pos) }} />
      </div>
      <div className="hint dim">Space play/pause · ← → one bar · A / B set loop points · L toggle loop · drag the bar to scrub</div>
    </div>
  )
}
