import { STANDARD_TUNING, noteName, type Song, type SongNote } from '../model/song'

export type Quality = 'maj' | 'min' | '7' | 'maj7' | 'min7' | 'sus2' | 'sus4' | 'dim' | 'm7b5' | 'dim7' | 'aug' | 'mMaj7' | '6' | 'min6' | '9'
export const QUALITIES: { id: Quality; label: string; name: string }[] = [
  { id: 'maj', label: '', name: 'Major' },
  { id: 'min', label: 'm', name: 'Minor' },
  { id: '7', label: '7', name: 'Dominant 7' },
  { id: 'maj7', label: 'maj7', name: 'Major 7' },
  { id: 'min7', label: 'm7', name: 'Minor 7' },
  { id: 'sus2', label: 'sus2', name: 'Sus2' },
  { id: 'sus4', label: 'sus4', name: 'Sus4' },
  { id: 'dim', label: 'dim', name: 'Diminished' },
  { id: 'm7b5', label: 'm7♭5', name: 'Half-diminished' },
  { id: 'dim7', label: 'dim7', name: 'Diminished 7' },
  { id: 'aug', label: 'aug', name: 'Augmented' },
  { id: 'mMaj7', label: 'mMaj7', name: 'Minor-major 7' },
  { id: '6', label: '6', name: 'Major 6' },
  { id: 'min6', label: 'm6', name: 'Minor 6' },
  { id: '9', label: '9', name: 'Dominant 9' },
]

export interface Voicing {
  /** Frets per string, lowest string first. -1 = not played. */
  frets: number[]
  /** Finger per string, 0 for open or unplayed. */
  fingers: number[]
  /** Where the shape sits, for the label ("barre at 5"). */
  barreFret?: number
}

export interface Chord {
  root: number
  quality: Quality
}

/** Semitone intervals for each quality, used by overlays and lessons. */
export const QUALITY_INTERVALS: Record<Quality, number[]> = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  '7': [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  dim: [0, 3, 6],
  m7b5: [0, 3, 6, 10],
  dim7: [0, 3, 6, 9],
  aug: [0, 4, 8],
  mMaj7: [0, 3, 7, 11],
  '6': [0, 4, 7, 9],
  min6: [0, 3, 7, 9],
  '9': [0, 4, 7, 10, 2],
}

const NOTE_INDEX: Record<string, number> = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 }

