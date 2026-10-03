# Fretlight

Learn songs on a 3D guitar neck. Pick a song, press play, and watch the frets light up where your fingers go, in time with the music. Slow it down, scrub, and loop the bars you are stuck on.

![Fretlight playing Moonlight Sonata](docs/screenshot.png)

The audio is synthesized in the browser with a plucked-string model (Karplus-Strong), so there are no recordings to license and nothing to download.

## What it does

- **3D fretboard** built procedurally with correct fret spacing. Four camera presets: lap view (as if the guitar is on your knee), neck close-up, teacher view, and top down. Drag to orbit, scroll to zoom.
- **Fret lights** colored by finger: blue open, green index, yellow middle, orange ring, purple pinky. Upcoming notes fade in up to two beats early.
- **Scrolling tab strip** under the 3D view with fret numbers approaching a playhead.
- **Transport**: play/pause, speeds from 0.25x to 1.5x, bar-snapped A/B loop, scrub bar, keyboard shortcuts (Space, arrows, A, B, L).
- **Song library** of public domain pieces: Ode to Joy, House of the Rising Sun, Greensleeves, Für Elise, Moonlight Sonata.
- **Practice tab** with a scale builder: any root, 13 scales and modes, 3-note-per-string positions, pentatonic boxes and CAGED-style windows, one-string runs, and picking patterns (up/down, groups of 3 and 4, thirds, string skipping) at any note value and tempo. Exercises loop by default.
- **Speed trainer**: add a few bpm every time the loop wraps until a ceiling, plus a metronome click and a one-bar count-in.
- **Licks and warm-ups** written in the app's tab notation: blues, rock, shred, and warm-up sets in A around the 5th position.
- **Articulations** in the model, the synth, the 3D neck, and the tab strip: bends (the string visibly pushes sideways, pitch glides), slides (the marker travels along the string), vibrato (the string shimmers), hammer-ons and pull-offs (linked markers, no pick attack), tapping, palm mute, and let ring. Imported Guitar Pro files bring their own articulations in.
- **Import** Guitar Pro files (.gp3, .gp4, .gp5, .gpx, .gp) and MusicXML via [alphaTab](https://www.alphatab.net/), with a track picker for multi-track files. Files are parsed in the browser and never uploaded. Seven sample classical guitar files are bundled.
- **Paste ASCII tab** as a best-effort import. ASCII tabs have no rhythm, so each column plays as an eighth note.
- **Shareable links**: `?song=<id>&at=<beat>&view=lap|neck|front|top&play=1`.

## Run it

```sh
npm install
npm run dev
```

Build for production with `npm run build`; the output is a static site in `dist/`.

## Deploy to Vercel

Vite is auto-detected, so no configuration is needed.

```sh
npm i -g vercel
vercel login
vercel          # first run links the directory to a new Vercel project and deploys a preview
vercel --prod   # production deploy
```

Or import the GitHub repo from the Vercel dashboard and every push deploys.

## Tab notation for licks and songs

Songs and licks are written as text, one voice at a time, in `src/model/tabdsl.ts` format:

```
1/8b2:q 1/5:e 2/8 2/5 3/7 3/5 4/7~:h
```

`string/fret`, then articulations (`b2` full bend, `b1` half, `b2r` bend and release, `s9` slide to 9, `h` hammer or pull, `t` tap, `~` vibrato, `m` palm mute, `l` let ring, `f3` finger), then `:duration` (`w h q e s t x` or a number of beats, add `.` for dotted). Strings use tab numbering: 1 is the high e. Chords join with `+`.

## Project layout

- `src/model/` song data model, the small text DSL used to author bundled songs, and the fingering heuristic.
- `src/songs/` bundled arrangements.
- `src/exercises/` the scale/shape/pattern generator and the hand-written licks library.
- `src/scene/articulation.ts` bend, slide, and vibrato geometry for the markers.
- `src/audio/synth.ts` Karplus-Strong synth.
- `src/player/transport.ts` song clock, note scheduler, loop logic.
- `src/import/` Guitar Pro / MusicXML importer (alphaTab) and the ASCII tab parser.
- `src/scene/` react-three-fiber guitar, marker pool, camera presets.
- `src/ui/` panels, transport bar, tab strip.

## Notes on the bundled sample files

The compositions in `public/samples/` are public domain. The Guitar Pro transcriptions came from gprotab.net (user uploads, no stated license) and the alphaTab website (MPL-2.0). Replace them with your own files if that matters for your use.
