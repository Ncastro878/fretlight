import type { Song, SongNote } from './song'

/**
 * Assign left-hand fingers to notes that do not already have one.
 * Heuristic: look at the fretted notes within a one-beat window, take the
 * lowest fret as the hand position, and count up from the index finger.
 */
export function assignFingers(song: Song): Song {
  const notes = song.notes
  const result: SongNote[] = notes.map((n) => ({ ...n }))
  for (let i = 0; i < result.length; i++) {
    const n = result[i]
    if (n.fret === 0) {
      delete n.finger
      continue
    }
    if (n.finger) continue
    let position = n.fret
    for (let j = i - 1; j >= 0 && notes[j].time >= n.time - 1; j--) {
      if (notes[j].fret > 0) position = Math.min(position, notes[j].fret)
    }
    for (let j = i + 1; j < notes.length && notes[j].time <= n.time + 1; j++) {
      if (notes[j].fret > 0) position = Math.min(position, notes[j].fret)
    }
    // Keep the stretch to four frets; anything beyond that is a pinky stretch.
    n.finger = Math.min(4, Math.max(1, n.fret - position + 1))
  }
  return { ...song, notes: result }
}
