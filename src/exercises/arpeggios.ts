import { STANDARD_TUNING, noteName, type Song, type SongNote } from '../model/song'
import { ROOT_NAMES } from './scales'
import { A_FORMS, E_FORMS, type Quality } from './chords'

export interface ArpeggioDef {
  id: string
  name: string
  label: string
  intervals: number[]
  group: 'Triads' | '7th chords'
}

export const ARPEGGIOS: ArpeggioDef[] = [
  { id: 'maj', name: 'Major', label: '', intervals: [0, 4, 7], group: 'Triads' },
  { id: 'min', name: 'Minor', label: 'm', intervals: [0, 3, 7], group: 'Triads' },
  { id: 'dim', name: 'Diminished', label: 'dim', intervals: [0, 3, 6], group: 'Triads' },
  { id: 'aug', name: 'Augmented', label: 'aug', intervals: [0, 4, 8], group: 'Triads' },
  { id: 'maj7', name: 'Major 7', label: 'maj7', intervals: [0, 4, 7, 11], group: '7th chords' },
  { id: '7', name: 'Dominant 7', label: '7', intervals: [0, 4, 7, 10], group: '7th chords' },
  { id: 'min7', name: 'Minor 7', label: 'm7', intervals: [0, 3, 7, 10], group: '7th chords' },
  { id: 'm7b5', name: 'Half-diminished (m7♭5)', label: 'm7♭5', intervals: [0, 3, 6, 10], group: '7th chords' },
  { id: 'dim7', name: 'Diminished 7', label: 'dim7', intervals: [0, 3, 6, 9], group: '7th chords' },
  { id: 'mMaj7', name: 'Minor-major 7', label: 'mMaj7', intervals: [0, 3, 7, 11], group: '7th chords' },
]

export type ArpShapeId = 'pos6' | 'pos5' | 'sweep5' | 'sweep6' | 'string'
export const ARP_SHAPES: { id: ArpShapeId; name: string; help: string }[] = [
  { id: 'pos6', name: 'Position, root on 6th string', help: 'Two octaves inside one hand position, starting from the low E string.' },
  { id: 'pos5', name: 'Position, root on 5th string', help: 'Two octaves starting from the A string. The other half of the neck.' },
  { id: 'sweep5', name: 'Sweep, 5 strings', help: 'One note per string from the A string up, two on the top string with a hammer-on. Rake the pick through.' },
  { id: 'sweep6', name: 'Sweep, 6 strings', help: 'The big one: six strings up and down with a hammer-on at the top.' },
  { id: 'string', name: 'Along one string', help: 'Chord tones up a single string. Learn where the intervals live.' },
]

export type ArpPatternId = 'updown' | 'groups3' | 'groups4' | 'inversions' | 'sweep'
export const ARP_PATTERNS: { id: ArpPatternId; name: string; help: string }[] = [
  { id: 'updown', name: 'Up and down', help: 'Straight up and back.' },
  { id: 'groups3', name: 'Groups of 3', help: '123 234 345… across the arpeggio.' },
  { id: 'groups4', name: 'Groups of 4', help: '1234 2345 3456… the alternate-picking sequence.' },
  { id: 'inversions', name: 'Climb the inversions', help: 'Play the chord tones in rotating order: 1-3-5, 3-5-1, 5-1-3…' },
  { id: 'sweep', name: 'Sweep (repeat)', help: 'Up and down four times without a gap. For the sweep shapes.' },
]

export interface ArpSpec {
  root: number
  arpId: string
  shape: ArpShapeId
  pattern: ArpPatternId
  noteValue: number
  bpm: number
  /** For the single-string shape, which string (0 = low E). */
  string?: number
}

interface ShapeNote {
  string: number
  fret: number
  finger: number
  hammer?: boolean
}

export function arpById(id: string): ArpeggioDef {
  return ARPEGGIOS.find((a) => a.id === id) ?? ARPEGGIOS[0]
}

function firstFret(stringMidi: number, pc: number, from = 1): number {
  for (let f = from; f <= from + 12; f++) if ((stringMidi + f) % 12 === pc) return f
  return from
}

/** All chord tones within a fret window on every string, lowest first. */
function windowShape(root: number, intervals: number[], rootString: number, tuning: number[]): ShapeNote[] {
  const pcs = new Set(intervals.map((i) => (root + i) % 12))
  const rootFret = firstFret(tuning[rootString], root, 2)
  // The window sits around the root: a fret below for the 7th or 3rd, three above.
  const lo = Math.max(0, rootFret - 1)
  const hi = rootFret + 3
  const out: ShapeNote[] = []
  for (let s = rootString; s < tuning.length; s++) {
    const frets: number[] = []
    for (let f = lo; f <= hi; f++) if (pcs.has((tuning[s] + f) % 12)) frets.push(f)
    // Allow one stretch note above the window when a string would otherwise be empty.
    if (frets.length === 0 && pcs.has((tuning[s] + hi + 1) % 12)) frets.push(hi + 1)
    for (const f of frets) out.push({ string: s, fret: f, finger: Math.min(4, Math.max(1, f - lo + 1)) })
  }
  // Start on the root, not on a lower chord tone that happens to be in the window.
  const start = out.findIndex((n) => n.string === rootString && n.fret === rootFret)
  return start > 0 ? out.slice(start) : out
}

/**
 * Classic sweep shapes are barre chords played one string at a time: the
 * A-form for five strings, the E-form for six, plus a hammer-on to the next
 * chord tone on the top string. Chords without a barre form fall back to a
 * one-note-per-string walk through the window.
 */
