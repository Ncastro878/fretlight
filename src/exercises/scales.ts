import { STANDARD_TUNING, noteName, type Song, type SongNote } from '../model/song'

export const ROOT_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export interface ScaleDef {
  id: string
  name: string
  /** Semitone offsets from the root. */
  intervals: number[]
  group: 'Scales' | 'Modes' | 'Pentatonic & blues'
}

export const SCALES: ScaleDef[] = [
  { id: 'major', name: 'Major (Ionian)', intervals: [0, 2, 4, 5, 7, 9, 11], group: 'Scales' },
  { id: 'minor', name: 'Natural minor (Aeolian)', intervals: [0, 2, 3, 5, 7, 8, 10], group: 'Scales' },
  { id: 'harmonic-minor', name: 'Harmonic minor', intervals: [0, 2, 3, 5, 7, 8, 11], group: 'Scales' },
  { id: 'melodic-minor', name: 'Melodic minor', intervals: [0, 2, 3, 5, 7, 9, 11], group: 'Scales' },
  { id: 'dorian', name: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10], group: 'Modes' },
  { id: 'phrygian', name: 'Phrygian', intervals: [0, 1, 3, 5, 7, 8, 10], group: 'Modes' },
  { id: 'lydian', name: 'Lydian', intervals: [0, 2, 4, 6, 7, 9, 11], group: 'Modes' },
  { id: 'mixolydian', name: 'Mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10], group: 'Modes' },
  { id: 'locrian', name: 'Locrian', intervals: [0, 1, 3, 5, 6, 8, 10], group: 'Modes' },
  { id: 'phrygian-dominant', name: 'Phrygian dominant', intervals: [0, 1, 4, 5, 7, 8, 10], group: 'Modes' },
  { id: 'minor-pentatonic', name: 'Minor pentatonic', intervals: [0, 3, 5, 7, 10], group: 'Pentatonic & blues' },
  { id: 'major-pentatonic', name: 'Major pentatonic', intervals: [0, 2, 4, 7, 9], group: 'Pentatonic & blues' },
  { id: 'blues', name: 'Blues (minor)', intervals: [0, 3, 5, 6, 7, 10], group: 'Pentatonic & blues' },
]

export type ShapeId = 'nps3' | 'box' | 'horizontal'
export const SHAPES: { id: ShapeId; name: string; help: string }[] = [
  { id: 'nps3', name: '3 notes per string', help: 'Seven shred-style positions covering the whole neck.' },
  { id: 'box', name: 'Box / position', help: 'Pentatonic boxes (two notes per string). For 7-note scales, every scale tone in a four-fret window, like CAGED positions.' },
  { id: 'horizontal', name: 'One string', help: 'Walk the scale up a single string to learn the intervals.' },
]

export type PatternId = 'updown' | 'groups3' | 'groups4' | 'thirds' | 'skip'
export const PATTERNS: { id: PatternId; name: string; help: string }[] = [
  { id: 'updown', name: 'Up and down', help: 'Straight through the shape and back.' },
  { id: 'groups4', name: 'Groups of 4', help: '1234 2345 3456… the classic alternate-picking sequence.' },
  { id: 'groups3', name: 'Groups of 3', help: '123 234 345… great with triplets.' },
  { id: 'thirds', name: 'In thirds', help: '13 24 35… skips one scale tone each step.' },
  { id: 'skip', name: 'String skipping', help: 'Plays each string pair with one string skipped.' },
]

export const NOTE_VALUES = [
  { beats: 0.5, name: 'Eighths' },
  { beats: 1 / 3, name: 'Triplets' },
  { beats: 0.25, name: 'Sixteenths' },
  { beats: 1 / 6, name: 'Sextuplets' },
]

export interface ExerciseSpec {
  root: number
  scaleId: string
  shape: ShapeId
  /** 0-based position index; see shapeCount. */
  position: number
  pattern: PatternId
  noteValue: number
  bpm: number
  /** Which string to use for the horizontal shape (0 = low E). */
  string?: number
}

interface ShapeNote {
  string: number
  fret: number
  finger: number
}

export function scaleById(id: string): ScaleDef {
  return SCALES.find((s) => s.id === id) ?? SCALES[0]
}

