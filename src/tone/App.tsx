import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Engine } from './audio/engine'
import { CATEGORY_NAMES, CATEGORY_ORDER, DEFAULT_CHAIN, PEDALS, decodeChain, encodeChain, loadSavedTones, makePedal, normalizeChain, pedalDef, storeSavedTones, type ParamDef, type PedalInstance, type SavedTone } from './audio/pedals'
import { RIFFS, RiffPlayer, openMic } from './audio/source'
import { LESSONS, PRESETS } from './lessons/lessons'
import { Board } from './scene/Board'
import { Scope, TransferPlot } from './ui/Scope'
import { ChainStrip } from './ui/ChainStrip'
import { Quiz } from './ui/Quiz'
import { MicMeter } from './ui/MicMeter'

const params = new URLSearchParams(window.location.search)

function sliderToValue(def: ParamDef, t: number): number {
  if (def.log) return def.min * Math.pow(def.max / def.min, t)
  return def.min + (def.max - def.min) * t
}
function valueToSlider(def: ParamDef, v: number): number {
  if (def.log) return Math.log(v / def.min) / Math.log(def.max / def.min)
  return (v - def.min) / (def.max - def.min)
}
function fmt(def: ParamDef, v: number): string {
  if (def.options) return def.options[Math.round(v)] ?? ''
  const digits = def.step && def.step < 1 ? 2 : v >= 100 ? 0 : 1
  return `${v.toFixed(digits)}${def.unit ? ' ' + def.unit : ''}`
}

