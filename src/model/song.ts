export interface Bend {
  /** How far the pitch rises, in semitones. 2 = full step, 1 = half step, 0.5 = quarter. */
  semitones: number
  /** Bend up and then back down to the fretted pitch within the note. */
  release?: boolean
}

export interface SongNote {
  /** Start time in beats (quarter notes) from the beginning of the song. */
  time: number
  /** Length in beats. */
  duration: number
  /** 0 = lowest string (low E in standard tuning), 5 = highest. */
  string: number
  /** 0 = open string. */
  fret: number
  /** Left-hand finger: 1 index, 2 middle, 3 ring, 4 pinky. Undefined for open strings or unknown. */
  finger?: number
  bend?: Bend
  /** Legato slide: the pitch glides from `fret` to this fret during the note. */
  slideTo?: number
  vibrato?: boolean
  /** Sounded with a hammer-on or pull-off from the previous note on this string. No pick attack. */
  hammer?: boolean
  /** Fret the hammer-on or pull-off came from, for drawing the link. */
  hammerFromFret?: number
  /** Right-hand tap. Drawn with a T. */
  tap?: boolean
  palmMute?: boolean
  letRing?: boolean
}

export interface Articulation {
  bend?: Bend
  /** Semitones the pitch slides by the end of the note (negative for downward). */
  slide?: number
  vibrato?: boolean
  hammer?: boolean
  palmMute?: boolean
  letRing?: boolean
}

export function articulationOf(n: SongNote): Articulation | undefined {
  if (!n.bend && n.slideTo === undefined && !n.vibrato && !n.hammer && !n.tap && !n.palmMute && !n.letRing) return undefined
  return {
    bend: n.bend,
    slide: n.slideTo !== undefined ? n.slideTo - n.fret : undefined,
    vibrato: n.vibrato,
    hammer: n.hammer || n.tap,
    palmMute: n.palmMute,
    letRing: n.letRing,
  }
}

export function bendLabel(semitones: number): string {
  if (semitones >= 1.9) return semitones >= 2.9 ? '1½' : 'full'
  if (semitones >= 0.9) return '½'
  return '¼'
}

export interface Section {
  /** Beat where the section starts. */
  beat: number
  name: string
}

export interface TempoChange {
  beat: number
  /** Quarter notes per minute from this beat on. */
  bpm: number
}

export interface Song {
  id: string
  title: string
  composer: string
  /** Quarter notes per minute at the start of the song. */
  tempo: number
  /** Tempo changes after the start, sorted by beat (from the tab file). */
  tempoChanges?: TempoChange[]
  beatsPerBar: number
  /** MIDI note of each open string, lowest string first. */
  tuning: number[]
  notes: SongNote[]
  /** Short note shown in the library, e.g. "Melody, open position". */
  blurb?: string
  /** Named parts (intro, verse, solo) for quick looping. */
  sections?: Section[]
}

export const STANDARD_TUNING = [40, 45, 50, 55, 59, 64]

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export function midiOf(song: Song, note: Pick<SongNote, 'string' | 'fret'>): number {
  return song.tuning[note.string] + note.fret
}

export function noteName(midi: number, withOctave = true): string {
  const name = NOTE_NAMES[midi % 12]
  return withOctave ? `${name}${Math.floor(midi / 12) - 1}` : name
}

export function songLength(song: Song): number {
  let end = 0
  for (const n of song.notes) end = Math.max(end, n.time + n.duration)
  return end
}

export function sortNotes(notes: SongNote[]): SongNote[] {
  return [...notes].sort((a, b) => a.time - b.time || a.string - b.string)
}

/** Tempo in effect at a beat, following the song's tempo changes. */
export function tempoAt(song: Song, beat: number): number {
  let bpm = song.tempo
  for (const c of song.tempoChanges ?? []) {
    if (c.beat > beat) break
    bpm = c.bpm
  }
  return bpm
}

/** Seconds from beat 0 to `beat` at normal speed, following tempo changes. Negative beats use the start tempo. */
export function secondsAt(song: Song, beat: number): number {
  let bpm = song.tempo
  if (beat <= 0) return (beat * 60) / bpm
  let sec = 0
  let prev = 0
  for (const c of song.tempoChanges ?? []) {
    if (c.beat >= beat) break
    sec += ((c.beat - prev) * 60) / bpm
    prev = c.beat
    bpm = c.bpm
  }
  return sec + ((beat - prev) * 60) / bpm
}

/** Inverse of secondsAt: the beat reached after `sec` seconds at normal speed. */
export function beatAtSeconds(song: Song, sec: number): number {
  let bpm = song.tempo
  if (sec <= 0) return (sec * bpm) / 60
  let acc = 0
  let prev = 0
  for (const c of song.tempoChanges ?? []) {
    const segSec = ((c.beat - prev) * 60) / bpm
    if (acc + segSec > sec) break
    acc += segSec
    prev = c.beat
    bpm = c.bpm
  }
  return prev + ((sec - acc) * bpm) / 60
}