/** Parse a label like "F#m7" back into a chord, or null if it is not one. */
export function parseChordName(name: string): Chord | null {
  const m = /^([A-G][#b]?)(.*)$/.exec(name.trim())
  if (!m) return null
  const root = NOTE_INDEX[m[1]]
  if (root === undefined) return null
  const q = QUALITIES.find((x) => x.label === m[2])
  return q ? { root, quality: q.id } : null
}

export function chordName(c: Chord): string {
  return noteName(c.root, false) + (QUALITIES.find((q) => q.id === c.quality)?.label ?? '')
}

// Open voicings, keyed by "root-quality". Frets low E to high e.
const OPEN: Record<string, Voicing> = {
  '0-maj': { frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] }, // C
  '9-maj': { frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0] }, // A
  '7-maj': { frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3] }, // G
  '4-maj': { frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0] }, // E
  '2-maj': { frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] }, // D
  '9-min': { frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0] }, // Am
  '4-min': { frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0] }, // Em
  '2-min': { frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1] }, // Dm
  '9-7': { frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 0, 2, 0, 3, 0] }, // A7
  '4-7': { frets: [0, 2, 0, 1, 0, 0], fingers: [0, 2, 0, 1, 0, 0] }, // E7
  '2-7': { frets: [-1, -1, 0, 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3] }, // D7
  '7-7': { frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1] }, // G7
  '0-7': { frets: [-1, 3, 2, 3, 1, 0], fingers: [0, 3, 2, 4, 1, 0] }, // C7
  '11-7': { frets: [-1, 2, 1, 2, 0, 2], fingers: [0, 2, 1, 3, 0, 4] }, // B7
  '0-maj7': { frets: [-1, 3, 2, 0, 0, 0], fingers: [0, 3, 2, 0, 0, 0] }, // Cmaj7
  '5-maj7': { frets: [-1, -1, 3, 2, 1, 0], fingers: [0, 0, 3, 2, 1, 0] }, // Fmaj7
  '9-min7': { frets: [-1, 0, 2, 0, 1, 0], fingers: [0, 0, 2, 0, 1, 0] }, // Am7
  '4-min7': { frets: [0, 2, 2, 0, 3, 0], fingers: [0, 1, 2, 0, 3, 0] }, // Em7
  '2-min7': { frets: [-1, -1, 0, 2, 1, 1], fingers: [0, 0, 0, 2, 1, 1] }, // Dm7
  '2-sus2': { frets: [-1, -1, 0, 2, 3, 0], fingers: [0, 0, 0, 1, 3, 0] },
  '2-sus4': { frets: [-1, -1, 0, 2, 3, 3], fingers: [0, 0, 0, 1, 3, 4] },
  '9-sus2': { frets: [-1, 0, 2, 2, 0, 0], fingers: [0, 0, 1, 2, 0, 0] },
  '9-sus4': { frets: [-1, 0, 2, 2, 3, 0], fingers: [0, 0, 1, 2, 3, 0] },
  '4-sus4': { frets: [0, 2, 2, 2, 0, 0], fingers: [0, 1, 2, 3, 0, 0] },
  '9-6': { frets: [-1, 0, 2, 2, 2, 2], fingers: [0, 0, 1, 1, 1, 1] }, // A6
  '4-6': { frets: [0, 2, 2, 1, 2, 0], fingers: [0, 2, 3, 1, 4, 0] }, // E6
  '4-min6': { frets: [0, 2, 2, 0, 2, 0], fingers: [0, 2, 3, 0, 4, 0] }, // Em6
  '9-9': { frets: [-1, 0, 2, 4, 2, 3], fingers: [0, 0, 1, 3, 2, 4] }, // A9
  '4-9': { frets: [0, 2, 0, 1, 0, 2], fingers: [0, 2, 0, 1, 0, 3] }, // E9
  '4-mMaj7': { frets: [0, 2, 1, 0, 0, 0], fingers: [0, 2, 1, 0, 0, 0] }, // EmMaj7
  '9-mMaj7': { frets: [-1, 0, 2, 1, 1, 0], fingers: [0, 0, 3, 1, 2, 0] }, // AmMaj7
}

