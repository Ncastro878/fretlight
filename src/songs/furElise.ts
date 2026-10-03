import { STANDARD_TUNING, type Song } from '../model/song'
import { repeat, voice } from '../model/tabdsl'

// Beethoven, Bagatelle No. 25 "Für Elise", opening theme, down an octave for guitar.
// 3/8 time written as 1.5 beats per bar, sixteenth = 0.25.
// E4=1/0 D#4=2/4 B3=2/0 D4=2/3 C4=2/1 A3=3/2 C3=5/3 E3=4/2 G#3=3/1
const bar = 1.5
const phrase = voice(`
  1/0:0.25 2/4 |
  1/0 2/4 1/0 2/0 2/3 2/1 | 3/2:0.5 5/3:0.25 4/2 3/2 | 2/0:0.5 4/2:0.25 3/1 2/0 | 2/1:0.5 4/2:0.25 1/0 2/4 |
  1/0 2/4 1/0 2/0 2/3 2/1 | 3/2:0.5 5/3:0.25 4/2 3/2 | 2/0:0.5 4/2:0.25 2/1 2/0 | 3/2:1
`)
const phraseLength = 8 * bar

export const furElise: Song = {
  id: 'fur-elise',
  title: 'Für Elise',
  composer: 'Ludwig van Beethoven',
  tempo: 76,
  beatsPerBar: 1.5,
  tuning: STANDARD_TUNING,
  notes: repeat(phrase, 2, phraseLength),
  blurb: 'Opening theme, two passes. Open position, mostly on the top three strings.',
}
