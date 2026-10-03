import { STANDARD_TUNING, type Song } from '../model/song'
import { voice } from '../model/tabdsl'

// Beethoven, Symphony No. 9, "Ode to Joy" theme. G major, open position.
// B=2/0 C=2/1 D=2/3 A=3/2 G=3/0 D(low)=4/0
const melody = voice(`
  2/0 2/0 2/1 2/3 | 2/3 2/1 2/0 3/2 | 3/0 3/0 3/2 2/0 | 2/0:1.5 3/2:0.5 3/2:2 |
  2/0:1 2/0 2/1 2/3 | 2/3 2/1 2/0 3/2 | 3/0 3/0 3/2 2/0 | 3/2:1.5 3/0:0.5 3/0:2 |
  3/2:1 3/2 2/0 3/0 | 3/2 2/0:0.5 2/1:0.5 2/0:1 3/0 | 3/2 2/0:0.5 2/1:0.5 2/0:1 3/2 | 3/0 3/2 4/0:2 |
  2/0:1 2/0 2/1 2/3 | 2/3 2/1 2/0 3/2 | 3/0 3/0 3/2 2/0 | 3/2:1.5 3/0:0.5 3/0:2
`)

export const odeToJoy: Song = {
  id: 'ode-to-joy',
  title: 'Ode to Joy',
  composer: 'Ludwig van Beethoven',
  tempo: 112,
  beatsPerBar: 4,
  tuning: STANDARD_TUNING,
  notes: melody,
  blurb: 'Melody only, first position. The classic first song.',
}
