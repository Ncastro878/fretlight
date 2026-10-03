import type { SongNote } from './song'

/**
 * Tiny text format for authoring the bundled songs, licks, and exercises.
 *
 * A voice is a whitespace-separated list of events played one after another:
 *   1/7        string 1 (high e, tab numbering), fret 7
 *   1/7+5/0    chord: several string/fret pairs joined with +
 *   r          rest
 *   |          bar line, ignored (for readability)
 *   :0.5       suffix on any event sets its duration in beats and becomes
 *              the default for the events that follow. Letters work too:
 *              w=4 h=2 q=1 e=0.5 s=0.25 t=1/3 x=1/6, add "." for dotted.
 *
 * Articulations go right after the fret number, in any order:
 *   b2  bend up two semitones (b1 half step, b0.5 quarter); b2r bends and releases
 *   s9  legato slide to fret 9        ~  vibrato
 *   h   hammer-on / pull-off from the previous note on that string
 *   t   tap                            m  palm mute      l  let ring
 *   f3  use finger 3 (overrides the automatic suggestion)
 *
 * Strings use tab convention: 1 is the highest string, 6 the lowest.
 */
const DURATIONS: Record<string, number> = { w: 4, h: 2, q: 1, e: 0.5, s: 0.25, t: 1 / 3, x: 1 / 6 }

export function parseDuration(text: string): number {
  const dotted = text.endsWith('.')
  const core = dotted ? text.slice(0, -1) : text
  const value = core in DURATIONS ? DURATIONS[core] : parseFloat(core)
  if (!Number.isFinite(value)) throw new Error(`Bad duration "${text}"`)
  return dotted ? value * 1.5 : value
}

const EVENT = /^(\d)\/(\d+)(.*)$/

function parseEvent(token: string, time: number, dur: number, lastFretOnString: Map<number, number>): SongNote {
  const m = EVENT.exec(token)
  if (!m) throw new Error(`Bad note "${token}"`)
  const string = 6 - Number(m[1])
  const fret = Number(m[2])
  const note: SongNote = { time, duration: dur, string, fret }
  let rest = m[3]
  while (rest.length) {
    let mm: RegExpExecArray | null
    if ((mm = /^b(\d+(?:\.\d+)?)(r?)/.exec(rest))) {
      note.bend = { semitones: parseFloat(mm[1]), release: mm[2] === 'r' }
    } else if ((mm = /^s(\d+)/.exec(rest))) {
      note.slideTo = Number(mm[1])
    } else if ((mm = /^f(\d)/.exec(rest))) {
      note.finger = Number(mm[1])
    } else if ((mm = /^h/.exec(rest))) {
      note.hammer = true
      note.hammerFromFret = lastFretOnString.get(string)
    } else if ((mm = /^t/.exec(rest))) {
      note.tap = true
      note.hammerFromFret = lastFretOnString.get(string)
    } else if ((mm = /^~/.exec(rest))) {
      note.vibrato = true
    } else if ((mm = /^m/.exec(rest))) {
      note.palmMute = true
    } else if ((mm = /^l/.exec(rest))) {
      note.letRing = true
    } else {
      throw new Error(`Unknown articulation "${rest}" in "${token}"`)
    }
    rest = rest.slice(mm[0].length)
  }
  lastFretOnString.set(string, note.slideTo ?? fret)
  return note
}

export function voice(spec: string, startBeat = 0): SongNote[] {
  const out: SongNote[] = []
  const lastFret = new Map<number, number>()
  let t = startBeat
  let dur = 1
  for (const raw of spec.split(/\s+/)) {
    const tok = raw.trim()
    if (!tok || tok === '|') continue
    const colon = tok.indexOf(':')
    const body = colon >= 0 ? tok.slice(0, colon) : tok
    if (colon >= 0) dur = parseDuration(tok.slice(colon + 1))
    if (body !== 'r' && body !== '') {
      for (const part of body.split('+')) out.push(parseEvent(part, t, dur, lastFret))
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