function sweepShape(root: number, arpId: string, intervals: number[], strings: 5 | 6, tuning: number[]): ShapeNote[] {
  const pcs = intervals.map((i) => (root + i) % 12)
  const low = strings === 5 ? 1 : 0
  const rootFret = firstFret(tuning[low], root, strings === 5 ? 3 : 5)
  const form = (strings === 5 ? A_FORMS : E_FORMS)[arpId as Quality]
  const out: ShapeNote[] = []
  if (form) {
    for (let s = low; s < tuning.length; s++) {
      const off = form.frets[s]
      if (off < 0) continue
      out.push({ string: s, fret: rootFret + off, finger: form.fingers[s] || 1 })
    }
  } else {
    const lo = rootFret - 2
    const hi = rootFret + 4
    let lastMidi = tuning[low] + rootFret - 1
    for (let s = low; s < tuning.length; s++) {
      for (let f = Math.max(0, lo); f <= hi; f++) {
        if (pcs.includes((tuning[s] + f) % 12) && tuning[s] + f > lastMidi) {
          out.push({ string: s, fret: f, finger: Math.min(4, Math.max(1, f - lo + 1)) })
          lastMidi = tuning[s] + f
          break
        }
      }
    }
  }
  // Hammer-on to the next chord tone up the top string.
  const top = out[out.length - 1]
  if (top && top.string === tuning.length - 1) {
    for (let f = top.fret + 1; f <= top.fret + 5; f++) {
      if (pcs.includes((tuning[top.string] + f) % 12)) {
        out.push({ string: top.string, fret: f, finger: 4, hammer: true })
        break
      }
    }
  }
  return out
}

function stringShape(root: number, intervals: number[], string: number, tuning: number[]): ShapeNote[] {
  const pcs = new Set(intervals.map((i) => (root + i) % 12))
  const start = firstFret(tuning[string], root, 0)
  const out: ShapeNote[] = []
  for (let f = start; f <= start + 12 && f <= 19; f++) if (pcs.has((tuning[string] + f) % 12)) out.push({ string, fret: f, finger: f === 0 ? 0 : 1 })
  return out
}

export function buildArpShape(spec: ArpSpec, tuning = STANDARD_TUNING): ShapeNote[] {
  const arp = arpById(spec.arpId)
  switch (spec.shape) {
    case 'pos6':
      return windowShape(spec.root, arp.intervals, 0, tuning)
    case 'pos5':
      return windowShape(spec.root, arp.intervals, 1, tuning)
    case 'sweep5':
      return sweepShape(spec.root, spec.arpId, arp.intervals, 5, tuning)
    case 'sweep6':
      return sweepShape(spec.root, spec.arpId, arp.intervals, 6, tuning)
    case 'string':
      return stringShape(spec.root, arp.intervals, Math.min(tuning.length - 1, spec.string ?? 0), tuning)
  }
}

function sequence(count: number, pattern: ArpPatternId, tones: number): number[] {
  const up = Array.from({ length: count }, (_, i) => i)
  const down = [...up].reverse()
  const out: number[] = []
  switch (pattern) {
    case 'updown':
      out.push(...up, ...down.slice(1, -1))
      break
    case 'sweep':
      for (let r = 0; r < 4; r++) out.push(...up, ...down.slice(1, -1))
      break
    case 'groups3':
    case 'groups4': {
      const g = pattern === 'groups4' ? 4 : 3
      for (let i = 0; i + g <= count; i++) for (let k = 0; k < g; k++) out.push(i + k)
      for (let i = count - 1; i - g >= -1; i--) for (let k = 0; k < g; k++) out.push(i - k)
      break
    }
    case 'inversions':
      // Rotate through the chord tones: each group starts one tone higher.
      for (let i = 0; i + tones <= count; i++) for (let k = 0; k < tones; k++) out.push(i + k)
      for (let i = count - 1; i - tones >= -1; i--) for (let k = 0; k < tones; k++) out.push(i - k)
      break
  }
  return out
}

export function arpTitle(spec: ArpSpec): string {
  const arp = arpById(spec.arpId)
  const shape = ARP_SHAPES.find((s) => s.id === spec.shape)?.name ?? ''
  const where = spec.shape === 'string' ? ` · ${noteName(STANDARD_TUNING[spec.string ?? 0], false)} string` : ''
  return `${ROOT_NAMES[spec.root]}${arp.label} arpeggio · ${shape}${where}`
}

export function buildArpeggio(spec: ArpSpec, tuning = STANDARD_TUNING): Song {
  const arp = arpById(spec.arpId)
  const shape = buildArpShape(spec, tuning)
  const order = sequence(shape.length, spec.pattern, arp.intervals.length)
  const notes: SongNote[] = order.map((idx, i) => {
    const n = shape[idx]
    const prev = i > 0 ? shape[order[i - 1]] : null
    const legato = n.hammer && prev && prev.string === n.string && prev.fret !== n.fret
    return {
      time: i * spec.noteValue,
      duration: spec.noteValue,
      string: n.string,
      fret: n.fret,
      finger: n.fret === 0 ? undefined : n.finger,
      hammer: legato || undefined,
      hammerFromFret: legato && prev ? prev.fret : undefined,
      letRing: spec.shape.startsWith('sweep') ? undefined : undefined,
    }
  })
  const pattern = ARP_PATTERNS.find((p) => p.id === spec.pattern)?.name ?? ''
  return {
    id: `arp-${spec.root}-${spec.arpId}-${spec.shape}-${spec.pattern}-${spec.noteValue}-${spec.string ?? 0}`,
    title: arpTitle(spec),
    composer: pattern,
    tempo: spec.bpm,
    beatsPerBar: 4,
    tuning,
    notes,
    blurb: `${arp.name} arpeggio: ${arp.intervals.map((i) => noteName((spec.root + i) % 12, false)).join(' ')}. ${ARP_SHAPES.find((s) => s.id === spec.shape)?.help ?? ''}`,
  }
}
