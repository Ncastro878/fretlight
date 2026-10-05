import { useEffect, useRef, useState } from 'react'
import type { Transport } from '../player/transport'
import { useTransportState } from '../player/transport'
import { formatBeat, formatClock } from './format'
import { trackRole, type LoadedScore } from '../import/alphatab'
import { INSTRUMENTS, type InstrumentId } from '../audio/instrument'

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5]

interface Props {
  transport: Transport
  /** Phone layout: two rows, no keyboard hint. */
  compact?: boolean
  /** Imported file with several parts, when the current song came from one. */
  parts?: LoadedScore | null
  onPart?: (trackIndex: number) => void
}

export function TransportBar({ transport, compact = false, parts = null, onPart }: Props) {
  const state = useTransportState(transport)
  const { song, playing, speed, loop, loopEnabled, length, bpm, metronome, instrument, instrumentLoading } = state
  const [pos, setPos] = useState(0)
  const dragging = useRef(false)
  const rail = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let raf = 0
    const loop = () => {
      if (!dragging.current) setPos(Math.max(0, transport.position()))
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

  const playButtons = (
    <>
      <button className="btn primary" onClick={() => transport.toggle()} title="Space">
        {playing ? '❚❚ Pause' : '▶ Play'}
      </button>
      <button className="btn" onClick={() => transport.stop()} title="Back to start">
        ■
      </button>
    </>
  )
  const speedButtons = (
    <div className="seg">
      {SPEEDS.map((s) => (
        <button key={s} className={`seg-btn ${speed === s ? 'on' : ''}`} onClick={() => transport.setSpeed(s)}>
          {s}×
        </button>
      ))}
    </div>
  )
  const clock = (
    <div className="clock mono">
      <span>{formatClock(song, pos, speed)}</span>
      <span className="dim"> / {formatClock(song, length, speed)}</span>
      <span className="dim"> · bar </span>
      <span>{formatBeat(song, pos)}</span>
      <span className="dim"> · ♩ </span>
      <span>{bpm}</span>
    </div>
  )
  const instrumentPicker = (
    <label className="instrument" title={INSTRUMENTS.find((i) => i.id === instrument)?.blurb}>
      <span className="dim small">🎸</span>
      <select value={instrument} onChange={(e) => transport.setInstrument(e.target.value as InstrumentId)}>
        {(['Electric', 'Acoustic', 'Other'] as const).map((g) => (
          <optgroup key={g} label={g}>
            {INSTRUMENTS.filter((i) => i.group === g).map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {instrumentLoading && <span className="dim small">loading…</span>}
    </label>
  )
  const clickButton = (
    <button className={`btn ${metronome ? 'on' : ''}`} onClick={() => transport.setMetronome(!metronome)} title="Metronome click">
      ♩ Click
    </button>
  )
  const loopButtons = (
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
        ⟲ Loop {loop && !compact ? `${formatBeat(song, loop.a)}–${formatBeat(song, loop.b)}` : ''}
      </button>
      <button className="btn ghost" disabled={!loop} onClick={() => transport.setLoop(null)}>
        Clear
      </button>
    </div>
  )

  const sections = song.sections ?? []
  const loopSection = (i: number) => {
    const a = sections[i].beat
    const b = sections[i + 1]?.beat ?? length
    transport.setLoop({ a, b })
    transport.seek(a)
  }
  const activeSection = sections.reduce((acc, s, i) => (s.beat <= pos ? i : acc), -1)

  return (
    <div className={`transport ${compact ? 'compact' : ''}`}>
      {parts && parts.tracks.length > 1 && (
        <div className="sections parts">
          <span className="dim small">Part:</span>
          {parts.tracks.map((t) => {
            const role = trackRole(t)
            return (
              <button
                key={t.index}
                className={`chip part ${t.index === parts.trackIndex ? 'on' : ''} role-${role}`}
                onClick={() => onPart?.(t.index)}
                title={`${t.name} · ${t.strings} strings · ${t.notes} notes`}
              >
                {t.name}
                <span className="role">{role}</span>
              </button>
            )
          })}
          <span className="dim small hint-inline">← switch guitar / bass part</span>
        </div>
      )}
      {sections.length > 0 && (
        <div className="sections">
          <span className="dim small">Sections:</span>
          {sections.map((s, i) => (
            <button
              key={`${s.beat}-${i}`}
              className={`chip ${i === activeSection ? 'on' : ''} ${loop && loop.a === s.beat ? 'looped' : ''}`}
              onClick={() => loopSection(i)}
              title={`Loop ${s.name} (bar ${formatBeat(song, s.beat)})`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
      {compact ? (
        <>
          <div className="transport-row">
            {playButtons}
            {clock}
          </div>
          <div className="transport-row">
            {speedButtons}
            {clickButton}
            {instrumentPicker}
            <div className="spacer" />
            {loopButtons}
          </div>
        </>
      ) : (
        <div className="transport-row">
          {playButtons}
          {speedButtons}
          {clickButton}
          {instrumentPicker}
          {clock}
          <div className="spacer" />
          {loopButtons}
        </div>
      )}
      <div className="rail" ref={rail} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
        {loop && <div className={`rail-loop ${loopEnabled ? 'on' : ''}`} style={{ left: pct(loop.a), width: pct(loop.b - loop.a) }} />}
        {Array.from({ length: Math.floor(length / song.beatsPerBar) }, (_, i) => (
          <div key={i} className="rail-bar" style={{ left: pct((i + 1) * song.beatsPerBar) }} />
        ))}
        <div className="rail-fill" style={{ width: pct(pos) }} />
        <div className="rail-head" style={{ left: pct(pos) }} />
      </div>
      {!compact && (
        <div className="hint dim">Space play/pause · ← → one bar · A / B set loop points · L toggle loop · drag the bar to scrub</div>
      )}
    </div>
  )
}
