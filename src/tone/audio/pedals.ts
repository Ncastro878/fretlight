/**
 * Pedal and amp definitions: what each effect is, its knobs, and the teaching
 * notes shown in the inspector. The audio graph for each lives in engine.ts.
 */
export type Category = 'dynamics' | 'drive' | 'eq' | 'modulation' | 'time' | 'amp' | 'cab' | 'utility'

export interface ParamDef {
  id: string
  name: string
  min: number
  max: number
  default: number
  step?: number
  unit?: string
  /** Logarithmic slider for frequencies and times. */
  log?: boolean
  /** Discrete choices; value is the index. */
  options?: string[]
}

export interface PedalDef {
  type: string
  name: string
  category: Category
  color: string
  /** Always first in the chain and cannot be removed (the guitar itself). */
  fixed?: boolean
  params: ParamDef[]
  /** One-paragraph explanation for the inspector. */
  about: string
  /** Where it usually goes and why. */
  placement: string
}

export const CATEGORY_ORDER: Category[] = ['utility', 'dynamics', 'drive', 'eq', 'modulation', 'time', 'amp', 'cab']
export const CATEGORY_NAMES: Record<Category, string> = {
  utility: 'Utility',
  dynamics: 'Dynamics',
  drive: 'Drive',
  eq: 'EQ & filter',
  modulation: 'Modulation',
  time: 'Time',
  amp: 'Amplifier',
  cab: 'Speaker cabinet',
}

