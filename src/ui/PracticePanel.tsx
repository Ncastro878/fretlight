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
import {
  PRESETS,
  QUALITIES,
  STRUMS,
  buildChordSong,
  buildProgression,
  chordName,
  presetSlots,
  voicingFor,
  voicingLabel,
  type Quality,
  type Slot,
  type StrumId,
} from '../exercises/chords'
import { starterRoutine, type RoutineRunner } from '../practice/routine'

interface Props {
  transport: Transport
  song: Song
  /** Load a generated exercise or lick; loops the whole thing by default. */
  onLoad: (song: Song) => void
  routine: RoutineRunner
}

export function formatSec(sec: number): string {
  const s = Math.max(0, sec)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
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

export function PracticePanel({ transport, song, onLoad, routine }: Props) {
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

  // Chords
  const [chordRoot, setChordRoot] = useState(9)
  const [chordQuality, setChordQuality] = useState<Quality>('maj')
  const [keyRoot, setKeyRoot] = useState(0)
  const [presetId, setPresetId] = useState(PRESETS[0].id)
  const [strum, setStrum] = useState<StrumId>('folk')
  const [chordBpm, setChordBpm] = useState(90)
  const [slots, setSlots] = useState<Slot[]>(() => presetSlots(PRESETS[0], 0))
  const applyPreset = (id: string, root: number) => {
    const preset = PRESETS.find((p) => p.id === id) ?? PRESETS[0]
    setPresetId(id)
    setKeyRoot(root)
    setSlots(presetSlots(preset, root))
  }
  const updateSlot = (i: number, patch: Partial<Slot> | { root?: number; quality?: Quality }) =>
    setSlots((list) =>
      list.map((sl, k) => {
        if (k !== i) return sl
        if ('root' in patch || 'quality' in patch) {
          const q = patch as { root?: number; quality?: Quality }
          return { ...sl, chord: { root: q.root ?? sl.chord.root, quality: q.quality ?? sl.chord.quality } }
        }
        return { ...sl, ...(patch as Partial<Slot>) }
      }),
    )
  const progression = useMemo(() => buildProgression({ slots, strum, bpm: chordBpm }), [slots, strum, chordBpm])
  const explorerChord = { root: chordRoot, quality: chordQuality }
  const explorerVoicing = voicingFor(explorerChord)
  const [stepMinutes, setStepMinutes] = useState(3)

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
        <h3>Chords</h3>
        <div className="grid2">
          <label>
            <span className="dim small">Chord</span>
            <select value={chordRoot} onChange={(e) => setChordRoot(Number(e.target.value))}>
              {ROOT_NAMES.map((n, i) => (
                <option key={n} value={i}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="dim small">Quality</span>
            <select value={chordQuality} onChange={(e) => setChordQuality(e.target.value as Quality)}>
              {QUALITIES.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name} ({chordName({ root: chordRoot, quality: q.id })})
                </option>
              ))}
            </select>
          </label>
        </div>
        <button className="btn" onClick={() => onLoad(buildChordSong(explorerChord, 80))}>
          Show {chordName(explorerChord)} on the neck · <span className="mono dim">{voicingLabel(explorerVoicing)}</span>
        </button>

        <div className="dim small" style={{ marginTop: 6 }}>
          Progression
        </div>
        <div className="grid2">
          <label>
            <span className="dim small">Key</span>
            <select value={keyRoot} onChange={(e) => applyPreset(presetId, Number(e.target.value))}>
              {ROOT_NAMES.map((n, i) => (
                <option key={n} value={i}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="dim small">Preset</span>
            <select value={presetId} onChange={(e) => applyPreset(e.target.value, keyRoot)}>
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="dim small">Strum</span>
            <select value={strum} onChange={(e) => setStrum(e.target.value as StrumId)}>
              {STRUMS.map((st) => (
                <option key={st.id} value={st.id} title={st.help}>
                  {st.name}
                </option>
              ))}
            </select>
          </label>
          <label className="range">
            <span className="dim small">
              Tempo <b className="mono">{chordBpm}</b>
            </span>
            <input type="range" min={50} max={160} step={2} value={chordBpm} onChange={(e) => setChordBpm(Number(e.target.value))} />
          </label>
        </div>
        <div className="slots">
          {slots.map((sl, i) => (
            <div key={i} className="slot">
              <select value={sl.chord.root} onChange={(e) => updateSlot(i, { root: Number(e.target.value) })}>
                {ROOT_NAMES.map((n, k) => (
                  <option key={n} value={k}>
                    {n}
                  </option>
                ))}
              </select>
              <select value={sl.chord.quality} onChange={(e) => updateSlot(i, { quality: e.target.value as Quality })}>
                {QUALITIES.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.label || 'maj'}
                  </option>
                ))}
              </select>
              <select value={sl.beats} onChange={(e) => updateSlot(i, { beats: Number(e.target.value) })}>
                {[2, 4, 8].map((b) => (
                  <option key={b} value={b}>
                    {b} beats
                  </option>
                ))}
              </select>
              <button className="btn ghost small" onClick={() => setSlots((l) => l.filter((_, k) => k !== i))} title="Remove">
                ✕
              </button>
            </div>
          ))}
          <button className="btn ghost small" onClick={() => setSlots((l) => [...l, { chord: { root: keyRoot, quality: 'maj' }, beats: 4 }])}>
            + Add chord
          </button>
        </div>
        <button className={`btn ${song.id === progression.id ? 'on' : 'primary'}`} onClick={() => onLoad(progression)} disabled={slots.length === 0}>
          {song.id === progression.id ? '✓ Loaded · reload' : '▶ Load progression'} · {slots.map((sl) => chordName(sl.chord)).join(' ')}
        </button>
        <p className="dim small">{STRUMS.find((st) => st.id === strum)?.help} Barre chords are used when there is no open shape.</p>
      </section>

      <section>
        <h3>Routine</h3>
        {routine.running ? (
          <div className="row">
            <button className="btn" onClick={routine.next} disabled={routine.index + 1 >= routine.steps.length}>
              Next step ▸
            </button>
            <button className="btn ghost" onClick={routine.stop}>
              ■ Stop routine
            </button>
          </div>
        ) : (
          <div className="row">
            <button className="btn primary" onClick={() => routine.start(0)} disabled={routine.steps.length === 0}>
              ▶ Start routine
            </button>
            <button className="btn ghost" onClick={() => routine.setSteps(starterRoutine())}>
              {routine.steps.length ? 'Reset to starter' : 'Load 20-minute starter'}
            </button>
          </div>
        )}
        <ul className="routine-list">
          {routine.steps.map((st, i) => (
            <li key={st.id} className={`routine-step ${routine.running && i === routine.index ? 'on' : ''}`}>
              <button className="name btn ghost small" onClick={() => (routine.running ? routine.start(i) : onLoad(st.song))} title={st.song.title} style={{ textAlign: 'left' }}>
                {i + 1}. {st.song.title}
              </button>
              <input
                type="number"
                min={1}
                max={60}
                value={st.minutes}
                onChange={(e) => routine.setSteps(routine.steps.map((x) => (x.id === st.id ? { ...x, minutes: Math.max(1, Number(e.target.value) || 1) } : x)))}
                title="Minutes"
              />
              <button
                className="btn ghost small"
                disabled={i === 0}
                onClick={() => {
                  const list = [...routine.steps]
                  ;[list[i - 1], list[i]] = [list[i], list[i - 1]]
                  routine.setSteps(list)
                }}
                title="Move up"
              >
                ↑
              </button>
              <button className="btn ghost small" onClick={() => routine.setSteps(routine.steps.filter((x) => x.id !== st.id))} title="Remove">
                ✕
              </button>
            </li>
          ))}
        </ul>
        <div className="row" style={{ alignItems: 'center' }}>
          <button className="btn small" onClick={() => routine.addStep(song, stepMinutes)}>
            + Add current ({song.title.length > 28 ? song.title.slice(0, 28) + '…' : song.title})
          </button>
          <select value={stepMinutes} onChange={(e) => setStepMinutes(Number(e.target.value))} style={{ width: 'auto' }}>
            {[1, 2, 3, 4, 5, 8, 10].map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </select>
        </div>
        <p className="dim small">
          Load anything (song, exercise, lick, chords) then add it. The routine plays each step on a loop for its minutes, then moves on. Total:{' '}
          {routine.steps.reduce((a, b) => a + b.minutes, 0)} min. Saved in this browser.
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
        <p className="dim small">Most licks are in A around the 5th position so they chain together; the style licks say otherwise in their notes. Legend: dashed bubble = hammer-on or pull-off, ↑ = bend, / = slide, ~ = vibrato, T = tap.</p>
      </section>
    </>
  )
}
