import type { Articulation } from '../model/song'

/** Anything the transport can play notes through. */
export interface Instrument {
  pluck(midi: number, when: number, durationSec: number, velocity?: number, art?: Articulation): void
  click(when: number, accent: boolean): void
  silence(): void
  /** Warm the cache for the pitches a song uses, so the first play has no gaps. */
  prepare?(midis: number[]): Promise<void>
}

export type InstrumentId = 'synth' | 'nylon' | 'steel' | 'clean' | 'jazz' | 'crunch' | 'lead' | 'overdriven' | 'distortion'

export interface InstrumentDef {
  id: InstrumentId
  name: string
  group: 'Acoustic' | 'Electric' | 'Other'
  /** Sample folder under /sf, or null for the synth. */
  samples: string | null
  /** Built-in amp simulation applied after the samples. */
  amp?: 'crunch' | 'lead'
  blurb: string
}

export const INSTRUMENTS: InstrumentDef[] = [
  { id: 'clean', name: 'Clean electric', group: 'Electric', samples: 'electric_guitar_clean', blurb: 'Sampled Strat-style clean tone. The default.' },
  { id: 'crunch', name: 'Crunch electric', group: 'Electric', samples: 'electric_guitar_clean', amp: 'crunch', blurb: 'Clean samples through a built-in overdrive and speaker. Blues and classic rock.' },
  { id: 'lead', name: 'Distorted electric', group: 'Electric', samples: 'electric_guitar_clean', amp: 'lead', blurb: 'Clean samples through a high-gain amp and cabinet. Hendrix, Metallica, solos.' },
  { id: 'overdriven', name: 'Overdriven (sampled)', group: 'Electric', samples: 'overdriven_guitar', blurb: 'The General MIDI overdriven guitar, recorded distorted.' },
  { id: 'distortion', name: 'Distortion (sampled)', group: 'Electric', samples: 'distortion_guitar', blurb: 'The General MIDI distortion guitar, recorded distorted.' },
  { id: 'jazz', name: 'Jazz electric', group: 'Electric', samples: 'electric_guitar_jazz', blurb: 'Hollow-body neck pickup. Warm and round.' },
  { id: 'steel', name: 'Steel-string acoustic', group: 'Acoustic', samples: 'acoustic_guitar_steel', blurb: 'Bright acoustic. Folk, strumming, fingerpicking.' },
  { id: 'nylon', name: 'Nylon-string classical', group: 'Acoustic', samples: 'acoustic_guitar_nylon', blurb: 'Classical guitar. The bundled classical pieces sound right on this.' },
  { id: 'synth', name: 'Plucked synth', group: 'Other', samples: null, blurb: 'The original physical-model string. No download, instant.' },
]

export const DEFAULT_INSTRUMENT: InstrumentId = 'clean'
const STORAGE_KEY = 'fretlight.instrument'

export function loadInstrumentChoice(): InstrumentId {
  const v = localStorage.getItem(STORAGE_KEY) as InstrumentId | null
  return v && INSTRUMENTS.some((i) => i.id === v) ? v : DEFAULT_INSTRUMENT
}
export function saveInstrumentChoice(id: InstrumentId): void {
  localStorage.setItem(STORAGE_KEY, id)
}
