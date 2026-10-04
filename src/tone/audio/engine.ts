import type { PedalInstance } from './pedals'

/** A built effect: an input node, an output node, live param updates, and an analyser tap on its output. */
export interface Unit {
  input: AudioNode
  output: AudioNode
  tap: AnalyserNode
  setParam(id: string, value: number): void
  dispose(): void
  /** Input-to-output transfer curve for clipping stages, for the curve plot. */
  transfer?: () => Float32Array
}

const dbToGain = (db: number) => Math.pow(10, db / 20)

// ----- Clipping curves -----

function curve(fn: (x: number) => number, n = 2048): Float32Array<ArrayBuffer> {
  const out = new Float32Array(new ArrayBuffer(n * 4))
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1
    out[i] = fn(x)
  }
  return out
}

/** Soft clip: tanh with a pre-gain. Rounds the peaks, keeps the dynamics. */
export const softClip = (drive: number) => {
  const k = 1 + drive * 3
  return curve((x) => Math.tanh(k * x) / Math.tanh(k))
}
/** Hard clip: a steep slope that slams into a ceiling. */
export const hardClip = (drive: number) => {
  const k = 1 + drive * 6
  const ceil = 0.8
  return curve((x) => Math.max(-ceil, Math.min(ceil, k * x)) / ceil)
}
/** Fuzz: huge gain with a bias so the two halves clip differently. */
export const fuzzClip = (fuzz: number, bias: number) => {
  const k = 4 + fuzz * 20
  return curve((x) => {
    const y = Math.tanh(k * (x + bias * 0.3))
    return Math.max(-1, Math.min(1, y * 1.2 - Math.tanh(k * bias * 0.3)))
  })
}
const AMP_CURVES = [
  (g: number) => curve((x) => Math.tanh((1 + g * 0.6) * x) / Math.tanh(1 + g * 0.6)), // American clean: barely bends
  (g: number) => curve((x) => Math.tanh((1 + g * 1.5) * x) * 0.95), // British crunch
  (g: number) => curve((x) => Math.tanh((1 + g * 2.5) * x + 0.1 * x * x) / 1.02), // Plexi: a bit asymmetric
  (g: number) => {
    const k = 2 + g * 5
    return curve((x) => Math.max(-0.85, Math.min(0.85, Math.tanh(k * x) * 1.1)) / 0.85)
  }, // High gain: cascaded, hard ceiling
]

// ----- Helpers -----

function mkGain(ctx: AudioContext, value: number): GainNode {
  const g = ctx.createGain()
  g.gain.value = value
  return g
}

function mkFilter(ctx: AudioContext, type: BiquadFilterType, frequency: number, q = 0.7, gain = 0): BiquadFilterNode {
  const f = ctx.createBiquadFilter()
  f.type = type
  f.frequency.value = frequency
  f.Q.value = q
  f.gain.value = gain
  return f
}

function mkTap(ctx: AudioContext): AnalyserNode {
  const a = ctx.createAnalyser()
  a.fftSize = 2048
  a.smoothingTimeConstant = 0.6
  return a
}

/** Synthesized impulse response: exponentially decaying noise with high-frequency damping. */
function reverbIR(ctx: AudioContext, decay: number, damping: number): AudioBuffer {
  const rate = ctx.sampleRate
  const len = Math.floor(rate * Math.min(decay * 1.2 + 0.1, 10))
  const buf = ctx.createBuffer(2, len, rate)
  const alpha = Math.exp((-2 * Math.PI * damping) / rate) // one-pole lowpass coefficient
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c)
    let lp = 0
    for (let i = 0; i < len; i++) {
      const env = Math.exp((-3 * i) / (decay * rate))
      const n = (Math.random() * 2 - 1) * env
      lp = alpha * lp + (1 - alpha) * n
      d[i] = lp * (i < 200 ? i / 200 : 1)
    }
  }
  return buf
}