export const PEDALS: PedalDef[] = [
  {
    type: 'guitar',
    name: 'Guitar',
    category: 'utility',
    color: '#f5d0a9',
    fixed: true,
    params: [
      { id: 'pickup', name: 'Pickup', min: 0, max: 2, default: 2, options: ['Neck', 'Middle', 'Bridge'] },
      { id: 'volume', name: 'Volume knob', min: 0, max: 10, default: 10 },
      { id: 'tone', name: 'Tone knob', min: 0, max: 10, default: 10 },
    ],
    about: 'The guitar is the first pedal. The pickup position sets which harmonics cancel (neck is round, bridge is bright). The volume knob is a gain control into everything after it: roll it back and a cranked amp cleans up. The tone knob is a low-pass filter.',
    placement: 'Always first. Learn to play the volume knob and you need fewer pedals.',
  },
  {
    type: 'boost',
    name: 'Clean boost',
    category: 'utility',
    color: '#e5e7eb',
    params: [{ id: 'gain', name: 'Boost', min: 0, max: 24, default: 6, unit: 'dB' }],
    about: 'Makes the signal louder without changing its shape. Into a drive pedal or an amp it adds grit, because the next stage clips harder. After everything it is just a volume lift for solos.',
    placement: 'Front of the chain to push drives; end of the chain for a solo lift.',
  },
  {
    type: 'gate',
    name: 'Noise gate',
    category: 'utility',
    color: '#64748b',
    params: [
      { id: 'threshold', name: 'Threshold', min: -80, max: -20, default: -50, unit: 'dB' },
      { id: 'release', name: 'Release', min: 20, max: 500, default: 120, unit: 'ms' },
    ],
    about: 'Mutes the signal when it drops below the threshold. Kills hum and hiss between notes, which matters once there is a lot of gain. Set it too high and it chops the tails of your notes.',
    placement: 'Right after the drive pedals, before time effects, so it does not cut delay and reverb tails.',
  },
  {
    type: 'compressor',
    name: 'Compressor',
    category: 'dynamics',
    color: '#60a5fa',
    params: [
      { id: 'threshold', name: 'Threshold', min: -60, max: 0, default: -24, unit: 'dB' },
      { id: 'ratio', name: 'Ratio', min: 1, max: 20, default: 4, unit: ':1' },
      { id: 'attack', name: 'Attack', min: 1, max: 100, default: 10, unit: 'ms', log: true },
      { id: 'release', name: 'Release', min: 20, max: 1000, default: 200, unit: 'ms', log: true },
      { id: 'makeup', name: 'Makeup', min: 0, max: 24, default: 6, unit: 'dB' },
    ],
    about: 'Turns loud notes down and quiet notes up, so every note comes out even and sustain seems longer. A slow attack lets the pick click through (country snap); a fast attack smooths it away.',
    placement: 'Early, before drive, so the drive sees a steady level. Country and funk players live on this.',
  },
  {
    type: 'overdrive',
    name: 'Overdrive',
    category: 'drive',
    color: '#4ade80',
    params: [
      { id: 'drive', name: 'Drive', min: 0, max: 10, default: 4 },
      { id: 'tone', name: 'Tone', min: 500, max: 8000, default: 3000, unit: 'Hz', log: true },
      { id: 'level', name: 'Level', min: 0, max: 10, default: 6 },
    ],
    about: 'Soft clipping: the peaks of the wave get rounded off gently, like a tube amp pushed hard. Keeps the dynamics of your picking. Tube Screamer territory: a mid bump and a tight low end.',
    placement: 'After compression and wah, before modulation. Stack a low-gain overdrive into a louder one for lead tones.',
  },
  {
    type: 'distortion',
    name: 'Distortion',
    category: 'drive',
    color: '#f97316',
    params: [
      { id: 'drive', name: 'Gain', min: 0, max: 10, default: 6 },
      { id: 'tone', name: 'Tone', min: 500, max: 8000, default: 2500, unit: 'Hz', log: true },
      { id: 'level', name: 'Level', min: 0, max: 10, default: 5 },
    ],
    about: 'Hard clipping: the peaks are flattened, which adds a lot of odd harmonics and squashes dynamics. Louder-sounding and more saturated than overdrive; the sound of rock and metal rhythm.',
    placement: 'Same slot as overdrive. Usually one or the other, not both at once.',
  },
  {
    type: 'fuzz',
    name: 'Fuzz',
    category: 'drive',
    color: '#c084fc',
    params: [
      { id: 'fuzz', name: 'Fuzz', min: 0, max: 10, default: 7 },
      { id: 'bias', name: 'Bias', min: -0.6, max: 0.6, default: 0.15, step: 0.01 },
      { id: 'level', name: 'Level', min: 0, max: 10, default: 5 },
    ],
    about: 'Clips so hard the wave turns into a square. Asymmetric bias adds even harmonics (octave-ish fizz) and the spluttery gated decay. Hendrix, Big Muff, early Sabbath.',
    placement: 'Very first in the chain. Fuzz reacts to the guitar volume knob and to the pickup directly; a buffer or wah in front of it changes the sound.',
  },
  {
    type: 'eq',
    name: 'Graphic EQ',
    category: 'eq',
    color: '#fbbf24',
    params: [
      { id: 'low', name: 'Low (100 Hz)', min: -12, max: 12, default: 0, unit: 'dB' },
      { id: 'mid', name: 'Mid', min: -12, max: 12, default: 0, unit: 'dB' },
      { id: 'midFreq', name: 'Mid freq', min: 200, max: 3000, default: 800, unit: 'Hz', log: true },
      { id: 'high', name: 'High (3 kHz)', min: -12, max: 12, default: 0, unit: 'dB' },
    ],
    about: 'Boost or cut parts of the spectrum. Guitar lives between 80 Hz and 5 kHz. Cut 200 to 400 Hz to remove mud; boost 2 to 3 kHz for presence; cut the mids and you vanish in a band mix.',
    placement: 'Before drive it changes what gets clipped (a mid boost tightens). After drive it shapes the result. Try both.',
  },
  {
    type: 'wah',
    name: 'Wah / filter',
    category: 'eq',
    color: '#f472b6',
    params: [
      { id: 'mode', name: 'Mode', min: 0, max: 1, default: 1, options: ['Manual', 'Auto (LFO)'] },
      { id: 'position', name: 'Pedal position', min: 0, max: 1, default: 0.5, step: 0.01 },
      { id: 'rate', name: 'Auto rate', min: 0.2, max: 8, default: 2, unit: 'Hz', log: true },
      { id: 'q', name: 'Resonance', min: 1, max: 15, default: 6 },
    ],
    about: 'A resonant band-pass filter swept across the mids. Your foot moves the peak between about 400 Hz and 2.5 kHz; the "wah" vowel sound is that peak moving. Auto mode sweeps it with an LFO.',
    placement: 'Early, usually before drive, so the drive emphasizes the swept peak.',
  },
  {
    type: 'chorus',
    name: 'Chorus',
    category: 'modulation',
    color: '#22d3ee',
    params: [
      { id: 'rate', name: 'Rate', min: 0.1, max: 5, default: 0.8, unit: 'Hz', log: true },
      { id: 'depth', name: 'Depth', min: 0, max: 10, default: 5, unit: 'ms' },
      { id: 'mix', name: 'Mix', min: 0, max: 1, default: 0.5, step: 0.01 },
    ],
    about: 'A short delay (around 20 ms) whose length wobbles, mixed with the dry signal. The pitch drifts slightly, like two guitarists almost in tune. The 80s clean sound, Nirvana verses, Police.',
    placement: 'After drive. Modulating a clipped signal sounds lush; clipping a modulated one sounds seasick.',
  },
  {
    type: 'phaser',
    name: 'Phaser',
    category: 'modulation',
    color: '#a78bfa',
    params: [
      { id: 'rate', name: 'Rate', min: 0.05, max: 4, default: 0.4, unit: 'Hz', log: true },
      { id: 'depth', name: 'Depth', min: 0, max: 1, default: 0.7, step: 0.01 },
      { id: 'feedback', name: 'Feedback', min: 0, max: 0.9, default: 0.3, step: 0.01 },
    ],
    about: 'All-pass filters shift the phase of some frequencies; mixed with the dry signal they cancel into moving notches. The swooshing jet sound. Van Halen, Pink Floyd, funk rhythm.',
    placement: 'After drive, though Eddie put it before the amp. Slow rate for texture, fast for warble.',
  },
  {
    type: 'tremolo',
    name: 'Tremolo',
    category: 'modulation',
    color: '#34d399',
    params: [
      { id: 'rate', name: 'Rate', min: 0.5, max: 16, default: 5, unit: 'Hz', log: true },
      { id: 'depth', name: 'Depth', min: 0, max: 1, default: 0.6, step: 0.01 },
      { id: 'shape', name: 'Shape', min: 0, max: 1, default: 0, options: ['Sine', 'Square'] },
    ],
    about: 'Volume going up and down on a cycle. Sine is the gentle Fender amp pulse; square is the choppy helicopter. Not vibrato: pitch does not move, only loudness.',
    placement: 'Late, after drive and before reverb, like the tremolo built into old amps.',
  },
  {
    type: 'delay',
    name: 'Delay',
    category: 'time',
    color: '#fb7185',
    params: [
      { id: 'time', name: 'Time', min: 30, max: 1200, default: 380, unit: 'ms', log: true },
      { id: 'feedback', name: 'Feedback', min: 0, max: 0.9, default: 0.35, step: 0.01 },
      { id: 'tone', name: 'Repeat tone', min: 800, max: 10000, default: 3500, unit: 'Hz', log: true },
      { id: 'mix', name: 'Mix', min: 0, max: 1, default: 0.3, step: 0.01 },
    ],
    about: 'Repeats the signal after a set time. Feedback sends repeats back in for more. Darker repeats (lower tone) stay out of the way of the dry note, like tape and analog units. 100 ms is slapback; a dotted eighth at your tempo is the U2 sound.',
    placement: 'After drive and modulation, before reverb. Delay before drive gives every repeat its own distortion, which turns to mush fast.',
  },
  {
    type: 'reverb',
    name: 'Reverb',
    category: 'time',
    color: '#38bdf8',
    params: [
      { id: 'decay', name: 'Decay', min: 0.3, max: 8, default: 2, unit: 's', log: true },
      { id: 'predelay', name: 'Pre-delay', min: 0, max: 120, default: 20, unit: 'ms' },
      { id: 'damping', name: 'Damping', min: 1000, max: 12000, default: 5000, unit: 'Hz', log: true },
      { id: 'mix', name: 'Mix', min: 0, max: 1, default: 0.25, step: 0.01 },
    ],
    about: 'Thousands of tiny echoes that simulate a room. Decay is the room size; pre-delay is the gap before the room answers, which keeps the note itself clear. Damping darkens the tail like soft walls do.',
    placement: 'Last. Reverb goes after everything so the whole sound sits in the same room.',
  },
  {
    type: 'amp',
    name: 'Amplifier',
    category: 'amp',
    color: '#d4a373',
    params: [
      { id: 'model', name: 'Model', min: 0, max: 3, default: 0, options: ['American clean', 'British crunch', 'Plexi lead', 'High gain'] },
      { id: 'gain', name: 'Gain', min: 0, max: 10, default: 3 },
      { id: 'bass', name: 'Bass', min: 0, max: 10, default: 5 },
      { id: 'mid', name: 'Middle', min: 0, max: 10, default: 5 },
      { id: 'treble', name: 'Treble', min: 0, max: 10, default: 5 },
      { id: 'presence', name: 'Presence', min: 0, max: 10, default: 4 },
      { id: 'master', name: 'Master', min: 0, max: 10, default: 5 },
    ],
    about: 'Preamp gain clips the signal with a curve that depends on the model, then the tone stack shapes it, then the master sets the volume. Every pedal in front of this is really a way of changing what the amp sees.',
    placement: 'The amp is the end of the pedal chain. Only the cabinet comes after it.',
  },
  {
    type: 'cab',
    name: 'Speaker cabinet',
    category: 'cab',
    color: '#78716c',
    params: [
      { id: 'model', name: 'Cabinet', min: 0, max: 2, default: 1, options: ['1x12 open back', '2x12', '4x12 closed'] },
      { id: 'mic', name: 'Mic position', min: 0, max: 1, default: 0.3, step: 0.01 },
      { id: 'distance', name: 'Mic distance', min: 0, max: 1, default: 0.1, step: 0.01 },
    ],
    about: 'A guitar speaker rolls off everything above about 5 kHz and has a bump around 100 Hz and 2 to 3 kHz. Without it, distortion sounds like bees. The mic position trades brightness (center) for warmth (edge); distance adds the room.',
    placement: 'Always last. Turning it off is the fastest way to hear why cab simulation exists.',
  },
]

