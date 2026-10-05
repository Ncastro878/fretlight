/**
 * Keys, diatonic chords, and naming. Pitch classes are 0..11 with C = 0.
 */
export const NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
export const NOTE_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

export type Mode = 'major' | 'minor'
export interface Key {
  root: number
  mode: Mode
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11]
const NATURAL_MINOR = [0, 2, 3, 5, 7, 8, 10]
const HARMONIC_MINOR = [0, 2, 3, 5, 7, 8, 11]

/** Keys with flats in their signature spell notes with flats. */
const FLAT_MAJOR_ROOTS = new Set([5, 10, 3, 8, 1, 6])
const FLAT_MINOR_ROOTS = new Set([2, 7, 0, 5, 10, 3])

export function spell(pc: number, key: Key): string {
  const flats = key.mode === 'major' ? FLAT_MAJOR_ROOTS.has(key.root) : FLAT_MINOR_ROOTS.has(key.root)
  return (flats ? NOTE_NAMES_FLAT : NOTE_NAMES_SHARP)[((pc % 12) + 12) % 12]
}

export function keyName(key: Key): string {
  return `${spell(key.root, key)} ${key.mode}`
}

export function scalePcs(key: Key): number[] {
  return (key.mode === 'major' ? MAJOR : NATURAL_MINOR).map((i) => (key.root + i) % 12)
}

/** Chord qualities: intervals from the root, a label suffix, and a complexity rank. */
export interface Quality {
  id: string
  label: string
  intervals: number[]
  /** 0 triad, 1 color (sus, 6, add9), 2 seventh, 3 extension. */
  complexity: 0 | 1 | 2 | 3
  /** Intervals that must be present for a voicing to count as this chord (besides the melody). */
  required: number[][]
  family: 'Triads' | 'Sus, 6 & add9' | '7th chords' | 'Extensions'
}

// `required` is a list of alternatives: at least one alternative must be fully present.
export const QUALITIES: Quality[] = [
  { id: 'maj', label: '', intervals: [0, 4, 7], complexity: 0, required: [[0, 4]], family: 'Triads' },
  { id: 'min', label: 'm', intervals: [0, 3, 7], complexity: 0, required: [[0, 3]], family: 'Triads' },
  { id: 'dim', label: 'dim', intervals: [0, 3, 6], complexity: 0, required: [[0, 3, 6]], family: 'Triads' },
  { id: 'sus2', label: 'sus2', intervals: [0, 2, 7], complexity: 1, required: [[0, 2, 7]], family: 'Sus, 6 & add9' },
  { id: 'sus4', label: 'sus4', intervals: [0, 5, 7], complexity: 1, required: [[0, 5, 7]], family: 'Sus, 6 & add9' },
  { id: '6', label: '6', intervals: [0, 4, 7, 9], complexity: 1, required: [[0, 4, 9], [4, 7, 9]], family: 'Sus, 6 & add9' },
  { id: 'm6', label: 'm6', intervals: [0, 3, 7, 9], complexity: 1, required: [[0, 3, 9], [3, 7, 9]], family: 'Sus, 6 & add9' },
  { id: 'add9', label: 'add9', intervals: [0, 4, 7, 2], complexity: 1, required: [[0, 4, 2], [4, 7, 2]], family: 'Sus, 6 & add9' },
  { id: 'madd9', label: 'm(add9)', intervals: [0, 3, 7, 2], complexity: 1, required: [[0, 3, 2], [3, 7, 2]], family: 'Sus, 6 & add9' },
  { id: 'maj7', label: 'maj7', intervals: [0, 4, 7, 11], complexity: 2, required: [[4, 11]], family: '7th chords' },
  { id: '7', label: '7', intervals: [0, 4, 7, 10], complexity: 2, required: [[4, 10]], family: '7th chords' },
  { id: 'm7', label: 'm7', intervals: [0, 3, 7, 10], complexity: 2, required: [[3, 10]], family: '7th chords' },
  { id: 'm7b5', label: 'm7♭5', intervals: [0, 3, 6, 10], complexity: 2, required: [[3, 6, 10], [0, 3, 10]], family: '7th chords' },
  { id: 'dim7', label: 'dim7', intervals: [0, 3, 6, 9], complexity: 2, required: [[0, 3, 6], [3, 6, 9]], family: '7th chords' },
  { id: 'mMaj7', label: 'm(maj7)', intervals: [0, 3, 7, 11], complexity: 2, required: [[3, 11]], family: '7th chords' },
  { id: '7sus4', label: '7sus4', intervals: [0, 5, 7, 10], complexity: 2, required: [[5, 10]], family: '7th chords' },
  { id: 'maj9', label: 'maj9', intervals: [0, 4, 7, 11, 2], complexity: 3, required: [[4, 11, 2]], family: 'Extensions' },
  { id: '9', label: '9', intervals: [0, 4, 7, 10, 2], complexity: 3, required: [[4, 10, 2]], family: 'Extensions' },
  { id: 'm9', label: 'm9', intervals: [0, 3, 7, 10, 2], complexity: 3, required: [[3, 10, 2]], family: 'Extensions' },
  { id: '69', label: '6/9', intervals: [0, 4, 7, 9, 2], complexity: 3, required: [[4, 9, 2]], family: 'Extensions' },
  { id: 'm11', label: 'm11', intervals: [0, 3, 7, 10, 2, 5], complexity: 3, required: [[3, 10, 5], [10, 2, 5]], family: 'Extensions' },
  { id: '11', label: '11', intervals: [0, 7, 10, 2, 5], complexity: 3, required: [[10, 5], [7, 10, 5]], family: 'Extensions' },
  { id: 'maj7#11', label: 'maj7♯11', intervals: [0, 4, 7, 11, 6], complexity: 3, required: [[4, 11, 6]], family: 'Extensions' },
  { id: '13', label: '13', intervals: [0, 4, 7, 10, 2, 9], complexity: 3, required: [[4, 10, 9]], family: 'Extensions' },
  { id: 'maj13', label: 'maj13', intervals: [0, 4, 7, 11, 2, 9], complexity: 3, required: [[4, 11, 9]], family: 'Extensions' },
  { id: 'm13', label: 'm13', intervals: [0, 3, 7, 10, 2, 9], complexity: 3, required: [[3, 10, 9]], family: 'Extensions' },
]

