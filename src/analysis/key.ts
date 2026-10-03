import { midiOf, noteName, type Song } from '../model/song'

// Krumhansl-Schmuckler key profiles.
const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
const MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11]
const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10]

export interface KeyGuess {
  root: number
  mode: 'major' | 'minor'
  name: string
  /** Pitch classes in the key's scale. */
  scale: Set<number>
  /** 0..1, how clearly the notes fit the key. */
  confidence: number
}

function correlate(hist: number[], profile: number[]): number {
  const n = 12
  const mh = hist.reduce((a, b) => a + b, 0) / n
  const mp = profile.reduce((a, b) => a + b, 0) / n
  let num = 0
  let dh = 0
  let dp = 0
  for (let i = 0; i < n; i++) {
    num += (hist[i] - mh) * (profile[i] - mp)
    dh += (hist[i] - mh) ** 2
    dp += (profile[i] - mp) ** 2
  }
  return dh === 0 ? 0 : num / Math.sqrt(dh * dp)
}

export function detectKey(song: Song): KeyGuess | null {
  if (song.notes.length < 4) return null
  const hist = new Array<number>(12).fill(0)
  for (const n of song.notes) hist[midiOf(song, n) % 12] += Math.max(0.25, n.duration)
  let best: KeyGuess | null = null
  let second = -Infinity
  for (let root = 0; root < 12; root++) {
    for (const mode of ['major', 'minor'] as const) {
      const profile = mode === 'major' ? MAJOR : MINOR
      const rotated = Array.from({ length: 12 }, (_, i) => profile[(i - root + 12) % 12])
      const score = correlate(hist, rotated)
      if (!best || score > best.confidence) {
        if (best) second = Math.max(second, best.confidence)
        const scale = new Set((mode === 'major' ? MAJOR_SCALE : MINOR_SCALE).map((i) => (root + i) % 12))
        best = { root, mode, name: `${noteName(root, false)} ${mode}`, scale, confidence: score }
      } else second = Math.max(second, score)
    }
  }
  if (best) best.confidence = Math.max(0, Math.min(1, best.confidence - Math.max(0, second) * 0.5 + 0.5))
  return best
}

export interface ChordLabel {
  beat: number
  name: string
}

interface Template {
  suffix: string
  pcs: number[]
}

const TEMPLATES: Template[] = [
  { suffix: '', pcs: [0, 4, 7] },
  { suffix: 'm', pcs: [0, 3, 7] },
  { suffix: '7', pcs: [0, 4, 7, 10] },
  { suffix: 'maj7', pcs: [0, 4, 7, 11] },
  { suffix: 'm7', pcs: [0, 3, 7, 10] },
  { suffix: 'sus4', pcs: [0, 5, 7] },
  { suffix: 'sus2', pcs: [0, 2, 7] },
  { suffix: 'dim', pcs: [0, 3, 6] },
  { suffix: '5', pcs: [0, 7] },
]

/** Guess a chord name for every bar from the notes sounding in it. Repeats are merged. */
/**
 * True when there is harmony to name: notes sounding together, or an
 * accompaniment pattern that uses both the bass strings and the treble strings.
 */
function hasHarmony(song: Song): boolean {
  const notes = song.notes
  let bass = false
  let treble = false
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i]
    if (n.string <= 1) bass = true
    if (n.string >= 3) treble = true
    if (i > 0) {
      const a = notes[i - 1]
      if (n.time < a.time + a.duration - 0.05 && a.string !== n.string) return true
    }
  }
  return bass && treble
}

export function detectChords(song: Song): ChordLabel[] {
  if (!hasHarmony(song)) return []
  // Very short bars (3/8 pieces) do not hold a whole harmony; look at two at a time.
  const bar = song.beatsPerBar < 2 ? song.beatsPerBar * 2 : song.beatsPerBar
  const length = song.notes.reduce((m, n) => Math.max(m, n.time + n.duration), 0)
  const bars = Math.ceil(length / bar)
  const out: ChordLabel[] = []
  let last = ''
  for (let b = 0; b < bars; b++) {
    const start = b * bar
    const end = start + bar
    const w = new Array<number>(12).fill(0)
    let bassMidi = Infinity
    let bassPc = -1
    let total = 0
    for (const n of song.notes) {
      if (n.time >= end || n.time + n.duration <= start) continue
      const overlap = Math.min(end, n.time + n.duration) - Math.max(start, n.time)
      const midi = midiOf(song, n)
      // Long notes, downbeat notes, and low notes say the most about the harmony.
      let weight = Math.max(0.2, overlap) + (n.time >= start && n.time < start + 0.5 ? 0.4 : 0)
      if (midi < 52) weight *= 2
      w[midi % 12] += weight
      total += weight
      if (n.time < start + 1 && midi < bassMidi) {
        bassMidi = midi
        bassPc = midi % 12
      }
    }
    const distinct = w.filter((x) => x > 0).length
    if (total === 0 || distinct < 2) continue
    let bestName = ''
    let bestScore = 0
    for (let root = 0; root < 12; root++) {
      for (const t of TEMPLATES) {
        let inside = 0
        for (const i of t.pcs) inside += w[(root + i) % 12]
        const outside = total - inside
        let score = inside / total - (0.6 * outside) / total
        if (w[root] < 0.15 * total) score -= 0.3
        if (bassPc === root) score += 0.15
        if (t.pcs.length === 3 && !t.suffix.startsWith('sus') && t.suffix !== 'dim') score += 0.06 // prefer plain triads
        if (t.suffix.startsWith('sus')) score -= 0.12
        if (t.pcs.length === 2) score -= 0.12 // only call a power chord when nothing better fits
        if (t.pcs.length === 4) {
          // Call a seventh chord only when the seventh is really there.
          const seventh = w[(root + t.pcs[3]) % 12]
          if (seventh < 0.18 * total) score -= 0.5
          else score -= 0.03
        }
        if (score > bestScore) {
          bestScore = score
          bestName = noteName(root, false) + t.suffix
        }
      }
    }
    if (bestScore < 0.5) continue
    if (bestName !== last) {
      out.push({ beat: start, name: bestName })
      last = bestName
    }
  }
  return out
}