// ----- Unit builders -----

type Builder = (ctx: AudioContext, p: Record<string, number>) => Unit

const builders: Record<string, Builder> = {
  guitar(ctx, p) {
    // Pickup position as a feed-forward comb filter: the string's standing
    // waves cancel at harmonics whose nodes sit over the pickup. Bridge = short
    // delay (bright, more notches), neck = longer delay (rounder).
    const inp = mkGain(ctx, 1)
    const direct = mkGain(ctx, 1)
    const comb = ctx.createDelay(0.01)
    const combGain = mkGain(ctx, -0.6)
    const tone = mkFilter(ctx, 'lowpass', 6000, 0.7)
    const vol = mkGain(ctx, 1)
    const body = mkFilter(ctx, 'peaking', 2400, 1.2, 2)
    const tap = mkTap(ctx)
    inp.connect(direct).connect(tone)
    inp.connect(comb).connect(combGain).connect(tone)
    tone.connect(body).connect(vol).connect(tap)
    const apply = (q: Record<string, number>) => {
      const t = ctx.currentTime
      const pickup = Math.round(q.pickup)
      comb.delayTime.setTargetAtTime([0.0011, 0.0007, 0.00035][pickup], t, 0.02)
      body.frequency.setTargetAtTime([1400, 2000, 3200][pickup], t, 0.02)
      body.gain.setTargetAtTime([1.5, 2, 3][pickup], t, 0.02)
      // Tone knob: 10 is wide open, 0 is dark. Volume rolls off a little treble too, like a real pot.
      const toneHz = 900 * Math.pow(7000 / 900, q.tone / 10) * (0.75 + 0.25 * (q.volume / 10))
      tone.frequency.setTargetAtTime(toneHz, t, 0.02)
      vol.gain.setTargetAtTime(Math.pow(q.volume / 10, 1.6), t, 0.02)
    }
    const state = { ...p }
    apply(state)
    return {
      input: inp,
      output: vol,
      tap,
      setParam: (id, v) => {
        state[id] = v
        apply(state)
      },
      dispose: () => [inp, direct, comb, combGain, tone, vol, body].forEach((n) => n.disconnect()),
    }
  },

  boost(ctx, p) {
    const g = mkGain(ctx, dbToGain(p.gain))
    const tap = mkTap(ctx)
    g.connect(tap)
    return { input: g, output: g, tap, setParam: (id, v) => id === 'gain' && g.gain.setTargetAtTime(dbToGain(v), ctx.currentTime, 0.02), dispose: () => g.disconnect() }
  },

  gate(ctx, p) {
    // Analyser-driven gate: poll the level and ramp a gain node.
    const inp = mkGain(ctx, 1)
    const out = mkGain(ctx, 1)
    const meter = ctx.createAnalyser()
    meter.fftSize = 512
    inp.connect(meter)
    inp.connect(out)
    const tap = mkTap(ctx)
    out.connect(tap)
    const buf = new Float32Array(meter.fftSize)
    let threshold = p.threshold
    let release = p.release
    const timer = window.setInterval(() => {
      meter.getFloatTimeDomainData(buf)
      let sum = 0
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i]
      const db = 20 * Math.log10(Math.sqrt(sum / buf.length) + 1e-9)
      const open = db > threshold
      out.gain.setTargetAtTime(open ? 1 : 0, ctx.currentTime, open ? 0.003 : release / 1000 / 3)
    }, 15)
    return {
      input: inp,
      output: out,
      tap,
      setParam: (id, v) => {
        if (id === 'threshold') threshold = v
        if (id === 'release') release = v
      },
      dispose: () => {
        window.clearInterval(timer)
        inp.disconnect()
        out.disconnect()
      },
    }
  },

  compressor(ctx, p) {
    const c = ctx.createDynamicsCompressor()
    c.threshold.value = p.threshold
    c.ratio.value = p.ratio
    c.attack.value = p.attack / 1000
    c.release.value = p.release / 1000
    c.knee.value = 6
    const makeup = mkGain(ctx, dbToGain(p.makeup))
    const tap = mkTap(ctx)
    c.connect(makeup).connect(tap)
    return {
      input: c,
      output: makeup,
      tap,
      setParam: (id, v) => {
        const t = ctx.currentTime
        if (id === 'threshold') c.threshold.setTargetAtTime(v, t, 0.02)
        if (id === 'ratio') c.ratio.setTargetAtTime(v, t, 0.02)
        if (id === 'attack') c.attack.setTargetAtTime(v / 1000, t, 0.02)
        if (id === 'release') c.release.setTargetAtTime(v / 1000, t, 0.02)
        if (id === 'makeup') makeup.gain.setTargetAtTime(dbToGain(v), t, 0.02)
      },
      dispose: () => {
        c.disconnect()
        makeup.disconnect()
      },
    }
  },

  overdrive(ctx, p) {
    return driveUnit(ctx, p, (q) => softClip(q.drive), 1.2)
  },
  distortion(ctx, p) {
    return driveUnit(ctx, p, (q) => hardClip(q.drive), 1.0)
  },

  fuzz(ctx, p) {
    const pre = mkFilter(ctx, 'highpass', 80)
    const shaper = ctx.createWaveShaper()
    shaper.oversample = '4x'
    shaper.curve = fuzzClip(p.fuzz, p.bias)
    const post = mkFilter(ctx, 'lowpass', 4500)
    const level = mkGain(ctx, (p.level / 10) * 0.6)
    const tap = mkTap(ctx)
    pre.connect(shaper).connect(post).connect(level).connect(tap)
    let fuzz = p.fuzz
    let bias = p.bias
    return {
      input: pre,
      output: level,
      tap,
      transfer: () => fuzzClip(fuzz, bias),
      setParam: (id, v) => {
        if (id === 'fuzz') fuzz = v
        if (id === 'bias') bias = v
        if (id === 'fuzz' || id === 'bias') shaper.curve = fuzzClip(fuzz, bias)
        if (id === 'level') level.gain.setTargetAtTime((v / 10) * 0.6, ctx.currentTime, 0.02)
      },
      dispose: () => [pre, shaper, post, level].forEach((n) => n.disconnect()),
    }
  },

  eq(ctx, p) {
    const low = mkFilter(ctx, 'lowshelf', 100, 0.7, p.low)
    const mid = mkFilter(ctx, 'peaking', p.midFreq, 1.0, p.mid)
    const high = mkFilter(ctx, 'highshelf', 3000, 0.7, p.high)
    const tap = mkTap(ctx)
    low.connect(mid).connect(high).connect(tap)
    return {
      input: low,
      output: high,
      tap,
      setParam: (id, v) => {
        const t = ctx.currentTime
        if (id === 'low') low.gain.setTargetAtTime(v, t, 0.02)
        if (id === 'mid') mid.gain.setTargetAtTime(v, t, 0.02)
        if (id === 'midFreq') mid.frequency.setTargetAtTime(v, t, 0.02)
        if (id === 'high') high.gain.setTargetAtTime(v, t, 0.02)
      },
      dispose: () => [low, mid, high].forEach((n) => n.disconnect()),
    }
  },

  wah(ctx, p) {
    const bp = mkFilter(ctx, 'bandpass', 800, p.q)
    const lfo = ctx.createOscillator()
    lfo.frequency.value = p.rate
    const lfoGain = mkGain(ctx, 0)
    lfo.connect(lfoGain).connect(bp.frequency)
    lfo.start()
    const makeup = mkGain(ctx, 2)
    const tap = mkTap(ctx)
    bp.connect(makeup).connect(tap)
    const apply = (mode: number, position: number) => {
      const t = ctx.currentTime
      if (mode >= 0.5) {
        bp.frequency.setTargetAtTime(1200, t, 0.02)
        lfoGain.gain.setTargetAtTime(800, t, 0.02)
      } else {
        lfoGain.gain.setTargetAtTime(0, t, 0.02)
        bp.frequency.setTargetAtTime(400 * Math.pow(2.5e3 / 400, position), t, 0.02)
      }
    }
    let mode = p.mode
    let position = p.position
    apply(mode, position)
    return {
      input: bp,
      output: makeup,
      tap,
      setParam: (id, v) => {
        if (id === 'mode') mode = v
        if (id === 'position') position = v
        if (id === 'mode' || id === 'position') apply(mode, position)
        if (id === 'rate') lfo.frequency.setTargetAtTime(v, ctx.currentTime, 0.02)
        if (id === 'q') bp.Q.setTargetAtTime(v, ctx.currentTime, 0.02)
      },
      dispose: () => {
        lfo.stop()
        ;[bp, lfo, lfoGain, makeup].forEach((n) => n.disconnect())
      },
    }
  },

  chorus(ctx, p) {
    const inp = mkGain(ctx, 1)
    const dry = mkGain(ctx, 1 - p.mix * 0.5)
    const wet = mkGain(ctx, p.mix)
    const delay = ctx.createDelay(0.1)
    delay.delayTime.value = 0.02
    const lfo = ctx.createOscillator()
    lfo.frequency.value = p.rate
    const depth = mkGain(ctx, (p.depth / 1000) * 0.5)
    lfo.connect(depth).connect(delay.delayTime)
    lfo.start()
    const out = mkGain(ctx, 1)
    const tap = mkTap(ctx)
    inp.connect(dry).connect(out)
    inp.connect(delay).connect(wet).connect(out)
    out.connect(tap)
    return {
      input: inp,
      output: out,
      tap,
      setParam: (id, v) => {
        const t = ctx.currentTime
        if (id === 'rate') lfo.frequency.setTargetAtTime(v, t, 0.02)
        if (id === 'depth') depth.gain.setTargetAtTime((v / 1000) * 0.5, t, 0.02)
        if (id === 'mix') {
          wet.gain.setTargetAtTime(v, t, 0.02)
          dry.gain.setTargetAtTime(1 - v * 0.5, t, 0.02)
        }
      },
      dispose: () => {
        lfo.stop()
        ;[inp, dry, wet, delay, lfo, depth, out].forEach((n) => n.disconnect())
      },
    }
  },

  phaser(ctx, p) {
    const inp = mkGain(ctx, 1)
    const out = mkGain(ctx, 1)
    const stages = [300, 600, 1200, 2400].map((f) => mkFilter(ctx, 'allpass', f, 0.6))
    const lfo = ctx.createOscillator()
    lfo.frequency.value = p.rate
    const depth = mkGain(ctx, p.depth * 600)
    lfo.connect(depth)
    stages.forEach((s) => depth.connect(s.frequency))
    lfo.start()
    const fb = mkGain(ctx, p.feedback)
    const wet = mkGain(ctx, 0.7)
    inp.connect(out) // dry
    inp.connect(stages[0])
    stages[0].connect(stages[1]).connect(stages[2]).connect(stages[3]).connect(wet).connect(out)
    stages[3].connect(fb).connect(stages[0])
    const tap = mkTap(ctx)
    out.connect(tap)
    return {
      input: inp,
      output: out,
      tap,
      setParam: (id, v) => {
        const t = ctx.currentTime
        if (id === 'rate') lfo.frequency.setTargetAtTime(v, t, 0.02)
        if (id === 'depth') depth.gain.setTargetAtTime(v * 600, t, 0.02)
        if (id === 'feedback') fb.gain.setTargetAtTime(v, t, 0.02)
      },
      dispose: () => {
        lfo.stop()
        ;[inp, out, lfo, depth, fb, wet, ...stages].forEach((n) => n.disconnect())
      },
    }
  },

  tremolo(ctx, p) {
    const vca = mkGain(ctx, 1 - p.depth / 2)
    const lfo = ctx.createOscillator()
    lfo.type = p.shape >= 0.5 ? 'square' : 'sine'
    lfo.frequency.value = p.rate
    const depth = mkGain(ctx, p.depth / 2)
    lfo.connect(depth).connect(vca.gain)
    lfo.start()
    const tap = mkTap(ctx)
    vca.connect(tap)
    return {
      input: vca,
      output: vca,
      tap,
      setParam: (id, v) => {
        const t = ctx.currentTime
        if (id === 'rate') lfo.frequency.setTargetAtTime(v, t, 0.02)
        if (id === 'depth') {
          depth.gain.setTargetAtTime(v / 2, t, 0.02)
          vca.gain.setTargetAtTime(1 - v / 2, t, 0.02)
        }
        if (id === 'shape') lfo.type = v >= 0.5 ? 'square' : 'sine'
      },
      dispose: () => {
        lfo.stop()
        ;[vca, lfo, depth].forEach((n) => n.disconnect())
      },
    }
  },

  delay(ctx, p) {
    const inp = mkGain(ctx, 1)
    const out = mkGain(ctx, 1)
    const d = ctx.createDelay(2)
    d.delayTime.value = p.time / 1000
    const fb = mkGain(ctx, p.feedback)
    const tone = mkFilter(ctx, 'lowpass', p.tone)
    const wet = mkGain(ctx, p.mix)
    inp.connect(out)
    inp.connect(d)
    d.connect(tone).connect(wet).connect(out)
    tone.connect(fb).connect(d)
    const tap = mkTap(ctx)
    out.connect(tap)
    return {
      input: inp,
      output: out,
      tap,
      setParam: (id, v) => {
        const t = ctx.currentTime
        if (id === 'time') d.delayTime.setTargetAtTime(v / 1000, t, 0.05)
        if (id === 'feedback') fb.gain.setTargetAtTime(v, t, 0.02)
        if (id === 'tone') tone.frequency.setTargetAtTime(v, t, 0.02)
        if (id === 'mix') wet.gain.setTargetAtTime(v, t, 0.02)
      },
      dispose: () => [inp, out, d, fb, tone, wet].forEach((n) => n.disconnect()),
    }
  },

  reverb(ctx, p) {
    const inp = mkGain(ctx, 1)
    const out = mkGain(ctx, 1)
    const pre = ctx.createDelay(0.5)
    pre.delayTime.value = p.predelay / 1000
    const conv = ctx.createConvolver()
    conv.buffer = reverbIR(ctx, p.decay, p.damping)
    const wet = mkGain(ctx, p.mix)
    inp.connect(out)
    inp.connect(pre).connect(conv).connect(wet).connect(out)
    const tap = mkTap(ctx)
    out.connect(tap)
    let decay = p.decay
    let damping = p.damping
    let rebuild: number | null = null
    return {
      input: inp,
      output: out,
      tap,
      setParam: (id, v) => {
        const t = ctx.currentTime
        if (id === 'predelay') pre.delayTime.setTargetAtTime(v / 1000, t, 0.02)
        if (id === 'mix') wet.gain.setTargetAtTime(v, t, 0.02)
        if (id === 'decay' || id === 'damping') {
          if (id === 'decay') decay = v
          else damping = v
          // Building an IR is heavy; wait for the slider to settle.
          if (rebuild !== null) window.clearTimeout(rebuild)
          rebuild = window.setTimeout(() => (conv.buffer = reverbIR(ctx, decay, damping)), 150)
        }
      },
      dispose: () => [inp, out, pre, conv, wet].forEach((n) => n.disconnect()),
    }
  },

  amp(ctx, p) {
    // Two cascaded gain stages with filtering between them, like a real preamp,
    // then a slow compressor for power-supply sag, then the tone stack.
    const inp = mkFilter(ctx, 'highpass', 60)
    const pre1 = mkGain(ctx, 1)
    const stage1 = ctx.createWaveShaper()
    stage1.oversample = '4x'
    const inter = mkFilter(ctx, 'highpass', 110) // tightens the low end before the second stage
    const interLp = mkFilter(ctx, 'lowpass', 7000)
    const pre2 = mkGain(ctx, 1)
    const stage2 = ctx.createWaveShaper()
    stage2.oversample = '4x'
    const sag = ctx.createDynamicsCompressor()
    sag.threshold.value = -18
    sag.ratio.value = 2.5
    sag.attack.value = 0.02
    sag.release.value = 0.25
    sag.knee.value = 10
    const bass = mkFilter(ctx, 'lowshelf', 120, 0.7, 0)
    const mid = mkFilter(ctx, 'peaking', 650, 0.8, 0)
    const treble = mkFilter(ctx, 'highshelf', 2500, 0.7, 0)
    const presence = mkFilter(ctx, 'highshelf', 4500, 0.7, 0)
    const master = mkGain(ctx, 0.5)
    const tap = mkTap(ctx)
    inp.connect(pre1).connect(stage1).connect(inter).connect(interLp).connect(pre2).connect(stage2).connect(sag).connect(bass).connect(mid).connect(treble).connect(presence).connect(master).connect(tap)
    let model = Math.round(p.model)
    let gain = p.gain
    const apply = () => {
      const t = ctx.currentTime
      // Stage one does most of the work on cleaner models; stage two takes over as gain rises.
      const g1 = model === 0 ? gain * 0.5 : gain * 0.7
      const g2 = model === 3 ? gain * 0.9 : gain * 0.45
      stage1.curve = AMP_CURVES[model](g1)
      stage2.curve = AMP_CURVES[model === 0 ? 0 : model](g2)
      pre1.gain.setTargetAtTime(0.7 + gain * 0.1, t, 0.02)
      pre2.gain.setTargetAtTime(0.8 + gain * 0.08, t, 0.02)
      inter.frequency.setTargetAtTime([80, 110, 130, 160][model], t, 0.02)
      sag.threshold.setTargetAtTime(model === 0 ? -8 : -18 - gain, t, 0.02)
    }
    const tone = (id: string, v: number) => {
      const t = ctx.currentTime
      const db = (v - 5) * 2.4
      if (id === 'bass') bass.gain.setTargetAtTime(db, t, 0.02)
      if (id === 'mid') mid.gain.setTargetAtTime(db, t, 0.02)
      if (id === 'treble') treble.gain.setTargetAtTime(db, t, 0.02)
      if (id === 'presence') presence.gain.setTargetAtTime((v - 4) * 1.8, t, 0.02)
      if (id === 'master') master.gain.setTargetAtTime(Math.pow(v / 10, 1.5) * 0.8, t, 0.02)
    }
    apply()
    for (const id of ['bass', 'mid', 'treble', 'presence', 'master']) tone(id, p[id])
    return {
      input: inp,
      output: master,
      tap,
      transfer: () => AMP_CURVES[model](gain),
      setParam: (id, v) => {
        if (id === 'model') {
          model = Math.round(v)
          apply()
        } else if (id === 'gain') {
          gain = v
          apply()
        } else tone(id, v)
      },
      dispose: () => [inp, pre1, stage1, inter, interLp, pre2, stage2, sag, bass, mid, treble, presence, master].forEach((n) => n.disconnect()),
    }
  },

  cab(ctx, p) {
    // Speaker: a steep lowpass plus a low bump and a presence bump, then a
    // synthesized impulse response for the mic distance (early reflections
    // and a short room tail).
    const lowBump = mkFilter(ctx, 'peaking', 110, 1.2, 3)
    const scoop = mkFilter(ctx, 'peaking', 450, 1.0, -2)
    const pres = mkFilter(ctx, 'peaking', 2400, 1.4, 3)
    const lp1 = mkFilter(ctx, 'lowpass', 5200, 0.9)
    const lp2 = mkFilter(ctx, 'lowpass', 6000, 0.7)
    const hp = mkFilter(ctx, 'highpass', 70)
    const dry = mkGain(ctx, 1)
    const room = ctx.createConvolver()
    const roomGain = mkGain(ctx, 0)
    const out = mkGain(ctx, 1)
    const tap = mkTap(ctx)
    hp.connect(lowBump).connect(scoop).connect(pres).connect(lp1).connect(lp2)
    lp2.connect(dry).connect(out)
    lp2.connect(room).connect(roomGain).connect(out)
    out.connect(tap)
    room.buffer = cabRoomIR(ctx, 1)
    const apply = (model: number, mic: number, distance: number) => {
      const t = ctx.currentTime
      const m = Math.round(model)
      // Bigger cabs: more low end, darker top. Mic toward the edge: darker and warmer.
      lowBump.gain.setTargetAtTime([2, 3.5, 5][m], t, 0.02)
      lowBump.frequency.setTargetAtTime([130, 110, 95][m], t, 0.02)
      lp1.frequency.setTargetAtTime([5600, 5200, 4600][m] * (1 - mic * 0.35), t, 0.02)
      pres.gain.setTargetAtTime(3 - mic * 2.5, t, 0.02)
      hp.frequency.setTargetAtTime([90, 75, 60][m], t, 0.02)
      // Distance: close mic is dry and present; back it off and the room comes in and proximity bass goes away.
      roomGain.gain.setTargetAtTime(distance * 0.9, t, 0.02)
      dry.gain.setTargetAtTime(1 - distance * 0.4, t, 0.02)
      lowBump.gain.setTargetAtTime([2, 3.5, 5][m] * (1 - distance * 0.6), t, 0.02)
    }
    let model = p.model
    let mic = p.mic
    let distance = p.distance ?? 0.1
    let rebuild: number | null = null
    apply(model, mic, distance)
    return {
      input: hp,
      output: out,
      tap,
      setParam: (id, v) => {
        if (id === 'model') {
          model = v
          if (rebuild !== null) window.clearTimeout(rebuild)
          rebuild = window.setTimeout(() => (room.buffer = cabRoomIR(ctx, Math.round(model))), 100)
        }
        if (id === 'mic') mic = v
        if (id === 'distance') distance = v
        apply(model, mic, distance)
      },
      dispose: () => [hp, lowBump, scoop, pres, lp1, lp2, dry, room, roomGain, out].forEach((n) => n.disconnect()),
    }
  },
}

