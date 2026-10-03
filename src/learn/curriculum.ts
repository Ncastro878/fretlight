import { buildArpeggio } from '../exercises/arpeggios'
import { buildChordSong, buildProgression, presetSlots, PRESETS, type Slot } from '../exercises/chords'
import { LICKS } from '../exercises/licks'
import { buildExercise, type ExerciseSpec } from '../exercises/scales'
import { assignFingers } from '../model/fingers'
import { STANDARD_TUNING, songLength, type Song } from '../model/song'
import { merge, voice } from '../model/tabdsl'
import type { Ramp } from '../player/transport'
import type { CameraPreset } from '../scene/CameraRig'
import { LIBRARY } from '../songs'

export interface Drill {
  kind: 'note-name'
  /** Strings to quiz, 0 = low E. */
  strings: number[]
  frets: [number, number]
  /** Only natural notes (no sharps) when true. */
  naturalsOnly?: boolean
}

export interface LearnStep {
  title: string
  body: string
  tryThis?: string
  /** What to put on the neck. Omit for a reading-only step. */
  load?: () => Song
  loop?: boolean
  bpm?: number
  overlay?: 'none' | 'key' | 'chord'
  view?: CameraPreset
  metronome?: boolean
  ramp?: Ramp | null
  drill?: Drill
}

export interface LearnLesson {
  id: string
  title: string
  summary: string
  minutes: number
  steps: LearnStep[]
}

export interface Course {
  id: string
  title: string
  blurb: string
  lessons: LearnLesson[]
}

// ----- helpers -----

const lick = (id: string): Song => {
  const s = LICKS.find((l) => l.id === `lick-${id}`)
  if (!s) throw new Error(`missing lick ${id}`)
  return s
}
const song = (id: string): Song => LIBRARY.find((s) => s.id === id) ?? LIBRARY[0]
const scale = (spec: Partial<ExerciseSpec>): Song =>
  buildExercise({ root: 9, scaleId: 'minor', shape: 'nps3', position: 0, pattern: 'updown', noteValue: 0.5, bpm: 80, ...spec })
const arp = (root: number, arpId: string, shape: 'pos6' | 'pos5' | 'sweep5' | 'sweep6' | 'string' = 'pos6', pattern: 'updown' | 'groups3' | 'groups4' | 'inversions' | 'sweep' = 'updown', noteValue = 0.5, bpm = 80): Song =>
  buildArpeggio({ root, arpId, shape, pattern, noteValue, bpm })
const prog = (presetId: string, key: number, strum: Parameters<typeof buildProgression>[0]['strum'] = 'folk', bpm = 90): Song => {
  const preset = PRESETS.find((p) => p.id === presetId) ?? PRESETS[0]
  return buildProgression({ slots: presetSlots(preset, key), strum, bpm })
}
const custom = (slots: Slot[], strum: Parameters<typeof buildProgression>[0]['strum'] = 'folk', bpm = 90, title?: string): Song =>
  buildProgression({ slots, strum, bpm }, title)

/** A song written in the tab notation, for small demonstrations. */
const tab = (id: string, title: string, spec: string, tempo = 80, blurb = '', beatsPerBar = 4): Song =>
  assignFingers({ id: `learn-${id}`, title, composer: 'Lesson', tempo, beatsPerBar, tuning: STANDARD_TUNING, notes: voice(spec), blurb })

/** Lay one song over another (the drone under a scale). Tempo and length come from the first. */
const layer = (a: Song, b: Song, title?: string): Song => {
  const len = songLength(a)
  const notes = merge(a.notes, b.notes.filter((n) => n.time < len))
  return { ...a, id: `${a.id}+${b.id}`, title: title ?? a.title, notes, sections: a.sections ?? b.sections }
}
/** A low root note repeated every bar, to hear a mode against. */
const drone = (string: number, fret: number, bars: number, bpm: number): Song =>
  tab(`drone-${string}-${fret}`, 'Drone', Array.from({ length: bars }, () => `${string}/${fret}l:w`).join(' '), bpm)

// ----- courses -----

