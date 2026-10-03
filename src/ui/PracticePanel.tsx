import { useEffect, useMemo, useState } from 'react'
import { LICKS, LICK_STYLES } from '../exercises/licks'
import {
  NOTE_VALUES,
  PATTERNS,
  ROOT_NAMES,
  SCALES,
  SHAPES,
  buildExercise,
  shapeCount,
  type ExerciseSpec,
} from '../exercises/scales'
import type { Song } from '../model/song'
import type { Transport } from '../player/transport'
import { useTransportState } from '../player/transport'

interface Props {
  transport: Transport
  song: Song
  /** Load a generated exercise or lick; loops the whole thing by default. */
  onLoad: (song: Song) => void
}

const DEFAULT_SPEC: ExerciseSpec = {
  root: 9, // A
  scaleId: 'minor',
  shape: 'nps3',
  position: 0,
  pattern: 'updown',
  noteValue: 0.25,
  bpm: 80,
}

export function PracticePanel({ transport, song, onLoad }: Props) {
  const state = useTransportState(transport)
  const [spec, setSpec] = useState<ExerciseSpec>(DEFAULT_SPEC)
  const [rampOn, setRampOn] = useState(false)
  const [rampStep, setRampStep] = useState(4)
  const [rampMax, setRampMax] = useState(160)
  const positions = shapeCount(spec)

  const exercise = useMemo(() => buildExercise(spec), [spec])
  const update = (patch: Partial<ExerciseSpec>) => setSpec((s) => ({ ...s, ...patch }))

  useEffect(() => {
    transport.setRamp(rampOn ? { stepBpm: rampStep, maxBpm: rampMax } : null)
  }, [transport, rampOn, rampStep, rampMax])

  const isLoaded = song.id === exercise.id

  return (
    <>
      <section>
        <h3>Scale builder</h3>
        <div className="grid2">
          <label>
            <span className="dim small">Root</span>
            <select value={spec.root} onChange={(e) => update({ root: Number(e.target.value) })}>
              {ROOT_NAMES.map((n, i) => (
                <option key={n} value={i}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="dim small">Scale / mode</span>
            <select value={spec.scaleId} onChange={(e) => update({ scaleId: e.target.value, position: 0 })}>
              {['Scales', 'Modes', 'Pentatonic & blues'].map((g) => (
                <optgroup key={g} label={g}>
                  {SCALES.filter((s) => s.group === g).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label>
            <span className="dim small">Shape</span>
            <select value={spec.shape} onChange={(e) => update({ shape: e.target.value as ExerciseSpec['shape'], position: 0 })}>
              {SHAPES.map((s) => (
                <option key={s.id} value={s.id} title={s.help}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="dim small">{spec.shape === 'horizontal' ? 'String' : 'Position'}</span>
            <select value={spec.position} onChange={(e) => update({ position: Number(e.target.value) })}>
              {Array.from({ length: positions }, (_, i) => (
                <option key={i} value={i}>
                  {spec.shape === 'horizontal' ? ['Low E', 'A', 'D', 'G', 'B', 'High e'][i] ?? i + 1 : `Position ${i + 1}`}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="dim small">Pattern</span>
            <select value={spec.pattern} onChange={(e) => update({ pattern: e.target.value as ExerciseSpec['pattern'] })}>
              {PATTERNS.map((p) => (
                <option key={p.id} value={p.id} title={p.help}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="dim small">Note value</span>
            <select value={spec.noteValue} onChange={(e) => update({ noteValue: Number(e.target.value) })}>
              {NOTE_VALUES.map((v) => (
                <option key={v.name} value={v.beats}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="range">
          <span className="dim small">
            Start tempo <b className="mono">{spec.bpm} bpm</b>
          </span>
          <input type="range" min={40} max={200} step={2} value={spec.bpm} onChange={(e) => update({ bpm: Number(e.target.value) })} />
        </label>
        <p className="dim small">{SHAPES.find((s) => s.id === spec.shape)?.help} {PATTERNS.find((p) => p.id === spec.pattern)?.help}</p>
        <button className={`btn ${isLoaded ? 'on' : 'primary'}`} onClick={() => onLoad(exercise)}>
          {isLoaded ? '✓ Loaded · reload' : '▶ Load exercise'} · {exercise.notes.length} notes
        </button>
      </section>

      <section>
        <h3>Speed trainer</h3>
        <label className="check">
          <input type="checkbox" checked={rampOn} onChange={(e) => setRampOn(e.target.checked)} /> Speed up every loop
        </label>
        <div className="grid2">
          <label>
            <span className="dim small">Add per loop</span>
            <select value={rampStep} onChange={(e) => setRampStep(Number(e.target.value))} disabled={!rampOn}>
              {[2, 4, 5, 8, 10].map((v) => (
                <option key={v} value={v}>
                  +{v} bpm
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="dim small">Stop at</span>
            <select value={rampMax} onChange={(e) => setRampMax(Number(e.target.value))} disabled={!rampOn}>
              {[100, 120, 140, 160, 180, 200, 240].map((v) => (
                <option key={v} value={v}>
                  {v} bpm
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="check">
          <input type="checkbox" checked={state.metronome} onChange={(e) => transport.setMetronome(e.target.checked)} /> Metronome click
        </label>
        <label className="check">
          <input type="checkbox" checked={state.countIn} onChange={(e) => transport.setCountIn(e.target.checked)} /> One bar count-in
        </label>
        <p className="dim small">
          Now at <b className="mono">{state.bpm} bpm</b>. The trainer needs a loop: load an exercise or lick, or set A and B on a song.
        </p>
      </section>

      <section>
        <h3>Licks &amp; warm-ups</h3>
        {LICK_STYLES.map((style) => (
          <div key={style} className="lick-group">
            <div className="dim small">{style}</div>
            <ul className="song-list">
              {LICKS.filter((l) => l.composer === style).map((l) => (
                <li key={l.id}>
                  <button className={`song ${song.id === l.id ? 'on' : ''}`} onClick={() => onLoad(l)}>
                    <span className="song-title">{l.title}</span>
                    <span className="song-meta dim">{l.tempo} bpm</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {song.blurb && (song.id.startsWith('lick-') || song.id.startsWith('exercise-')) && <p className="blurb dim">{song.blurb}</p>}
        <p className="dim small">All licks are in A, around the 5th position, so they chain together. Legend: dashed bubble = hammer-on or pull-off, ↑ = bend, / = slide, ~ = vibrato, T = tap.</p>
      </section>
    </>
  )
}
