/** All dimensions in scene units where 1 unit = 100 mm. */
export const SCALE_LENGTH = 6.48
export const FRET_COUNT = 20
export const NUT_SPREAD = 0.36
export const BRIDGE_SPREAD = 0.54
export const STRING_HEIGHT = 0.055

/** Distance from the nut to fret `n` (0 = nut). */
export function fretX(n: number): number {
  return SCALE_LENGTH * (1 - Math.pow(2, -n / 12))
}

export function fretboardEndX(): number {
  return fretX(FRET_COUNT) + 0.18
}

export function stringSpread(x: number): number {
  const t = Math.max(0, Math.min(1, x / SCALE_LENGTH))
  return NUT_SPREAD + (BRIDGE_SPREAD - NUT_SPREAD) * t
}

/** z position of string `i` (0 = lowest string, nearest the player) at distance x. */
export function stringZ(i: number, x: number, stringCount = 6): number {
  const spread = stringSpread(x)
  return spread / 2 - (i * spread) / (stringCount - 1)
}

/** Where a finger goes for a note: just behind the fret wire. Open strings sit before the nut. */
export function notePosition(string: number, fret: number, stringCount = 6): [number, number, number] {
  const x = fret === 0 ? -0.14 : fretX(fret - 1) + (fretX(fret) - fretX(fret - 1)) * 0.68
  return [x, STRING_HEIGHT + 0.01, stringZ(string, Math.max(0, x), stringCount)]
}

export const INLAY_FRETS = [3, 5, 7, 9, 12, 15, 17, 19]

export const FINGER_COLORS: Record<number, string> = {
  0: '#9ad8ff', // open string
  1: '#4ade80', // index
  2: '#facc15', // middle
  3: '#fb923c', // ring
  4: '#c084fc', // pinky
}