export const COURSES: Course[] = [
  {
    id: 'foundations',
    title: 'Foundations',
    blurb: 'Where the notes are, what intervals sound like, and the three triads everything is built from.',
    lessons: [
      {
        id: 'know-the-neck',
        title: 'Know the neck',
        summary: 'Open strings, the fret markers, octave shapes, and a note-naming drill.',
        minutes: 12,
        steps: [
          {
            title: 'The open strings',
            body: 'Low to high: E A D G B E. Each string is tuned a fourth above the last, except G to B, which is a major third. That one odd gap is why chord shapes change when they cross the B string.',
            load: () => tab('open-strings', 'Open strings', '6/0:h 5/0 4/0 3/0 2/0 1/0 1/0:h 2/0 3/0 4/0 5/0 6/0', 70),
            view: 'neck',
            tryThis: 'Say each string name out loud as it lights. Then say them backwards.',
          },
          {
            title: 'Fret markers are your map',
            body: 'The dots sit at frets 3, 5, 7, 9, and 12 (double dot). Fret 12 is the octave: the same note as the open string. Fret 5 on any string equals the next string open, except the G string where it is fret 4.',
            load: () => tab('markers', 'Marker frets on the low E', '6/0:q 6/3 6/5 6/7 6/9 6/12:h 6/12:q 6/9 6/7 6/5 6/3 6/0:h', 80),
            tryThis: 'Name the notes at the markers on the low E: E G A B C# E. The A string follows the same pattern from A.',
          },
          {
            title: 'Octave shapes',
            body: 'Two strings up and two frets over is the same note an octave higher (from the E and A strings). From the D and G strings it is two strings up and three frets over, because of that B string. Learn one note on the low strings and you know it everywhere.',
            load: () => tab('octaves', 'Octave shapes from G', '6/3:q 4/5 6/3+4/5:h 5/3:q 3/5 5/3+3/5:h 4/5:q 2/8 4/5+2/8:h 3/5:q 1/8 3/5+1/8:h', 76),
            tryThis: 'Watch the two lit notes. Same name, one octave apart. Find the shape for A starting at fret 5.',
          },
          {
            title: 'Drill: natural notes on E and A',
            body: 'Name the lit note. Only natural notes for now (no sharps or flats). Use the markers: fret 3 is G on the low E, fret 5 is A, fret 7 is B, fret 8 is C, fret 10 is D, fret 12 is E. On the A string shift everything: fret 3 is C, fret 5 is D, fret 7 is E.',
            drill: { kind: 'note-name', strings: [0, 1], frets: [0, 12], naturalsOnly: true },
            view: 'neck',
          },
          {
            title: 'Drill: all six strings',
            body: 'Same drill, every string, sharps included. Sharps sit one fret above the natural. Use octave shapes to work out the high strings from the low ones.',
            drill: { kind: 'note-name', strings: [0, 1, 2, 3, 4, 5], frets: [0, 12] },
            view: 'neck',
          },
        ],
      },
      {
        id: 'intervals',
        title: 'Intervals',
        summary: 'The distances between notes, heard and seen as shapes.',
        minutes: 10,
        steps: [
          {
            title: 'Half steps and whole steps',
            body: 'One fret is a half step (semitone). Two frets is a whole step. Every scale is just a pattern of half and whole steps. The major scale is whole, whole, half, whole, whole, whole, half.',
            load: () => tab('steps', 'Half and whole steps', '3/5:q 3/6 3/5 3/7 3/5:h 3/6:q 3/7 3/8 3/9 3/10:h', 72),
            tryThis: 'Listen to the tension in the half step and how the whole step feels more open.',
          },
          {
            title: 'Thirds: major and minor',
            body: 'A major third is four frets, a minor third is three. On adjacent strings: the major third is one string up, one fret back; the minor third is one string up, two frets back (shift one fret when crossing to the B string). Thirds decide whether a chord is happy or sad.',
            load: () => tab('thirds', 'Major third, then minor third', '4/7:q 3/6 4/7+3/6:h 4/7:q 3/5 4/7+3/5:h 5/5:q 4/4 5/5+4/4:h 5/5:q 4/3 5/5+4/3:h', 72),
            tryThis: 'Each pair plays the two notes, then both together. Hear bright, then dark.',
          },
          {
            title: 'Fourths and fifths',
            body: 'A perfect fifth is seven frets: one string up, two frets over. It is the power chord. A fourth is five frets: the same fret on the next string. Fifths sound stable and hollow; fourths sound suspended.',
            load: () => tab('fifths', 'Fifths and fourths', '6/5+5/7:h 6/5+5/5:h 5/7+4/9:h 5/7+4/7:h 6/3+5/5:h 6/3+5/3:h', 72),
            tryThis: 'The fifth is the rock interval. Hear it move: A5, then D5, then G5.',
          },
          {
            title: 'The octave and the interval ladder',
            body: 'Twelve frets is the octave: the same note, higher. Here is every interval from A on the G string up to the octave, each played against the root. Listen to how each one feels before the next arrives.',
            load: () => tab('ladder', 'Interval ladder from A', '3/2+3/2:h 3/2+3/3:h 3/2+3/4:h 3/2+3/5:h 3/2+3/6:h 3/2+3/7:h 3/2+3/8:h 3/2+3/9:h 3/2+3/10:h 3/2+3/11:h 3/2+3/12:h 3/2+3/13:h 3/2+3/14:w', 60),
            tryThis: 'Pause at any step and sing the top note. Minor second, major second, minor third, major third, fourth, tritone, fifth, minor sixth, major sixth, minor seventh, major seventh, octave.',
          },
        ],
      },
      {
        id: 'triads',
        title: 'Triads',
        summary: 'Major, minor, and diminished: three notes that make every chord.',
        minutes: 10,
        steps: [
          {
            title: 'Root, third, fifth',
            body: 'A triad is a root, a third, and a fifth. Major has a major third; minor has a minor third; diminished has a minor third and a flat fifth. The fifth is the same in major and minor, which is why power chords are neither.',
            load: () => arp(0, 'maj', 'pos6', 'updown', 0.5, 76),
            overlay: 'key',
            tryThis: 'The C major arpeggio: C E G up and down. Now load the next step and hear only one note change.',
          },
          {
            title: 'Major to minor: one fret',
            body: 'Lower the third one fret and major becomes minor. That single move is the biggest emotional switch in music.',
            load: () => arp(0, 'min', 'pos6', 'updown', 0.5, 76),
            tryThis: 'Compare with the previous step. The E became E♭ and everything else stayed.',
          },
          {
            title: 'Diminished: lower the fifth too',
            body: 'Lower the fifth as well and the triad becomes diminished: tense, unresolved, it wants to move. It shows up as the seventh chord of every major key.',
            load: () => arp(0, 'dim', 'pos6', 'updown', 0.5, 76),
            tryThis: 'Play this, then the major arpeggio again. Diminished sounds like a question; major like the answer.',
          },
          {
            title: 'Triads as chords',
            body: 'Stack the same three notes and strum them: that is a chord. Here are C major, C minor, and C diminished as chord shapes.',
            load: () =>
              custom(
                [
                  { chord: { root: 0, quality: 'maj' }, beats: 4 },
                  { chord: { root: 0, quality: 'min' }, beats: 4 },
                  { chord: { root: 0, quality: 'dim' }, beats: 4 },
                  { chord: { root: 0, quality: 'maj' }, beats: 4 },
                ],
                'whole',
                70,
                'C, Cm, Cdim, C',
              ),
            overlay: 'chord',
            tryThis: 'The overlay lights the chord tones across the whole neck: yellow root, green third, blue fifth. Watch the third drop a fret for the minor.',
          },
          {
            title: 'Inversions',
            body: 'Play the same three notes starting from the third or the fifth and you have an inversion. Same chord, different bass note, smoother movement between chords.',
            load: () => arp(0, 'maj', 'pos6', 'inversions', 0.5, 84),
            tryThis: 'Every group of three starts one chord tone higher. Root position, first inversion, second inversion, and back around.',
          },
        ],
      },
    ],
  },
  {
    id: 'scales',
    title: 'Scales and keys',
    blurb: 'The major scale, the pentatonic shortcut, modes as colors, and connecting positions across the neck.',
    lessons: [
      {
        id: 'major-scale',
        title: 'The major scale',
        summary: 'Build it on one string, then in a position, then in sequence.',
        minutes: 10,
        steps: [
          {
            title: 'On one string',
            body: 'Whole, whole, half, whole, whole, whole, half. Playing it up a single string shows the gaps as distances on the neck. The half steps are between the 3rd and 4th notes and the 7th and 8th.',
            load: () => scale({ root: 7, scaleId: 'major', shape: 'horizontal', position: 0, string: 0, noteValue: 0.5, bpm: 72 }),
            overlay: 'key',
            tryThis: 'Count the fret gaps as it climbs: 2 2 1 2 2 2 1.',
          },
          {
            title: 'In one position',
            body: 'The same notes folded into a hand position: three notes per string, no shifting. This is the shape you will use for fast playing. The overlay shows every G major note on the neck; the exercise plays the ones under your hand.',
            load: () => scale({ root: 7, scaleId: 'major', shape: 'nps3', position: 0, noteValue: 0.5, bpm: 80 }),
            overlay: 'key',
            tryThis: 'Watch the finger colors: index, middle, pinky or index, ring, pinky on each string.',
          },
          {
            title: 'Sequences',
            body: 'Scales are learned by playing them in patterns, not straight up and down. Groups of three is the classic: 1-2-3, 2-3-4, 3-4-5. It forces your fingers to know the scale, not just the shape.',
            load: () => scale({ root: 7, scaleId: 'major', shape: 'nps3', position: 0, pattern: 'groups3', noteValue: 1 / 3, bpm: 70 }),
            ramp: { stepBpm: 4, maxBpm: 120 },
            tryThis: 'The speed trainer is on: every loop adds 4 bpm up to 120. Stop when it gets sloppy and set that as your tempo for the week.',
          },
          {
            title: 'The relative minor',
            body: 'Start the same notes from the sixth degree and you get the natural minor scale. G major and E minor share every note; what changes is which note feels like home.',
            load: () => scale({ root: 4, scaleId: 'minor', shape: 'nps3', position: 0, noteValue: 0.5, bpm: 80 }),
            overlay: 'key',
            tryThis: 'Compare the overlay with the G major step: identical dots, different root color.',
          },
        ],
      },
      {
        id: 'pentatonic',
        title: 'Pentatonic to diatonic',
        summary: 'The five-note box every soloist starts with, and the two notes that turn it into a full scale.',
        minutes: 8,
        steps: [
          {
            title: 'Box 1',
            body: 'The A minor pentatonic, 5th position: two notes on every string. Five notes, no half steps, so nothing clashes. This is why it is the first solo scale.',
            load: () => scale({ root: 9, scaleId: 'minor-pentatonic', shape: 'box', position: 0, noteValue: 0.5, bpm: 84 }),
            overlay: 'key',
            tryThis: 'Index finger stays at fret 5 the whole time. Ring or pinky takes the other note.',
          },
          {
            title: 'Add the blue note',
            body: 'Slide in a flat fifth (E♭) and the pentatonic becomes the blues scale. The blue note is a passing tone: lean on it briefly, then resolve.',
            load: () => scale({ root: 9, scaleId: 'blues', shape: 'box', position: 0, noteValue: 0.5, bpm: 84 }),
            tryThis: 'Spot the extra note on the A string, G string, and the pinky stretch. Then play the blue-note slide lick.',
          },
          {
            title: 'Add two more: natural minor',
            body: 'The pentatonic plus the 2nd (B) and the 6th (F) is the full A natural minor scale. The two added notes bring the half steps back, and with them more color and more risk.',
            load: () => scale({ root: 9, scaleId: 'minor', shape: 'box', position: 0, noteValue: 0.5, bpm: 84 }),
            overlay: 'key',
            tryThis: 'The overlay shows the full scale; the exercise plays the position. Find the two notes that were not in box 1.',
          },
          {
            title: 'Use it: a lick',
            body: 'Pentatonic in groups of four, descending through box 1. This is how the box becomes music.',
            load: () => lick('rock-pentatonic-4s'),
            tryThis: 'Loop it slowly, then let the speed trainer push you.',
            ramp: { stepBpm: 4, maxBpm: 140 },
          },
        ],
      },
      {
        id: 'modes',
        title: 'Modes as colors',
        summary: 'Same seven notes, different home. Hear each mode against a drone.',
        minutes: 10,
        steps: [
          {
            title: 'What a mode is',
            body: 'Take the C major scale and treat D as home: that is D Dorian. The notes did not change, the center did. Modes are not new scales to memorize; they are the major scale heard from a different note. A drone makes the center obvious.',
            load: () => layer(drone(5, 5, 8, 72), scale({ root: 2, scaleId: 'dorian', shape: 'nps3', position: 0, noteValue: 0.5, bpm: 72 }), 'D Dorian over a D drone'),
            overlay: 'key',
            tryThis: 'Listen to the raised 6th (B) against the minor 3rd (F). That bittersweet lift is Dorian. Santana, So What.',
          },
          {
            title: 'Mixolydian',
            body: 'Major scale with a flat 7th. Bluesy major; the sound of dominant chords, Sweet Home Alabama, most classic rock. Here it is on A against an A drone.',
            load: () => layer(drone(5, 0, 8, 72), scale({ root: 9, scaleId: 'mixolydian', shape: 'nps3', position: 0, noteValue: 0.5, bpm: 72 }), 'A Mixolydian over an A drone'),
            overlay: 'key',
            tryThis: 'Compare with A major in your head: only the G is different (G natural instead of G#).',
          },
          {
            title: 'Lydian',
            body: 'Major scale with a sharp 4th. Dreamy, floating, film-score. The sharp 4 wants to rise to the 5th. Steve Vai and Joe Satriani live here.',
            load: () => layer(drone(6, 3, 8, 72), scale({ root: 7, scaleId: 'lydian', shape: 'nps3', position: 0, noteValue: 0.5, bpm: 72 }), 'G Lydian over a G drone'),
            overlay: 'key',
            tryThis: 'Find the C# (sharp 4). Hold on it mentally and feel it pull upward.',
          },
          {
            title: 'Phrygian',
            body: 'Natural minor with a flat 2nd. Spanish, dark, metal. The half step above the root is the whole flavor. Phrygian dominant (raise the 3rd) is the flamenco and Yngwie sound.',
            load: () => layer(drone(6, 0, 8, 72), scale({ root: 4, scaleId: 'phrygian', shape: 'nps3', position: 0, noteValue: 0.5, bpm: 72 }), 'E Phrygian over an E drone'),
            overlay: 'key',
            tryThis: 'Then load the harmonic minor run lick for the dominant flavor.',
          },
        ],
      },
      {
        id: 'caged',
        title: 'Connecting the neck',
        summary: 'Five positions of one scale and how to travel between them.',
        minutes: 10,
        steps: [
          {
            title: 'Five boxes, one scale',
            body: 'The pentatonic has five positions. Each box shares strings with the next: the top notes of one are the bottom notes of the next. Learn them as neighbors, not as five separate things.',
            load: () => scale({ root: 9, scaleId: 'minor-pentatonic', shape: 'box', position: 1, noteValue: 0.5, bpm: 84 }),
            overlay: 'key',
            tryThis: 'This is box 2 (starting on C). The overlay shows all five boxes at once; the exercise plays one.',
          },
          {
            title: 'Box 3, 4, 5',
            body: 'Step through the remaining positions. Watch how each one sits a few frets higher and how the overlay never changes.',
            load: () => scale({ root: 9, scaleId: 'minor-pentatonic', shape: 'box', position: 2, noteValue: 0.5, bpm: 84 }),
            overlay: 'key',
            tryThis: 'Change Position in the Practice tab to 4 and 5 and load them. Box 5 at fret 15 is box 1 an octave up.',
          },
          {
            title: 'Travel along one string',
            body: 'Positions connect through slides. Here is the scale up the G string, which crosses all five boxes.',
            load: () => scale({ root: 9, scaleId: 'minor-pentatonic', shape: 'horizontal', position: 3, string: 3, noteValue: 0.5, bpm: 80 }),
            overlay: 'key',
            tryThis: 'Now play the slide lick: it shifts from box 1 to box 3 with slides on the G and B strings.',
          },
          {
            title: 'A lick that shifts',
            body: 'Shifting positions mid-phrase is what makes a solo sound like it goes somewhere.',
            load: () => lick('rock-slide-run'),
            tryThis: 'Loop it. Notice which finger lands after each slide.',
          },
        ],
      },
    ],
  },
  {
    id: 'harmony',
    title: 'Harmony',
    blurb: 'Why progressions work, what seventh chords add, and how to solo over the changes.',
    lessons: [
      {
        id: 'progressions',
        title: 'Chord progressions and numbers',
        summary: 'Roman numerals, the chords in a key, and the progressions behind most songs.',
        minutes: 10,
        steps: [
          {
            title: 'The chords in a key',
            body: 'Build a triad on each note of the major scale and you get the family: I ii iii IV V vi vii°. Three major (I, IV, V), three minor (ii, iii, vi), one diminished. Songs mostly use these seven.',
            load: () =>
              custom(
                [
                  { chord: { root: 7, quality: 'maj' }, beats: 2 },
                  { chord: { root: 9, quality: 'min' }, beats: 2 },
                  { chord: { root: 11, quality: 'min' }, beats: 2 },
                  { chord: { root: 0, quality: 'maj' }, beats: 2 },
                  { chord: { root: 2, quality: 'maj' }, beats: 2 },
                  { chord: { root: 4, quality: 'min' }, beats: 2 },
                  { chord: { root: 6, quality: 'dim' }, beats: 2 },
                  { chord: { root: 7, quality: 'maj' }, beats: 2 },
                ],
                'whole',
                84,
                'Chords of G major: G Am Bm C D Em F#dim G',
              ),
            overlay: 'chord',
            tryThis: 'The overlay shows each chord\'s tones. Every one of them lives inside the G major dots from the scale lesson.',
          },
          {
            title: 'I – IV – V',
            body: 'The three major chords. Blues, folk, country, punk. In G: G, C, D. The V wants to go back to I; that pull is called resolution.',
            load: () => prog('folk', 7, 'down4', 100),
            overlay: 'chord',
            tryThis: 'Stop on the D chord (press pause during it) and feel the pull. Then let it resolve.',
          },
          {
            title: 'I – V – vi – IV',
            body: 'The pop progression. Hundreds of hits use exactly this. In C: C G Am F. The vi (Am) is the relative minor, which is why it fits so smoothly.',
            load: () => prog('pop', 0, 'folk', 92),
            overlay: 'chord',
            tryThis: 'Change the strum to Down-up eighths in the Practice tab and reload for a different feel.',
          },
          {
            title: 'Minor key: vi – IV – I – V',
            body: 'Start the same four chords from the minor and the mood flips. Am F C G is the same chords as C G Am F, rotated. Home is now Am.',
            load: () => prog('sad', 0, 'arpeggio', 88),
            overlay: 'chord',
            tryThis: 'House of the Rising Sun is this in arpeggios. Load it from the song library afterwards.',
          },
        ],
      },
      {
        id: 'sevenths',
        title: 'Seventh chords and voice leading',
        summary: 'Add a fourth note, then move between chords with the least motion.',
        minutes: 10,
        steps: [
          {
            title: 'Four kinds of seventh',
            body: 'Major 7 (dreamy), dominant 7 (bluesy, wants to resolve), minor 7 (smooth), half-diminished (tense). Same root, four moods. The 7th is the note that gives each its character.',
            load: () =>
              custom(
                [
                  { chord: { root: 0, quality: 'maj7' }, beats: 4 },
                  { chord: { root: 0, quality: '7' }, beats: 4 },
                  { chord: { root: 0, quality: 'min7' }, beats: 4 },
                  { chord: { root: 0, quality: 'm7b5' }, beats: 4 },
                ],
                'whole',
                70,
                'Cmaj7, C7, Cm7, Cm7♭5',
              ),
            overlay: 'chord',
            tryThis: 'Watch the fourth color appear on the neck and move down a fret each time.',
          },
          {
            title: 'Arpeggiate them',
            body: 'Play the seventh chords as arpeggios and the extra note becomes a melody note you can land on. Dominant 7 first.',
            load: () => arp(7, '7', 'pos5', 'updown', 0.5, 80),
            tryThis: 'G7 up and down. The F on top is the 7th; hear how it leans toward E (the third of C).',
          },
          {
            title: 'ii – V – I',
            body: 'The jazz engine: Dm7 to G7 to Cmaj7. Each chord shares notes with the next and the ones that move only move by a step. That is voice leading.',
            load: () => prog('jazz', 0, 'whole', 72),
            overlay: 'chord',
            tryThis: 'Watch the overlay between chords. Most dots stay; one or two slide over by a fret.',
          },
          {
            title: 'Jazz blues',
            body: 'A 12-bar blues with seventh chords and a ii–V turnaround. Learn this and you can sit in at any jam.',
            load: () => prog('jazz-blues', 5, 'rock', 100),
            overlay: 'chord',
            tryThis: 'Follow the section chips in the transport. Loop bars 9 and 10 (the ii–V) until the change is automatic.',
          },
        ],
      },
      {
        id: 'chord-tones',
        title: 'Chord-tone soloing',
        summary: 'Target the notes of the chord that is playing, not just the scale.',
        minutes: 8,
        steps: [
          {
            title: 'The scale is not enough',
            body: 'Every note of A minor "fits" over Am F C G, but some notes fit each chord better. Chord tones (root, third, fifth) are safe landing spots; the rest are passing tones. The overlay now shows the chord tones changing with the chords.',
            load: () => prog('sad', 0, 'arpeggio', 84),
            overlay: 'chord',
            tryThis: 'Watch the yellow roots jump as the chords change. Those are the notes to end phrases on.',
          },
          {
            title: 'Arpeggio over each chord',
            body: 'The simplest chord-tone solo: play the arpeggio of each chord as it goes by. Mechanical, but it trains your ear to hear the changes.',
            load: () => layer(prog('sad', 0, 'whole', 84), arp(9, 'min', 'pos6', 'updown', 0.5, 84), 'Am arpeggio over the progression'),
            overlay: 'chord',
            tryThis: 'Then build the F, C, and G arpeggios in the Practice tab and play each over its bar.',
          },
          {
            title: 'Target the third',
            body: 'The third tells the ear major from minor, so landing on it sounds intentional. Over C major that is E; over Am it is C. Here is a lick that lands on thirds.',
            load: () => lick('style-clapton'),
            overlay: 'key',
            tryThis: 'Find where the lick rests. Those long notes are chord tones.',
          },
        ],
      },
    ],
  },
  {
    id: 'technique',
    title: 'Technique',
    blurb: 'Picking, legato, bending, sweeping, and rhythm, each with a trainer.',
    lessons: [
      {
        id: 'alternate-picking',
        title: 'Alternate picking',
        summary: 'Down-up on every note, even across strings.',
        minutes: 10,
        steps: [
          {
            title: 'The spider',
            body: 'One finger per fret, every string. Strict down-up picking. Start slow enough that every note is clean and the same volume.',
            load: () => lick('warm-spider'),
            metronome: true,
            ramp: { stepBpm: 4, maxBpm: 140 },
            tryThis: 'The click is on and the tempo climbs 4 bpm per loop. Stop at the first sloppy loop.',
          },
          {
            title: 'Three notes per string',
            body: 'With three notes per string, the pick direction flips on every string change: down-up-down, up-down-up. That outside-inside motion is the whole skill.',
            load: () => scale({ root: 9, scaleId: 'minor', shape: 'nps3', position: 0, pattern: 'groups4', noteValue: 0.25, bpm: 70 }),
            metronome: true,
            ramp: { stepBpm: 4, maxBpm: 130 },
            tryThis: 'Say "down up" out loud for one loop. If you lose track, slow down.',
          },
          {
            title: 'Direction changes',
            body: 'Petrucci-style fragments that turn around every six notes. The turnarounds are where picking falls apart.',
            load: () => lick('style-petrucci'),
            metronome: true,
            ramp: { stepBpm: 3, maxBpm: 140 },
          },
          {
            title: 'String skipping',
            body: 'Skip a string and the pick has to travel. Keep the motion small and from the wrist.',
            load: () => lick('shred-string-skip'),
            metronome: true,
            ramp: { stepBpm: 3, maxBpm: 130 },
          },
        ],
      },
      {
        id: 'legato',
        title: 'Legato',
        summary: 'Hammer-ons, pull-offs, and getting every note as loud as a picked one.',
        minutes: 8,
        steps: [
          {
            title: 'Hammer and pull strength',
            body: 'Pick once, then hammer and pull three times per string. The hammer comes from a quick snap, not from pushing hard. The pull-off is a tiny downward flick that plucks the string.',
            load: () => lick('warm-hammer-pull'),
            metronome: true,
            tryThis: 'Watch the dashed bubbles in the tab strip: those notes are not picked. Make them match the picked ones in volume.',
          },
          {
            title: 'Trills',
            body: 'A fast hammer-pull between two notes. The blues trill on the G string, then landing on the root.',
            load: () => lick('blues-trill'),
          },
          {
            title: 'Sextuplets',
            body: 'Six notes per beat, one pick stroke per string. Keep the fretting hand relaxed; tension kills legato.',
            load: () => lick('shred-legato-sextuplets'),
            ramp: { stepBpm: 4, maxBpm: 150 },
          },
          {
            title: 'Tapping',
            body: 'Legato with the picking hand joining in. Tap with the middle finger, pull off sideways, hammer the index.',
            load: () => lick('shred-tapping'),
            tryThis: 'The T marks the tapped notes. Mute the lower strings with the picking-hand palm.',
          },
        ],
      },
      {
        id: 'bending',
        title: 'Bends and vibrato',
        summary: 'Bending in tune and shaking a note on purpose.',
        minutes: 8,
        steps: [
          {
            title: 'Bend intonation',
            body: 'Play the target note, then bend up to it from two frets below. The bend is right when both sound identical. Use three fingers behind the bend and push with the wrist.',
            load: () => lick('warm-bend-tuning'),
            tryThis: 'Watch the string push sideways on the neck and the pitch glide in the audio. Match it.',
          },
          {
            title: 'Vibrato control',
            body: 'Slow, even, wide. Vibrato is a series of small bends and releases; the rhythm matters more than the width. Rock the wrist, keep the finger locked.',
            load: () => lick('warm-vibrato'),
          },
          {
            title: 'The classic bend lick',
            body: 'Full-step bend at fret 8 on the high e, walk down, vibrato on the root. If you learn one lick, learn this one.',
            load: () => lick('blues-classic-bend'),
          },
          {
            title: 'Unison and oblique bends',
            body: 'Bend one string up to match a held note on another. Unison bends shout; oblique bends sing.',
            load: () => lick('rock-unison-bend'),
            tryThis: 'Then load the oblique bend lick and the pedal steel bend from the licks list.',
          },
        ],
      },
      {
        id: 'sweep',
        title: 'Sweep picking',
        summary: 'Arpeggios with one continuous pick stroke per direction.',
        minutes: 8,
        steps: [
          {
            title: 'The shape',
            body: 'A five-string Am sweep is the Am barre chord played one string at a time, plus a hammer-on at the top. The pick falls through the strings like a slow strum; each finger lifts as soon as its note is done so the notes do not ring together.',
            load: () => arp(9, 'min', 'sweep5', 'updown', 0.5, 60),
            tryThis: 'Slow. Down through five strings, hammer, then up through five. Watch the finger numbers.',
          },
          {
            title: 'Repeat it',
            body: 'Four times without a gap. The turnaround at the top and bottom is the hard part.',
            load: () => arp(9, 'min', 'sweep5', 'sweep', 1 / 6, 60),
            ramp: { stepBpm: 4, maxBpm: 110 },
          },
          {
            title: 'Major and six strings',
            body: 'The C major five-string shape, then the E minor six-string shape. Same motion, bigger stretch.',
            load: () => arp(4, 'min', 'sweep6', 'sweep', 1 / 6, 60),
            ramp: { stepBpm: 4, maxBpm: 100 },
          },
          {
            title: 'Sweeping through a progression',
            body: 'Sweep the arpeggio of each chord as the progression plays. This is how Yngwie and Jason Becker outline changes.',
            load: () => lick('shred-sweep-am'),
          },
        ],
      },
      {
        id: 'rhythm',
        title: 'Rhythm and strumming',
        summary: 'Keeping the arm moving, accents, and patterns you will use forever.',
        minutes: 8,
        steps: [
          {
            title: 'Downstrokes on the beat',
            body: 'Four downstrokes per bar with the click. The arm keeps moving even when it does not hit the strings; that constant motion is what keeps time.',
            load: () => prog('folk', 7, 'down4', 90),
            metronome: true,
            tryThis: 'Accent beats 2 and 4 a little. That is where the snare goes.',
          },
          {
            title: 'The campfire pattern',
            body: 'Down, down-up, up-down-up. Miss the strings on beat 3 but keep the arm going down. Every strummer knows this one.',
            load: () => prog('pop', 7, 'folk', 90),
            metronome: true,
            tryThis: 'Watch the tab strip: the gap on beat 3 is a downward arm motion that does not touch the strings.',
          },
          {
            title: 'Offbeats',
            body: 'Reggae lives on the "and" of every beat: short upstrokes, muted right after. Feel the beat in your foot and play between the taps.',
            load: () => prog('pop', 2, 'reggae', 84),
            metronome: true,
          },
          {
            title: 'Fingerpicking',
            body: 'Travis picking: the thumb alternates bass notes on the beat while the fingers pinch the top strings in between. Thumb is the metronome.',
            load: () => prog('fifties', 0, 'travis', 84),
            tryThis: 'Then load House of the Rising Sun from the library for the arpeggio version.',
          },
        ],
      },
    ],
  },
  {
    id: 'styles',
    title: 'Styles',
    blurb: 'The vocabulary of blues, rock, and shred, with the songs in the library as homework.',
    lessons: [
      {
        id: 'blues',
        title: 'Blues',
        summary: 'The 12-bar form, the box, and the licks everyone quotes.',
        minutes: 10,
        steps: [
          {
            title: 'The 12-bar form',
            body: 'Twelve bars: four of the I, two of the IV, two of the I, then V, IV, I, V. In A: A7 D7 E7. Count it until you can feel bar 9 coming.',
            load: () => prog('blues', 9, 'rock', 96),
            overlay: 'chord',
            tryThis: 'Follow the section chips. Say the chord names out loud a beat before they arrive.',
          },
          {
            title: 'The blues box',
            body: 'A minor pentatonic box 1 plus the blue note. Over a major-key blues the minor third rubs against the major chords, and that rub is the sound.',
            load: () => scale({ root: 9, scaleId: 'blues', shape: 'box', position: 0, noteValue: 0.5, bpm: 90 }),
            overlay: 'key',
          },
          {
            title: 'Three essential licks',
            body: 'The classic bend, the B.B. box, and the double stops. Learn them in order; each one is a phrase you will hear in a thousand solos.',
            load: () => lick('blues-bb-box'),
            tryThis: 'Load the other two from the Practice tab under Blues.',
          },
          {
            title: 'The turnaround',
            body: 'Bars 11 and 12: the walk-down that sets up the next chorus. Every blues player has three of these.',
            load: () => lick('blues-turnaround'),
          },
        ],
      },
      {
        id: 'rock',
        title: 'Rock',
        summary: 'Power chords, pentatonic runs, and the bends that define the genre.',
        minutes: 10,
        steps: [
          {
            title: 'Power chords',
            body: 'Root and fifth, palm muted on the chugs, open on the accents. Downstrokes only for the tight sound.',
            load: () => lick('metal-power-chords'),
            metronome: true,
          },
          {
            title: 'Pentatonic runs',
            body: 'Groups of four down the box. Then the repeating pull-off lick that Page and Angus built careers on.',
            load: () => lick('rock-page-pulloff'),
            ramp: { stepBpm: 4, maxBpm: 150 },
          },
          {
            title: 'Bends that sing',
            body: 'Gilmour-style slow bends with wide vibrato. Patience and intonation over speed.',
            load: () => lick('style-gilmour'),
          },
          {
            title: 'Homework',
            body: 'Enter Sandman for the riff, Last Nite for the lead line, Reptilia for interlocking guitars. All three are in the song library with every part switchable.',
            load: () => song('house-of-the-rising-sun'),
            tryThis: 'Open Songs and load one. Use the Part chips to switch between guitars.',
          },
        ],
      },
      {
        id: 'shred',
        title: 'Shred',
        summary: 'Speed built on everything above: scales, arpeggios, legato, and the trainer.',
        minutes: 10,
        steps: [
          {
            title: '3-note-per-string runs',
            body: 'The A minor run through position 1, alternate picked. Shred is scales played very evenly; the evenness comes first, the speed follows.',
            load: () => lick('shred-3nps-run'),
            metronome: true,
            ramp: { stepBpm: 4, maxBpm: 160 },
          },
          {
            title: 'Pedal point',
            body: 'Return to the same high note between every scale tone. Neoclassical and instantly impressive.',
            load: () => lick('shred-pedal-point'),
            ramp: { stepBpm: 4, maxBpm: 150 },
          },
          {
            title: 'Harmonic minor',
            body: 'Raise the 7th of the minor scale and you get the exotic gap that Yngwie and Randy Rhoads lived on.',
            load: () => lick('metal-harmonic-minor'),
            overlay: 'key',
          },
          {
            title: 'Put it together',
            body: 'Sweep, legato, picking, in one phrase. Then load Polyphia\'s Bloodbath from the library and pick a bar.',
            load: () => lick('shred-sweep-am'),
            ramp: { stepBpm: 3, maxBpm: 130 },
          },
        ],
      },
    ],
  },
]

export function findLesson(id: string): { course: Course; lesson: LearnLesson } | null {
  for (const course of COURSES) {
    const lesson = course.lessons.find((l) => l.id === id)
    if (lesson) return { course, lesson }
  }
  return null
}

/** One lit note for the drill, long enough to read. */
export function drillSong(string: number, fret: number): Song {
  return {
    id: `drill-${string}-${fret}-${Date.now()}`,
    title: 'Name this note',
    composer: 'Drill',
    tempo: 60,
    beatsPerBar: 4,
    tuning: STANDARD_TUNING,
    notes: [{ time: 0, duration: 4, string, fret }],
    blurb: '',
  }
}

export const NOTE_CHOICES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
export { buildChordSong }
