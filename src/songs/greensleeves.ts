import { STANDARD_TUNING, type Song } from '../model/song'
import { merge, voice } from '../model/tabdsl'

// Traditional, A minor, 6/8 (written here as 3 beats per bar, eighth = 0.5).
// Melody frets: A3=3/2 B3=2/0 C4=2/1 D4=2/3 E4=1/0 F4=1/1 G4=1/3 G3=3/0 G#3=3/1 E3=4/2 F#3=4/4
const melody = voice(`
  r:1 r:0.5 3/2:0.5 |
  2/1:1 2/3:0.5 1/0:0.75 1/1:0.25 1/0:0.5 | 2/3:1 2/0:0.5 3/0:0.75 3/2:0.25 2/0:0.5 |
  2/1:1 3/2:0.5 3/2:0.75 3/1:0.25 3/2:0.5 | 2/0:1 3/1:0.5 4/2:1 3/2:0.5 |
  2/1:1 2/3:0.5 1/0:0.75 1/1:0.25 1/0:0.5 | 2/3:1 2/0:0.5 3/0:0.75 3/2:0.25 2/0:0.5 |
  2/1:0.75 2/0:0.25 3/2:0.5 3/1:0.75 4/4:0.25 3/1:0.5 | 3/2:1.5 3/2:1.5 |
  1/3:1.5 1/3:0.75 1/1:0.25 1/0:0.5 | 2/3:1 2/0:0.5 3/0:0.75 3/2:0.25 2/0:0.5 |
  2/1:1 3/2:0.5 3/2:0.75 3/1:0.25 3/2:0.5 | 2/0:1 3/1:0.5 4/2:1.5 |
  1/3:1.5 1/3:0.75 1/1:0.25 1/0:0.5 | 2/3:1 2/0:0.5 3/0:0.75 3/2:0.25 2/0:0.5 |
  2/1:0.75 2/0:0.25 3/2:0.5 3/1:0.75 4/4:0.25 3/1:0.5 | 3/2:3
`)

// Thumb bass on the downbeats: Am G Am E | Am G Am/E Am | C G Am E | C G Am/E Am
const bass = voice(`
  r:3 |
  5/0:3 | 6/3:3 | 5/0:3 | 6/0:3 |
  5/0:3 | 6/3:3 | 5/0:1.5 6/0:1.5 | 5/0:3 |
  5/3:3 | 6/3:3 | 5/0:3 | 6/0:3 |
  5/3:3 | 6/3:3 | 5/0:1.5 6/0:1.5 | 5/0:3
`)

export const greensleeves: Song = {
  id: 'greensleeves',
  title: 'Greensleeves',
  composer: 'Traditional (16th century)',
  tempo: 96,
  beatsPerBar: 3,
  tuning: STANDARD_TUNING,
  notes: merge(melody, bass),
  blurb: 'Melody with thumb bass notes. A minor, open position.',
}