export interface Chord {
  root: number
  quality: Quality
  /** 1-based scale degree in the key. */
  degree: number
  /** Roman numeral with quality. */
  numeral: string
  pcs: number[]
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']

export function chordName(chord: Chord, key: Key): string {
  return spell(chord.root, key) + chord.quality.label
}

function numeral(degree: number, q: Quality): string {
  const base = ROMAN[degree - 1]
  const minorish = q.intervals.includes(3)
  const dimish = q.intervals.includes(6) && !q.intervals.includes(7)
  const r = minorish || dimish ? base.toLowerCase() : base
  return r + (dimish ? '°' : '') + (q.complexity >= 2 ? q.label.replace(/^m(?!aj)/, '') : q.complexity === 1 ? q.label : '')
}

/**
 * Every chord whose tones all live in the key. Minor keys also get the
 * harmonic-minor V and vii° (the chords that make minor sound like minor).
 */
export function diatonicChords(key: Key): Chord[] {
  const natural = new Set((key.mode === 'major' ? MAJOR : NATURAL_MINOR).map((i) => (key.root + i) % 12))
  const harmonic = new Set(HARMONIC_MINOR.map((i) => (key.root + i) % 12))
  const degrees = key.mode === 'major' ? MAJOR : NATURAL_MINOR
  const out: Chord[] = []
  degrees.forEach((offset, idx) => {
    const degree = idx + 1
    const root = (key.root + offset) % 12
    for (const q of QUALITIES) {
      const pcs = q.intervals.map((i) => (root + i) % 12)
      const inNatural = pcs.every((p) => natural.has(p))
      const inHarmonic = key.mode === 'minor' && (degree === 5 || degree === 7) && pcs.every((p) => harmonic.has(p))
      if (inNatural || inHarmonic) out.push({ root, quality: q, degree, numeral: numeral(degree, q), pcs })
    }
  })
  // The harmonic-minor vii°7 sits a half step higher than the natural VII.
  if (key.mode === 'minor') {
    const root = (key.root + 11) % 12
    for (const q of QUALITIES.filter((x) => x.id === 'dim' || x.id === 'dim7' || x.id === 'm7b5')) {
      const pcs = q.intervals.map((i) => (root + i) % 12)
      if (pcs.every((p) => harmonic.has(p))) out.push({ root, quality: q, degree: 7, numeral: 'vii' + (q.id === 'm7b5' ? 'ø7' : q.id === 'dim7' ? '°7' : '°'), pcs })
    }
  }
  return out
}

/** What the melody note is inside the chord: "3rd", "9th", and so on. */
export function roleOf(pc: number, chord: Chord): string {
  const i = ((pc - chord.root) % 12 + 12) % 12
  const names: Record<number, string> = { 0: 'root', 1: '♭9', 2: '9th', 3: '3rd', 4: '3rd', 5: '11th', 6: '♯11', 7: '5th', 8: '♭13', 9: '13th', 10: '7th', 11: '7th' }
  if (i === 2 && !chord.quality.intervals.includes(2)) return '9th'
  if (i === 5 && chord.quality.intervals.includes(5) && chord.quality.id.includes('sus')) return '4th'
  if (i === 9 && chord.quality.intervals.includes(9) && chord.quality.complexity <= 1) return '6th'
  return names[i] ?? '?'
}
