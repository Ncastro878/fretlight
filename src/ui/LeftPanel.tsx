import { useRef, useState } from 'react'
import { listStringedTracks, parseScore, scoreToSong, type ImportedTrack } from '../import/alphatab'
import { parseAsciiTab } from '../import/asciiTab'
import type { Song } from '../model/song'
import { CAMERA_PRESETS, type CameraPreset } from '../scene/CameraRig'
import { LIBRARY } from '../songs'
import { PracticePanel } from './PracticePanel'
import type { RoutineRunner } from '../practice/routine'
import type { Transport } from '../player/transport'

const SAMPLE_GROUPS: { title: string; items: { label: string; file: string }[] }[] = [
  {
    title: 'Classical',
    items: [
      { label: 'Romance (Spanish Romance)', file: 'anonymous-romance.gp3' },
      { label: 'Tárrega · Lágrima', file: 'tarrega-lagrima.gp3' },
      { label: 'Bach · Bourrée in E minor', file: 'bach-bourree-e-minor.gp4' },
      { label: 'Bach · Prelude BWV 999', file: 'bach-prelude-bwv999.gp' },
      { label: 'Sor · Study Op. 60 No. 1', file: 'sor-op60-no1.gp4' },
      { label: "Packington's Pound", file: 'packingtons-pound.gp4' },
      { label: 'Greensleeves (GP3)', file: 'traditional-greensleeves.gp3' },
    ],
  },
  {
    title: 'Rock',
    items: [
      { label: 'Metallica · Enter Sandman', file: 'rock/metallica--enter-sandman.gp3' },
      { label: 'Metallica · Nothing Else Matters', file: 'rock/metallica--nothing-else-matters.gp4' },
      { label: 'Metallica · Master of Puppets', file: 'rock/metallica--master-of-puppets.gp3' },
      { label: 'Metallica · One', file: 'rock/metallica--one.gp3' },
      { label: 'Metallica · Fade to Black', file: 'rock/metallica--fade-to-black.gp4' },
      { label: 'Metallica · Seek and Destroy', file: 'rock/metallica--seek-and-destroy.gp3' },
      { label: 'Metallica · For Whom the Bell Tolls', file: 'rock/metallica--for-whom-the-bell-tolls.gp3' },
      { label: 'blink-182 · All the Small Things', file: 'rock/blink-182--all-the-small-things.gp3' },
      { label: 'blink-182 · Dammit', file: 'rock/blink-182--dammit.gp3' },
      { label: "blink-182 · What's My Age Again", file: 'rock/blink-182--what-s-my-age-again.gp3' },
      { label: 'blink-182 · First Date', file: 'rock/blink-182--first-date.gp3' },
      { label: 'blink-182 · I Miss You', file: 'rock/blink-182--i-miss-you.gp4' },
      { label: "blink-182 · Adam's Song", file: 'rock/blink-182--adam-s-song.gp3' },
      { label: 'Polyphia · Bloodbath (8-string)', file: 'rock/polyphia--bloodbat.gpx' },
      { label: 'Polyphia · Ignite', file: 'rock/polyphia--ignite.gp5' },
    ],
  },
]

/**
 * Guess the track a guitarist wants: skip vocal and bass lines when possible,
 * then take the one with the most notes.
 */
function pickDefaultTrack(score: Awaited<ReturnType<typeof parseScore>>, tracks: ImportedTrack[]): number {
  const isVocal = (t: ImportedTrack) => /vocal|voice|voz|sing|lyric/i.test(t.name)
  const isBass = (t: ImportedTrack) => t.strings <= 5 || /bass/i.test(t.name)
  const candidates = tracks.filter((t) => !isVocal(t) && !isBass(t))
  const pool = candidates.length ? candidates : tracks.filter((t) => !isVocal(t)).length ? tracks.filter((t) => !isVocal(t)) : tracks
  let best = pool[0].index
  let bestNotes = -1
  for (const t of pool) {
    const n = countNotes(score, t.index)
    if (n > bestNotes) {
      bestNotes = n
      best = t.index
    }
  }
  return best
}

function countNotes(score: Awaited<ReturnType<typeof parseScore>>, trackIndex: number): number {
  let n = 0
  for (const staff of score.tracks[trackIndex].staves) {
    for (const bar of staff.bars) for (const v of bar.voices) for (const b of v.beats) n += b.notes.length
  }
  return n
}

interface Props {
  transport: Transport
  song: Song
  onSelectSong: (song: Song) => void
  onLoadExercise: (song: Song) => void
  tab: 'songs' | 'practice'
  onTab: (t: 'songs' | 'practice') => void
  routine: RoutineRunner
  showKey: boolean
  onShowKey: (v: boolean) => void
  preset: CameraPreset
  onPreset: (p: CameraPreset) => void
  showUpcoming: boolean
  onShowUpcoming: (v: boolean) => void
  showFingers: boolean
  onShowFingers: (v: boolean) => void
  showTab: boolean
  onShowTab: (v: boolean) => void
}