/** Short room impulse: a few early reflections and a 0.3 s tail, bigger for bigger cabs. */
function cabRoomIR(ctx: AudioContext, model: number): AudioBuffer {
  const rate = ctx.sampleRate
  const len = Math.floor(rate * 0.35)
  const buf = ctx.createBuffer(2, len, rate)
  const reflections = [0.004, 0.009, 0.013, 0.021, 0.03][model] ? [0.004, 0.009, 0.015, 0.024] : [0.004, 0.009, 0.015, 0.024]
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c)
    for (const r of reflections) {
      const i = Math.floor((r + c * 0.0007 + model * 0.002) * rate)
      if (i < len) d[i] += 0.5 / (1 + reflections.indexOf(r))
    }
    let lp = 0
    for (let i = Math.floor(0.02 * rate); i < len; i++) {
      const env = Math.exp((-6 * i) / len)
      const n = (Math.random() * 2 - 1) * env * 0.25
      lp = 0.7 * lp + 0.3 * n
      d[i] += lp
    }
  }
  return buf
}

function driveUnit(ctx: AudioContext, p: Record<string, number>, curveFor: (q: Record<string, number>) => Float32Array<ArrayBuffer>, levelScale: number): Unit {
  const pre = mkFilter(ctx, 'highpass', 120) // tightens the low end before clipping, like a Tube Screamer
  const shaper = ctx.createWaveShaper()
  shaper.oversample = '4x'
  const state = { ...p }
  shaper.curve = curveFor(state)
  const tone = mkFilter(ctx, 'lowpass', p.tone, 0.7)
  const level = mkGain(ctx, (p.level / 10) * levelScale)
  const tap = mkTap(ctx)
  pre.connect(shaper).connect(tone).connect(level).connect(tap)
  return {
    input: pre,
    output: level,
    tap,
    transfer: () => curveFor(state),
    setParam: (id, v) => {
      state[id] = v
      if (id === 'drive') shaper.curve = curveFor(state)
      if (id === 'tone') tone.frequency.setTargetAtTime(v, ctx.currentTime, 0.02)
      if (id === 'level') level.gain.setTargetAtTime((v / 10) * levelScale, ctx.currentTime, 0.02)
    },
    dispose: () => [pre, shaper, tone, level].forEach((n) => n.disconnect()),
  }
}

