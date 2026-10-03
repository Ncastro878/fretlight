import { assignFingers } from '../model/fingers'
import { STANDARD_TUNING, type Song } from '../model/song'
import { repeat, voice } from '../model/tabdsl'

interface LickDef {
  id: string
  title: string
  style: string
  tempo: number
  beatsPerBar?: number
  blurb: string
  spec: string
  /** Repeat the phrase this many times (default 2) so the loop has a natural length. */
  times?: number
}

// All licks are in A (A minor pentatonic / A blues around the 5th position)
// unless the blurb says otherwise, so they can be strung together.
const LICK_DEFS: LickDef[] = [
  // ---------- Blues ----------
  {
    id: 'blues-classic-bend',
    title: 'The classic bend',
    style: 'Blues',
    tempo: 88,
    blurb: 'Full-step bend on the high e at fret 8 (C up to D), then walk down the box to the root with vibrato. The first lick everyone learns.',
    spec: '1/8b2:q 1/5:e 2/8 2/5 3/7 3/5 4/7~:h',
  },
  {
    id: 'blues-bb-box',
    title: 'B.B. box bends',
    style: 'Blues',
    tempo: 84,
    blurb: 'Up at the 10th fret B string, the "B.B. King box". Bend-and-release, then rest on the root.',
    spec: '2/10b2r:q 2/10:e 1/8 1/10~:q. 1/8:e 2/10b2:q 2/10:e 2/8 3/9~:h',
  },
  {
    id: 'blues-blue-note-slide',
    title: 'Blue note slide',
    style: 'Blues',
    tempo: 92,
    blurb: 'Slide into the flat five on the G string and resolve down. The sound of the blues scale.',
    spec: '3/7s8:e 3/8:e 3/7 3/5 4/7 4/5 5/7 5/5~:q 5/7~:h',
  },
  {
    id: 'blues-double-stops',
    title: 'Double stops',
    style: 'Blues',
    tempo: 96,
    blurb: 'Two-string stabs on the top strings with a quarter-tone curl, Chuck Berry style.',
    spec: '1/5+2/5:e 1/5+2/5 1/8+2/8:e 1/8+2/8 1/5+2/5b0.5:q 1/5+2/5b0.5:q 1/8+2/8:e 1/5+2/5:e 3/7~:h',
  },
  {
    id: 'blues-trill',
    title: 'Hammer-on trill',
    style: 'Blues',
    tempo: 80,
    blurb: 'Hammer and pull on the G string, then land on the root. Keep the first finger planted.',
    spec: '3/5:t 3/7h 3/5h 3/7h 3/5h 3/7h 3/5:t 3/7h 3/5h 4/7:e 4/5 5/7~:h',
  },
  {
    id: 'blues-turnaround',
    title: 'Turnaround walk-down',
    style: 'Blues',
    tempo: 92,
    blurb: 'Chromatic walk-down on the D string against the open A string. Bars 11 and 12 of a 12-bar blues.',
    spec: '4/7+5/0:e 4/6+5/0 4/5+5/0 4/4+5/0 4/7:e 4/6 4/5 4/4 5/0:q 6/0:q 6/1:e 6/2:e 5/0~:h',
  },
  // ---------- Rock ----------
  {
    id: 'rock-pentatonic-4s',
    title: 'Pentatonic in 4s',
    style: 'Rock',
    tempo: 100,
    blurb: 'Descending groups of four through box 1. Strict alternate picking; this is the backbone of rock soloing.',
    spec: '1/8:s 1/5 2/8 2/5 1/5:s 2/8 2/5 3/7 2/8:s 2/5 3/7 3/5 2/5:s 3/7 3/5 4/7 3/7:s 3/5 4/7 4/5 3/5:s 4/7 4/5 5/7 4/7:s 4/5 5/7 5/5 4/5:s 5/7 5/5 6/8 5/7:s 5/5 6/8 6/5 6/5~:h',
  },
  {
    id: 'rock-unison-bend',
    title: 'Unison bends',
    style: 'Rock',
    tempo: 84,
    blurb: 'Bend the B string up to meet the high e. Match the pitch exactly, then add vibrato.',
    spec: '2/8b2~+1/5~:h 2/10b2~+1/8~:h 2/8b2+1/5:q 1/5:e 2/8 2/5 3/7~:h',
  },
  {
    id: 'rock-page-pulloff',
    title: 'Repeating pull-off',
    style: 'Rock',
    tempo: 110,
    blurb: 'Triplet pull-offs on the high e against the B string. The Jimmy Page / Angus Young repeating lick.',
    spec: '1/8:t 1/5h 2/8 1/8:t 1/5h 2/8 1/8:t 1/5h 2/8 1/8:t 1/5h 2/8',
    times: 4,
  },
  {
    id: 'rock-oblique-bend',
    title: 'Oblique bend lick',
    style: 'Rock',
    tempo: 92,
    blurb: 'Hold the high e while bending the B string underneath it. Country and rock players live on this.',
    spec: '2/8b2:e 1/5 2/8b2:e 1/5 2/8b2:e 1/5 2/8b2r:q 2/5:e 3/7~:q.',
  },
  {
    id: 'rock-slide-run',
    title: 'Slide up the neck',
    style: 'Rock',
    tempo: 96,
    blurb: 'Shift boxes with slides: 5th position up to the 12th. Each slide lands you in the next shape.',
    spec: '3/5:e 3/7s9 3/9:e 2/8 2/10s12:e 2/12:e 1/10 1/12s15:e 1/15:q 1/12 2/13b2~:h',
  },
  // ---------- Shred ----------
  {
    id: 'shred-legato-sextuplets',
    title: 'Legato sextuplets',
    style: 'Shred',
    tempo: 100,
    blurb: 'Hammer-ons and pull-offs only, six notes per beat, one string at a time. Pick only the first note of each string.',
    spec: '1/5:x 1/7h 1/8h 1/7h 1/5h 1/7h 1/5:x 1/7h 1/8h 1/7h 1/5h 1/7h 2/5:x 2/6h 2/8h 2/6h 2/5h 2/6h 2/5:x 2/6h 2/8h 2/6h 2/5h 2/6h',
    times: 2,
  },
  {
    id: 'shred-3nps-run',
    title: '3-note-per-string run',
    style: 'Shred',
    tempo: 110,
    blurb: 'A minor, 5th position, three notes per string straight up and down. Alternate pick every note.',
    spec: '6/5:s 6/7 6/8 5/5 5/7 5/8 4/5 4/7 4/9 3/5 3/7 3/9 2/5 2/6 2/8 1/5 1/7 1/8 1/7:s 1/5 2/8 2/6 2/5 3/9 3/7 3/5 4/9 4/7 4/5 5/8 5/7 5/5 6/8 6/7 6/5:q',
  },
  {
    id: 'shred-pedal-point',
    title: 'Pedal point',
    style: 'Shred',
    tempo: 104,
    blurb: 'Keep returning to the high E while the other notes climb. Neoclassical staple.',
    spec: '1/12:s 1/5 1/12 1/7 1/12 1/8 1/12 1/10 1/12:s 1/13 1/12 1/15 1/12 1/13 1/12 1/10 1/12:s 1/8 1/12 1/7 1/12 1/5 1/12 1/3 1/5~:q',
  },
  {
    id: 'shred-sweep-am',
    title: 'Sweep: A minor arpeggio',
    style: 'Shred',
    tempo: 80,
    blurb: 'Five-string A minor sweep at the 12th fret with a hammer-on at the top. One continuous pick stroke up, one down.',
    spec: '5/12:x 4/14 3/14 2/13 1/12 1/17h 1/12:x 2/13 3/14 4/14 5/12 5/12',
    times: 4,
  },
  {
    id: 'shred-string-skip',
    title: 'String skipping',
    style: 'Shred',
    tempo: 100,
    blurb: 'A minor across the D and high e strings, skipping the G and B. Builds picking accuracy.',
    spec: '4/7:s 4/9 4/10 1/5 1/7 1/8 4/9 4/10 4/12 1/7 1/8 1/10 4/10:s 4/12 4/14 1/8 1/10 1/12 1/10 1/8 1/7 4/12 4/10 4/9 1/5~:q',
  },
  {
    id: 'shred-tapping',
    title: 'Tapping triplets',
    style: 'Shred',
    tempo: 120,
    blurb: 'Tap at the 12th, pull off to 5, hammer 8. Then move the tap to 13 and 15 for the Eruption flavor.',
    spec: '1/12t:t 1/5h 1/8h 1/12t:t 1/5h 1/8h 1/13t:t 1/5h 1/8h 1/13t:t 1/5h 1/8h 1/15t:t 1/5h 1/8h 1/15t:t 1/5h 1/8h 1/12t:t 1/5h 1/8h 1/12t:t 1/5h 1/8h',
    times: 2,
  },
  // ---------- Classic rock players (in the style of) ----------
  {
    id: 'style-gilmour',
    title: 'Gilmour-style slow bends',
    style: 'Classic rock',
    tempo: 66,
    blurb: 'Long, slow bends with wide vibrato at the top, then a bend-and-release. Patience is the whole point. B minor pentatonic at the 7th fret.',
    spec: '2/10b2~:h 1/10~:q 1/12b2~:h. 1/10:e 2/12b2r:h 2/10:q 3/11~:w',
  },
  {
    id: 'style-slash',
    title: 'Slash-style pentatonic run',
    style: 'Classic rock',
    tempo: 104,
    blurb: 'Descending triplet run through the A minor box with a slide at the bottom. Loose and bluesy, not metronomic.',
    spec: '1/8:t 1/5 2/8 2/5:t 3/7 3/5 4/7:t 4/5 5/7 5/5:t 6/8 6/5 6/5s7:e 6/7:e 5/5 5/7 4/5:q 4/7~:h',
  },
  {
    id: 'style-mayer',
    title: 'Mayer-style double stops',
    style: 'Classic rock',
    tempo: 92,
    blurb: 'Hammered double stops on the G and B strings over an A chord. Thumb over the top for the bass. Hendrix taught Mayer this.',
    spec: '3/6+2/5:e 3/7h+2/5:e 1/5:e 3/7+2/5:e 3/9+2/10:e 3/9+2/10:e 2/10h:e 1/9+2/10:q 3/7:e 4/7:e 5/0~:q',
  },
  {
    id: 'style-clapton',
    title: 'Clapton-style box shift',
    style: 'Classic rock',
    tempo: 96,
    blurb: 'Box 1 up to the extended box with the slide on the G string. Woman-tone phrasing: bend into the root, not away from it.',
    spec: '3/5:e 3/7s9:e 3/9:e 2/8 2/10 1/8 1/10b2~:q. 1/8:e 2/10 2/8 3/9 3/7 4/7~:h',
  },
  {
    id: 'style-page',
    title: 'Page-style blues rock lick',
    style: 'Classic rock',
    tempo: 100,
    blurb: 'Pull-offs on the top strings, a quick slide, and a sloppy-on-purpose bend to finish.',
    spec: '1/8:s 1/5h 2/8 1/5 2/8:s 2/5h 3/7 2/5 3/7:s 3/5h 4/7 3/5 4/7:e 4/5s7:e 3/7:e 2/8b2~:q.',
  },
  {
    id: 'style-petrucci',
    title: 'Petrucci-style alternate picking',
    style: 'Classic rock',
    tempo: 100,
    blurb: 'Sixteenth-note 3NPS fragments that change direction every six notes. Strict alternate picking, start slow.',
    spec: '6/5:s 6/7 6/8 5/5 5/7 5/8 5/7 5/5 6/8 6/7 6/5 6/7 5/5:s 5/7 5/8 4/5 4/7 4/9 4/7 4/5 5/8 5/7 5/5 5/7 4/5:s 4/7 4/9 3/5 3/7 3/9 3/7 3/5 4/9 4/7 4/5 4/7 3/5:s 3/7 3/9 2/5 2/6 2/8 2/6 2/5 3/9 3/7 3/5 3/7',
  },
  {
    id: 'style-srv',
    title: 'SRV-style turnaround',
    style: 'Classic rock',
    tempo: 100,
    blurb: 'Texas blues in A: double stops sliding down, chromatic walk, hard vibrato on the root.',
    spec: '2/5+1/5:e 2/5+1/5:e 3/6s5+2/5:e 3/5+2/5:e 4/7:e 4/6 4/5 4/4 5/7:e 5/6 5/5 5/4 6/5:e 6/4 5/0~:q. 2/5+1/5:e 3/6+2/5:e 5/0~:h',
  },
  {
    id: 'style-angus',
    title: 'Angus-style open-string lick',
    style: 'Classic rock',
    tempo: 120,
    blurb: 'Pull-offs to the open B and e strings, A minor pentatonic in the open position. Loud and simple.',
    spec: '1/3:t 1/0h 2/3 1/3:t 1/0h 2/3 2/3:t 2/0h 3/2 2/3:t 2/0h 3/2 3/2:t 3/0h 4/2 4/2:e 5/0~:q.',
    times: 2,
  },
  // ---------- Country ----------
  {
    id: 'country-chicken',
    title: 'Chicken pickin\'',
    style: 'Country',
    tempo: 112,
    blurb: 'Muted "cluck" notes between open strings in A. Pick the muted notes with the pick, snap the open ones with a finger.',
    spec: '1/5m:s 1/0 1/5m 1/0 2/5m:s 2/0 2/5m 2/0 3/6m:s 3/0 3/6m 3/0 2/5:e 1/5:e 3/6:e 5/0~:q',
    times: 2,
  },
  {
    id: 'country-bend',
    title: 'Country pedal steel bend',
    style: 'Country',
    tempo: 90,
    blurb: 'Hold the top string while bending the B string a whole step underneath, then release. Sounds like a pedal steel.',
    spec: '2/8b2+1/5:q 2/8b2r+1/5:h 2/7b2+1/5:q 2/7b2r+1/5:h 1/5:e 2/5 3/6s7:e 3/7:e 4/7~:h',
  },
  {
    id: 'country-banjo-roll',
    title: 'Banjo roll on open strings',
    style: 'Country',
    tempo: 96,
    blurb: 'Forward roll across G, B, and e with a hammer-on. Thumb, index, middle. Keep every note even.',
    spec: '3/0:s 2/0 1/0 3/0 2/0 1/0 3/0 2/0 3/2h:s 2/0 1/0 3/2 2/0 1/0 3/0 2/0 4/0:s 3/0 2/0 1/0 4/2h 3/0 2/0 1/0 3/0:s 2/0 1/0 3/0 2/0 1/0 3/0 2/0',
  },
  // ---------- Metal ----------
  {
    id: 'metal-gallop',
    title: 'Palm-muted gallop',
    style: 'Metal',
    tempo: 130,
    blurb: 'Eighth plus two sixteenths on the low E, palm muted. The Iron Maiden engine. Keep the picking hand loose.',
    spec: '6/0m:e 6/0m:s 6/0m 6/0m:e 6/0m:s 6/0m 6/0m:e 6/0m:s 6/0m 6/0m:e 6/0m:s 6/0m 6/0m:e 6/0m:s 6/0m 6/0m:e 6/0m:s 6/0m 6/3m:e 6/3m:s 6/3m 6/5m:e 6/5m:s 6/5m',
    times: 2,
  },
  {
    id: 'metal-power-chords',
    title: 'Power chord riff',
    style: 'Metal',
    tempo: 120,
    blurb: 'E5 chug with G5 and A5 accents. Downstrokes only, palm mute the chugs, open up the chords.',
    spec: '6/0m+5/2m:e 6/0m+5/2m 6/0m+5/2m 6/3+5/5:e 6/3+5/5:e 6/0m+5/2m:e 6/0m+5/2m 6/5+5/7:e 6/0m+5/2m:e 6/0m+5/2m 6/0m+5/2m 6/3+5/5:e 6/1+5/3:q 6/0+5/2:h',
    times: 2,
  },
  {
    id: 'metal-harmonic-minor',
    title: 'Harmonic minor run',
    style: 'Metal',
    tempo: 104,
    blurb: 'E harmonic minor up the top strings with the raised 7th (D#). Yngwie and Randy Rhoads territory.',
    spec: '3/9:s 3/11 3/12 2/12 2/13 2/15 1/12 1/14 1/15 1/16 1/15 1/14 1/12 2/15 2/13 2/12 3/12:s 3/11 3/9 4/9 4/10 4/12 3/9 3/11 3/12 2/12 2/13 2/15 1/12 1/14 1/15 1/16 1/19~:q',
  },
  // ---------- Warm-ups ----------
  {
    id: 'warm-spider',
    title: 'Spider walk 1-2-3-4',
    style: 'Warm-up',
    tempo: 80,
    blurb: 'One finger per fret, every string, up and back. Keep all four fingers close to the strings.',
    spec: '6/5:s 6/6 6/7 6/8 5/5 5/6 5/7 5/8 4/5 4/6 4/7 4/8 3/5 3/6 3/7 3/8 2/5 2/6 2/7 2/8 1/5 1/6 1/7 1/8 1/8:s 1/7 1/6 1/5 2/8 2/7 2/6 2/5 3/8 3/7 3/6 3/5 4/8 4/7 4/6 4/5 5/8 5/7 5/6 5/5 6/8 6/7 6/6 6/5',
  },
  {
    id: 'warm-1324',
    title: 'Finger independence 1-3-2-4',
    style: 'Warm-up',
    tempo: 76,
    blurb: 'Same frets, scrambled order. Harder than it looks for the ring and pinky.',
    spec: '6/5:s 6/7 6/6 6/8 5/5 5/7 5/6 5/8 4/5 4/7 4/6 4/8 3/5 3/7 3/6 3/8 2/5 2/7 2/6 2/8 1/5 1/7 1/6 1/8',
    times: 2,
  },
  {
    id: 'warm-hammer-pull',
    title: 'Hammer and pull strength',
    style: 'Warm-up',
    tempo: 84,
    blurb: 'Pick once, then hammer and pull three times per string. Make every note as loud as the picked one.',
    spec: '6/5:s 6/7h 6/5h 6/7h 5/5:s 5/7h 5/5h 5/7h 4/5:s 4/7h 4/5h 4/7h 3/5:s 3/7h 3/5h 3/7h 2/5:s 2/7h 2/5h 2/7h 1/5:s 1/7h 1/5h 1/7h',
    times: 2,
  },
  {
    id: 'warm-bend-tuning',
    title: 'Bend intonation',
    style: 'Warm-up',
    tempo: 72,
    blurb: 'Play the target fret, then bend up to it from two frets below. Train your ear to land bends in tune.',
    spec: '2/10:q 2/8b2:h 2/10:q 2/8b2~:h 1/10:q 1/8b2:h 1/10:q 1/8b2~:h 3/9:q 3/7b2:h 3/9:q 3/7b2~:h',
  },
  {
    id: 'warm-vibrato',
    title: 'Vibrato control',
    style: 'Warm-up',
    tempo: 60,
    blurb: 'Long notes with slow, even vibrato on each finger. Rock the wrist, not the finger.',
    spec: '2/5~:w 2/6~:w 2/7~:w 2/8~:w 1/5~:w 1/8~:w',
  },
]

function lickLength(notes: ReturnType<typeof voice>): number {
  let end = 0
  for (const n of notes) end = Math.max(end, n.time + n.duration)
  return end
}

function build(def: LickDef): Song {
  const phrase = voice(def.spec)
  const bar = def.beatsPerBar ?? 4
  const len = Math.ceil(lickLength(phrase) / bar) * bar
  const notes = repeat(phrase, def.times ?? 2, len)
  return assignFingers({
    id: `lick-${def.id}`,
    title: def.title,
    composer: def.style,
    tempo: def.tempo,
    beatsPerBar: bar,
    tuning: STANDARD_TUNING,
    notes,
    blurb: def.blurb,
  })
}

export const LICKS: Song[] = LICK_DEFS.map(build)
export const LICK_STYLES = ['Blues', 'Rock', 'Classic rock', 'Country', 'Metal', 'Shred', 'Warm-up']