export default function App() {
  const [chain, setChainRaw] = useState<PedalInstance[]>(() => {
    const shared = params.get('chain') ? decodeChain(params.get('chain') as string) : null
    if (shared) return shared
    const preset = PRESETS.find((p) => p.id === params.get('preset'))
    return normalizeChain(preset ? preset.build() : DEFAULT_CHAIN())
  })
  // The guitar stage is always present and first.
  const setChain = useCallback((update: PedalInstance[] | ((c: PedalInstance[]) => PedalInstance[])) => {
    setChainRaw((c) => normalizeChain(typeof update === 'function' ? update(c) : update))
  }, [])
  const [saved, setSaved] = useState<SavedTone[]>(() => loadSavedTones())
  const [quizOpen, setQuizOpen] = useState(false)
  const quizBackup = useRef<PedalInstance[] | null>(null)
  const [holdBypass, setHoldBypass] = useState<string | null>(null)
  const [micAnalyser, setMicAnalyser] = useState<AnalyserNode | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [riffId, setRiffId] = useState(params.get('riff') ?? 'clean-arp')
  const [playing, setPlaying] = useState(false)
  const [mic, setMic] = useState(false)
  const [master, setMaster] = useState(0.8)
  const [scopeMode, setScopeMode] = useState<'wave' | 'spectrum'>('wave')
  const [lessonId, setLessonId] = useState<string | null>(params.get('lesson'))
  const [stepIdx, setStepIdx] = useState(0)
  const [bypassAll, setBypassAll] = useState(false)
  const [leftTab, setLeftTab] = useState<'lessons' | 'recipes' | 'ear'>('lessons')
  const [mobilePanel, setMobilePanel] = useState<'none' | 'left' | 'right'>('none')
  const [engineReady, setEngineReady] = useState(false)
  const engine = useRef<Engine | null>(null)
  const player = useRef<RiffPlayer | null>(null)
  const micHandle = useRef<{ stop: () => void } | null>(null)
  const levelRef = useRef(0)
  const [, bump] = useState(0)

  const ensureEngine = useCallback(async () => {
    if (!engine.current) {
      engine.current = new Engine()
      player.current = new RiffPlayer(engine.current.ctx, engine.current.input)
      engine.current.rebuild(chain)
      setEngineReady(true)
      // Handy for debugging from the console.
      ;(window as unknown as { tonelab: Engine }).tonelab = engine.current
    }
    await engine.current.resume()
    return engine.current
  }, [chain])

  // Structural changes (order, add, remove, enable) rebuild the graph.
  const effective = useMemo(() => chain.map((p) => ({ ...p, enabled: p.enabled && !bypassAll && p.uid !== holdBypass })), [chain, bypassAll, holdBypass])
  const structure = useMemo(() => effective.map((p) => `${p.uid}:${p.enabled ? 1 : 0}`).join('|'), [effective])
  useEffect(() => {
    if (!engine.current) return
    engine.current.rebuild(effective)
    bump((n) => n + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structure])

  // Level meter for the cable pulse.
  useEffect(() => {
    let raf = 0
    const buf = new Float32Array(512)
    const loop = () => {
      const e = engine.current
      if (e) {
        e.inputTap.getFloatTimeDomainData(buf)
        let s = 0
        for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i]
        levelRef.current = Math.min(1, Math.sqrt(s / buf.length) * 4)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    engine.current?.setMaster(master)
  }, [master])

  const setParam = (uid: string, id: string, value: number) => {
    setChain((c) => c.map((p) => (p.uid === uid ? { ...p, params: { ...p.params, [id]: value } } : p)))
    engine.current?.setParam(uid, id, value)
  }
  const toggle = (uid: string) => setChain((c) => c.map((p) => (p.uid === uid ? { ...p, enabled: !p.enabled } : p)))
  const knobFromBoard = (uid: string, id: string, t: number) => {
    const p = chain.find((x) => x.uid === uid)
    if (!p) return
    const def = pedalDef(p.type).params.find((d) => d.id === id)
    if (!def) return
    let v = sliderToValue(def, t)
    if (def.step) v = Math.round(v / def.step) * def.step
    setParam(uid, id, v)
  }
  const shareLink = () => {
    const url = `${location.origin}${location.pathname}?chain=${encodeChain(chain)}`
    void navigator.clipboard?.writeText(url)
    history.replaceState(null, '', url)
    alert('Link copied. Anyone who opens it gets this exact chain.')
  }
  const saveTone = () => {
    const name = prompt('Name this tone', selDef ? `${selDef.name} tone` : 'My tone')
    if (!name) return
    const next = [{ name, chain: encodeChain(chain), savedAt: Date.now() }, ...saved.filter((t) => t.name !== name)].slice(0, 40)
    setSaved(next)
    storeSavedTones(next)
  }
  const deleteTone = (name: string) => {
    const next = saved.filter((t) => t.name !== name)
    setSaved(next)
    storeSavedTones(next)
  }
  const openQuiz = () => {
    quizBackup.current = chain
    setQuizOpen(true)
    setLeftTab('ear')
  }
  const closeQuiz = () => {
    if (quizBackup.current) setChain(quizBackup.current)
    quizBackup.current = null
    setQuizOpen(false)
    setLeftTab((t) => (t === 'ear' ? 'lessons' : t))
  }
  const remove = (uid: string) => {
    if (chain.find((p) => p.uid === uid)?.type === 'guitar') return
    setChain((c) => c.filter((p) => p.uid !== uid))
    if (selected === uid) setSelected(null)
  }
  const moveTo = (uid: string, toIndex: number) =>
    setChain((c) => {
      const i = c.findIndex((p) => p.uid === uid)
      if (i < 0) return c
      const next = [...c]
      const [item] = next.splice(i, 1)
      const target = Math.max(0, Math.min(next.length, toIndex > i ? toIndex - 1 : toIndex))
      next.splice(target, 0, item)
      return next
    })
  const move = (uid: string, dir: -1 | 1) => {
    const i = chain.findIndex((p) => p.uid === uid)
    if (i < 0) return
    moveTo(uid, dir < 0 ? i - 1 : i + 2)
  }
  const add = (type: string) => {
    const p = makePedal(type)
    setChain((c) => {
      // Insert before the amp so new pedals land in the pedal section by default.
      const ampIdx = c.findIndex((x) => x.type === 'amp' || x.type === 'cab')
      const next = [...c]
      next.splice(ampIdx < 0 ? c.length : ampIdx, 0, p)
      return next
    })
    setSelected(p.uid)
  }
  const loadChain = (build: () => PedalInstance[], riff?: string) => {
    const next = normalizeChain(build())
    setChain(next)
    setSelected(null)
    if (riff) setRiffId(riff)
  }

  const play = async () => {
    const e = await ensureEngine()
    const riff = RIFFS.find((r) => r.id === riffId) ?? RIFFS[0]
    player.current?.play(riff)
    setPlaying(true)
    void e
  }
  const stop = () => {
    player.current?.stop()
    setPlaying(false)
  }
  useEffect(() => {
    if (playing) void play()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riffId])

  const toggleMic = async () => {
    if (mic) {
      micHandle.current?.stop()
      micHandle.current = null
      setMic(false)
      setMicAnalyser(null)
      return
    }
    const e = await ensureEngine()
    try {
      micHandle.current = await openMic(e.ctx, e.input)
      setMicAnalyser(e.inputTap)
      setMic(true)
    } catch (err) {
      alert(`Could not open the microphone: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const lesson = LESSONS.find((l) => l.id === lessonId) ?? null
  const step = lesson?.steps[stepIdx] ?? null
  const openStep = (lid: string, idx: number) => {
    const l = LESSONS.find((x) => x.id === lid)
    if (!l) return
    const s = l.steps[idx]
    setLessonId(lid)
    setStepIdx(idx)
    if (s.chain) loadChain(s.chain, s.riff)
    else if (s.riff) setRiffId(s.riff)
    if (s.focus) {
      // Select the matching pedal after the chain state settles.
      setTimeout(() => {
        setChain((c) => {
          const hit = c.find((p) => p.type === s.focus?.type)
          if (hit) setSelected(hit.uid)
          return c
        })
      }, 0)
    }
    setMobilePanel('none')
  }

  const sel = chain.find((p) => p.uid === selected) ?? null
  const selDef = sel ? pedalDef(sel.type) : null
  const selUnit = sel && engine.current ? engine.current.unit(sel.uid) : undefined
  const transfer = selUnit?.transfer ? selUnit.transfer() : null
  const signalTap = selUnit ? selUnit.tap : engine.current?.outputTap ?? null
  const refTap = engine.current?.inputTap ?? null
  const riff = RIFFS.find((r) => r.id === riffId) ?? RIFFS[0]

  return (
    <div className="tl">
      <header className="tl-top">
        <div>
          <h1>Tone Lab</h1>
          <div className="dim small">Build a signal chain, hear it, see what every knob does.</div>
        </div>
        <div className="row">
          <button className="btn small" onClick={() => setMobilePanel(mobilePanel === 'left' ? 'none' : 'left')}>
            Lessons
          </button>
          <button className="btn small" onClick={() => setMobilePanel(mobilePanel === 'right' ? 'none' : 'right')}>
            Pedal
          </button>
          <a className="btn small ghost" href="/">
            ← Fretlight
          </a>
        </div>
      </header>

      <div className="tl-main">
        <aside className={`tl-panel left ${mobilePanel === 'left' ? 'open' : ''}`}>
          <div className="seg tabs">
            <button
              className={`seg-btn ${leftTab === 'lessons' ? 'on' : ''}`}
              onClick={() => {
                if (quizOpen) closeQuiz()
                setLeftTab('lessons')
              }}
            >
              Lessons
            </button>
            <button className={`seg-btn ${leftTab === 'recipes' ? 'on' : ''}`} onClick={() => {
                if (quizOpen) closeQuiz()
                setLeftTab('recipes')
              }}
            >
              Recipes
            </button>
            <button className={`seg-btn ${leftTab === 'ear' ? 'on' : ''}`} onClick={openQuiz}>
              Ear training
            </button>
          </div>
          {leftTab === 'ear' && quizOpen && (
            <Quiz chain={quizBackup.current ?? chain} apply={(c) => setChain(c)} restore={closeQuiz} playing={playing} onPlay={() => void play()} />
          )}
          {leftTab === 'recipes' && (
            <section>
              <h3>My tones</h3>
              <div className="row">
                <button className="btn small primary" onClick={saveTone}>
                  Save current chain
                </button>
                <button className="btn small" onClick={shareLink}>
                  Copy share link
                </button>
              </div>
              {saved.length === 0 ? (
                <p className="dim small">Nothing saved yet. Saved tones live in this browser; share links carry the whole chain in the URL.</p>
              ) : (
                <ul className="list">
                  {saved.map((t) => (
                    <li key={t.name} className="row between">
                      <button className="item" style={{ flex: 1 }} onClick={() => loadChain(() => decodeChain(t.chain) ?? chain)}>
                        <span className="title">{t.name}</span>
                      </button>
                      <button className="btn ghost small" onClick={() => deleteTone(t.name)} title="Delete">
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
          {leftTab === 'recipes' && (
            <section>
              <h3>Tone recipes</h3>
              <ul className="list">
                {PRESETS.map((p) => (
                  <li key={p.id}>
                    <button className="item" onClick={() => loadChain(p.build, p.riff)}>
                      <span className="title">{p.name}</span>
                      <span className="dim small">{p.style} · {p.blurb}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {leftTab === 'lessons' && !lesson && (
            <section>
              <h3>Lessons</h3>
              <ul className="list">
                {LESSONS.map((l) => (
                  <li key={l.id}>
                    <button className="item" onClick={() => openStep(l.id, 0)}>
                      <span className="title">{l.title}</span>
                      <span className="dim small">
                        {l.summary} · {l.steps.length} steps · {l.minutes} min
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="dim small">Each step loads a chain and a riff. Press Play, then do the “try this”. Watch the scope and spectrum while you turn knobs.</p>
            </section>
          )}
          {leftTab === 'lessons' && lesson && step && (
            <section className="lesson">
              <button className="btn ghost small" onClick={() => setLessonId(null)}>
                ← All lessons
              </button>
              <h3>{lesson.title}</h3>
              <div className="dim small">
                Step {stepIdx + 1} of {lesson.steps.length}
              </div>
              <h4>{step.title}</h4>
              <p>{step.body}</p>
              {step.tryThis && (
                <div className="try">
                  <b>Try this:</b> {step.tryThis}
                </div>
              )}
              <div className="row">
                <button className="btn small" disabled={stepIdx === 0} onClick={() => openStep(lesson.id, stepIdx - 1)}>
                  ← Back
                </button>
                <button className="btn small primary" disabled={stepIdx + 1 >= lesson.steps.length} onClick={() => openStep(lesson.id, stepIdx + 1)}>
                  Next step →
                </button>
                <button className="btn small ghost" onClick={() => openStep(lesson.id, stepIdx)}>
                  Reload step
                </button>
              </div>
              <ol className="steps">
                {lesson.steps.map((s, i) => (
                  <li key={i} className={i === stepIdx ? 'on' : ''}>
                    <button className="linkish" onClick={() => openStep(lesson.id, i)}>
                      {s.title}
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </aside>

        <div className="tl-stage">
          <Board chain={effective} selected={selected} onSelect={setSelected} onToggle={toggle} onKnob={knobFromBoard} onMove={moveTo} levelRef={levelRef} hideTypes={quizOpen} />
          <ChainStrip
            chain={chain}
            selected={selected}
            bypassAll={bypassAll}
            onSelect={setSelected}
            onToggle={toggle}
            onRemove={remove}
            onMove={moveTo}
            onBypassAll={() => setBypassAll((v) => !v)}
            hideTypes={quizOpen}
          />
        </div>

        <aside className={`tl-panel right ${mobilePanel === 'right' ? 'open' : ''}`}>
          {sel && selDef ? (
            <section>
              <div className="row between">
                <h3 style={{ color: selDef.color }}>{selDef.name}</h3>
                <label className="check">
                  <input type="checkbox" checked={sel.enabled} onChange={() => toggle(sel.uid)} /> On
                </label>
              </div>
              <p className="small">{selDef.about}</p>
              <p className="dim small">
                <b>Placement:</b> {selDef.placement}
              </p>
              <div className="params">
                {selDef.params.map((d) => {
                  const v = sel.params[d.id]
                  const focus = step?.focus?.type === sel.type && step.focus.param === d.id
                  return (
                    <label key={d.id} className={`param ${focus ? 'focus' : ''}`}>
                      <span className="name">
                        {d.name} <b className="mono">{fmt(d, v)}</b>
                      </span>
                      {d.options ? (
                        <select value={Math.round(v)} onChange={(e) => setParam(sel.uid, d.id, Number(e.target.value))}>
                          {d.options.map((o, i) => (
                            <option key={o} value={i}>
                              {o}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.001}
                          value={valueToSlider(d, v)}
                          onChange={(e) => {
                            let nv = sliderToValue(d, Number(e.target.value))
                            if (d.step) nv = Math.round(nv / d.step) * d.step
                            setParam(sel.uid, d.id, nv)
                          }}
                        />
                      )}
                    </label>
                  )
                })}
              </div>
              {sel.type === 'delay' && <DelayTempo bpm={riff.bpm} onTime={(ms) => setParam(sel.uid, 'time', ms)} />}
              <div className="row">
                <button
                  className={`btn small ${holdBypass === sel.uid ? 'on' : ''}`}
                  onPointerDown={() => setHoldBypass(sel.uid)}
                  onPointerUp={() => setHoldBypass(null)}
                  onPointerLeave={() => setHoldBypass(null)}
                  title="Hold to hear the chain without this pedal"
                >
                  Hold: hear without it
                </button>
                {!selDef.fixed && (
                  <>
                    <button className="btn small" onClick={() => move(sel.uid, -1)} title="Move earlier in the chain">
                      ← Earlier
                    </button>
                    <button className="btn small" onClick={() => move(sel.uid, 1)} title="Move later in the chain">
                      Later →
                    </button>
                    <button className="btn small ghost" onClick={() => remove(sel.uid)}>
                      Remove
                    </button>
                  </>
                )}
              </div>
            </section>
          ) : (
            <section>
              <h3>Inspector</h3>
              <p className="dim small">Click a pedal on the board (or a chip under it) to see what it does and turn its knobs. Click the footswitch to bypass it.</p>
            </section>
          )}
          <section>
            <h3>Add to the chain</h3>
            {CATEGORY_ORDER.map((cat) => (
              <div key={cat} className="addgroup">
                <div className="dim small">{CATEGORY_NAMES[cat]}</div>
                <div className="row">
                  {PEDALS.filter((p) => p.category === cat && !p.fixed).map((p) => (
                    <button key={p.type} className="btn small" style={{ borderColor: p.color }} onClick={() => add(p.type)} title={p.about}>
                      + {p.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>
        </aside>
      </div>

      <footer className="tl-bottom">
        <div className="source">
          <button className="btn primary" onClick={() => (playing ? stop() : void play())}>
            {playing ? '■ Stop riff' : '▶ Play riff'}
          </button>
          <select value={riffId} onChange={(e) => setRiffId(e.target.value)} title={riff.blurb}>
            {RIFFS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} · {r.bpm} bpm
              </option>
            ))}
          </select>
          <button className={`btn ${mic ? 'on' : ''}`} onClick={() => void toggleMic()} title="Play your own guitar through the chain. Use headphones: speakers will feed back.">
            {mic ? '● Mic on' : '○ Use my guitar (mic)'}
          </button>
          {mic && <MicMeter analyser={micAnalyser} />}
          <label className="vol">
            <span className="dim small">Volume</span>
            <input type="range" min={0} max={1} step={0.01} value={master} onChange={(e) => setMaster(Number(e.target.value))} />
          </label>
          <div className="seg">
            <button className={`seg-btn ${scopeMode === 'wave' ? 'on' : ''}`} onClick={() => setScopeMode('wave')}>
              Waveform
            </button>
            <button className={`seg-btn ${scopeMode === 'spectrum' ? 'on' : ''}`} onClick={() => setScopeMode('spectrum')}>
              Spectrum
            </button>
          </div>
          <span className="dim small">{engineReady ? (sel ? `Yellow: after ${selDef?.name}. Grey: dry guitar.` : 'Yellow: chain output. Grey: dry guitar.') : 'Press Play to start the audio engine.'}</span>
        </div>
        <div className="scopes">
          <Scope reference={refTap} signal={signalTap} label={scopeMode === 'wave' ? 'waveform' : 'spectrum (40 Hz – 12 kHz)'} mode={scopeMode} />
          <Scope reference={refTap} signal={signalTap} label={scopeMode === 'wave' ? 'spectrum (40 Hz – 12 kHz)' : 'waveform'} mode={scopeMode === 'wave' ? 'spectrum' : 'wave'} />
          <TransferPlot curve={transfer} label={sel && transfer ? `clipping curve: ${selDef?.name}` : 'clipping curve'} />
        </div>
      </footer>
    </div>
  )
}


/** Tap tempo and note divisions for the delay, based on the riff tempo or your taps. */
function DelayTempo({ bpm, onTime }: { bpm: number; onTime: (ms: number) => void }) {
  const taps = useRef<number[]>([])
  const [tempo, setTempo] = useState(bpm)
  useEffect(() => setTempo(bpm), [bpm])
  const tap = () => {
    const now = performance.now()
    const recent = [...taps.current.filter((t) => now - t < 3000), now]
    taps.current = recent
    if (recent.length >= 2) {
      const gaps = recent.slice(1).map((t, i) => t - recent[i])
      const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length
      setTempo(Math.round(60000 / avg))
    }
  }
  const quarter = 60000 / tempo
  const divisions: [string, number][] = [
    ['♩ quarter', quarter],
    ['♪. dotted 8th', quarter * 0.75],
    ['♪ eighth', quarter / 2],
    ['♪₃ triplet', quarter / 3],
    ['♬ sixteenth', quarter / 4],
  ]
  return (
    <div className="delay-tempo">
      <div className="row between">
        <span className="dim small">
          Tempo <b className="mono">{tempo} bpm</b>
        </span>
        <button className="btn small" onClick={tap}>
          Tap tempo
        </button>
      </div>
      <div className="row">
        {divisions.map(([label, ms]) => (
          <button key={label} className="btn small" onClick={() => onTime(Math.max(30, Math.min(1200, Math.round(ms))))} title={`${Math.round(ms)} ms`}>
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}