import { STANDARD_TUNING, type Song } from '../model/song'
import { voice } from '../model/tabdsl'

// Traditional American folk song. Fingerpicked arpeggio in 6/8 (3 beats per bar).
// Pattern per chord: bass, 3, 2, 1, 2, 3 as eighth notes.
const pick = (bass: string, s3: string, s2: string, s1: string) =>
  `${bass}:0.5 ${s3} ${s2} ${s1} ${s2} ${s3}`

const Am = pick('5/0', '3/2', '2/1', '1/0')
const C = pick('5/3', '3/0', '2/1', '1/0')
const D = pick('4/0', '3/2', '2/3', '1/2')
const F = pick('4/3', '3/2', '2/1', '1/1')
const E = pick('6/0', '3/1', '2/0', '1/0')

const notes = voice(`
  ${Am} | ${C} | ${D} | ${F} |
  ${Am} | ${C} | ${E} | ${E} |
  ${Am} | ${C} | ${D} | ${F} |
  ${Am} | ${E} | ${Am} | ${E}
`)

export const houseOfTheRisingSun: Song = {
  id: 'house-of-the-rising-sun',
  title: 'House of the Rising Sun',
  composer: 'Traditional',
  tempo: 100,
  beatsPerBar: 3,
  tuning: STANDARD_TUNING,
  notes,
  blurb: 'Fingerpicking pattern over Am C D F Am C E E. Great for right-hand practice.',
}