// Movable shapes: offsets from the barre fret, per string. Root on string 6 (E forms) or 5 (A forms).
export const E_FORMS: Partial<Record<Quality, Voicing>> = {
  maj: { frets: [0, 2, 2, 1, 0, 0], fingers: [1, 3, 4, 2, 1, 1] },
  min: { frets: [0, 2, 2, 0, 0, 0], fingers: [1, 3, 4, 1, 1, 1] },
  '7': { frets: [0, 2, 0, 1, 0, 0], fingers: [1, 3, 1, 2, 1, 1] },
  min7: { frets: [0, 2, 0, 0, 0, 0], fingers: [1, 3, 1, 1, 1, 1] },
  sus4: { frets: [0, 2, 2, 2, 0, 0], fingers: [1, 2, 3, 4, 1, 1] },
  maj7: { frets: [0, -1, 1, 1, 0, -1], fingers: [1, 0, 3, 4, 2, 0] },
  '6': { frets: [0, -1, 2, 1, 2, -1], fingers: [1, 0, 3, 2, 4, 0] },
  min6: { frets: [0, -1, 2, 0, 2, -1], fingers: [1, 0, 3, 1, 4, 0] },
  mMaj7: { frets: [0, -1, 1, 0, 0, -1], fingers: [1, 0, 2, 1, 1, 0] },
  '9': { frets: [0, 2, 0, 1, 0, 2], fingers: [1, 3, 1, 2, 1, 4] },
}
export const A_FORMS: Partial<Record<Quality, Voicing>> = {
  maj: { frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 1, 2, 3, 4, 1] },
  min: { frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 1, 3, 4, 2, 1] },
  '7': { frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 1, 3, 1, 4, 1] },
  maj7: { frets: [-1, 0, 2, 1, 2, 0], fingers: [0, 1, 3, 2, 4, 1] },
  min7: { frets: [-1, 0, 2, 0, 1, 0], fingers: [0, 1, 3, 1, 2, 1] },
  sus2: { frets: [-1, 0, 2, 2, 0, 0], fingers: [0, 1, 3, 4, 1, 1] },
  sus4: { frets: [-1, 0, 2, 2, 3, 0], fingers: [0, 1, 2, 3, 4, 1] },
  dim: { frets: [-1, 0, 1, 2, 1, -1], fingers: [0, 1, 2, 4, 3, 0] },
  m7b5: { frets: [-1, 0, 1, 0, 1, -1], fingers: [0, 1, 2, 1, 3, 0] },
  dim7: { frets: [-1, 0, 1, -1, 1, 0], fingers: [0, 1, 2, 0, 3, 1] },
  aug: { frets: [-1, 0, 3, 2, 2, -1], fingers: [0, 1, 4, 2, 3, 0] },
  '6': { frets: [-1, 0, 2, 2, 2, 2], fingers: [0, 1, 3, 3, 3, 3] },
  min6: { frets: [-1, 0, 2, 2, 1, 2], fingers: [0, 1, 3, 4, 2, 4] },
  '9': { frets: [-1, 0, 2, 0, 0, 0], fingers: [0, 1, 3, 1, 1, 1] },
  mMaj7: { frets: [-1, 0, 2, 1, 1, 0], fingers: [0, 1, 4, 2, 3, 1] },
}

function shifted(form: Voicing, fret: number): Voicing {
  return {
    frets: form.frets.map((f) => (f < 0 ? -1 : f + fret)),
    fingers: form.fingers,
    barreFret: fret,
  }
}

/** Pick a playable voicing: open shape if there is one, else the lowest barre form. */
export function voicingFor(c: Chord): Voicing {
  const open = OPEN[`${c.root}-${c.quality}`]
  if (open) return open
  const eFret = (c.root - 4 + 12) % 12 || 12
  const aFret = (c.root - 9 + 12) % 12 || 12
  const eForm = E_FORMS[c.quality]
  const aForm = A_FORMS[c.quality]
  const candidates: { fret: number; form: Voicing }[] = []
  if (eForm) candidates.push({ fret: eFret, form: eForm })
  if (aForm) candidates.push({ fret: aFret, form: aForm })
  candidates.sort((x, y) => x.fret - y.fret)
  const pick = candidates[0] ?? { fret: aFret, form: A_FORMS.maj as Voicing }
  return shifted(pick.form, pick.fret)
}

export function voicingLabel(v: Voicing): string {
  const frets = v.frets.map((f) => (f < 0 ? 'x' : String(f))).join(v.frets.some((f) => f > 9) ? ' ' : '')
  return v.barreFret ? `${frets} (barre at ${v.barreFret})` : frets
}

// ----- Strum patterns -----

export type StrumId = 'whole' | 'down4' | 'folk' | 'eighths' | 'rock' | 'arpeggio' | 'travis' | 'reggae'

interface Stroke {
  /** Beat within the bar, 0-based. */
  at: number
  dir: 'd' | 'u'
  /** Which strings: all sounding, just the bass note, or the top three. */
  part?: 'all' | 'bass' | 'treble' | 'alt'
  /** Explicit pick of one sounding string by index from the lowest (arpeggios). */
  pick?: number
  palmMute?: boolean
}

