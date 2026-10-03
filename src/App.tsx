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

/** Shareable links: ?song=<id>&at=<beat>&view=lap|neck|front|top&play=1 */
const params = new URLSearchParams(window.location.search)
const MOBILE_QUERY = '(max-width: 900px)'

type Drawer = 'none' | 'songs' | 'notes'

export default function App() {
  const transport = useMemo(() => new Transport(LIBRARY.find((s) => s.id === params.get('song')) ?? LIBRARY[0]), [])
  const { song } = useTransportState(transport)
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches)
  const [drawer, setDrawer] = useState<Drawer>('none')
  const [tab, setTab] = useState<'songs' | 'practice'>(params.get('tab') === 'practice' ? 'practice' : 'songs')
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

  return (
    <div className={`app ${isMobile ? 'mobile' : ''}`}>
      <header className="topbar">
        <div>
          <h1>Fretlight</h1>
          <div className="dim small">
            {song.title}
            {song.composer ? ` · ${song.composer}` : ''} · {song.tempo} bpm · {song.notes.length} notes
          </div>
        </div>
        <div className="dim small tagline">Watch the frets light up, slow it down, loop the hard part.</div>
      </header>

      <div className="stage">
        <Scene transport={transport} song={song} preset={preset} presetNonce={presetNonce} showUpcoming={showUpcoming} showFingers={showFingers} />
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
        {showTab && <TabStrip transport={transport} />}
        <TransportBar transport={transport} compact={isMobile} />
      </footer>
    </div>
  )
}
