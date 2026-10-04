import { useEffect, useRef, useState } from 'react'

interface Props {
  analyser: AnalyserNode | null
}

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

/** Autocorrelation pitch detector. Returns Hz or -1 when there is no clear pitch. */
function detectPitch(buf: Float32Array, sampleRate: number): number {
  let rms = 0
  for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i]
  rms = Math.sqrt(rms / buf.length)
  if (rms < 0.01) return -1
  const size = buf.length
  let bestOffset = -1
  let bestCorr = 0
  const minLag = Math.floor(sampleRate / 1000)
  const maxLag = Math.floor(sampleRate / 70)
  for (let lag = minLag; lag < maxLag; lag++) {
    let corr = 0
    for (let i = 0; i < size - lag; i++) corr += buf[i] * buf[i + lag]
    corr /= size - lag
    if (corr > bestCorr) {
      bestCorr = corr
      bestOffset = lag
    }
  }
  if (bestOffset < 0 || bestCorr < 0.001) return -1
  return sampleRate / bestOffset
}

/** Input level bar plus a tuner readout, shown while the mic is on. */
export function MicMeter({ analyser }: Props) {
  const [level, setLevel] = useState(0)
  const [note, setNote] = useState<{ name: string; cents: number } | null>(null)
  const buf = useRef(new Float32Array(2048))
  useEffect(() => {
    if (!analyser) return
    let raf = 0
    let frame = 0
    const loop = () => {
      analyser.getFloatTimeDomainData(buf.current)
      let s = 0
      for (let i = 0; i < buf.current.length; i++) s += buf.current[i] * buf.current[i]
      setLevel(Math.min(1, Math.sqrt(s / buf.current.length) * 3))
      if (frame++ % 6 === 0) {
        const hz = detectPitch(buf.current, analyser.context.sampleRate)
        if (hz > 0) {
          const midi = 69 + 12 * Math.log2(hz / 440)
          const nearest = Math.round(midi)
          setNote({ name: `${NAMES[((nearest % 12) + 12) % 12]}${Math.floor(nearest / 12) - 1}`, cents: Math.round((midi - nearest) * 100) })
        } else setNote(null)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [analyser])
  if (!analyser) return null
  const inTune = note && Math.abs(note.cents) <= 5
  return (
    <div className="micmeter" title="Input level and tuner. Use headphones to avoid feedback.">
      <div className="meter">
        <div className="fill" style={{ width: `${level * 100}%`, background: level > 0.9 ? '#ef4444' : level > 0.6 ? '#facc15' : '#4ade80' }} />
      </div>
      <div className={`tuner mono ${inTune ? 'ok' : ''}`}>
        {note ? `${note.name} ${note.cents > 0 ? '+' : ''}${note.cents}¢` : level < 0.02 ? 'no signal' : '…'}
      </div>
    </div>
  )
}
