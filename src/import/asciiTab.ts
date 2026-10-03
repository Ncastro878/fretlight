import { assignFingers } from '../model/fingers'
import { STANDARD_TUNING, sortNotes, type Song, type SongNote } from '../model/song'

/**
 * Best-effort ASCII tab reader. ASCII tabs carry no reliable rhythm, so every
 * text column is treated as one eighth note. Six consecutive lines that look
 * like strings (optional letter, then | and dashes) form one system.
 */
export function parseAsciiTab(text: string, title = 'Pasted tab'): Song {
  const lines = text.split(/\r?\n/)
  const systems: string[][] = []
  let current: string[] = []
  for (const line of lines) {
    if (/^\s*[a-gA-G]?#?\s*[|:]?[-0-9|hpb\/\\~xs()^]{4,}/.test(line) && line.includes('-')) {
      current.push(line)
      if (current.length === 6) {
        systems.push(current)
        current = []
      }
    } else {
      current = []
    }
  }
  if (systems.length === 0) throw new Error('No tab systems found. Paste six lines per system, high e on top.')

  const columnBeats = 0.5
  const notes: SongNote[] = []
  let offset = 0
  for (const system of systems) {
    const rows = system.map((line) => line.replace(/^\s*[a-gA-G]?#?\s*/, ''))
    const width = Math.max(...rows.map((r) => r.length))
    const consumed = rows.map(() => -1)
    for (let col = 0; col < width; col++) {
      for (let row = 0; row < 6; row++) {
        if (col <= consumed[row]) continue
        const ch = rows[row][col]
        if (ch === undefined || !/[0-9]/.test(ch)) continue
        let text = ch
        if (/[0-9]/.test(rows[row][col + 1] ?? '')) {
          text += rows[row][col + 1]
          consumed[row] = col + 1
        }
        const fret = parseInt(text, 10)
        if (fret > 24) continue
        notes.push({
          time: offset + col * columnBeats,
          duration: columnBeats,
          string: 5 - row, // top line is the highest string
          fret,
        })
      }
    }
    offset += width * columnBeats
  }
  if (notes.length === 0) throw new Error('Found tab lines but no fret numbers.')

  // Each note rings until the next note on the same string, up to two beats.
  const sorted = sortNotes(notes)
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      if (sorted[j].string === sorted[i].string) {
        sorted[i].duration = Math.min(2, Math.max(columnBeats, sorted[j].time - sorted[i].time))
        break
      }
    }
  }

  return assignFingers({
    id: `ascii-${Date.now()}`,
    title,
    composer: '',
    tempo: 90,
    beatsPerBar: 4,
    tuning: STANDARD_TUNING,
    notes: sorted,
    blurb: 'ASCII tab has no rhythm, so every column is an eighth note.',
  })
}
