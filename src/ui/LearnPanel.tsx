import { useEffect, useState } from 'react'
import { COURSES, NOTE_CHOICES, drillSong, findLesson, type Drill, type LearnStep } from '../learn/curriculum'
import { midiOf, noteName, type Song } from '../model/song'
import type { Transport } from '../player/transport'
import type { CameraPreset } from '../scene/CameraRig'

export interface StepSettings {
  overlay?: 'none' | 'key' | 'chord'
  view?: CameraPreset
}

interface Props {
  transport: Transport
  song: Song
  /** Apply overlay and camera for a step. */
  onSettings: (s: StepSettings) => void
  /** Load and loop a song (closes the drawer on phones). */
  onLoad: (song: Song, opts?: { loop?: boolean; bpm?: number; metronome?: boolean; ramp?: { stepBpm: number; maxBpm: number } | null; play?: boolean }) => void
}

const STORAGE = 'fretlight.learn.v1'

function loadDone(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

export function LearnPanel({ transport, song, onSettings, onLoad }: Props) {
  const [lessonId, setLessonId] = useState<string | null>(() => new URLSearchParams(window.location.search).get('lesson'))
  const [stepIdx, setStepIdx] = useState(0)
  const [done, setDone] = useState<Set<string>>(() => loadDone())
  const found = lessonId ? findLesson(lessonId) : null
  const lesson = found?.lesson ?? null
  const step = lesson?.steps[stepIdx] ?? null

  const markDone = (id: string) => {
    const next = new Set(done)
    next.add(id)
    setDone(next)
    localStorage.setItem(STORAGE, JSON.stringify([...next]))
  }

  const openStep = (lid: string, idx: number) => {
    const f = findLesson(lid)
    if (!f) return
    const s = f.lesson.steps[idx]
    setLessonId(lid)
    setStepIdx(idx)
    applyStep(s)
    if (idx === f.lesson.steps.length - 1) markDone(lid)
  }

  const applyStep = (s: LearnStep) => {
    onSettings({ overlay: s.overlay ?? 'none', view: s.view })
    if (s.load) onLoad(s.load(), { loop: s.loop ?? true, bpm: s.bpm, metronome: s.metronome ?? false, ramp: s.ramp ?? null, play: true })
    else if (!s.drill) transport.pause()
  }

  if (!lesson || !step) {
    const total = COURSES.reduce((a, c) => a + c.lessons.length, 0)
    return (
      <section className="learn">
        <h3>Courses</h3>
        <p className="dim small">
          {done.size} of {total} lessons finished. Each step puts something on the neck and plays it. Read, watch, then play along.
        </p>
        {COURSES.map((c) => (
          <div key={c.id} className="course">
            <div className="course-title">{c.title}</div>
            <div className="dim small">{c.blurb}</div>
            <ul className="song-list">
              {c.lessons.map((l) => (
                <li key={l.id}>
                  <button className={`song ${done.has(l.id) ? 'done' : ''}`} onClick={() => openStep(l.id, 0)}>
                    <span className="song-title">
                      {done.has(l.id) ? '✓ ' : ''}
                      {l.title}
                    </span>
                    <span className="song-meta dim">
                      {l.summary} · {l.steps.length} steps · {l.minutes} min
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    )
  }

  return (
    <section className="learn lesson">
      <button className="btn ghost small" onClick={() => setLessonId(null)}>
        ← All courses
      </button>
      <div className="dim small">{found?.course.title}</div>
      <h3>{lesson.title}</h3>
      <div className="dim small">
        Step {stepIdx + 1} of {lesson.steps.length}
      </div>
      <h4>{step.title}</h4>
      <p className="body">{step.body}</p>
      {step.tryThis && (
        <div className="try">
          <b>Try this:</b> {step.tryThis}
        </div>
      )}
      {step.drill && <NoteDrill key={`${lesson.id}-${stepIdx}`} drill={step.drill} transport={transport} song={song} onLoad={onLoad} />}
      <div className="row">
        <button className="btn small" disabled={stepIdx === 0} onClick={() => openStep(lesson.id, stepIdx - 1)}>
          ← Back
        </button>
        <button className="btn small primary" disabled={stepIdx + 1 >= lesson.steps.length} onClick={() => openStep(lesson.id, stepIdx + 1)}>
          Next step →
        </button>
        {step.load && (
          <button className="btn small ghost" onClick={() => applyStep(step)}>
            Reload
          </button>
        )}
      </div>
      <ol className="steps">
        {lesson.steps.map((s, i) => (
          <li key={i} className={i === stepIdx ? 'on' : ''}>
            <button className="linkish" onClick={() => openStep(lesson.id, i)}>
              {s.title}
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}

function NoteDrill({ drill, transport, song, onLoad }: { drill: Drill; transport: Transport; song: Song; onLoad: Props['onLoad'] }) {
  const [target, setTarget] = useState<{ string: number; fret: number } | null>(null)
  const [score, setScore] = useState({ right: 0, total: 0 })
  const [feedback, setFeedback] = useState<string | null>(null)

  const next = () => {
    let s = 0
    let f = 0
    for (let tries = 0; tries < 50; tries++) {
      s = drill.strings[Math.floor(Math.random() * drill.strings.length)]
      f = drill.frets[0] + Math.floor(Math.random() * (drill.frets[1] - drill.frets[0] + 1))
      const name = noteName(song.tuning[s] + f, false)
      if (!drill.naturalsOnly || !name.includes('#')) break
    }
    setTarget({ string: s, fret: f })
    setFeedback(null)
    onLoad(drillSong(s, f), { loop: true, metronome: false, ramp: null, play: true })
  }

  useEffect(() => {
    next()
    return () => transport.pause()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const answer = (choice: string) => {
    if (!target) return
    const correct = noteName(midiOf({ ...song, tuning: song.tuning }, target), false)
    const right = choice === correct
    setScore((s) => ({ right: s.right + (right ? 1 : 0), total: s.total + 1 }))
    setFeedback(right ? `Yes, ${correct}.` : `No, that is ${correct}. String ${6 - target.string} (${noteName(song.tuning[target.string], false)}) fret ${target.fret}.`)
    window.setTimeout(next, right ? 700 : 1800)
  }

  const choices = drill.naturalsOnly ? NOTE_CHOICES.filter((n) => !n.includes('#')) : NOTE_CHOICES
  return (
    <div className="drill">
      <div className="row between">
        <b>Name the lit note</b>
        <span className="mono dim">
          {score.right}/{score.total}
        </span>
      </div>
      <div className="choices">
        {choices.map((n) => (
          <button key={n} className="btn small" onClick={() => answer(n)} disabled={!!feedback}>
            {n}
          </button>
        ))}
      </div>
      <div className={`feedback ${feedback?.startsWith('Yes') ? 'ok' : feedback ? 'bad' : ''}`}>{feedback ?? ' '}</div>
      <button className="btn ghost small" onClick={next}>
        Skip
      </button>
    </div>
  )
}