// ----- The chain -----

/**
 * Owns the AudioContext and the live graph. The source plugs into `input`;
 * `output` goes to the speakers. Rebuild the graph when the pedal order or
 * set changes; tweak params live otherwise.
 */
export class Engine {
  readonly ctx: AudioContext
  readonly input: GainNode
  readonly output: GainNode
  readonly inputTap: AnalyserNode
  readonly outputTap: AnalyserNode
  private units = new Map<string, Unit>()
  private order: PedalInstance[] = []

  constructor() {
    this.ctx = new AudioContext({ latencyHint: 'interactive' })
    this.input = mkGain(this.ctx, 1)
    this.output = mkGain(this.ctx, 0.8)
    this.inputTap = mkTap(this.ctx)
    this.outputTap = mkTap(this.ctx)
    this.input.connect(this.inputTap)
    const limiter = this.ctx.createDynamicsCompressor()
    limiter.threshold.value = -3
    limiter.ratio.value = 20
    limiter.attack.value = 0.002
    limiter.release.value = 0.1
    this.output.connect(limiter).connect(this.outputTap).connect(this.ctx.destination)
  }

  async resume(): Promise<void> {
    if (this.ctx.state !== 'running') await this.ctx.resume()
  }

  unit(uid: string): Unit | undefined {
    return this.units.get(uid)
  }

