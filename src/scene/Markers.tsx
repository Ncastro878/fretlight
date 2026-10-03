import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { Song, SongNote } from '../model/song'
import type { Transport } from '../player/transport'
import { lowerBound } from '../player/transport'
import { FINGER_COLORS, notePosition } from './geometry'

const POOL = 32
/** Upcoming notes start to appear this many beats ahead. */
export const LOOKAHEAD_BEATS = 2

interface Props {
  transport: Transport
  song: Song
  showUpcoming: boolean
  showFingers: boolean
}

/**
 * A fixed pool of glowing markers. Every frame we find the notes near the
 * playhead and point the pool at them. No React state changes per frame.
 */
export function Markers({ transport, song, showUpcoming, showFingers }: Props) {
  const labelRefs = useRef<(THREE.Object3D | null)[]>([])
  const groupRefs = useRef<(THREE.Group | null)[]>([])
  const discRefs = useRef<(THREE.Mesh | null)[]>([])
  const ringRefs = useRef<(THREE.Mesh | null)[]>([])
  const tmpColor = useMemo(() => new THREE.Color(), [])

  const discMaterials = useMemo(
    () =>
      Array.from({ length: POOL }, () => new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff', emissiveIntensity: 1, transparent: true, opacity: 1 })),
    [],
  )
  const ringMaterials = useMemo(
    () => Array.from({ length: POOL }, () => new THREE.MeshBasicMaterial({ color: '#fff', transparent: true, opacity: 0.6, side: THREE.DoubleSide })),
    [],
  )

  useFrame(() => {
    const pos = transport.position()
    const notes = song.notes
    const windowStart = pos - 4 // keep notes that may still be sounding
    const windowEnd = pos + (showUpcoming ? LOOKAHEAD_BEATS : 0.02)
    const visible: { note: SongNote; phase: number }[] = []
    for (let i = lowerBound(notes, windowStart); i < notes.length && notes[i].time <= windowEnd; i++) {
      const n = notes[i]
      const end = n.time + Math.max(n.duration, 0.25)
      if (n.time <= pos && end > pos) visible.push({ note: n, phase: 0 })
      else if (n.time > pos) visible.push({ note: n, phase: n.time - pos })
      if (visible.length >= POOL) break
    }
    // Active notes first so they win the pool when it is crowded.
    visible.sort((a, b) => a.phase - b.phase)

    for (let k = 0; k < POOL; k++) {
      const g = groupRefs.current[k]
      const disc = discRefs.current[k]
      const ring = ringRefs.current[k]
      const label = labelRefs.current[k] as (THREE.Object3D & { text?: string; color?: THREE.Color | string }) | null
      if (!g || !disc || !ring) continue
      const item = visible[k]
      if (!item) {
        g.visible = false
        continue
      }
      const { note, phase } = item
      const [x, y, z] = notePosition(note.string, note.fret, song.tuning.length)
      g.visible = true
      g.position.set(x, y, z)
      const color = FINGER_COLORS[note.fret === 0 ? 0 : (note.finger ?? 1)]
      tmpColor.set(color)

      const discMat = discMaterials[k]
      const ringMat = ringMaterials[k]
      discMat.color.copy(tmpColor)
      discMat.emissive.copy(tmpColor)
      ringMat.color.copy(tmpColor)

      if (phase === 0) {
        // Sounding now: full brightness, slight pulse from the attack.
        const age = pos - note.time
        const pulse = 1 + Math.max(0, 0.35 - age) * 1.4
        discMat.emissiveIntensity = 1.6
        discMat.opacity = 1
        disc.scale.setScalar(pulse)
        ring.scale.setScalar(1 + Math.min(age, 1) * 0.9)
        ringMat.opacity = Math.max(0, 0.7 - age * 0.7)
        ring.visible = true
      } else {
        // Upcoming: fade in and shrink toward the fret as it approaches.
        const t = 1 - phase / LOOKAHEAD_BEATS // 0 far away, 1 about to play
        discMat.emissiveIntensity = 0.35 + t * 0.7
        discMat.opacity = 0.4 + t * 0.6
        disc.scale.setScalar(0.55 + t * 0.4)
        ring.visible = false
      }

      if (label) {
        const text = note.fret === 0 ? '0' : String(note.finger ?? '')
        if (label.text !== text) {
          label.text = text
          ;(label as unknown as { sync?: () => void }).sync?.()
        }
        label.visible = showFingers && phase === 0
      }
    }
  })

  return (
    <group>
      {Array.from({ length: POOL }, (_, k) => (
        <group key={k} ref={(el) => void (groupRefs.current[k] = el)} visible={false}>
          <mesh ref={(el) => void (discRefs.current[k] = el)} material={discMaterials[k]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.052, 24]} />
          </mesh>
          <mesh ref={(el) => void (ringRefs.current[k] = el)} material={ringMaterials[k]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
            <ringGeometry args={[0.058, 0.074, 32]} />
          </mesh>
          <Text
            ref={(el) => void (labelRefs.current[k] = el)}
            position={[0, 0.006, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.062}
            color="#0b0f14"
            anchorX="center"
            anchorY="middle"
            fontWeight="bold"
          >
            {''}
          </Text>
        </group>
      ))}
    </group>
  )
}
