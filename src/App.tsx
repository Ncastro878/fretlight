import { useEffect, useMemo, useState } from 'react'
import type { Song } from './model/song'
import { Transport, useTransportState } from './player/transport'
import { Scene } from './scene/Scene'
import { CAMERA_PRESETS, type CameraPreset } from './scene/CameraRig'
import { LIBRARY } from './songs'
import { LeftPanel } from './ui/LeftPanel'
import { RightPanel } from './ui/RightPanel'
import { TabStrip } from './ui/TabStrip'
import { TransportBar } from './ui/TransportBar'
import { useRoutine } from './practice/routine'
import { scoreToSong, type LoadedScore } from './import/alphatab'
import { detectChords, detectKey } from './analysis/key'
import { formatSec } from './ui/PracticePanel'

/** Shareable links: ?song=<id>&at=<beat>&view=lap|neck|front|top&play=1 */
const params = new URLSearchParams(window.location.search)
const MOBILE_QUERY = '(max-width: 900px)'

type Drawer = 'none' | 'songs' | 'notes'

export default function App() {
  const transport = useMemo(() => {
    if (params.get('handoff')) {
      try {
        const raw = localStorage.getItem('fretlight.handoff')
        if (raw) return new Transport(JSON.parse(raw) as Song)
      } catch {
        // fall through to the library
      }
    }
    return new Transport(LIBRARY.find((s) => s.id === params.get('song')) ?? LIBRARY[0])
  }, [])
  const { song } = useTransportState(transport)
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches)
  const [drawer, setDrawer] = useState<Drawer>('none')
  const [tab, setTab] = useState<'songs' | 'practice' | 'learn'>(params.get('tab') === 'practice' ? 'practice' : params.get('tab') === 'learn' || params.get('lesson') ? 'learn' : 'songs')
  const [preset, setPreset] = useState<CameraPreset>(() => {
    const v = params.get('view')
    if (v && v in CAMERA_PRESETS) return v as CameraPreset
    // Phones in portrait see more of the neck from the close-up preset.
    return window.matchMedia(MOBILE_QUERY).matches ? 'neck' : 'lap'
  })
  const [presetNonce, setPresetNonce] = useState(0)
  const [showUpcoming, setShowUpcoming] = useState(true)
  const [showFingers, setShowFingers] = useState(true)
  const [showTab, setShowTab] = useState(true)
  const [overlay, setOverlay] = useState<'none' | 'key' | 'chord'>('none')
  const routine = useRoutine(transport)
  const [loadedScore, setLoadedScore] = useState<LoadedScore | null>(null)
  const switchPart = (trackIndex: number) => {
    if (!loadedScore) return
    const wasPlaying = transport.getSnapshot().playing
    const pos = Math.max(0, transport.position())
    const { loop, loopEnabled } = transport.getSnapshot()
    const next = scoreToSong(loadedScore.score, trackIndex, loadedScore.fileName, loadedScore.title)
    transport.setSong(next)
    if (loop) {
      transport.setLoop(loop)
      transport.setLoopEnabled(loopEnabled)
    }
    transport.seek(pos)
    if (wasPlaying) void transport.play()
    setLoadedScore({ ...loadedScore, trackIndex })
  }
  // Parts only apply while the imported song is the one playing.
  const partsFor = loadedScore && song.blurb === `Imported from ${loadedScore.fileName}` ? loadedScore : null
  const keyGuess = useMemo(() => (overlay !== 'none' ? detectKey(song) : null), [overlay, song])
  const chords = useMemo(() => (overlay !== 'none' ? detectChords(song) : null), [overlay, song])
  const loadStep = (s: Song, opts: { loop?: boolean; bpm?: number; metronome?: boolean; ramp?: { stepBpm: number; maxBpm: number } | null; play?: boolean } = {}) => {
    transport.setSong(s, { loopAll: opts.loop ?? true })
    if (opts.bpm) transport.setBpm(opts.bpm)
    else transport.setSpeed(1)
    if (opts.metronome !== undefined) transport.setMetronome(opts.metronome)
    if (opts.ramp !== undefined) transport.setRamp(opts.ramp)
    if (opts.play) void transport.play()
    if (isMobile) setDrawer('none')
  }

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY)
    const onChange = () => setIsMobile(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    // Handy for debugging from the console.
    ;(window as unknown as { fretlight: Transport }).fretlight = transport
    const at = Number(params.get('at'))
    if (at > 0) transport.seek(at)
    if (params.get('play')) void transport.play()
  }, [transport])

  const selectSong = (s: Song) => {
    transport.setSong(s)
    if (isMobile) setDrawer('none')
  }
  const loadExercise = (s: Song) => {
    transport.setSong(s, { loopAll: true })
    if (isMobile) setDrawer('none')
  }
  const choosePreset = (p: CameraPreset) => {
    setPreset(p)
    setPresetNonce((n) => n + 1)
    if (isMobile) setDrawer('none')
  }
  const toggleDrawer = (d: Drawer) => setDrawer((cur) => (cur === d ? 'none' : d))
  const applyStepSettings = (st: { overlay?: 'none' | 'key' | 'chord'; view?: CameraPreset }) => {
    if (st.overlay) setOverlay(st.overlay)
    if (st.view) choosePreset(st.view)
  }

  return (
    <div className={`app ${isMobile ? 'mobile' : ''}`}>
      <header className="topbar">
        <div>
          <h1>Fretlight</h1>
          <div className="dim small">
            {song.title}
            {song.composer ? ` · ${song.composer}` : ''} · {song.tempo} bpm · {song.notes.length} notes
            {overlay === 'key' && keyGuess && <span className="key-badge"> · key of {keyGuess.name}</span>}
          </div>
        </div>
        <div className="row">
          <span className="dim small tagline">Watch the frets light up, slow it down, loop the hard part.</span>
          <a className="btn small" href="/harmony/" title="Chord-melody builder: which chords fit under each melody note">
            Harmonizer →
          </a>
          <a className="btn small" href="/tone/" title="Build and understand guitar tones">
            Tone Lab →
          </a>
        </div>
      </header>

      <div className="stage">
        <Scene transport={transport} song={song} preset={preset} presetNonce={presetNonce} showUpcoming={showUpcoming} showFingers={showFingers} keyGuess={keyGuess} overlay={overlay} />
        {routine.running && routine.steps[routine.index] && (
          <div className="routine-banner">
            <span className="dim small">
              Step {routine.index + 1}/{routine.steps.length}
            </span>
            <span>{routine.steps[routine.index].song.title}</span>
            <span className="big">{formatSec(routine.remainingSec)}</span>
            <button className="btn small" onClick={routine.next} disabled={routine.index + 1 >= routine.steps.length}>
              Next ▸
            </button>
            <button className="btn small ghost" onClick={routine.stop}>
              Stop
            </button>
          </div>
        )}
        {isMobile && (
          <div className="mobile-bar">
            <button className={`btn small ${drawer === 'songs' ? 'on' : ''}`} onClick={() => toggleDrawer('songs')}>
              ♫ Library
            </button>
            <button className={`btn small ${drawer === 'notes' ? 'on' : ''}`} onClick={() => toggleDrawer('notes')}>
              ● Notes
            </button>
            <div className="spacer" />
            {drawer !== 'none' && (
              <button className="btn small ghost" onClick={() => setDrawer('none')}>
                ✕ Close
              </button>
            )}
          </div>
        )}
        {(!isMobile || drawer === 'songs') && (
          <LeftPanel
            transport={transport}
            song={song}
            onSelectSong={selectSong}
            onLoadExercise={loadExercise}
            tab={tab}
            onTab={setTab}
            onScoreLoaded={setLoadedScore}
            routine={routine}
            overlay={overlay}
            onOverlay={setOverlay}
            onStepSettings={applyStepSettings}
            onLoadStep={loadStep}
            preset={preset}
            onPreset={choosePreset}
            showUpcoming={showUpcoming}
            onShowUpcoming={setShowUpcoming}
            showFingers={showFingers}
            onShowFingers={setShowFingers}
            showTab={showTab}
            onShowTab={setShowTab}
          />
        )}
        {(!isMobile || drawer === 'notes') && <RightPanel transport={transport} song={song} />}
      </div>

      <footer className="bottom">
        {showTab && <TabStrip transport={transport} chords={chords} />}
        <TransportBar transport={transport} compact={isMobile} parts={partsFor} onPart={switchPart} />
      </footer>
    </div>
  )
}