export function LeftPanel(p: Props) {
  const [imported, setImported] = useState<Song[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [loaded, setLoaded] = useState<{ score: Awaited<ReturnType<typeof parseScore>>; tracks: ImportedTrack[]; name: string; trackIndex: number } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const file = useRef<HTMLInputElement>(null)

  const addImported = (song: Song) => {
    // Switching tracks in the same file replaces its earlier entry.
    setImported((list) => [song, ...list.filter((s) => s.blurb !== song.blurb)].slice(0, 20))
    p.onSelectSong(song)
    setError(null)
  }

  const loadBuffer = async (data: ArrayBuffer, name: string) => {
    setBusy(name)
    try {
      const score = await parseScore(data)
      const tracks = listStringedTracks(score)
      if (tracks.length === 0) throw new Error('No guitar or bass tracks in that file.')
      const trackIndex = pickDefaultTrack(score, tracks)
      addImported(scoreToSong(score, trackIndex, name))
      setLoaded({ score, tracks, name, trackIndex })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  const switchTrack = (trackIndex: number) => {
    if (!loaded) return
    try {
      addImported(scoreToSong(loaded.score, trackIndex, loaded.name))
      setLoaded({ ...loaded, trackIndex })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const onFile = async (f: File) => loadBuffer(await f.arrayBuffer(), f.name)

  const onSample = async (file: string) => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}samples/${file}`)
      if (!res.ok) throw new Error(`Could not fetch ${file}`)
      await loadBuffer(await res.arrayBuffer(), file.split('/').pop() ?? file)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <aside className="panel left">
      <div className="seg tabs">
        <button className={`seg-btn ${p.tab === 'songs' ? 'on' : ''}`} onClick={() => p.onTab('songs')}>
          ♫ Songs
        </button>
        <button className={`seg-btn ${p.tab === 'practice' ? 'on' : ''}`} onClick={() => p.onTab('practice')}>
          ⚡ Practice
        </button>
      </div>
      {p.tab === 'practice' && <PracticePanel transport={p.transport} song={p.song} onLoad={p.onLoadExercise} routine={p.routine} />}
      {p.tab === 'songs' && (
      <>
      <section>
        <h3>Song library</h3>
        <ul className="song-list">
          {[...imported, ...LIBRARY].map((s) => (
            <li key={s.id}>
              <button className={`song ${s.id === p.song.id ? 'on' : ''}`} onClick={() => p.onSelectSong(s)}>
                <span className="song-title">{s.title}</span>
                <span className="song-meta dim">
                  {s.composer}
                  {s.composer ? ' · ' : ''}
                  {s.tempo} bpm
                </span>
              </button>
            </li>
          ))}
        </ul>
        {p.song.blurb && <p className="blurb dim">{p.song.blurb}</p>}
      </section>

      <section>
        <h3>Import</h3>
        <div className="row">
          <button className="btn" onClick={() => file.current?.click()}>
            Open Guitar Pro / MusicXML…
          </button>
          <button className="btn ghost" onClick={() => setPasteOpen((v) => !v)}>
            Paste ASCII tab
          </button>
        </div>
        <input
          ref={file}
          type="file"
          accept=".gp,.gpx,.gp3,.gp4,.gp5,.xml,.musicxml,.mxl,.alphatab,.tex"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void onFile(f)
            e.target.value = ''
          }}
        />
        {loaded && loaded.tracks.length > 1 && (
          <label className="track-select">
            <span className="dim small">Track in {loaded.name}:</span>
            <select value={loaded.trackIndex} onChange={(e) => switchTrack(Number(e.target.value))}>
              {loaded.tracks.map((t) => (
                <option key={t.index} value={t.index}>
                  {t.name} · {t.strings} strings
                </option>
              ))}
            </select>
          </label>
        )}
        {pasteOpen && (
          <div className="paste">
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={'e|-------0-1-0---|\nB|---1-3-------3-|\nG|-0-------------|\nD|---------------|\nA|---------------|\nE|---------------|'}
              rows={7}
              spellCheck={false}
            />
            <button
              className="btn small"
              onClick={() => {
                try {
                  addImported(parseAsciiTab(pasteText))
                  setPasteOpen(false)
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e))
                }
              }}
            >
              Load pasted tab
            </button>
          </div>
        )}
        {busy && <div className="dim small">Reading {busy}…</div>}
        {error && <div className="error">{error}</div>}
        <p className="dim small">
          Nothing is uploaded; files are read in your browser. ASCII tabs have no rhythm, so they play as even eighth notes.
        </p>
        {SAMPLE_GROUPS.map((g) => (
          <div key={g.title} className="sample-group">
            <div className="dim small">{g.title} tabs:</div>
            <div className="row">
              {g.items.map((s) => (
                <button key={s.file} className="btn small" onClick={() => void onSample(s.file)} title={s.file}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      </>
      )}

      <section>
        <h3>View</h3>
        <div className="seg wrap">
          {(Object.keys(CAMERA_PRESETS) as CameraPreset[]).map((k) => (
            <button key={k} className={`seg-btn ${p.preset === k ? 'on' : ''}`} onClick={() => p.onPreset(k)} title={CAMERA_PRESETS[k].help}>
              {CAMERA_PRESETS[k].label}
            </button>
          ))}
        </div>
        <label className="check">
          <input type="checkbox" checked={p.showUpcoming} onChange={(e) => p.onShowUpcoming(e.target.checked)} /> Preview upcoming notes
        </label>
        <label className="check">
          <input type="checkbox" checked={p.showFingers} onChange={(e) => p.onShowFingers(e.target.checked)} /> Finger numbers on frets
        </label>
        <label className="check">
          <input type="checkbox" checked={p.showTab} onChange={(e) => p.onShowTab(e.target.checked)} /> Scrolling tab strip
        </label>
        <label className="check">
          <input type="checkbox" checked={p.showKey} onChange={(e) => p.onShowKey(e.target.checked)} /> Key &amp; chord overlay
        </label>
        <p className="dim small">Drag to orbit · scroll to zoom · right-drag to pan</p>
      </section>
    </aside>
  )
}
