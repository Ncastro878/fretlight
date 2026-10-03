import { STANDARD_TUNING, type Song } from '../model/song'
import { merge, voice } from '../model/tabdsl'

// Beethoven, Piano Sonata No. 14 "Moonlight", 1st movement, opening bars.
// Transposed from C# minor to E minor for guitar. Triplets: each note is 1/3 beat.
const t = (1 / 3).toFixed(6)
const trip = (a: string, b: string, c: string, times: number) =>
  Array(times).fill(`${a}:${t} ${b} ${c}`).join(' ')

// Bars 1-2: Em (B3 E4 G4). Bar 3: C (C4 E4 G4) then F (C4 F4 A4).
// Bar 4: B7 (B3 D#4 A4) x2, Em/B (B3 E4 G4), B (B3 D#4 F#4).
// Bars 5-6: Em again with the melody entering on the high B.
const arpeggio = voice(`
  ${trip('2/0', '1/0', '1/3', 4)} |
  ${trip('2/0', '1/0', '1/3', 4)} |
  ${trip('2/1', '1/0', '1/3', 2)} ${trip('2/1', '1/1', '1/5', 2)} |
  ${trip('2/0', '2/4', '1/5', 2)} ${trip('2/0', '1/0', '1/3', 1)} ${trip('2/0', '2/4', '1/2', 1)} |
  ${trip('3/4', '2/5', '2/8', 4)} |
  ${trip('3/4', '2/5', '2/8', 4)}
`)

const bass = voice(`
  6/0+4/2:4 | 6/0+4/2:4 | 5/3:2 6/1:2 | 5/2:4 | 6/0+4/2:4 | 6/0+4/2:4
`)

const melody = voice(`
  r:4 r r r |
  1/7:3 1/7:0.75 1/7:0.25 |
  1/7:4
`)

export const moonlightSonata: Song = {
  id: 'moonlight-sonata',
  title: 'Moonlight Sonata (opening)',
  composer: 'Ludwig van Beethoven',
  tempo: 54,
  beatsPerBar: 4,
  tuning: STANDARD_TUNING,
  notes: merge(arpeggio, bass, melody),
  blurb: 'First six bars in E minor. Slow triplet arpeggios, good for loop practice.',
}
