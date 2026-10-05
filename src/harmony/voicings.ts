import { chordName, roleOf, type Chord, type Key } from './theory'

export const TUNING = [40, 45, 50, 55, 59, 64]
export const FRETS = 15

export interface MelodyNote {
  string: number
  fret: number
}

export interface Voicing {
  chord: Chord
  name: string
  numeral: string
  /** Fret per string, -1 muted. Index 0 = low E. */
  frets: number[]
  fingers: number[]
  /** What the melody note is in this chord. */
  melodyRole: string
  strings: number
  fingerCount: number
  span: number
  barre: boolean
  mutedInner: boolean
  rootless: boolean
  noFifth: boolean
  score: number
  tier: Tier
  /** Why it scored what it did, for the UI. */
  notes: string[]
}

export type Tier = 'Beginner' | 'Easy' | 'Intermediate' | 'Advanced' | 'Expert'
export const TIERS: Tier[] = ['Beginner', 'Easy', 'Intermediate', 'Advanced', 'Expert']

export function midiAt(string: number, fret: number): number {
  return TUNING[string] + fret
}

/**
 * Count fingers for a shape. Adjacent-or-not strings at the same fret, when
 * that fret is the lowest fretted fret in the shape, can be a barre (one finger).
 */
function analyze(frets: number[]) {
  const fretted = frets.filter((f) => f > 0)
  const open = frets.filter((f) => f === 0).length
  if (fretted.length === 0) return { fingers: 0, span: 0, barre: false, open }
  const lo = Math.min(...fretted)
  const hi = Math.max(...fretted)
  const atLo = fretted.filter((f) => f === lo).length
  let fingers = fretted.length
  let barre = false
  if (atLo >= 2) {
    // Barre only works when nothing below the lowest-fret strings is open or muted in between the barre strings.
    const idxs = frets.map((f, i) => (f === lo ? i : -1)).filter((i) => i >= 0)
    const first = idxs[0]
    const last = idxs[idxs.length - 1]
    const between = frets.slice(first, last + 1)
    const blocked = between.some((f) => f === 0 || f === -1)
    if (!blocked) {
      fingers = fretted.length - atLo + 1
      barre = true
    }
  }
  return { fingers, span: hi - lo, barre, open }
}

function assignFingers(frets: number[], barre: boolean): number[] {
  const fretted = frets.map((f, i) => ({ f, i })).filter((x) => x.f > 0)
  if (fretted.length === 0) return frets.map(() => 0)
  const lo = Math.min(...fretted.map((x) => x.f))
  const out = frets.map(() => 0)
  // Sort by fret then by string (low strings first); hand finger numbers in order.
  const order = [...fretted].sort((a, b) => a.f - b.f || a.i - b.i)
  let finger = 1
  let lastFret = -1
  for (const x of order) {
    if (barre && x.f === lo) {
      out[x.i] = 1
      continue
    }
    if (x.f !== lastFret) {
      finger = Math.min(4, Math.max(barre ? 2 : 1, x.f - lo + 1, finger + (lastFret >= 0 ? 1 : 0)))
      lastFret = x.f
    } else finger = Math.min(4, finger + 1)
    out[x.i] = finger
  }
  return out
}

