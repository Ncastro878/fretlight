import { useMemo } from 'react'
import type { KeyGuess } from '../analysis/key'
import { FRET_COUNT, notePosition } from './geometry'

interface Props {
  keyGuess: KeyGuess
  tuning: number[]
}

/** Dots on every in-key fret: roots bright, other scale tones dim. Out-of-key frets stay dark. */
export function KeyOverlay({ keyGuess, tuning }: Props) {
  const dots = useMemo(() => {
    const out: { pos: [number, number, number]; root: boolean; key: string }[] = []
    for (let s = 0; s < tuning.length; s++) {
      for (let f = 0; f <= FRET_COUNT; f++) {
        const pc = (tuning[s] + f) % 12
        if (!keyGuess.scale.has(pc)) continue
        const [x, y, z] = notePosition(s, f, tuning.length)
        out.push({ pos: [x, y - 0.004, z], root: pc === keyGuess.root, key: `${s}-${f}` })
      }
    }
    return out
  }, [keyGuess, tuning])

  return (
    <group>
      {dots.map((d) => (
        <mesh key={d.key} position={d.pos} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[d.root ? 0.03 : 0.018, 16]} />
          <meshBasicMaterial color={d.root ? '#facc15' : '#8fb3ff'} transparent opacity={d.root ? 0.9 : 0.45} />
        </mesh>
      ))}
    </group>
  )
}
