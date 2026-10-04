import { useEffect, useRef, useState } from 'react'
import { makePedal, pedalDef, type ParamDef, type PedalInstance } from '../audio/pedals'

interface Props {
  /** Current user chain, used as the base for "what changed". */
  chain: PedalInstance[]
  /** Push a chain into the engine and board. */
  apply: (chain: PedalInstance[]) => void
  /** Restore the user's own chain when leaving the quiz. */
  restore: () => void
  playing: boolean
  onPlay: () => void
}

type Mode = 'which' | 'changed'

const QUIZ_PEDALS = ['overdrive', 'distortion', 'fuzz', 'compressor', 'eq', 'wah', 'chorus', 'phaser', 'tremolo', 'delay', 'reverb']

function shuffle<T>(a: T[]): T[] {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

/** Strong, audible settings for the hidden pedal so the quiz is about identity, not subtlety. */
function loudPreset(type: string): Partial<Record<string, number>> {
  switch (type) {
    case 'overdrive':
      return { drive: 6, level: 6 }
    case 'distortion':
      return { drive: 7, level: 5 }
    case 'fuzz':
      return { fuzz: 8, bias: 0.25, level: 5 }
    case 'compressor':
      return { threshold: -35, ratio: 10, attack: 3, release: 150, makeup: 12 }
    case 'eq':
      return { low: -6, mid: 10, midFreq: 900, high: -4 }
    case 'wah':
      return { mode: 1, rate: 2, q: 8 }
    case 'chorus':
      return { rate: 1.2, depth: 7, mix: 0.6 }
    case 'phaser':
      return { rate: 0.5, depth: 0.9, feedback: 0.6 }
    case 'tremolo':
      return { rate: 5, depth: 0.8 }
    case 'delay':
      return { time: 380, feedback: 0.45, mix: 0.45 }
    case 'reverb':
      return { decay: 3.5, predelay: 20, mix: 0.5 }
    default:
      return {}
  }
}

export function Quiz({ chain, apply, restore, playing, onPlay }: Props) {
  void restore
  const [mode, setMode] = useState<Mode>('which')
  const [score, setScore] = useState({ right: 0, total: 0 })
  const [feedback, setFeedback] = useState<string | null>(null)
  const [options, setOptions] = useState<string[]>([])
  const [answer, setAnswer] = useState<string>('')
  const [ab, setAb] = useState<'a' | 'b'>('b')
  const baseRef = useRef<PedalInstance[]>([])
  const changedRef = useRef<PedalInstance[]>([])
  const userChain = useRef(chain)

  const newWhich = () => {
    const type = QUIZ_PEDALS[Math.floor(Math.random() * QUIZ_PEDALS.length)]
    const hidden = makePedal(type, loudPreset(type))
    const amp = makePedal('amp', { model: 0, gain: 2.5 })
    const cab = makePedal('cab')
    apply([makePedal('guitar'), hidden, amp, cab])
    const others = shuffle(QUIZ_PEDALS.filter((t) => t !== type)).slice(0, 3)
    setOptions(shuffle([type, ...others]))
    setAnswer(type)
    setFeedback(null)
  }

  const newChanged = () => {
    const candidates = userChain.current.filter((p) => p.enabled && pedalDef(p.type).params.some((d) => !d.options))
    if (candidates.length === 0) {
      setFeedback('Add a pedal or two to your chain first.')
      return
    }
    const pedal = candidates[Math.floor(Math.random() * candidates.length)]
    const defs = pedalDef(pedal.type).params.filter((d) => !d.options)
    const def = defs[Math.floor(Math.random() * defs.length)]
    const moved = movedValue(def, pedal.params[def.id])
    baseRef.current = userChain.current
    changedRef.current = userChain.current.map((p) => (p.uid === pedal.uid ? { ...p, params: { ...p.params, [def.id]: moved } } : p))
    const label = `${pedalDef(pedal.type).name}: ${def.name}`
    const pool: string[] = []
    for (const p of userChain.current) for (const d of pedalDef(p.type).params) if (!d.options) pool.push(`${pedalDef(p.type).name}: ${d.name}`)
    const others = shuffle(pool.filter((x) => x !== label)).slice(0, 3)
    setOptions(shuffle([label, ...others]))
    setAnswer(label)
    setAb('b')
    apply(changedRef.current)
    setFeedback(null)
  }

  useEffect(() => {
    userChain.current = chain
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (mode === 'which') newWhich()
    else newChanged()
    if (!playing) onPlay()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  const choose = (opt: string) => {
    const right = opt === answer
    setScore((s) => ({ right: s.right + (right ? 1 : 0), total: s.total + 1 }))
    setFeedback(right ? `Yes: ${pretty(answer)}.` : `No. It was ${pretty(answer)}.`)
    window.setTimeout(() => (mode === 'which' ? newWhich() : newChanged()), right ? 900 : 2200)
  }

  const toggleAb = () => {
    const next = ab === 'a' ? 'b' : 'a'
    setAb(next)
    apply(next === 'a' ? baseRef.current : changedRef.current)
  }

  return (
    <section className="quiz">
      <h3>Ear training</h3>
      <div className="seg tabs">
        <button className={`seg-btn ${mode === 'which' ? 'on' : ''}`} onClick={() => setMode('which')}>
          Which pedal?
        </button>
        <button className={`seg-btn ${mode === 'changed' ? 'on' : ''}`} onClick={() => setMode('changed')}>
          What changed?
        </button>
      </div>
      {mode === 'which' ? (
        <p className="small dim">One hidden pedal is in front of a clean amp. Listen, then name it. The board shows a blank slot so you cannot peek.</p>
      ) : (
        <p className="small dim">One knob on your own chain has been moved a lot. Flip between A (original) and B (changed) and say which knob it was.</p>
      )}
      {mode === 'changed' && (
        <button className="btn" onClick={toggleAb}>
          Hearing <b>{ab.toUpperCase()}</b> · tap to flip
        </button>
      )}
      <div className="choices">
        {options.map((o) => (
          <button key={o} className="btn small" disabled={!!feedback && !feedback.startsWith('Add')} onClick={() => choose(o)}>
            {pretty(o)}
          </button>
        ))}
      </div>
      <div className={`feedback ${feedback?.startsWith('Yes') ? 'ok' : feedback ? 'bad' : ''}`}>{feedback ?? ' '}</div>
      <div className="row between">
        <span className="mono dim">
          {score.right}/{score.total}
        </span>
        <button className="btn ghost small" onClick={() => (mode === 'which' ? newWhich() : newChanged())}>
          Skip
        </button>
        <button className="btn ghost small" onClick={restore}>
          Done
        </button>
      </div>
    </section>
  )
}

/** Pedal types become names; "Pedal: Param" labels pass through. */
function pretty(key: string): string {
  try {
    return pedalDef(key).name
  } catch {
    return key
  }
}

function movedValue(def: ParamDef, current: number): number {
  const span = def.max - def.min
  const t = (current - def.min) / span
  // Jump to the far side of the range so the change is obvious.
  const target = t > 0.5 ? def.min + span * 0.1 : def.max - span * 0.1
  return def.log ? def.min * Math.pow(def.max / def.min, (target - def.min) / span) : target
}
