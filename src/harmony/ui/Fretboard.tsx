import { FRETS, TUNING, midiAt, type MelodyNote } from '../voicings'
import type { Key } from '../theory'
import { spell } from '../theory'

interface Props {
  keySig: Key
  /** Melody notes in order; the selected one is highlighted. */
  melody: MelodyNote[]
  selected: number
  /** Voicing to draw under the selected note, frets per string or null. */
  voicing: number[] | null
  fingers?: number[]
  onPick: (note: MelodyNote) => void
  onSelect: (index: number) => void
  showKey: boolean
}

const W = 1040
const H = 230
const LEFT = 56
const TOP = 28
const STRING_GAP = (H - TOP * 2) / 5
const FRET_W = (W - LEFT - 20) / FRETS
const SCALE = [0, 2, 4, 5, 7, 9, 11]

/** Clickable 2D neck, high e on top like a tab. */
export function Fretboard({ keySig, melody, selected, voicing, fingers, onPick, onSelect, showKey }: Props) {
  const keyPcs = new Set((keySig.mode === 'major' ? SCALE : [0, 2, 3, 5, 7, 8, 10]).map((i) => (keySig.root + i) % 12))
  const y = (s: number) => TOP + (5 - s) * STRING_GAP
  const x = (f: number) => (f === 0 ? LEFT - 18 : LEFT + (f - 0.5) * FRET_W)
  const cells = []
  for (let s = 0; s < 6; s++) for (let f = 0; f <= FRETS; f++) cells.push({ s, f })
  const melodyIndex = (s: number, f: number) => melody.findIndex((m) => m.string === s && m.fret === f)

  return (
    <svg className="neck" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Fretboard">
      <rect x={LEFT} y={TOP - 10} width={FRETS * FRET_W} height={5 * STRING_GAP + 20} rx={6} fill="#3b2418" />
      {[3, 5, 7, 9, 12, 15].map((f) => (
        <g key={f}>
          {(f === 12 ? [1.5, 3.5] : [2.5]).map((row) => (
            <circle key={row} cx={LEFT + (f - 0.5) * FRET_W} cy={TOP + row * STRING_GAP} r={5} fill="#f3ead8" opacity={0.5} />
          ))}
          <text x={LEFT + (f - 0.5) * FRET_W} y={H - 6} textAnchor="middle" fontSize={11} fill="#8b94a5">
            {f}
          </text>
        </g>
      ))}
      {Array.from({ length: FRETS + 1 }, (_, f) => (
        <line key={f} x1={LEFT + f * FRET_W} x2={LEFT + f * FRET_W} y1={TOP - 10} y2={TOP + 5 * STRING_GAP + 10} stroke={f === 0 ? '#efe7d6' : '#cfd3d6'} strokeWidth={f === 0 ? 6 : 2} />
      ))}
      {TUNING.map((_, s) => (
        <g key={s}>
          <line x1={LEFT - 30} x2={LEFT + FRETS * FRET_W} y1={y(s)} y2={y(s)} stroke={s < 3 ? '#b8a27a' : '#d9dde2'} strokeWidth={2.6 - s * 0.3} />
          <text x={LEFT - 46} y={y(s) + 4} fontSize={11} fill="#8b94a5" textAnchor="middle">
            {spell(TUNING[s] % 12, keySig)}
          </text>
        </g>
      ))}
      {/* Key overlay + click targets */}
      {cells.map(({ s, f }) => {
        const pc = midiAt(s, f) % 12
        const inKey = keyPcs.has(pc)
        const isRoot = pc === keySig.root
        const mi = melodyIndex(s, f)
        const v = voicing && voicing[s] === f && mi !== selected
        return (
          <g key={`${s}-${f}`} className="cell" onClick={() => (mi >= 0 ? onSelect(mi) : onPick({ string: s, fret: f }))}>
            <rect x={f === 0 ? LEFT - 34 : LEFT + (f - 1) * FRET_W} y={y(s) - STRING_GAP / 2} width={f === 0 ? 30 : FRET_W} height={STRING_GAP} fill="transparent" />
            {showKey && inKey && mi < 0 && !v && <circle cx={x(f)} cy={y(s)} r={isRoot ? 6 : 4} fill={isRoot ? '#facc15' : '#8fb3ff'} opacity={isRoot ? 0.8 : 0.35} />}
            {v && (
              <g>
                <circle cx={x(f)} cy={y(s)} r={11} fill="#4ade80" stroke="#0b0f14" strokeWidth={1.5} />
                <text x={x(f)} y={y(s) + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill="#0b0f14">
                  {fingers && fingers[s] ? fingers[s] : f === 0 ? '0' : ''}
                </text>
              </g>
            )}
            {mi >= 0 && (
              <g>
                <circle cx={x(f)} cy={y(s)} r={mi === selected ? 13 : 10} fill={mi === selected ? '#facc15' : '#fb923c'} stroke="#0b0f14" strokeWidth={1.5} />
                <text x={x(f)} y={y(s) + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill="#0b0f14">
                  {mi + 1}
                </text>
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}

/** Tiny chord diagram: 6 strings, frets relative to the lowest fretted note. */
export function MiniDiagram({ frets, fingers, melodyString }: { frets: number[]; fingers?: number[]; melodyString: number }) {
  const fretted = frets.filter((f) => f > 0)
  const base = fretted.length ? Math.max(1, Math.min(...fretted)) : 1
  const rows = 5
  const w = 84
  const h = 96
  const left = 14
  const top = 20
  const gapX = (w - left * 2) / 5
  const gapY = (h - top - 6) / rows
  return (
    <svg className="mini" viewBox={`0 0 ${w} ${h}`} width={w} height={h}>
      {base > 1 && (
        <text x={1} y={top + gapY * 0.75} fontSize={10} fill="#e6e9ef">
          {base}fr
        </text>
      )}
      <line x1={left} x2={left + gapX * 5} y1={top} y2={top} stroke="#e6e9ef" strokeWidth={base === 1 ? 4 : 1.2} />
      {Array.from({ length: rows }, (_, r) => (
        <line key={r} x1={left} x2={left + gapX * 5} y1={top + (r + 1) * gapY} y2={top + (r + 1) * gapY} stroke="#6b7280" strokeWidth={1} />
      ))}
      {frets.map((f, s) => {
        const cx = left + s * gapX
        if (f < 0)
          return (
            <text key={s} x={cx} y={top - 6} textAnchor="middle" fontSize={11} fill="#9ca3af">
              ×
            </text>
          )
        if (f === 0)
          return <circle key={s} cx={cx} cy={top - 9} r={4} fill="none" stroke={s === melodyString ? '#facc15' : '#e6e9ef'} strokeWidth={1.6} />
        const row = f - base + 1
        return (
          <g key={s}>
            <circle cx={cx} cy={top + (row - 0.5) * gapY} r={6.5} fill={s === melodyString ? '#facc15' : '#e6e9ef'} />
            {fingers && fingers[s] > 0 && (
              <text x={cx} y={top + (row - 0.5) * gapY + 3.5} textAnchor="middle" fontSize={9} fontWeight={700} fill="#0b0f14">
                {fingers[s]}
              </text>
            )}
          </g>
        )
      })}
      {frets.map((_, s) => (
        <line key={`s${s}`} x1={left + s * gapX} x2={left + s * gapX} y1={top} y2={top + rows * gapY} stroke="#9ca3af" strokeWidth={1} />
      ))}
    </svg>
  )
}
