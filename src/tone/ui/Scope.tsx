import { useEffect, useRef } from 'react'

interface Props {
  /** Analyser for the dim reference trace (usually the chain input). */
  reference: AnalyserNode | null
  /** Analyser for the bright trace (selected pedal output or chain output). */
  signal: AnalyserNode | null
  label: string
  mode: 'wave' | 'spectrum'
}

/** Oscilloscope or spectrum analyser drawn on a canvas every frame. */
export function Scope({ reference, signal, label, mode }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const el = canvas.current
    if (!el) return
    const ctx = el.getContext('2d')
    if (!ctx) return
    let raf = 0
    const time = new Float32Array(2048)
    const freq = new Float32Array(1024)
    const draw = () => {
      const dpr = window.devicePixelRatio || 1
      const w = el.clientWidth
      const h = el.clientHeight
      if (el.width !== w * dpr || el.height !== h * dpr) {
        el.width = w * dpr
        el.height = h * dpr
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.font = '10px ui-monospace, Menlo, monospace'
      ctx.fillText(label, 6, 12)

      const plot = (an: AnalyserNode, color: string, width: number) => {
        ctx.strokeStyle = color
        ctx.lineWidth = width
        ctx.beginPath()
        if (mode === 'wave') {
          an.getFloatTimeDomainData(time)
          for (let i = 0; i < time.length; i++) {
            const x = (i / time.length) * w
            const y = h / 2 - time[i] * (h / 2) * 0.9
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
        } else {
          an.getFloatFrequencyData(freq)
          const nyquist = an.context.sampleRate / 2
          const minF = 40
          const maxF = 12000
          for (let i = 1; i < freq.length; i++) {
            const f = (i / freq.length) * nyquist
            if (f < minF || f > maxF) continue
            const x = (Math.log(f / minF) / Math.log(maxF / minF)) * w
            const db = Math.max(-100, Math.min(0, freq[i]))
            const y = h - ((db + 100) / 100) * (h - 16)
            if (i === 1 || f <= minF * 1.05) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
        }
        ctx.stroke()
      }
      if (mode === 'spectrum') {
        ctx.fillStyle = 'rgba(255,255,255,0.3)'
        for (const f of [100, 200, 400, 800, 1600, 3200, 6400]) {
          const x = (Math.log(f / 40) / Math.log(12000 / 40)) * w
          ctx.fillRect(x, 14, 1, h - 14)
          ctx.fillText(f >= 1000 ? `${f / 1000}k` : String(f), x + 2, h - 3)
        }
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.15)'
        ctx.fillRect(0, h / 2, w, 1)
      }
      if (reference) plot(reference, 'rgba(148,163,184,0.45)', 1)
      if (signal) plot(signal, '#facc15', 1.6)
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [reference, signal, label, mode])
  return <canvas ref={canvas} className="scope" />
}

/** Input-to-output curve of a clipping stage, with a unity line for reference. */
export function TransferPlot({ curve, label }: { curve: Float32Array | null; label: string }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const el = canvas.current
    if (!el) return
    const ctx = el.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const w = el.clientWidth
    const h = el.clientHeight
    el.width = w * dpr
    el.height = h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.font = '10px ui-monospace, Menlo, monospace'
    ctx.fillText(label, 6, 12)
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'
    ctx.beginPath()
    ctx.moveTo(0, h)
    ctx.lineTo(w, 0)
    ctx.stroke()
    ctx.fillRect(w / 2, 0, 1, h)
    ctx.fillRect(0, h / 2, w, 1)
    if (!curve) {
      ctx.fillText('no clipping stage selected', 6, h / 2 + 4)
      return
    }
    ctx.strokeStyle = '#fb923c'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let i = 0; i < curve.length; i++) {
      const x = (i / (curve.length - 1)) * w
      const y = h / 2 - curve[i] * (h / 2) * 0.95
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }, [curve, label])
  return <canvas ref={canvas} className="scope" />
}
