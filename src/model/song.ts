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
}

export interface Song {
  id: string
  title: string
  composer: string
  /** Quarter notes per minute. */
  tempo: number
  beatsPerBar: number
  /** MIDI note of each open string, lowest string first. */
  tuning: number[]
  notes: SongNote[]
  /** Short note shown in the library, e.g. "Melody, open position". */
  blurb?: string
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
