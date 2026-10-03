import { useCallback, useEffect, useRef, useState } from 'react'
import { buildProgression, presetSlots, PRESETS } from '../exercises/chords'
import { LICKS } from '../exercises/licks'
import { buildExercise } from '../exercises/scales'
import type { Song } from '../model/song'
import type { Transport } from '../player/transport'
import { LIBRARY } from '../songs'

export interface RoutineStep {
  id: string
  song: Song
  minutes: number
}

const STORAGE_KEY = 'fretlight.routine.v1'

function lick(id: string): Song {
  const s = LICKS.find((l) => l.id === `lick-${id}`)
  if (!s) throw new Error(`missing lick ${id}`)
  return s
}

/** A sensible 20-minute intermediate session to start from. */
export function starterRoutine(): RoutineStep[] {
  const steps: { song: Song; minutes: number }[] = [
    { song: lick('warm-spider'), minutes: 2 },
    { song: buildExercise({ root: 9, scaleId: 'minor', shape: 'nps3', position: 0, pattern: 'updown', noteValue: 0.25, bpm: 80 }), minutes: 4 },
    { song: lick('rock-pentatonic-4s'), minutes: 3 },
    { song: lick('blues-classic-bend'), minutes: 3 },
    { song: buildProgression({ slots: presetSlots(PRESETS[1], 0), strum: 'folk', bpm: 90 }), minutes: 4 },
    { song: LIBRARY.find((s) => s.id === 'house-of-the-rising-sun') ?? LIBRARY[0], minutes: 4 },
  ]
  return steps.map((s, i) => ({ id: `${Date.now()}-${i}`, ...s }))
}

function load(): RoutineStep[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RoutineStep[]
    return Array.isArray(parsed) ? parsed.filter((s) => s && s.song && Array.isArray(s.song.notes)) : []
  } catch {
    return []
  }
}

function save(steps: RoutineStep[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(steps))
  } catch {
    // Storage full or unavailable; the routine still works for this session.
  }
}

export interface RoutineRunner {
  steps: RoutineStep[]
  setSteps: (steps: RoutineStep[]) => void
  addStep: (song: Song, minutes?: number) => void
  running: boolean
  index: number
  remainingSec: number
  start: (from?: number) => void
  stop: () => void
  next: () => void
}

export function useRoutine(transport: Transport): RoutineRunner {
  const [steps, setStepsState] = useState<RoutineStep[]>(() => load())
  const [running, setRunning] = useState(false)
  const [index, setIndex] = useState(0)
  const [remainingSec, setRemaining] = useState(0)
  const timer = useRef<number | null>(null)
  const stepsRef = useRef(steps)
  stepsRef.current = steps
  const indexRef = useRef(0)

  const setSteps = useCallback((s: RoutineStep[]) => {
    setStepsState(s)
    save(s)
  }, [])

  const addStep = useCallback(
    (song: Song, minutes = 3) => setSteps([...stepsRef.current, { id: `${Date.now()}`, song, minutes }]),
    [setSteps],
  )

  const clearTimer = () => {
    if (timer.current !== null) window.clearInterval(timer.current)
    timer.current = null
  }

  const stop = useCallback(() => {
    clearTimer()
    setRunning(false)
    transport.pause()
  }, [transport])

  const begin = useCallback(
    (i: number) => {
      const step = stepsRef.current[i]
      if (!step) {
        clearTimer()
        setRunning(false)
        transport.pause()
        return
      }
      indexRef.current = i
      setIndex(i)
      setRemaining(step.minutes * 60)
      transport.setSong(step.song, { loopAll: true })
      void transport.play()
    },
    [transport],
  )

  const start = useCallback(
    (from = 0) => {
      clearTimer()
      setRunning(true)
      begin(from)
      timer.current = window.setInterval(() => {
        setRemaining((r) => r - 1)
      }, 1000)
    },
    [begin],
  )

  const next = useCallback(() => {
    begin(indexRef.current + 1)
  }, [begin])

  // Advance when a step's clock runs out.
  useEffect(() => {
    if (running && remainingSec <= 0 && timer.current !== null) {
      if (index + 1 < stepsRef.current.length) begin(index + 1)
      else stop()
    }
  }, [remainingSec, running, index, begin, stop])

  useEffect(() => () => clearTimer(), [])

  return { steps, setSteps, addStep, running, index, remainingSec, start, stop, next }
}
