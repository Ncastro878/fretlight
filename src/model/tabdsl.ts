import type { SongNote } from './song'

/**
 * Tiny text format for authoring the bundled songs.
 *
 * A voice is a whitespace-separated list of events played one after another:
 *   1/7        string 1 (high e, tab numbering), fret 7
 *   1/7+5/0    chord: several string/fret pairs joined with +
 *   r          rest
 *   :0.5       suffix on any event sets its duration in beats and becomes
 *              the default for the events that follow
 *   |          bar line, ignored (for readability)
 *
 * Strings use tab convention: 1 is the highest string, 6 the lowest.
 */
export function voice(spec: string, startBeat = 0): SongNote[] {
  const out: SongNote[] = []
  let t = startBeat
  let dur = 1
  for (const raw of spec.split(/\s+/)) {
    const tok = raw.trim()
    if (!tok || tok === '|') continue
    const [body, durText] = tok.split(':')
    if (durText !== undefined) dur = parseFloat(durText)
    if (body !== 'r' && body !== '') {
      for (const pair of body.split('+')) {
        const [s, f] = pair.split('/').map(Number)
        out.push({ time: t, duration: dur, string: 6 - s, fret: f })
      }
    }
    t += dur
  }
  return out
}

export function merge(...voices: SongNote[][]): SongNote[] {
  return voices.flat().sort((a, b) => a.time - b.time || a.string - b.string)
}

/** Repeat a block of notes `times` times, each copy shifted by `lengthBeats`. */
export function repeat(notes: SongNote[], times: number, lengthBeats: number): SongNote[] {
  const out: SongNote[] = []
  for (let i = 0; i < times; i++) {
    for (const n of notes) out.push({ ...n, time: n.time + i * lengthBeats })
  }
  return out
}

export function shift(notes: SongNote[], beats: number): SongNote[] {
  return notes.map((n) => ({ ...n, time: n.time + beats }))
}