export const STRUMS: { id: StrumId; name: string; help: string; strokes: Stroke[] }[] = [
  { id: 'whole', name: 'Hold', help: 'One strum per bar, let it ring. Good for learning the shapes.', strokes: [{ at: 0, dir: 'd' }] },
  {
    id: 'down4',
    name: 'Down on every beat',
    help: 'Four downstrokes. Keep the arm moving.',
    strokes: [0, 1, 2, 3].map((b) => ({ at: b, dir: 'd' as const })),
  },
  {
    id: 'folk',
    name: 'D DU UDU',
    help: 'The campfire pattern: down, down-up, up-down-up. Miss the strings on beat 3.',
    strokes: [
      { at: 0, dir: 'd' },
      { at: 1, dir: 'd' },
      { at: 1.5, dir: 'u' },
      { at: 2.5, dir: 'u' },
      { at: 3, dir: 'd' },
      { at: 3.5, dir: 'u' },
    ],
  },
  {
    id: 'eighths',
    name: 'Down-up eighths',
    help: 'Constant down-up. Accent beats 2 and 4.',
    strokes: Array.from({ length: 8 }, (_, i) => ({ at: i / 2, dir: i % 2 === 0 ? ('d' as const) : ('u' as const) })),
  },
  {
    id: 'rock',
    name: 'D D U  D D U',
    help: 'Rock rhythm: two downs and an up, twice.',
    strokes: [
      { at: 0, dir: 'd' },
      { at: 1, dir: 'd' },
      { at: 1.5, dir: 'u' },
      { at: 2, dir: 'd' },
      { at: 3, dir: 'd' },
      { at: 3.5, dir: 'u' },
    ],
  },
  {
    id: 'arpeggio',
    name: 'Arpeggio',
    help: 'Bass note then the top strings, one at a time. Let everything ring.',
    strokes: [
      { at: 0, dir: 'd', pick: 0 },
      { at: 0.5, dir: 'd', pick: -3 },
      { at: 1, dir: 'd', pick: -2 },
      { at: 1.5, dir: 'd', pick: -1 },
      { at: 2, dir: 'd', pick: -2 },
      { at: 2.5, dir: 'd', pick: -3 },
      { at: 3, dir: 'd', pick: -2 },
      { at: 3.5, dir: 'd', pick: -1 },
    ],
  },
  {
    id: 'travis',
    name: 'Travis picking',
    help: 'Thumb alternates bass notes on the beat, fingers pinch the top strings in between.',
    strokes: [
      { at: 0, dir: 'd', part: 'bass' },
      { at: 0, dir: 'd', pick: -2 },
      { at: 0.5, dir: 'd', pick: -1 },
      { at: 1, dir: 'd', part: 'alt' },
      { at: 1.5, dir: 'd', pick: -2 },
      { at: 2, dir: 'd', part: 'bass' },
      { at: 2.5, dir: 'd', pick: -1 },
      { at: 3, dir: 'd', part: 'alt' },
      { at: 3.5, dir: 'd', pick: -2 },
    ],
  },
  {
    id: 'reggae',
    name: 'Reggae offbeats',
    help: 'Short upstrokes on the "and" of every beat, muted quickly.',
    strokes: [0.5, 1.5, 2.5, 3.5].map((b) => ({ at: b, dir: 'u' as const, part: 'treble' as const, palmMute: true })),
  },
]

// ----- Progressions -----

export interface Slot {
  chord: Chord
  beats: number
}

export interface ProgressionSpec {
  slots: Slot[]
  strum: StrumId
  bpm: number
}

interface PresetDegree {
  /** Semitones above the key root. */
  semis: number
  quality: Quality
  beats?: number
}

export interface Preset {
  id: string
  name: string
  minor?: boolean
  degrees: PresetDegree[]
}