export function shapeCount(spec: ExerciseSpec, tuning = STANDARD_TUNING): number {
  const scale = scaleById(spec.scaleId)
  if (spec.shape === 'horizontal') return tuning.length
  return scale.intervals.length
}

/** Pitch classes of the scale, as a sorted set. */
function pitchClasses(root: number, scale: ScaleDef): Set<number> {
  return new Set(scale.intervals.map((i) => (root + i) % 12))
}

/**
 * Build a position shape: `perString` consecutive scale tones on each string,
 * starting on scale degree `position` on the lowest string. Each string
 * continues from where the previous one left off, which yields the standard
 * 3-note-per-string and box systems.
 */
function positionShape(spec: ExerciseSpec, perString: number, tuning: number[]): ShapeNote[] {
  const scale = scaleById(spec.scaleId)
  const pcs = pitchClasses(spec.root, scale)
  const degreePc = (spec.root + scale.intervals[spec.position % scale.intervals.length]) % 12
  const out: ShapeNote[] = []

  // Lowest string: find the first fret (from 1 up) that is the starting degree.
  let startFret = 0
  for (let f = 1; f <= 12; f++) {
    if ((tuning[0] + f) % 12 === degreePc) {
      startFret = f
      break
    }
  }
  let nextMidi = tuning[0] + startFret
  for (let s = 0; s < tuning.length; s++) {
    const frets: number[] = []
    let midi = Math.max(nextMidi, tuning[s])
    // Walk up from the continuation pitch collecting scale tones on this string.
    let fret = midi - tuning[s]
    while (frets.length < perString) {
      if (pcs.has((tuning[s] + fret) % 12)) frets.push(fret)
      fret++
    }
    // Keep the hand in one place: if the first note sits far below the rest, drop it up an octave is
    // not possible, so just accept. Compute fingers from the stretch.
    const fingers = fingersFor(frets)
    frets.forEach((f, i) => out.push({ string: s, fret: f, finger: fingers[i] }))
    // Next string continues with the scale tone after the last one played.
    midi = tuning[s] + frets[frets.length - 1]
    let probe = midi + 1
    while (!pcs.has(probe % 12)) probe++
    nextMidi = probe
  }
  return out
}

function fingersFor(frets: number[]): number[] {
  if (frets.length === 1) return [1]
  const span = frets[frets.length - 1] - frets[0]
  if (frets.length === 2) return span >= 3 ? [1, 4] : span === 2 ? [1, 3] : [1, 2]
  // Three notes: whole-whole 1-2-4, half-whole 1-2-4, whole-half 1-3-4, wider stretches 1-2-4.
  const a = frets[1] - frets[0]
  const b = frets[2] - frets[1]
  if (a === 2 && b === 1) return [1, 3, 4]
  if (a === 1 && b === 1) return [1, 2, 3]
  if (a === 1 && b === 2) return [1, 2, 4]
  if (a === 2 && b === 2) return [1, 2, 4]
  return [1, 2, 4]
}

function horizontalShape(spec: ExerciseSpec, tuning: number[]): ShapeNote[] {
  const scale = scaleById(spec.scaleId)
  const pcs = pitchClasses(spec.root, scale)
  const s = Math.min(tuning.length - 1, spec.string ?? spec.position)
  const out: ShapeNote[] = []
  // Start on the root (or the lowest scale tone at/after fret 0) and go up an octave plus one.
  let startFret = 0
  for (let f = 0; f <= 12; f++) {
    if ((tuning[s] + f) % 12 === spec.root) {
      startFret = f
      break
    }
  }
  for (let f = startFret; f <= startFret + 12 && f <= 19; f++) {
    if (pcs.has((tuning[s] + f) % 12)) out.push({ string: s, fret: f, finger: f === 0 ? 0 : 1 })
  }
  return out
}

/**
 * Position box for 7-note scales: every scale tone inside a four-fret window
 * on each string, the way CAGED positions are taught. The window starts on
 * the chosen degree on the low string.
 */