export function pedalDef(type: string): PedalDef {
  const d = PEDALS.find((p) => p.type === type)
  if (!d) throw new Error(`Unknown pedal ${type}`)
  return d
}

export interface PedalInstance {
  uid: string
  type: string
  enabled: boolean
  params: Record<string, number>
}

let counter = 0
export function makePedal(type: string, params: Partial<Record<string, number>> = {}, enabled = true): PedalInstance {
  const def = pedalDef(type)
  const p: Record<string, number> = {}
  for (const d of def.params) p[d.id] = params[d.id] ?? d.default
  return { uid: `${type}-${++counter}-${Math.random().toString(36).slice(2, 6)}`, type, enabled, params: p }
}

export const DEFAULT_CHAIN = (): PedalInstance[] => [makePedal('guitar'), makePedal('overdrive'), makePedal('delay'), makePedal('reverb'), makePedal('amp'), makePedal('cab')]

/** Make sure the fixed guitar stage is present and first. */
export function normalizeChain(chain: PedalInstance[]): PedalInstance[] {
  const guitar = chain.find((p) => p.type === 'guitar') ?? makePedal('guitar')
  return [guitar, ...chain.filter((p) => p.type !== 'guitar')]
}

// ----- Save and share -----

interface Packed {
  t: string
  e: 0 | 1
  p: Record<string, number>
}

export function encodeChain(chain: PedalInstance[]): string {
  const packed: Packed[] = chain.map((p) => ({ t: p.type, e: p.enabled ? 1 : 0, p: p.params }))
  const json = JSON.stringify(packed)
  return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeChain(text: string): PedalInstance[] | null {
  try {
    const b64 = text.replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(escape(atob(b64)))
    const packed = JSON.parse(json) as Packed[]
    if (!Array.isArray(packed)) return null
    return normalizeChain(packed.filter((x) => PEDALS.some((d) => d.type === x.t)).map((x) => makePedal(x.t, x.p, x.e !== 0)))
  } catch {
    return null
  }
}

export interface SavedTone {
  name: string
  chain: string
  savedAt: number
}
const SAVED_KEY = 'tonelab.tones.v1'
export function loadSavedTones(): SavedTone[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY)
    return raw ? (JSON.parse(raw) as SavedTone[]) : []
  } catch {
    return []
  }
}
export function storeSavedTones(list: SavedTone[]): void {
  localStorage.setItem(SAVED_KEY, JSON.stringify(list))
}
