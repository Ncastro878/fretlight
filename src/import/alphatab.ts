import type * as alphaTab from '@coderline/alphatab'
import { assignFingers } from '../model/fingers'
import { sortNotes, type Song, type SongNote } from '../model/song'

const TICKS_PER_BEAT = 960

export interface ImportedTrack {
  index: number
  name: string
  strings: number
}

/** Parse a Guitar Pro (.gp3/.gp4/.gp5/.gpx/.gp), MusicXML, or alphaTex file. */
export async function parseScore(data: ArrayBuffer): Promise<alphaTab.model.Score> {
  // alphaTab is large, so it is only downloaded the first time a file is opened.
  const lib = await import('@coderline/alphatab')
  return lib.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(data))
}

export function listStringedTracks(score: alphaTab.model.Score): ImportedTrack[] {
  const out: ImportedTrack[] = []
  score.tracks.forEach((track, index) => {
    const staff = track.staves.find((s) => s.isStringed && s.tuning.length >= 4)
    if (staff) out.push({ index, name: track.name || `Track ${index + 1}`, strings: staff.tuning.length })
  })
  return out
}

export function scoreToSong(score: alphaTab.model.Score, trackIndex: number, fileName: string): Song {
  const track = score.tracks[trackIndex]
  const staff = track.staves.find((s) => s.isStringed && s.tuning.length >= 4)
  if (!staff) throw new Error('That track has no string tablature.')

  // alphaTab lists tuning from the highest string to the lowest; we want lowest first.
  const tuning = [...staff.tuning].reverse()
  const notes: SongNote[] = []

  for (const bar of staff.bars) {
    for (const v of bar.voices) {
      for (const beat of v.beats) {
        if (beat.isRest) continue
        const time = beat.absolutePlaybackStart / TICKS_PER_BEAT
        const duration = Math.max(beat.playbackDuration / TICKS_PER_BEAT, 0.0625)
        for (const note of beat.notes) {
          if (note.isTieDestination || note.isDead || !note.isVisible) continue
          if (note.string < 1 || note.string > tuning.length) continue
          const finger = note.leftHandFinger
          notes.push({
            time,
            duration,
            // alphaTab: string 1 is the lowest. Ours: index 0 is the lowest.
            string: note.string - 1,
            fret: note.fret,
            finger: finger >= 1 && finger <= 4 ? finger : undefined,
          })
        }
      }
    }
  }

  // Use the most common time signature; the first bar is often a short pickup.
  const counts = new Map<number, number>()
  for (const mb of score.masterBars) {
    const bpb = (mb.timeSignatureNumerator * 4) / mb.timeSignatureDenominator
    counts.set(bpb, (counts.get(bpb) ?? 0) + 1)
  }
  let beatsPerBar = 4
  let best = 0
  for (const [bpb, n] of counts) {
    if (n > best) {
      best = n
      beatsPerBar = bpb
    }
  }
  const title = score.title || fileName.replace(/\.[^.]+$/, '')
  const composer = score.artist || score.music || score.words || ''

  return assignFingers({
    id: `import-${Date.now()}`,
    title: track.name && score.tracks.length > 1 ? `${title} (${track.name})` : title,
    composer,
    tempo: score.tempo || 120,
    beatsPerBar,
    tuning,
    notes: sortNotes(notes),
    blurb: `Imported from ${fileName}`,
  })
}
