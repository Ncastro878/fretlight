import { useEffect, useState } from 'react'
import { midiOf, noteName, type Song, type SongNote } from '../model/song'
import type { Transport } from '../player/transport'
import { lowerBound } from '../player/transport'
import { FINGER_COLORS } from '../scene/geometry'

interface Props {
  transport: Transport
  song: Song
}

const FINGER_NAMES: Record<number, string> = { 1: 'index', 2: 'middle', 3: 'ring', 4: 'pinky' }
const STRING_LABELS = ['6th', '5th', '4th', '3rd', '2nd', '1st']

export function RightPanel({ transport, song }: Props) {
  const [now, setNow] = useState<SongNote[]>([])
  const [next, setNext] = useState<SongNote[]>([])

  useEffect(() => {
    const id = window.setInterval(() => {
      const pos = transport.position()
      const notes = song.notes
      const sounding: SongNote[] = []
      const upcoming: SongNote[] = []
      for (let i = lowerBound(notes, pos - 4); i < notes.length && upcoming.length < 6; i++) {
        const n = notes[i]
        if (n.time <= pos && n.time + Math.max(n.duration, 0.25) > pos) sounding.push(n)
        else if (n.time > pos) upcoming.push(n)
      }
      setNow(sounding)
      setNext(upcoming)
    }, 80)
    return () => window.clearInterval(id)
  }, [transport, song])

  const row = (n: SongNote, i: number) => {
    const color = FINGER_COLORS[n.fret === 0 ? 0 : (n.finger ?? 1)]
    const label = song.tuning.length === 6 ? STRING_LABELS[n.string] : `str ${song.tuning.length - n.string}`
    return (
      <li key={`${n.time}-${n.string}-${i}`} className="note-row">
        <span className="dot" style={{ background: color }} />
        <span className="mono note-name">{noteName(midiOf(song, n))}</span>
        <span className="dim">
          {label} string · fret {n.fret}
        </span>
        <span className="finger" style={{ color }}>
          {n.fret === 0 ? 'open' : (FINGER_NAMES[n.finger ?? 0] ?? '')}
        </span>
      </li>
    )
  }

  return (
    <aside className="panel right">
      <section>
        <h3>Now</h3>
        {now.length === 0 ? <p className="dim small">Press play.</p> : <ul className="notes">{now.map(row)}</ul>}
      </section>
      <section>
        <h3>Next</h3>
        {next.length === 0 ? <p className="dim small">End of song.</p> : <ul className="notes">{next.map(row)}</ul>}
      </section>
      <section>
        <h3>Finger colors</h3>
        <ul className="legend">
          {[0, 1, 2, 3, 4].map((f) => (
            <li key={f}>
              <span className="dot" style={{ background: FINGER_COLORS[f] }} />
              {f === 0 ? 'Open string' : `${f} · ${FINGER_NAMES[f]}`}
            </li>
          ))}
        </ul>
        <p className="dim small">
          Fingerings come from the tab file when it has them. Otherwise they are suggested from hand position and may not match your
          teacher's.
        </p>
      </section>
    </aside>
  )
}