export const PRESETS: Preset[] = [
  {
    id: 'pop',
    name: 'I – V – vi – IV (pop)',
    degrees: [
      { semis: 0, quality: 'maj' },
      { semis: 7, quality: 'maj' },
      { semis: 9, quality: 'min' },
      { semis: 5, quality: 'maj' },
    ],
  },
  {
    id: 'sad',
    name: 'vi – IV – I – V',
    degrees: [
      { semis: 9, quality: 'min' },
      { semis: 5, quality: 'maj' },
      { semis: 0, quality: 'maj' },
      { semis: 7, quality: 'maj' },
    ],
  },
  {
    id: 'fifties',
    name: 'I – vi – IV – V (50s)',
    degrees: [
      { semis: 0, quality: 'maj' },
      { semis: 9, quality: 'min' },
      { semis: 5, quality: 'maj' },
      { semis: 7, quality: 'maj' },
    ],
  },
  {
    id: 'blues',
    name: '12-bar blues',
    degrees: [
      { semis: 0, quality: '7' },
      { semis: 0, quality: '7' },
      { semis: 0, quality: '7' },
      { semis: 0, quality: '7' },
      { semis: 5, quality: '7' },
      { semis: 5, quality: '7' },
      { semis: 0, quality: '7' },
      { semis: 0, quality: '7' },
      { semis: 7, quality: '7' },
      { semis: 5, quality: '7' },
      { semis: 0, quality: '7' },
      { semis: 7, quality: '7' },
    ],
  },
  {
    id: 'jazz',
    name: 'ii – V – I (jazz)',
    degrees: [
      { semis: 2, quality: 'min7' },
      { semis: 7, quality: '7' },
      { semis: 0, quality: 'maj7' },
      { semis: 0, quality: 'maj7' },
    ],
  },
  {
    id: 'rhythm-changes',
    name: 'I – vi – ii – V (7ths)',
    degrees: [
      { semis: 0, quality: 'maj7' },
      { semis: 9, quality: 'min7' },
      { semis: 2, quality: 'min7' },
      { semis: 7, quality: '7' },
    ],
  },
  {
    id: 'jazz-blues',
    name: 'Jazz blues (7ths)',
    degrees: [
      { semis: 0, quality: '7' },
      { semis: 5, quality: '7' },
      { semis: 0, quality: '7' },
      { semis: 0, quality: '7' },
      { semis: 5, quality: '7' },
      { semis: 5, quality: '7' },
      { semis: 0, quality: '7' },
      { semis: 9, quality: '7' },
      { semis: 2, quality: 'min7' },
      { semis: 7, quality: '7' },
      { semis: 0, quality: '7' },
      { semis: 7, quality: '7' },
    ],
  },
  {
    id: 'minor-251',
    name: 'ii – V – i minor (m7♭5, 7, m7)',
    minor: true,
    degrees: [
      { semis: 2, quality: 'm7b5' },
      { semis: 7, quality: '7' },
      { semis: 0, quality: 'min7' },
      { semis: 0, quality: 'min7' },
    ],
  },
  {
    id: 'folk',
    name: 'I – IV – V',
    degrees: [
      { semis: 0, quality: 'maj' },
      { semis: 5, quality: 'maj' },
      { semis: 7, quality: 'maj' },
      { semis: 7, quality: 'maj' },
    ],
  },
  {
    id: 'minor-pop',
    name: 'i – ♭VI – ♭III – ♭VII (minor)',
    minor: true,
    degrees: [
      { semis: 0, quality: 'min' },
      { semis: 8, quality: 'maj' },
      { semis: 3, quality: 'maj' },
      { semis: 10, quality: 'maj' },
    ],
  },
  {
    id: 'andalusian',
    name: 'i – ♭VII – ♭VI – V (Andalusian)',
    minor: true,
    degrees: [
      { semis: 0, quality: 'min' },
      { semis: 10, quality: 'maj' },
      { semis: 8, quality: 'maj' },
      { semis: 7, quality: 'maj' },
    ],
  },
]

