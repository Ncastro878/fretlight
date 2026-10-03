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

export default function App() {
  const transport = useMemo(() => new Transport(LIBRARY.find((s) => s.id === params.get('song')) ?? LIBRARY[0]), [])
  const { song } = useTransportState(transport)
  const [preset, setPreset] = useState<CameraPreset>(() => {
    const v = params.get('view')
    return v && v in CAMERA_PRESETS ? (v as CameraPreset) : 'lap'
  })

  useEffect(() => {
    // Handy for debugging from the console.
    ;(window as unknown as { fretlight: Transport }).fretlight = transport
    const at = Number(params.get('at'))
    if (at > 0) transport.seek(at)
    if (params.get('play')) void transport.play()
  }, [transport])

  const [presetNonce, setPresetNonce] = useState(0)
  const [showUpcoming, setShowUpcoming] = useState(true)
  const [showFingers, setShowFingers] = useState(true)
  const [showTab, setShowTab] = useState(true)

  const selectSong = (s: Song) => transport.setSong(s)
  const choosePreset = (p: CameraPreset) => {
    setPreset(p)
    setPresetNonce((n) => n + 1)
  }

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>Fretlight</h1>
          <div className="dim small">
            {song.title}
            {song.composer ? ` · ${song.composer}` : ''} · {song.tempo} bpm · {song.notes.length} notes
          </div>
        </div>
        <div className="dim small">Watch the frets light up, slow it down, loop the hard part.</div>
      </header>

      <div className="stage">
        <Scene transport={transport} song={song} preset={preset} presetNonce={presetNonce} showUpcoming={showUpcoming} showFingers={showFingers} />
        <LeftPanel
          song={song}
          onSelectSong={selectSong}
          preset={preset}
          onPreset={choosePreset}
          showUpcoming={showUpcoming}
          onShowUpcoming={setShowUpcoming}
          showFingers={showFingers}
          onShowFingers={setShowFingers}
          showTab={showTab}
          onShowTab={setShowTab}
        />
        <RightPanel transport={transport} song={song} />
      </div>

      <footer className="bottom">
        {showTab && <TabStrip transport={transport} />}
        <TransportBar transport={transport} />
      </footer>
    </div>
  )
}
