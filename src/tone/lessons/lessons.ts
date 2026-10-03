import { makePedal, type PedalInstance } from '../audio/pedals'

export interface Preset {
  id: string
  name: string
  style: string
  riff: string
  blurb: string
  build: () => PedalInstance[]
}

export const PRESETS: Preset[] = [
  {
    id: 'clean-sparkle',
    name: 'Clean sparkle',
    style: 'Clean',
    riff: 'clean-arp',
    blurb: 'Compressor for evenness, a touch of chorus, slapback-free long delay, and a plate-ish reverb into a clean American amp.',
    build: () => [
      makePedal('compressor', { threshold: -28, ratio: 3, attack: 20, release: 250, makeup: 6 }),
      makePedal('chorus', { rate: 0.6, depth: 4, mix: 0.35 }),
      makePedal('delay', { time: 420, feedback: 0.3, tone: 4000, mix: 0.22 }),
      makePedal('reverb', { decay: 2.4, predelay: 25, damping: 6000, mix: 0.28 }),
      makePedal('amp', { model: 0, gain: 2.5, bass: 5, mid: 4.5, treble: 6.5, presence: 5, master: 6 }),
      makePedal('cab', { model: 0, mic: 0.4 }),
    ],
  },
  {
    id: 'blues-crunch',
    name: 'Blues crunch',
    style: 'Blues',
    riff: 'blues-lick',
    blurb: 'Low-gain overdrive into a British amp on the edge of breakup, with a little spring-style reverb.',
    build: () => [
      makePedal('overdrive', { drive: 3, tone: 3200, level: 7 }),
      makePedal('reverb', { decay: 1.4, predelay: 15, damping: 4500, mix: 0.2 }),
      makePedal('amp', { model: 1, gain: 4.5, bass: 5, mid: 6, treble: 5.5, presence: 5, master: 6 }),
      makePedal('cab', { model: 1, mic: 0.3 }),
    ],
  },
  {
    id: 'classic-rock-lead',
    name: 'Classic rock lead',
    style: 'Rock',
    riff: 'blues-lick',
    blurb: 'Boost pushing a Plexi-style amp hard, a dark delay for size, mids up so it cuts.',
    build: () => [
      makePedal('boost', { gain: 10 }),
      makePedal('overdrive', { drive: 5, tone: 2800, level: 6 }),
      makePedal('delay', { time: 330, feedback: 0.25, tone: 2500, mix: 0.2 }),
      makePedal('reverb', { decay: 1.2, predelay: 20, damping: 4000, mix: 0.12 }),
      makePedal('amp', { model: 2, gain: 6.5, bass: 4.5, mid: 7, treble: 6, presence: 6, master: 6 }),
      makePedal('cab', { model: 2, mic: 0.25 }),
    ],
  },
  {
    id: 'eighties-chorus',
    name: '80s chorus clean',
    style: 'Clean',
    riff: 'clean-arp',
    blurb: 'Deep chorus, bright compressed clean, long hall reverb. The Police, early Metallica clean parts.',
    build: () => [
      makePedal('compressor', { threshold: -30, ratio: 4, attack: 8, release: 200, makeup: 8 }),
      makePedal('chorus', { rate: 1.1, depth: 7, mix: 0.6 }),
      makePedal('delay', { time: 500, feedback: 0.4, tone: 5000, mix: 0.25 }),
      makePedal('reverb', { decay: 4, predelay: 30, damping: 7000, mix: 0.35 }),
      makePedal('amp', { model: 0, gain: 2, bass: 5, mid: 4, treble: 7, presence: 6, master: 6 }),
      makePedal('cab', { model: 1, mic: 0.5 }),
    ],
  },
  {
    id: 'modern-metal',
    name: 'Modern metal rhythm',
    style: 'Metal',
    riff: 'gallop',
    blurb: 'Overdrive as a tight boost (low drive, high level) into a high-gain amp, gate to keep it clean, 4x12 closed back.',
    build: () => [
      makePedal('overdrive', { drive: 1, tone: 4000, level: 9 }),
      makePedal('gate', { threshold: -42, release: 80 }),
      makePedal('eq', { low: -2, mid: 1, midFreq: 900, high: 1 }),
      makePedal('amp', { model: 3, gain: 7, bass: 5.5, mid: 4.5, treble: 6, presence: 6.5, master: 5 }),
      makePedal('cab', { model: 2, mic: 0.2 }),
    ],
  },
  {
    id: 'ambient',
    name: 'Ambient swells',
    style: 'Ambient',
    riff: 'melody',
    blurb: 'Compression for sustain, long dotted delay feeding a huge reverb, slow tremolo for movement.',
    build: () => [
      makePedal('compressor', { threshold: -35, ratio: 6, attack: 5, release: 400, makeup: 10 }),
      makePedal('tremolo', { rate: 1.2, depth: 0.4, shape: 0 }),
      makePedal('delay', { time: 620, feedback: 0.6, tone: 3000, mix: 0.5 }),
      makePedal('reverb', { decay: 7, predelay: 60, damping: 4000, mix: 0.6 }),
      makePedal('amp', { model: 0, gain: 2, bass: 5, mid: 4, treble: 5.5, presence: 4, master: 5 }),
      makePedal('cab', { model: 1, mic: 0.5 }),
    ],
  },
  {
    id: 'country',
    name: 'Country twang',
    style: 'Country',
    riff: 'blues-lick',
    blurb: 'Squashy compressor with a slow attack for the pick snap, 110 ms slapback, bright clean amp.',
    build: () => [
      makePedal('compressor', { threshold: -26, ratio: 6, attack: 30, release: 150, makeup: 8 }),
      makePedal('delay', { time: 110, feedback: 0.08, tone: 5000, mix: 0.35 }),
      makePedal('reverb', { decay: 1.2, predelay: 10, damping: 6000, mix: 0.15 }),
      makePedal('amp', { model: 0, gain: 3, bass: 4.5, mid: 4, treble: 7.5, presence: 6, master: 6 }),
      makePedal('cab', { model: 0, mic: 0.2 }),
    ],
  },
  {
    id: 'edge',
    name: 'Dotted-eighth delay rhythm',
    style: 'Rock',
    riff: 'clean-arp',
    blurb: 'The U2 trick: delay time equals a dotted eighth at the riff tempo (96 bpm = 469 ms) so repeats land between the notes.',
    build: () => [
      makePedal('compressor', { threshold: -28, ratio: 3, attack: 15, release: 200, makeup: 5 }),
      makePedal('overdrive', { drive: 1.5, tone: 3500, level: 6 }),
      makePedal('delay', { time: 469, feedback: 0.45, tone: 3500, mix: 0.45 }),
      makePedal('reverb', { decay: 2, predelay: 20, damping: 5000, mix: 0.2 }),
      makePedal('amp', { model: 1, gain: 3, bass: 5, mid: 5, treble: 6, presence: 5, master: 6 }),
      makePedal('cab', { model: 1, mic: 0.35 }),
    ],
  },
  {
    id: 'fuzz-face',
    name: 'Woolly fuzz',
    style: 'Rock',
    riff: 'power-chug',
    blurb: 'Fuzz first in line, nothing else but amp and cab. Roll the bias to hear it splutter.',
    build: () => [
      makePedal('fuzz', { fuzz: 7, bias: 0.2, level: 5 }),
      makePedal('amp', { model: 1, gain: 3.5, bass: 5, mid: 6, treble: 5, presence: 4, master: 6 }),
      makePedal('cab', { model: 1, mic: 0.4 }),
    ],
  },
  {
    id: 'funk',
    name: 'Funk rhythm',
    style: 'Funk',
    riff: 'funk',
    blurb: 'Auto-wah and compressor into a clean amp; a touch of phaser for the 70s.',
    build: () => [
      makePedal('compressor', { threshold: -28, ratio: 5, attack: 12, release: 120, makeup: 6 }),
      makePedal('wah', { mode: 1, position: 0.5, rate: 2.5, q: 7 }),
      makePedal('phaser', { rate: 0.5, depth: 0.6, feedback: 0.3 }),
      makePedal('amp', { model: 0, gain: 2.5, bass: 4.5, mid: 5, treble: 6.5, presence: 5, master: 6 }),
      makePedal('cab', { model: 0, mic: 0.35 }),
    ],
  },
]