/** Generate every playable voicing of `chord` with the melody note on top. */
export function voicingsFor(chord: Chord, melody: MelodyNote, key: Key): Voicing[] {
  const melodyMidi = midiAt(melody.string, melody.fret)
  const melodyPc = melodyMidi % 12
  if (!chord.pcs.includes(melodyPc)) return []
  const results: Voicing[] = []
  const seen = new Set<string>()
  const lo = Math.max(0, melody.fret - 4)
  const hi = Math.min(FRETS, melody.fret + 4)

  const frets: number[] = new Array(6).fill(-1)
  frets[melody.string] = melody.fret
  const pcIntervals = (f: number[]) => {
    const set = new Set<number>()
    f.forEach((fr, s) => fr >= 0 && set.add(((midiAt(s, fr) - chord.root) % 12 + 12) % 12))
    return set
  }

  const consider = () => {
    const used = frets.filter((f) => f >= 0).length
    if (used < 2) return
    const intervals = pcIntervals(frets)
    const ok = chord.quality.required.some((alt) => alt.every((i) => intervals.has(i)))
    const isDyad = used === 2
    if (isDyad) {
      // Double stops only stand in for triads, and only as a third or sixth below the melody.
      if (chord.quality.complexity !== 0) return
      const other = frets.findIndex((f, s) => f >= 0 && s !== melody.string)
      const gap = (melodyMidi - midiAt(other, frets[other])) % 12
      if (![3, 4, 8, 9].includes(gap)) return
      if (!intervals.has(3) && !intervals.has(4)) return
    } else if (!ok) return
    // Inner muted strings are awkward; allow at most one, never between the two highest sounding strings.
    const sounding = frets.map((f, s) => (f >= 0 ? s : -1)).filter((s) => s >= 0)
    const lowest = sounding[0]
    let mutedInner = false
    for (let s = lowest; s < melody.string; s++) {
      if (frets[s] === -1) {
        if (mutedInner) return
        mutedInner = true
        if (s === melody.string - 1) return
      }
    }
    const a = analyze(frets)
    if (a.fingers > 4 || a.span > 4) return
    if (a.span === 4 && a.fingers >= 4) return
    const key_ = frets.join(',')
    if (seen.has(key_)) return
    seen.add(key_)

    const rootless = !intervals.has(0)
    const noFifth = !intervals.has(7) && chord.quality.intervals.includes(7)
    const role = roleOf(melodyPc, chord)
    const notes: string[] = []
    let score = 0
    const n = used
    score += [0, 0, 0, 1, 2, 3, 4][n] ?? 4
    if (n === 2) notes.push('double stop')
    score += Math.max(0, a.fingers - 1)
    if (a.span >= 2) score += a.span - 1
    if (a.span === 4) score += 1
    if (a.barre) {
      score += 2
      notes.push('barre')
    }
    if (mutedInner) {
      score += 3
      notes.push('mute an inner string')
    }
    score += chord.quality.complexity
    if (['9th', '11th', '13th', '♯11'].includes(role)) {
      score += 1
      notes.push(`melody is the ${role}`)
    }
    score -= Math.min(a.open, 2) * 0.5
    if (rootless && !isDyad) notes.push('rootless')
    if (noFifth && !isDyad && !rootless) notes.push('no 5th')
    score = Math.max(0, Math.round(score * 2) / 2)
    const tier: Tier = score <= 2 ? 'Beginner' : score <= 4 ? 'Easy' : score <= 7 ? 'Intermediate' : score <= 10 ? 'Advanced' : 'Expert'
    results.push({
      chord,
      name: chordName(chord, key),
      numeral: chord.numeral,
      frets: [...frets],
      fingers: assignFingers(frets, a.barre),
      melodyRole: role,
      strings: n,
      fingerCount: a.fingers,
      span: a.span,
      barre: a.barre,
      mutedInner,
      rootless,
      noFifth,
      score,
      tier,
      notes,
    })
  }

  const dfs = (s: number) => {
    consider()
    if (s < 0) return
    const used = frets.filter((f) => f >= 0).length
    if (used >= 6) return
    // Option: mute this string and continue below (only allowed once, handled in consider).
    frets[s] = -1
    dfs(s - 1)
    // Option: a chord tone on this string, below the melody in pitch.
    const candidates = new Set<number>([0])
    for (let f = lo; f <= hi; f++) candidates.add(f)
    for (const f of candidates) {
      const m = midiAt(s, f)
      if (m >= melodyMidi) continue
      if (!chord.pcs.includes(m % 12)) continue
      frets[s] = f
      dfs(s - 1)
      frets[s] = -1
    }
  }
  dfs(melody.string - 1)
  return results
}

export interface Suggestion {
  chord: Chord
  name: string
  numeral: string
  melodyRole: string
  /** Easiest voicing first. */
  voicings: Voicing[]
  best: Voicing
}

/** All chord options for a melody note, grouped by chord and ordered easiest first. */
export function suggestionsFor(chords: Chord[], melody: MelodyNote, key: Key, families?: Set<string>, maxStrings = 6): Suggestion[] {
  const out: Suggestion[] = []
  const melodyPc = midiAt(melody.string, melody.fret) % 12
  for (const chord of chords) {
    if (families && !families.has(chord.quality.family)) continue
    if (!chord.pcs.includes(melodyPc)) continue
    const voicings = voicingsFor(chord, melody, key)
      .filter((v) => v.strings <= maxStrings)
      .sort((a, b) => a.score - b.score || b.strings - a.strings)
    if (voicings.length === 0) continue
    // Headline with the easiest full voicing; double stops stay in the list as alternatives.
    const best = voicings.find((v) => v.strings >= 3) ?? voicings[0]
    out.push({ chord, name: chordName(chord, key), numeral: chord.numeral, melodyRole: roleOf(melodyPc, chord), voicings: voicings.slice(0, 14), best })
  }
  return out.sort((a, b) => a.best.score - b.best.score || a.chord.quality.complexity - b.chord.quality.complexity || a.chord.degree - b.chord.degree)
}
