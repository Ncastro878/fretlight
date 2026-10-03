import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { QUALITY_INTERVALS, parseChordName } from '../exercises/chords'
import type { Song } from '../model/song'
import type { Transport } from '../player/transport'
import { FRET_COUNT, notePosition } from './geometry'

interface Props {
  transport: Transport
  song: Song
}

/**
 * Lights the chord tones of whatever chord is playing right now, read from the
 * song's section names (progressions name each section after its chord).
 * Roots are bright, thirds and fifths dimmer. Updates only when the chord changes.
 */
export function ChordOverlay({ transport, song }: Props) {
  const strings = song.tuning.length
  const refs = useRef<(THREE.Mesh | null)[]>([])
  const mats = useRef<(THREE.MeshBasicMaterial | null)[]>([])
  const last = useRef<string>('')
  const cells = useMemo(() => {
    const out: { s: number; f: number; pos: [number, number, number] }[] = []
    for (let s = 0; s < strings; s++) for (let f = 0; f <= FRET_COUNT; f++) {
      const [x, y, z] = notePosition(s, f, strings)
      out.push({ s, f, pos: [x, y - 0.004, z] })
    }
    return out
  }, [strings])

  useFrame(() => {
    const pos = transport.position()
    const sections = song.sections ?? []
    let name = ''
    for (const sec of sections) if (sec.beat <= pos) name = sec.name
    if (name === last.current) return
    last.current = name
    const chord = parseChordName(name)
    const pcs = chord ? QUALITY_INTERVALS[chord.quality].map((i) => (chord.root + i) % 12) : []
    cells.forEach((c, k) => {
      const mesh = refs.current[k]
      const mat = mats.current[k]
      if (!mesh || !mat) return
      const pc = (song.tuning[c.s] + c.f) % 12
      const idx = pcs.indexOf(pc)
      mesh.visible = idx >= 0
      if (idx < 0) return
      const isRoot = idx === 0
      mat.color.set(isRoot ? '#facc15' : idx === 1 ? '#4ade80' : '#9ad8ff')
      mat.opacity = isRoot ? 0.95 : 0.6
      mesh.scale.setScalar(isRoot ? 1.5 : 1)
    })
  })

  return (
    <group>
      {cells.map((c, k) => (
        <mesh key={`${c.s}-${c.f}`} ref={(el) => void (refs.current[k] = el)} position={c.pos} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <circleGeometry args={[0.02, 14]} />
          <meshBasicMaterial ref={(el) => void (mats.current[k] = el)} color="#9ad8ff" transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  )
}