export interface LessonStep {
  title: string
  body: string
  /** Chain to load when the step is opened. */
  chain?: () => PedalInstance[]
  /** Riff to play for this step. */
  riff?: string
  /** What to turn, in one sentence. */
  tryThis?: string
  /** Pedal type and param to highlight in the inspector. */
  focus?: { type: string; param?: string }
}

export interface Lesson {
  id: string
  title: string
  summary: string
  minutes: number
  steps: LessonStep[]
}

const ampCab = (model = 1, gain = 3) => [makePedal('amp', { model, gain }), makePedal('cab', { model: 1, mic: 0.3 })]

export const LESSONS: Lesson[] = [
  {
    id: 'signal-chain',
    title: '1. The signal chain',
    summary: 'What order pedals go in and why it matters.',
    minutes: 8,
    steps: [
      {
        title: 'Guitar, amp, speaker',
        body: 'Start with nothing in between. The amp adds gain and shapes tone; the speaker cabinet rolls off the fizz above 5 kHz. Everything else is a way of changing what the amp receives.',
        chain: () => ampCab(1, 3),
        riff: 'power-chug',
        tryThis: 'Switch the cabinet off with its power button and listen to the fizz come back.',
        focus: { type: 'cab' },
      },
      {
        title: 'Drive goes early',
        body: 'Drive pedals clip the signal. Put them near the front so the clean, dynamic guitar signal is what gets clipped. Pedals placed after a drive hear a distorted signal.',
        chain: () => [makePedal('overdrive'), ...ampCab(1, 3)],
        riff: 'power-chug',
        tryThis: 'Drag the overdrive after the amp and hear it clip the already-shaped amp sound instead.',
        focus: { type: 'overdrive', param: 'drive' },
      },
      {
        title: 'Modulation after drive',
        body: 'Chorus, phaser, and tremolo multiply or delay the signal slightly. Done after distortion they sound lush; done before it, the distortion squares off the wobble and it sounds seasick.',
        chain: () => [makePedal('overdrive', { drive: 6 }), makePedal('chorus', { mix: 0.6, depth: 7 }), ...ampCab(1, 3)],
        riff: 'clean-arp',
        tryThis: 'Move the chorus in front of the overdrive and compare.',
        focus: { type: 'chorus' },
      },
      {
        title: 'Time effects last',
        body: 'Delay and reverb create copies of the sound. You want copies of the finished tone, not a finished tone made of copies. Reverb goes last so the whole thing sits in one room.',
        chain: () => [makePedal('overdrive', { drive: 4 }), makePedal('delay', { feedback: 0.5, mix: 0.4 }), makePedal('reverb'), ...ampCab(1, 3)],
        riff: 'blues-lick',
        tryThis: 'Put the delay before the overdrive. Every repeat now gets distorted on its own and smears together.',
        focus: { type: 'delay', param: 'feedback' },
      },
      {
        title: 'The standard order',
        body: 'Tuner and compressor, then wah and filters, then drives, then EQ and gate, then modulation, then delay, then reverb, then the amp and cabinet. Not a law. Fuzz likes to be first; some players run EQ before drive to shape what clips.',
        chain: () => PRESETS.find((p) => p.id === 'classic-rock-lead')!.build(),
        riff: 'blues-lick',
        tryThis: 'Read the board left to right. Then reorder one pedal at a time and notice which moves matter and which barely do.',
      },
    ],
  },
  {
    id: 'gain-staging',
    title: '2. Gain staging',
    summary: 'Level and drive are different knobs. Stack them on purpose.',
    minutes: 8,
    steps: [
      {
        title: 'Drive knob versus level knob',
        body: 'Drive sets how hard the pedal clips: the shape of the wave. Level sets how loud it leaves the pedal: how hard it hits the next stage. Watch the transfer curve as you move Drive, and the output waveform as you move Level.',
        chain: () => [makePedal('overdrive', { drive: 2, level: 5 }), ...ampCab(0, 2)],
        riff: 'blues-lick',
        tryThis: 'Drive to 8 with Level at 3, then Drive at 2 with Level at 9. Same loudness, different sound.',
        focus: { type: 'overdrive', param: 'drive' },
      },
      {
        title: 'Push the amp',
        body: 'A clean boost does nothing to the shape; it makes the amp clip harder. This is how a "clean" boost can sound like more distortion. Players run a boost into an amp set on the edge of breakup for solos.',
        chain: () => [makePedal('boost', { gain: 0 }), ...ampCab(2, 4)],
        riff: 'blues-lick',
        tryThis: 'Raise the boost from 0 to 18 dB and watch the amp transfer curve stay the same while the sound saturates.',
        focus: { type: 'boost', param: 'gain' },
      },
      {
        title: 'Stacking drives',
        body: 'Low-gain pedal into higher-gain pedal: the first adds compression and mids, the second does the heavy clipping. Classic combination: Tube Screamer with low drive and high level into a cranked amp or a distortion pedal.',
        chain: () => [makePedal('overdrive', { drive: 1.5, level: 9, tone: 4000 }), makePedal('distortion', { drive: 5, level: 5 }), ...ampCab(1, 4)],
        riff: 'power-chug',
        tryThis: 'Bypass the overdrive with its power button. The distortion alone is looser and boomier.',
        focus: { type: 'overdrive', param: 'level' },
      },
      {
        title: 'Where noise comes from',
        body: 'Every gain stage amplifies the noise of the stage before it. High gain means a gate is part of the tone. Set the threshold just above the hum and give it a release that does not chop sustained notes.',
        chain: () => PRESETS.find((p) => p.id === 'modern-metal')!.build(),
        riff: 'gallop',
        tryThis: 'Raise the gate threshold until the palm mutes start getting cut, then back off.',
        focus: { type: 'gate', param: 'threshold' },
      },
    ],
  },
  {
    id: 'drive-types',
    title: '3. Overdrive, distortion, fuzz',
    summary: 'Three ways to clip a wave and what each does to harmonics.',
    minutes: 7,
    steps: [
      {
        title: 'Soft clipping',
        body: 'Overdrive rounds the peaks. Look at the transfer curve: a gentle S. Low notes keep their dynamics, and digging in with the pick gets you more grit. The harmonics added are mostly the gentle odd ones.',
        chain: () => [makePedal('overdrive', { drive: 5 }), ...ampCab(0, 2)],
        riff: 'blues-lick',
        tryThis: 'Watch the output waveform. Peaks are rounded, not flattened.',
        focus: { type: 'overdrive', param: 'drive' },
      },
      {
        title: 'Hard clipping',
        body: 'Distortion slams into a ceiling: the curve has corners. Flat tops mean strong odd harmonics all the way up, which is the buzz and the sustain. Dynamics are mostly gone: soft and hard picking sound alike.',
        chain: () => [makePedal('distortion', { drive: 6 }), ...ampCab(0, 2)],
        riff: 'power-chug',
        tryThis: 'Compare the spectrum to the overdrive step: more energy high up.',
        focus: { type: 'distortion', param: 'drive' },
      },
      {
        title: 'Fuzz and asymmetry',
        body: 'Fuzz gain is so high the wave becomes a square. The bias knob offsets the clipping so the top and bottom halves differ, which adds even harmonics (an octave-up shimmer) and the spluttering decay as notes die.',
        chain: () => [makePedal('fuzz', { fuzz: 8, bias: 0 }), ...ampCab(1, 3)],
        riff: 'melody',
        tryThis: 'Sweep Bias from 0 to 0.5 and listen to the note tails gate and splutter.',
        focus: { type: 'fuzz', param: 'bias' },
      },
      {
        title: 'The tone knob',
        body: 'Clipping creates harmonics above the note, and the top of that range is harsh. Every drive pedal has a low-pass filter after the clipper. The tone knob is that filter. The cabinet does the same job one more time.',
        chain: () => [makePedal('distortion', { drive: 7, tone: 8000 }), ...ampCab(1, 3)],
        riff: 'power-chug',
        tryThis: 'Drop Tone from 8 kHz to 1.5 kHz while watching the spectrum shelf collapse.',
        focus: { type: 'distortion', param: 'tone' },
      },
    ],
  },
  {
    id: 'eq',
    title: '4. EQ and the mids',
    summary: 'Where the guitar lives in the spectrum and why scooping the mids makes you disappear.',
    minutes: 7,
    steps: [
      {
        title: 'The guitar range',
        body: 'Low E is 82 Hz; the highest fretted note is about 1.3 kHz; harmonics and pick noise reach to 5 kHz. Below 80 Hz there is only mud shared with the bass. Above 6 kHz is fizz.',
        chain: () => [makePedal('eq'), ...ampCab(1, 4)],
        riff: 'clean-arp',
        tryThis: 'Boost the low shelf to +12 and hear the mud, then cut it to -12 and hear it thin out.',
        focus: { type: 'eq', param: 'low' },
      },
      {
        title: 'Mud at 200 to 400 Hz',
        body: 'Boomy, woolly, cardboard: that is this band. Set the mid frequency to 300 Hz and cut a few dB; the tone cleans up without losing body.',
        chain: () => [makePedal('eq', { midFreq: 300, mid: 0 }), ...ampCab(1, 5)],
        riff: 'power-chug',
        tryThis: 'Cut Mid to -8 at 300 Hz, then boost it to +8. Decide which one you would want in a band.',
        focus: { type: 'eq', param: 'mid' },
      },
      {
        title: 'Presence at 2 to 3 kHz',
        body: 'This is where a guitar cuts through drums and vocals. A small boost here makes you louder in the mix without touching the volume. Too much and it is ice-picky.',
        chain: () => [makePedal('eq', { midFreq: 2500, mid: 0 }), ...ampCab(1, 5)],
        riff: 'blues-lick',
        tryThis: 'Boost Mid +6 at 2.5 kHz and watch the spectrum peak move.',
        focus: { type: 'eq', param: 'midFreq' },
      },
      {
        title: 'The scoop trap',
        body: 'Scooped mids sound huge alone: all lows and highs. In a band the bass takes the lows, the cymbals take the highs, and the guitar vanishes. Metal rhythm tones that work live usually have more mids than the player expects.',
        chain: () => [makePedal('eq', { low: 6, mid: -10, midFreq: 600, high: 6 }), makePedal('distortion', { drive: 7 }), ...ampCab(3, 6)],
        riff: 'gallop',
        tryThis: 'Bring Mid from -10 back to +2. Less impressive alone, far more audible next to a bass.',
        focus: { type: 'eq', param: 'mid' },
      },
    ],
  },
  {
    id: 'compression',
    title: '5. Compression',
    summary: 'Even notes, more sustain, and the attack knob that defines a style.',
    minutes: 6,
    steps: [
      {
        title: 'What it does',
        body: 'Above the threshold, loud notes get turned down by the ratio. Makeup gain brings everything back up, so quiet notes end up louder. The result reads as sustain and consistency.',
        chain: () => [makePedal('compressor', { threshold: -30, ratio: 6, makeup: 8 }), ...ampCab(0, 2)],
        riff: 'melody',
        tryThis: 'Bypass it and listen to how much faster the notes fade.',
        focus: { type: 'compressor', param: 'threshold' },
      },
      {
        title: 'Attack: snap or smooth',
        body: 'A slow attack (30 ms+) lets the pick transient through before clamping down: the country and funk snap. A fast attack (under 5 ms) rounds off the pick and smooths everything: the lead-guitar sustain feel.',
        chain: () => [makePedal('compressor', { threshold: -28, ratio: 8, attack: 40, release: 150, makeup: 8 }), ...ampCab(0, 2)],
        riff: 'funk',
        tryThis: 'Move Attack from 40 ms to 2 ms and listen to the clicks disappear.',
        focus: { type: 'compressor', param: 'attack' },
      },
      {
        title: 'Before or after drive',
        body: 'Compressor first: the drive gets a steady level, so every note distorts the same amount. Compressor after drive: it levels the already-distorted signal and raises the noise floor between notes. First is the usual answer.',
        chain: () => [makePedal('compressor', { threshold: -28, ratio: 4, makeup: 6 }), makePedal('overdrive', { drive: 4 }), ...ampCab(1, 3)],
        riff: 'blues-lick',
        tryThis: 'Swap the order and listen for hiss creeping in between notes.',
        focus: { type: 'compressor' },
      },
    ],
  },
  {
    id: 'modulation',
    title: '6. Chorus, phaser, tremolo',
    summary: 'Three kinds of movement and how to tell them apart.',
    minutes: 6,
    steps: [
      {
        title: 'Chorus is a wobbling delay',
        body: 'About 20 ms of delay whose length drifts with an LFO, mixed with the dry signal. The pitch of the copy wavers, like a second guitarist almost in tune. More depth is more detune; more rate is faster wobble.',
        chain: () => [makePedal('chorus', { rate: 0.8, depth: 5, mix: 0.5 }), ...ampCab(0, 2)],
        riff: 'clean-arp',
        tryThis: 'Depth to 10 and rate to 4 Hz for seasick; depth 3 and rate 0.3 for subtle width.',
        focus: { type: 'chorus', param: 'depth' },
      },
      {
        title: 'Phaser is moving notches',
        body: 'All-pass filters shift phase; mixed with the dry signal they cancel at certain frequencies, creating notches that sweep. Feedback sharpens the notches into the jet-plane swoosh.',
        chain: () => [makePedal('phaser', { rate: 0.4, depth: 0.8, feedback: 0.5 }), ...ampCab(1, 4)],
        riff: 'funk',
        tryThis: 'Watch the spectrum: dips crawl across it. Feedback to 0.85 makes them deep.',
        focus: { type: 'phaser', param: 'feedback' },
      },
      {
        title: 'Tremolo is volume, not pitch',
        body: 'The oldest effect, built into 1950s amps. Volume pulses on a cycle. Sine is the smooth throb; square is the chopped helicopter. Match the rate to the song tempo and it becomes rhythm.',
        chain: () => [makePedal('tremolo', { rate: 4.8, depth: 0.8, shape: 0 }), makePedal('reverb', { mix: 0.3 }), ...ampCab(0, 2)],
        riff: 'melody',
        tryThis: 'Switch Shape to Square, then set Rate to 6 Hz, which is eighth notes at 180 bpm.',
        focus: { type: 'tremolo', param: 'shape' },
      },
    ],
  },
  {
    id: 'delay',
    title: '7. Delay',
    summary: 'Slapback, tempo-matched repeats, and why dark repeats sit better.',
    minutes: 7,
    steps: [
      {
        title: 'Slapback',
        body: 'One quick repeat at 80 to 140 ms with almost no feedback. Rockabilly, country, early rock and roll. It thickens without being heard as an echo.',
        chain: () => [makePedal('delay', { time: 110, feedback: 0.05, mix: 0.4, tone: 5000 }), ...ampCab(0, 2)],
        riff: 'blues-lick',
        tryThis: 'Push Time past 200 ms and notice when it stops being thickness and becomes an echo.',
        focus: { type: 'delay', param: 'time' },
      },
      {
        title: 'Tempo math',
        body: 'Quarter note in ms = 60000 / bpm. Dotted eighth = quarter × 0.75. At 96 bpm: quarter 625 ms, dotted eighth 469 ms. Dotted-eighth repeats land between your notes and create the galloping U2 pattern.',
        chain: () => PRESETS.find((p) => p.id === 'edge')!.build(),
        riff: 'clean-arp',
        tryThis: 'Set Time to 625 (quarter) and then 312 (eighth) and hear the rhythm change character.',
        focus: { type: 'delay', param: 'time' },
      },
      {
        title: 'Feedback and runaway',
        body: 'Feedback sends the repeat back into the delay. Low values give a couple of repeats; high values give long trails; above 1.0 the repeats grow forever. We stop at 0.9.',
        chain: () => [makePedal('delay', { time: 380, feedback: 0.3, mix: 0.35 }), ...ampCab(0, 2)],
        riff: 'melody',
        tryThis: 'Feedback to 0.9 and listen to the trail build. Then pull the mix down and hear it under the note.',
        focus: { type: 'delay', param: 'feedback' },
      },
      {
        title: 'Dark repeats',
        body: 'Tape and analog delays lose highs on every pass. That is why they sit behind the dry note instead of fighting it. Repeat tone around 2 to 3 kHz gets you there; 8 kHz is the pristine digital sound.',
        chain: () => [makePedal('overdrive', { drive: 4 }), makePedal('delay', { time: 400, feedback: 0.5, mix: 0.4, tone: 8000 }), ...ampCab(1, 3)],
        riff: 'blues-lick',
        tryThis: 'Repeat tone from 8000 down to 2000 while the lick plays.',
        focus: { type: 'delay', param: 'tone' },
      },
    ],
  },
  {
    id: 'reverb',
    title: '8. Reverb',
    summary: 'Room size, pre-delay, and keeping the note clear inside the wash.',
    minutes: 5,
    steps: [
      {
        title: 'Decay is the room',
        body: 'Short decay (under 1 s) is a small room or a spring. 2 to 3 s is a hall. 6 s and up is a cathedral or an ambient pad. Longer is not better; it is just further away.',
        chain: () => [makePedal('reverb', { decay: 1, mix: 0.3 }), ...ampCab(0, 2)],
        riff: 'melody',
        tryThis: 'Decay from 0.5 s to 8 s. Notice when the notes start blurring into each other.',
        focus: { type: 'reverb', param: 'decay' },
      },
      {
        title: 'Pre-delay keeps it clear',
        body: 'The gap before the reverb starts. Even 30 to 60 ms lets the attack of the note through before the wash arrives, so you can use a lot of reverb and still hear what you played.',
        chain: () => [makePedal('reverb', { decay: 4, predelay: 0, mix: 0.5 }), ...ampCab(0, 2)],
        riff: 'blues-lick',
        tryThis: 'Pre-delay from 0 to 80 ms. The notes step forward out of the wash.',
        focus: { type: 'reverb', param: 'predelay' },
      },
      {
        title: 'Damping',
        body: 'Real rooms absorb highs faster than lows. Lower damping frequency is a softer, warmer room; high damping is tile and glass. Dark reverb hides behind the guitar; bright reverb sits on top.',
        chain: () => [makePedal('reverb', { decay: 3, predelay: 30, damping: 10000, mix: 0.4 }), ...ampCab(0, 2)],
        riff: 'clean-arp',
        tryThis: 'Damping from 10 kHz down to 1.5 kHz.',
        focus: { type: 'reverb', param: 'damping' },
      },
    ],
  },
  {
    id: 'amp-cab',
    title: '9. Amp and cabinet',
    summary: 'Preamp curves, the tone stack, and why the speaker is half the tone.',
    minutes: 6,
    steps: [
      {
        title: 'Four amp characters',
        body: 'American clean barely bends until pushed hard. British crunch breaks up early with a mid bump. Plexi lead is asymmetric and sings. High gain cascades stages and hits a hard ceiling. Same riff, four curves.',
        chain: () => ampCab(0, 5),
        riff: 'power-chug',
        tryThis: 'Step Model through all four with Gain at 5 and watch the transfer curve change shape.',
        focus: { type: 'amp', param: 'model' },
      },
      {
        title: 'The tone stack',
        body: 'Bass, Middle, Treble on an amp are interactive and sit after the preamp clipping, so they shape the distortion rather than what gets distorted. Presence adds sparkle above the treble control.',
        chain: () => ampCab(2, 6),
        riff: 'blues-lick',
        tryThis: 'Middle to 2, then to 8. Then Presence up. Watch the spectrum move with each.',
        focus: { type: 'amp', param: 'mid' },
      },
      {
        title: 'No cab, no tone',
        body: 'A guitar speaker is a steep low-pass around 5 kHz with a bump near 100 Hz and another near 2.5 kHz. Without it, any distortion sounds like a swarm of bees. Amp sims that sound bad are usually missing this.',
        chain: () => [makePedal('distortion', { drive: 7 }), ...ampCab(3, 6)],
        riff: 'gallop',
        tryThis: 'Bypass the cabinet. Then bring it back and move Mic position from center to edge.',
        focus: { type: 'cab', param: 'mic' },
      },
    ],
  },
  {
    id: 'recipes',
    title: '10. Build the classics',
    summary: 'Load each recipe, then take one pedal away to hear what it was doing.',
    minutes: 10,
    steps: PRESETS.map((p) => ({
      title: p.name,
      body: p.blurb,
      chain: p.build,
      riff: p.riff,
      tryThis: 'Bypass each pedal in turn. The ones you miss are the recipe; the rest is seasoning.',
    })),
  },
]
