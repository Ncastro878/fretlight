import type { Song } from '../model/song'

export function formatBeat(song: Song, beat: number): string {
  const bar = Math.floor(beat / song.beatsPerBar) + 1
  const inBar = beat - (bar - 1) * song.beatsPerBar
  return `${bar}.${(Math.floor(inBar) + 1).toString()}`
}

export function formatClock(song: Song, beat: number, speed: number): string {
  const secs = (beat / ((song.tempo * speed) / 60)) | 0
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
}