export function presetSlots(preset: Preset, keyRoot: number, beatsPerChord = 4): Slot[] {
  return preset.degrees.map((d) => ({ chord: { root: (keyRoot + d.semis) % 12, quality: d.quality }, beats: d.beats ?? beatsPerChord }))
}

const STAGGER = 0.018 // beats between strings in a strum

/** Notes for one chord slot starting at `start`, following the strum pattern each bar. */
function strumSlot(slot: Slot, start: number, strumId: StrumId, bar: number): SongNote[] {
  const v = voicingFor(slot.chord)
  const pattern = STRUMS.find((s) => s.id === strumId) ?? STRUMS[0]
  const sounding = v.frets.map((f, s) => (f >= 0 ? s : -1)).filter((s) => s >= 0)
  const out: SongNote[] = []
  const strokesIn = (barStart: number, barLen: number) =>
    pattern.strokes.filter((st) => st.at < barLen).map((st) => ({ ...st, time: barStart + st.at }))

  for (let barStart = 0; barStart < slot.beats; barStart += bar) {
    const barLen = Math.min(bar, slot.beats - barStart)
    const strokes = strokesIn(barStart, barLen)
    strokes.forEach((st, i) => {
      const next = strokes[i + 1]?.time ?? barStart + barLen
      const ring = pattern.id === 'arpeggio' || pattern.id === 'whole' || pattern.id === 'travis'
      const len = Math.max(0.25, (ring ? barStart + barLen : next) - st.time - 0.02)
      let strings: number[]
      if (st.pick !== undefined) strings = [sounding[st.pick < 0 ? sounding.length + st.pick : st.pick]].filter((s) => s !== undefined)
      else if (st.part === 'bass') strings = [sounding[0]]
      else if (st.part === 'alt') strings = [sounding[Math.min(1, sounding.length - 1)]]
      else if (st.part === 'treble') strings = sounding.slice(-3)
      else strings = sounding
      const order = st.dir === 'd' ? strings : [...strings].reverse()
      order.forEach((s, k) => {
        out.push({
          time: start + st.time + k * STAGGER,
          duration: st.palmMute ? 0.2 : len,
          string: s,
          fret: v.frets[s],
          finger: v.frets[s] === 0 ? undefined : v.fingers[s] || undefined,
          letRing: ring || undefined,
          palmMute: st.palmMute || undefined,
        })
      })
    })
  }
  return out
}

export function buildProgression(spec: ProgressionSpec, title?: string): Song {
  const bar = 4
  const notes: SongNote[] = []
  const sections = []
  let t = 0
  for (const slot of spec.slots) {
    notes.push(...strumSlot(slot, t, spec.strum, bar))
    sections.push({ beat: t, name: chordName(slot.chord) })
    t += slot.beats
  }
  notes.sort((a, b) => a.time - b.time || a.string - b.string)
  const names = spec.slots.map((s) => chordName(s.chord))
  const strum = STRUMS.find((s) => s.id === spec.strum)
  return {
    id: `chords-${names.join('-')}-${spec.strum}-${spec.slots.map((s) => s.beats).join('.')}`,
    title: title ?? names.join(' – '),
    composer: strum?.name ?? 'Chords',
    tempo: spec.bpm,
    beatsPerBar: bar,
    tuning: STANDARD_TUNING,
    notes,
    sections,
    blurb: `${strum?.help ?? ''} Voicings: ${spec.slots.map((s) => `${chordName(s.chord)} ${voicingLabel(voicingFor(s.chord))}`).join(' · ')}`,
  }
}

/** One chord, strummed and held for a bar: the chord explorer view. */
export function buildChordSong(chord: Chord, bpm = 80): Song {
  return buildProgression({ slots: [{ chord, beats: 4 }], strum: 'whole', bpm }, chordName(chord))
}
