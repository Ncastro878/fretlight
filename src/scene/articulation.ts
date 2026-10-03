import type { SongNote } from '../model/song'
import { fretX, notePosition, stringZ } from './geometry'

/** Semitones of bend reached at `progress` (0..1 of the note's duration). */
export function bendAmount(n: SongNote, progress: number): number {
  if (!n.bend) return 0
  const rise = 0.35
  if (progress < rise) return (n.bend.semitones * progress) / rise
  if (!n.bend.release) return n.bend.semitones
  const fallStart = 0.6
  if (progress < fallStart) return n.bend.semitones
  return n.bend.semitones * Math.max(0, 1 - (progress - fallStart) / (1 - fallStart))
}

/** Fret position (can be fractional) reached at `progress` for a slide. */
export function slideFret(n: SongNote, progress: number): number {
  if (n.slideTo === undefined) return n.fret
  const start = 0.25
  if (progress <= start) return n.fret
  const t = Math.min(1, (progress - start) / 0.6)
  return n.fret + (n.slideTo - n.fret) * t
}

/** Sideways displacement of the string for a bend, in scene units. */
export function bendOffset(n: SongNote, semitones: number): number {
  // Upper strings push toward the low E side (+z); low strings pull the other way.
  const dir = n.string >= 3 ? 1 : -1
  return dir * semitones * 0.045
}

/**
 * Where to draw a note's marker right now, including slides, bends, and vibrato.
 * `progress` is 0..1 through the note; `clock` is seconds for the vibrato wobble.
 */
export function markerPosition(n: SongNote, progress: number, clock: number, stringCount: number): [number, number, number] {
  const fret = slideFret(n, progress)
  let [x, y, z] = notePosition(n.string, Math.round(fret), stringCount)
  if (n.slideTo !== undefined && fret !== Math.round(fret)) {
    const lo = Math.floor(fret)
    const a = notePosition(n.string, lo, stringCount)[0]
    const b = notePosition(n.string, lo + 1, stringCount)[0]
    x = a + (b - a) * (fret - lo)
    z = stringZ(n.string, Math.max(0, x), stringCount)
  }
  z += bendOffset(n, bendAmount(n, progress))
  if (n.vibrato && progress > 0.1) z += Math.sin(clock * 2 * Math.PI * 5.5) * 0.022 * Math.min(1, (progress - 0.1) / 0.15)
  return [x, y, z]
}

/** Anchor points on either side of a bent/vibratoed note for the displaced string segment. */
export function stringAnchors(n: SongNote, stringCount: number): [[number, number, number], [number, number, number]] {
  const [x, y] = notePosition(n.string, n.fret, stringCount)
  const left = Math.max(-0.4, x - 0.45)
  const right = Math.min(fretX(20) + 0.3, x + 0.45)
  return [
    [left, y, stringZ(n.string, Math.max(0, left), stringCount)],
    [right, y, stringZ(n.string, right, stringCount)],
  ]
}
