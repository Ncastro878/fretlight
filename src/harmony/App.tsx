import { useEffect, useMemo, useRef, useState } from 'react'
import { INSTRUMENTS, type InstrumentId } from '../audio/instrument'
import { assignFingers } from '../model/fingers'
import { STANDARD_TUNING, type Song, type SongNote } from '../model/song'
import { Transport, useTransportState } from '../player/transport'
import { detectKey } from '../analysis/key'
import { diatonicChords, keyName, spell, NOTE_NAMES_SHARP, type Key, type Mode } from './theory'
import { TIERS, midiAt, suggestionsFor, type MelodyNote, type Suggestion, type Tier, type Voicing } from './voicings'
import { Fretboard, MiniDiagram } from './ui/Fretboard'

interface Step {
  note: MelodyNote
  beats: number
  /** Chosen voicing frets, or null for melody only. */
  voicing: Voicing | null
}

const FAMILIES = ['Triads', 'Sus, 6 & add9', '7th chords', 'Extensions'] as const
const STORAGE = 'fretlight.harmony.v1'

function encode(key: Key, steps: Step[]): string {
  const packed = { k: key, s: steps.map((st) => ({ n: [st.note.string, st.note.fret], b: st.beats, v: st.voicing ? st.voicing.frets : null, c: st.voicing ? st.voicing.name : null })) }
  return btoa(unescape(encodeURIComponent(JSON.stringify(packed)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function strumNotes(step: Step, start: number, tuning: number[]): SongNote[] {
  const melodyMidi = midiAt(step.note.string, step.note.fret)
  void tuning
  if (!step.voicing) return [{ time: start, duration: step.beats, string: step.note.string, fret: step.note.fret }]
  const out: SongNote[] = []
  let k = 0
  step.voicing.frets.forEach((f, s) => {
    if (f < 0) return
    out.push({ time: start + k * 0.02, duration: step.beats, string: s, fret: f, finger: f > 0 ? step.voicing!.fingers[s] || undefined : undefined, letRing: true })
    k++
  })
  void melodyMidi
  return out
}

export function arrangementSong(key: Key, steps: Step[], tempo: number): Song {
  const notes: SongNote[] = []
  const sections: { beat: number; name: string }[] = []
  let t = 0
  steps.forEach((st) => {
    notes.push(...strumNotes(st, t, STANDARD_TUNING))
    if (st.voicing) sections.push({ beat: t, name: st.voicing.name })
    t += st.beats
  })
  // Pad to a whole bar so the loop breathes.
  const beatsPerBar = 4
  const length = Math.max(beatsPerBar, Math.ceil(t / beatsPerBar) * beatsPerBar)
  if (notes.length === 0) notes.push({ time: 0, duration: 0.01, string: 5, fret: 0 })
  return assignFingers({
    id: `harmony-${encode(key, steps).slice(0, 24)}`,
    title: `Chord melody in ${keyName(key)}`,
    composer: 'Harmonizer',
    tempo,
    beatsPerBar,
    tuning: STANDARD_TUNING,
    notes: notes.sort((a, b) => a.time - b.time || a.string - b.string),
    sections,
    blurb: `${steps.length} melody notes, ${steps.filter((s) => s.voicing).length} harmonized. ${length} beats.`,
  })
}

export default function App() {
  const params = new URLSearchParams(window.location.search)
  const [key, setKey] = useState<Key>({ root: 7, mode: 'major' })
  const [steps, setSteps] = useState<Step[]>([])
  const [selected, setSelected] = useState(-1)
  const [families, setFamilies] = useState<Set<string>>(() => new Set(FAMILIES))
  const [maxStrings, setMaxStrings] = useState(6)
  const [showKey, setShowKey] = useState(true)
  const [tempo, setTempo] = useState(80)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [tier, setTier] = useState<Tier | 'all'>('all')
  const transport = useMemo(() => new Transport(arrangementSong({ root: 7, mode: 'major' }, [], 80)), [])
  const tstate = useTransportState(transport)
  const previewTimer = useRef<number | null>(null)

  // Restore from URL or local storage.
  useEffect(() => {
    const raw = params.get('a') ?? localStorage.getItem(STORAGE)
    if (!raw) return
    try {
      const json = decodeURIComponent(escape(atob(raw.replace(/-/g, '+').replace(/_/g, '/'))))
      const packed = JSON.parse(json) as { k: Key; s: { n: [number, number]; b: number; v: number[] | null; c: string | null }[] }
      setKey(packed.k)
      const chords = diatonicChords(packed.k)
      const restored: Step[] = packed.s.map((st) => {
        const note = { string: st.n[0], fret: st.n[1] }
        let voicing: Voicing | null = null
        if (st.v) {
          const sugg = suggestionsFor(chords, note, packed.k)
          for (const sg of sugg) {
            const hit = sg.voicings.find((v) => v.frets.join(',') === st.v!.join(','))
            if (hit) {
              voicing = hit
              break
            }
          }
        }
        return { note, beats: st.b, voicing }
      })
      setSteps(restored)
      setSelected(restored.length ? 0 : -1)
    } catch {
      // ignore bad data
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (steps.length) localStorage.setItem(STORAGE, encode(key, steps))
  }, [key, steps])

  const chords = useMemo(() => diatonicChords(key), [key])
  const current = selected >= 0 ? steps[selected] : null
  const suggestions: Suggestion[] = useMemo(() => (current ? suggestionsFor(chords, current.note, key, families, maxStrings) : []), [chords, current, key, families, maxStrings])
  const visible = tier === 'all' ? suggestions : suggestions.filter((s) => s.voicings.some((v) => v.tier === tier))

  const addNote = (note: MelodyNote) => {
    setSteps((s) => [...s, { note, beats: 1, voicing: null }])
    setSelected(steps.length)
    preview([{ note, beats: 1, voicing: null }])
  }
  const removeStep = (i: number) => {
    setSteps((s) => s.filter((_, k) => k !== i))
    setSelected((cur) => (cur >= i ? Math.max(-1, cur - 1) : cur))
  }
  const setVoicing = (i: number, v: Voicing | null) => setSteps((s) => s.map((st, k) => (k === i ? { ...st, voicing: v } : st)))
  const setBeats = (i: number, b: number) => setSteps((s) => s.map((st, k) => (k === i ? { ...st, beats: b } : st)))

  /** Hear one step (a strum) without touching the arrangement playback. */
  const preview = (list: Step[]) => {
    const song = arrangementSong(key, list, 80)
    transport.setSong(song)
    void transport.play()
    if (previewTimer.current) window.clearTimeout(previewTimer.current)
    previewTimer.current = window.setTimeout(() => transport.pause(), 1600)
  }
  const previewVoicing = (v: Voicing) => current && preview([{ ...current, beats: 2, voicing: v }])

  const playAll = () => {
    if (previewTimer.current) window.clearTimeout(previewTimer.current)
    transport.setSong(arrangementSong(key, steps, tempo), { loopAll: true })
    void transport.play()
  }
  const stop = () => transport.pause()

  const detect = () => {
    if (steps.length < 3) return
    const song = arrangementSong(key, steps.map((s) => ({ ...s, voicing: null })), tempo)
    const g = detectKey(song)
    if (g) setKey({ root: g.root, mode: g.mode })
  }

  const share = () => {
    const url = `${location.origin}${location.pathname}?a=${encode(key, steps)}`
    void navigator.clipboard?.writeText(url)
    history.replaceState(null, '', url)
    alert('Link copied.')
  }
  const openInFretlight = () => {
    localStorage.setItem('fretlight.handoff', JSON.stringify(arrangementSong(key, steps, tempo)))
    window.open('/?handoff=1', '_blank')
  }
  const tabText = () => {
    const names = ['e', 'B', 'G', 'D', 'A', 'E']
    const lines = names.map((n) => `${n}|`)
    for (const st of steps) {
      const frets = st.voicing ? st.voicing.frets : [-1, -1, -1, -1, -1, -1].map((_, s) => (s === st.note.string ? st.note.fret : -1))
      for (let s = 5; s >= 0; s--) {
        const f = frets[s]
        const cell = f < 0 ? '-' : String(f)
        lines[5 - s] += cell.padEnd(3, '-') + '-'.repeat(Math.max(0, Math.round(st.beats * 2) - 1))
      }
    }
    const chordLine = '   ' + steps.map((st) => (st.voicing ? st.voicing.name : '').padEnd(3 + Math.max(0, Math.round(st.beats * 2) - 1))).join('')
    return chordLine + '\n' + lines.map((l) => l + '|').join('\n')
  }

  const setKeyRoot = (root: number) => {
    setKey({ ...key, root })
    setSteps((s) => s.map((st) => ({ ...st, voicing: null })))
  }
  const setMode = (mode: Mode) => {
    setKey({ ...key, mode })
    setSteps((s) => s.map((st) => ({ ...st, voicing: null })))
  }

  return (
    <div className="hz">
      <header className="hz-top">
        <div>
          <h1>Harmonizer</h1>
          <div className="dim small">Click melody notes on the neck. For each one, see every chord in the key you can put under it, easiest first.</div>
        </div>
        <div className="row">
          <a className="btn small ghost" href="/">
            ← Fretlight
          </a>
          <a className="btn small ghost" href="/tone/">
            Tone Lab
          </a>
        </div>
      </header>

      <div className="hz-main">
        <aside className="hz-panel">
          <section>
            <h3>Key</h3>
            <div className="row">
              <select value={key.root} onChange={(e) => setKeyRoot(Number(e.target.value))}>
                {NOTE_NAMES_SHARP.map((n, i) => (
                  <option key={n} value={i}>
                    {spell(i, { root: i, mode: key.mode })}
                  </option>
                ))}
              </select>
              <div className="seg">
                <button className={`seg-btn ${key.mode === 'major' ? 'on' : ''}`} onClick={() => setMode('major')}>
                  major
                </button>
                <button className={`seg-btn ${key.mode === 'minor' ? 'on' : ''}`} onClick={() => setMode('minor')}>
                  minor
                </button>
              </div>
              <button className="btn small ghost" onClick={detect} disabled={steps.length < 3} title="Guess the key from the melody notes">
                Detect
              </button>
            </div>
            <label className="check">
              <input type="checkbox" checked={showKey} onChange={(e) => setShowKey(e.target.checked)} /> Show key notes on the neck
            </label>
            <p className="dim small">
              {chords.length} chords live in {keyName(key)}: {[...new Set(chords.filter((c) => c.quality.complexity === 0).map((c) => spell(c.root, key) + c.quality.label))].join(' · ')} and their 7ths and extensions.
            </p>
          </section>

          <section>
            <h3>Melody</h3>
            {steps.length === 0 ? (
              <p className="dim small">Click frets on the neck to add melody notes in order. Try G (fret 3), then E (open), then D (fret 10) on the high e string.</p>
            ) : (
              <ol className="melody">
                {steps.map((st, i) => (
                  <li key={i} className={i === selected ? 'on' : ''}>
                    <button className="linkish" onClick={() => setSelected(i)}>
                      <b>{spell(midiAt(st.note.string, st.note.fret) % 12, key)}</b> <span className="dim">str {6 - st.note.string} fr {st.note.fret}</span>
                    </button>
                    <span className="chord">{st.voicing ? st.voicing.name : <span className="dim">—</span>}</span>
                    <select value={st.beats} onChange={(e) => setBeats(i, Number(e.target.value))} title="Beats">
                      {[0.5, 1, 1.5, 2, 3, 4].map((b) => (
                        <option key={b} value={b}>
                          {b}♩
                        </option>
                      ))}
                    </select>
                    <button className="mini danger" onClick={() => removeStep(i)} title="Remove">
                      ✕
                    </button>
                  </li>
                ))}
              </ol>
            )}
            <div className="row">
              <button className="btn primary small" onClick={tstate.playing && !previewTimer.current ? stop : playAll} disabled={steps.length === 0}>
                {tstate.playing ? '■ Stop' : '▶ Play arrangement'}
              </button>
              <label className="range small">
                <span className="dim">{tempo} bpm</span>
                <input type="range" min={40} max={160} step={2} value={tempo} onChange={(e) => setTempo(Number(e.target.value))} />
              </label>
            </div>
            <div className="row">
              <label className="instrument">
                <span className="dim small">🎸</span>
                <select value={tstate.instrument} onChange={(e) => transport.setInstrument(e.target.value as InstrumentId)}>
                  {INSTRUMENTS.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="row">
              <button className="btn small" onClick={share} disabled={steps.length === 0}>
                Copy share link
              </button>
              <button className="btn small" onClick={openInFretlight} disabled={steps.length === 0} title="See it on the 3D neck with the full player">
                Open in Fretlight 3D
              </button>
              <button className="btn small ghost" onClick={() => void navigator.clipboard?.writeText(tabText())} disabled={steps.length === 0}>
                Copy as tab
              </button>
              <button className="btn small ghost" onClick={() => (setSteps([]), setSelected(-1), localStorage.removeItem(STORAGE))} disabled={steps.length === 0}>
                Clear
              </button>
            </div>
            {steps.length > 0 && <pre className="tab">{tabText()}</pre>}
          </section>
        </aside>

        <main className="hz-stage">
          <Fretboard
            keySig={key}
            melody={steps.map((s) => s.note)}
            selected={selected}
            voicing={current?.voicing ? current.voicing.frets : null}
            fingers={current?.voicing ? current.voicing.fingers : undefined}
            onPick={addNote}
            onSelect={setSelected}
            showKey={showKey}
          />
          <div className="hz-legend dim small">
            <span><i className="sw melody" /> melody note</span>
            <span><i className="sw sel" /> selected</span>
            <span><i className="sw chord" /> chord under it (finger numbers)</span>
            <span><i className="sw root" /> key root</span>
            <span><i className="sw key" /> in key</span>
          </div>

          {current ? (
            <section className="options">
              <div className="row between wrap">
                <h3>
                  Chords under <b>{spell(midiAt(current.note.string, current.note.fret) % 12, key)}</b> (string {6 - current.note.string}, fret {current.note.fret}) in {keyName(key)}:
                  <span className="dim"> {visible.length} chords</span>
                </h3>
                <div className="row">
                  <div className="seg">
                    <button className={`seg-btn ${tier === 'all' ? 'on' : ''}`} onClick={() => setTier('all')}>
                      All
                    </button>
                    {TIERS.map((t) => (
                      <button key={t} className={`seg-btn ${tier === t ? 'on' : ''}`} onClick={() => setTier(t)}>
                        {t}
                      </button>
                    ))}
                  </div>
                  <select value={maxStrings} onChange={(e) => setMaxStrings(Number(e.target.value))} title="Most strings a voicing may use">
                    {[3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        ≤ {n} strings
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="row families">
                {FAMILIES.map((f) => (
                  <label key={f} className="check">
                    <input
                      type="checkbox"
                      checked={families.has(f)}
                      onChange={(e) => {
                        const next = new Set(families)
                        if (e.target.checked) next.add(f)
                        else next.delete(f)
                        setFamilies(next)
                      }}
                    />
                    {f}
                  </label>
                ))}
                <button className="btn small ghost" onClick={() => setVoicing(selected, null)} disabled={!current.voicing}>
                  Melody only (no chord)
                </button>
              </div>
              <ul className="chordlist">
                {visible.map((sg) => {
                  const list = tier === 'all' ? sg.voicings : sg.voicings.filter((v) => v.tier === tier)
                  const head = list[0]
                  const open = expanded === sg.name
                  const chosen = current.voicing?.name === sg.name
                  return (
                    <li key={sg.name} className={`chordrow tier-${head.tier} ${chosen ? 'chosen' : ''}`}>
                      <div className="chordhead" onClick={() => previewVoicing(head)} title="Click to hear">
                        <MiniDiagram frets={head.frets} fingers={head.fingers} melodyString={current.note.string} />
                        <div className="chordinfo">
                          <div className="chordname">
                            {sg.name} <span className="numeral dim">{sg.numeral}</span>
                          </div>
                          <div className="small">
                            melody is the <b>{sg.melodyRole}</b> · {head.strings} strings · {head.fingerCount} finger{head.fingerCount === 1 ? '' : 's'}
                            {head.notes.length ? ` · ${head.notes.join(', ')}` : ''}
                          </div>
                          <div className="small">
                            <span className={`tierchip ${head.tier}`}>{head.tier}</span> <span className="mono dim">{head.frets.map((f) => (f < 0 ? 'x' : f)).join(head.frets.some((f) => f > 9) ? ' ' : '')}</span>
                          </div>
                        </div>
                        <div className="chordactions" onClick={(e) => e.stopPropagation()}>
                          <button className={`btn small ${chosen && current.voicing?.frets.join() === head.frets.join() ? 'on' : 'primary'}`} onClick={() => setVoicing(selected, head)}>
                            Use
                          </button>
                          <button className="btn small ghost" onClick={() => setExpanded(open ? null : sg.name)}>
                            {open ? 'Fewer' : `${list.length} voicings`}
                          </button>
                        </div>
                      </div>
                      {open && (
                        <div className="voicings">
                          {list.map((v, i) => (
                            <div key={i} className={`voicing ${current.voicing?.frets.join() === v.frets.join() ? 'chosen' : ''}`} onClick={() => previewVoicing(v)} title="Click to hear">
                              <MiniDiagram frets={v.frets} fingers={v.fingers} melodyString={current.note.string} />
                              <div className="small">
                                <span className={`tierchip ${v.tier}`}>{v.tier}</span>
                                <div className="mono dim">{v.frets.map((f) => (f < 0 ? 'x' : f)).join(v.frets.some((f) => f > 9) ? ' ' : '')}</div>
                                <div className="dim">
                                  {v.strings} str · {v.fingerCount} fingers{v.notes.length ? ` · ${v.notes.join(', ')}` : ''}
                                </div>
                              </div>
                              <button
                                className="btn small"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setVoicing(selected, v)
                                }}
                              >
                                Use
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </li>
                  )
                })}
                {visible.length === 0 && <li className="dim small">No chords in this tier with the current filters.</li>}
              </ul>
            </section>
          ) : (
            <section className="options">
              <h3>How this works</h3>
              <p className="small">
                Pick a key, then click the frets of your melody in order. Select a melody note and the list shows every chord in the key that contains it, voiced with that note on top so it stays the melody. Each chord shows its easiest voicing first; open it for alternatives. Click a diagram to hear it, Use to put it under the note, then Play the whole arrangement.
              </p>
              <p className="small dim">
                Ranking: fewer strings and fingers, small fret spans, no barres, no muted inner strings, and plain triads score easiest. Seventh chords, extensions, barres, and five- or six-string shapes score harder. Double stops (a third or sixth under the melody) are the gentlest start.
              </p>
            </section>
          )}
        </main>
      </div>
    </div>
  )
}