  /** Reconnect everything in the given order. Params are applied from the instances. */
  rebuild(chain: PedalInstance[]): void {
    this.input.disconnect()
    this.input.connect(this.inputTap)
    for (const u of this.units.values()) u.output.disconnect()

    // Build any missing units, drop removed ones.
    const keep = new Set(chain.map((p) => p.uid))
    for (const [uid, u] of this.units) {
      if (!keep.has(uid)) {
        u.dispose()
        this.units.delete(uid)
      }
    }
    for (const p of chain) {
      if (!this.units.has(p.uid)) this.units.set(p.uid, builders[p.type](this.ctx, p.params))
      else {
        const u = this.units.get(p.uid) as Unit
        for (const [id, v] of Object.entries(p.params)) u.setParam(id, v)
      }
    }

    let prev: AudioNode = this.input
    for (const p of chain) {
      if (!p.enabled) continue
      const u = this.units.get(p.uid) as Unit
      prev.connect(u.input)
      u.output.connect(u.tap)
      prev = u.output
    }
    prev.connect(this.output)
    this.order = chain
  }

  setParam(uid: string, id: string, value: number): void {
    this.units.get(uid)?.setParam(id, value)
  }

  setMaster(v: number): void {
    this.output.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02)
  }

  get chain(): PedalInstance[] {
    return this.order
  }
}