function windowShape(spec: ExerciseSpec, tuning: number[]): ShapeNote[] {
  const scale = scaleById(spec.scaleId)
  const pcs = pitchClasses(spec.root, scale)
  const degreePc = (spec.root + scale.intervals[spec.position % scale.intervals.length]) % 12
  let startFret = 1
  for (let f = 1; f <= 12; f++) {
    if ((tuning[0] + f) % 12 === degreePc) {
      startFret = f
      break
    }
  }
  const out: ShapeNote[] = []
  for (let s = 0; s < tuning.length; s++) {
    const frets: number[] = []
    for (let f = startFret; f <= startFret + 3; f++) if (pcs.has((tuning[s] + f) % 12)) frets.push(f)
    // A string with a single note gets a pinky stretch so the hand has something to do.
    if (frets.length < 2 && pcs.has((tuning[s] + startFret + 4) % 12)) frets.push(startFret + 4)
    for (const f of frets) out.push({ string: s, fret: f, finger: Math.min(4, f - startFret + 1) })
  }
  return out
}

export function buildShape(spec: ExerciseSpec, tuning = STANDARD_TUNING): ShapeNote[] {
  if (spec.shape === 'horizontal') return horizontalShape(spec, tuning)
  if (spec.shape === 'nps3') return positionShape(spec, 3, tuning)
  const scale = scaleById(spec.scaleId)
  return scale.intervals.length <= 5 ? positionShape(spec, 2, tuning) : windowShape(spec, tuning)
}

/** Order the shape's notes according to the picking pattern. Returns indices into the shape. */
function sequence(count: number, pattern: PatternId, shape: ShapeNote[]): number[] {
  const up = Array.from({ length: count }, (_, i) => i)
  const down = [...up].reverse()
  const out: number[] = []
  switch (pattern) {
    case 'updown':
      out.push(...up, ...down.slice(1, -1))
      break
    case 'groups4':
    case 'groups3': {
      const g = pattern === 'groups4' ? 4 : 3
      for (let i = 0; i + g <= count; i++) for (let k = 0; k < g; k++) out.push(i + k)
      for (let i = count - 1; i - g >= -1; i--) for (let k = 0; k < g; k++) out.push(i - k)
      break
    }
    case 'thirds':
      for (let i = 0; i + 2 < count; i++) out.push(i, i + 2)
      for (let i = count - 1; i - 2 >= 0; i--) out.push(i, i - 2)
      break
    case 'skip': {
      // Group the shape by string, then play string s with string s+2.
      const byString = new Map<number, number[]>()
      shape.forEach((n, i) => byString.set(n.string, [...(byString.get(n.string) ?? []), i]))
      const strings = [...byString.keys()].sort((a, b) => a - b)
      for (let k = 0; k + 2 < strings.length + 2 && k < strings.length; k++) {
        const a = byString.get(strings[k]) ?? []
        const b = byString.get(strings[k + 2]) ?? []
        if (b.length === 0) break
        out.push(...a, ...b, ...[...b].reverse().slice(1), ...[...a].reverse().slice(1, -1))
      }
      if (out.length === 0) out.push(...up, ...down.slice(1, -1))
      break
    }
  }
  return out
}

export function exerciseTitle(spec: ExerciseSpec): string {
  const scale = scaleById(spec.scaleId)
  const shape = SHAPES.find((s) => s.id === spec.shape)?.name ?? ''
  const where = spec.shape === 'horizontal' ? `${noteName(STANDARD_TUNING[spec.string ?? spec.position], false)} string` : `position ${spec.position + 1}`
  return `${ROOT_NAMES[spec.root]} ${scale.name} · ${shape} · ${where}`
}

export function buildExercise(spec: ExerciseSpec, tuning = STANDARD_TUNING): Song {
  const shape = buildShape(spec, tuning)
  const order = sequence(shape.length, spec.pattern, shape)
  const notes: SongNote[] = order.map((idx, i) => {
    const n = shape[idx]
    return { time: i * spec.noteValue, duration: spec.noteValue, string: n.string, fret: n.fret, finger: n.fret === 0 ? undefined : n.finger }
  })
  // Pad the end to a whole bar so the loop breathes.
  const beatsPerBar = 4
  const pattern = PATTERNS.find((p) => p.id === spec.pattern)?.name ?? ''
  return {
    id: `exercise-${spec.root}-${spec.scaleId}-${spec.shape}-${spec.position}-${spec.pattern}-${spec.noteValue}`,
    title: exerciseTitle(spec),
    composer: pattern,
    tempo: spec.bpm,
    beatsPerBar,
    tuning,
    notes,
    blurb: `${pattern}. ${notes.length} notes. Loop it and let the speed trainer push the tempo up.`,
  }
}
