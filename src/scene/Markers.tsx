import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { bendLabel, type Song, type SongNote } from '../model/song'
import type { Transport } from '../player/transport'
import { lowerBound } from '../player/transport'
import { markerPosition, stringAnchors } from './articulation'
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

type TextObject = THREE.Object3D & { text: string; sync?: () => void }

/**
 * A fixed pool of glowing markers. Every frame we find the notes near the
 * playhead and point the pool at them. No React state changes per frame.
 * Each slot also owns a displaced string segment (bends, vibrato), a trail
 * (slides), a link bar (hammer-ons), and a small technique label.
 */
export function Markers({ transport, song, showUpcoming, showFingers }: Props) {
  const groupRefs = useRef<(THREE.Group | null)[]>([])
  const discRefs = useRef<(THREE.Mesh | null)[]>([])
  const ringRefs = useRef<(THREE.Mesh | null)[]>([])
  const labelRefs = useRef<(TextObject | null)[]>([])
  const techRefs = useRef<(TextObject | null)[]>([])
  const segARefs = useRef<(THREE.Mesh | null)[]>([])
  const segBRefs = useRef<(THREE.Mesh | null)[]>([])
  const trailRefs = useRef<(THREE.Mesh | null)[]>([])
  const linkRefs = useRef<(THREE.Mesh | null)[]>([])
  const tmpColor = useMemo(() => new THREE.Color(), [])
  const tmpA = useMemo(() => new THREE.Vector3(), [])
  const tmpB = useMemo(() => new THREE.Vector3(), [])

  const discMaterials = useMemo(
    () =>
      Array.from(
        { length: POOL },
        () => new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff', emissiveIntensity: 1, transparent: true, opacity: 1 }),
      ),
    [],
  )
  const ringMaterials = useMemo(
    () => Array.from({ length: POOL }, () => new THREE.MeshBasicMaterial({ color: '#fff', transparent: true, opacity: 0.6, side: THREE.DoubleSide })),
    [],
  )
  const segMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e8ecf2', emissive: '#aab6ff', emissiveIntensity: 0.6, metalness: 0.8, roughness: 0.3 }), [])
  const trailMaterials = useMemo(
    () => Array.from({ length: POOL }, () => new THREE.MeshBasicMaterial({ color: '#fff', transparent: true, opacity: 0.45 })),
    [],
  )

  /** Stretch a unit cylinder (along y) between two points. */
  const placeSegment = (mesh: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3, radius: number) => {
    const len = a.distanceTo(b)
    if (len < 1e-4) {
      mesh.visible = false
      return
    }
    mesh.visible = true
    mesh.position.copy(a).add(b).multiplyScalar(0.5)
    mesh.scale.set(radius, len, radius)
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tmpB.copy(b).sub(a).normalize())
  }

  useFrame(({ clock }) => {
    const pos = transport.position()
    const notes = song.notes
    const strings = song.tuning.length
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
      const label = labelRefs.current[k]
      const tech = techRefs.current[k]
      const segA = segARefs.current[k]
      const segB = segBRefs.current[k]
      const trail = trailRefs.current[k]
      const link = linkRefs.current[k]
      if (!g || !disc || !ring || !segA || !segB || !trail || !link) continue
      const item = visible[k]
      if (!item) {
        g.visible = false
        continue
      }
      const { note, phase } = item
      const held = Math.max(note.duration, 0.25)
      const progress = phase === 0 ? Math.min(1, (pos - note.time) / held) : 0
      const [x, y, z] = phase === 0 ? markerPosition(note, progress, clock.elapsedTime, strings) : notePosition(note.string, note.fret, strings)
      g.visible = true
      g.position.set(0, 0, 0)
      disc.position.set(x, y, z)
      ring.position.set(x, y + 0.002, z)
      const color = FINGER_COLORS[note.fret === 0 ? 0 : (note.finger ?? 1)]
      tmpColor.set(color)

      const discMat = discMaterials[k]
      const ringMat = ringMaterials[k]
      discMat.color.copy(tmpColor)
      discMat.emissive.copy(tmpColor)
      ringMat.color.copy(tmpColor)
      trailMaterials[k].color.copy(tmpColor)

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

      // Displaced string segment for bends and vibrato.
      const displaced = phase === 0 && (note.bend || note.vibrato)
      if (displaced) {
        const [a, b] = stringAnchors(note, strings)
        tmpA.set(a[0], a[1], a[2])
        tmpB.set(x, y - 0.008, z)
        placeSegment(segA, tmpA, tmpB.clone(), 0.006)
        tmpA.set(b[0], b[1], b[2])
        placeSegment(segB, tmpB.clone(), tmpA, 0.006)
      } else {
        segA.visible = false
        segB.visible = false
      }

      // Slide trail from the starting fret to the current spot.
      if (phase === 0 && note.slideTo !== undefined) {
        const [sx, sy, sz] = notePosition(note.string, note.fret, strings)
        tmpA.set(sx, sy - 0.004, sz)
        tmpB.set(x, y - 0.004, z)
        placeSegment(trail, tmpA, tmpB.clone(), 0.012)
        trail.material = trailMaterials[k]
      } else {
        trail.visible = false
      }

      // Link bar back to the fret a hammer-on or pull-off came from.
      if (note.hammerFromFret !== undefined && note.hammerFromFret !== note.fret) {
        const [fx, fy, fz] = notePosition(note.string, note.hammerFromFret, strings)
        tmpA.set(fx, fy + 0.03, fz)
        tmpB.set(x, y + 0.03, z)
        placeSegment(link, tmpA, tmpB.clone(), 0.007)
        link.material = trailMaterials[k]
        link.visible = phase === 0 || phase < 0.75
      } else {
        link.visible = false
      }

      if (label) {
        const text = note.tap ? 'T' : note.fret === 0 ? '0' : String(note.finger ?? '')
        if (label.text !== text) {
          label.text = text
          label.sync?.()
        }
        label.position.set(x, y + 0.006, z)
        label.visible = showFingers && phase === 0
      }
      if (tech) {
        let text = ''
        if (note.bend) text = `↑${bendLabel(note.bend.semitones)}${note.bend.release ? '↓' : ''}`
        else if (note.slideTo !== undefined) text = note.slideTo > note.fret ? `/${note.slideTo}` : `\\${note.slideTo}`
        else if (note.vibrato) text = '~~'
        else if (note.hammer) text = note.hammerFromFret !== undefined && note.hammerFromFret > note.fret ? 'P' : 'H'
        else if (note.palmMute) text = 'PM'
        if (tech.text !== text) {
          tech.text = text
          tech.sync?.()
        }
        tech.position.set(x, y + 0.01, z - 0.085 * (note.string >= 3 ? -1 : 1))
        tech.visible = text !== '' && (phase === 0 || phase < 1)
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
          <mesh ref={(el) => void (ringRefs.current[k] = el)} material={ringMaterials[k]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.058, 0.074, 32]} />
          </mesh>
          <mesh ref={(el) => void (segARefs.current[k] = el)} material={segMaterial} visible={false}>
            <cylinderGeometry args={[1, 1, 1, 6]} />
          </mesh>
          <mesh ref={(el) => void (segBRefs.current[k] = el)} material={segMaterial} visible={false}>
            <cylinderGeometry args={[1, 1, 1, 6]} />
          </mesh>
          <mesh ref={(el) => void (trailRefs.current[k] = el)} visible={false}>
            <cylinderGeometry args={[1, 1, 1, 6]} />
          </mesh>
          <mesh ref={(el) => void (linkRefs.current[k] = el)} visible={false}>
            <cylinderGeometry args={[1, 1, 1, 6]} />
          </mesh>
          <Text
            ref={(el) => void (labelRefs.current[k] = el as unknown as TextObject | null)}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.062}
            color="#0b0f14"
            anchorX="center"
            anchorY="middle"
            fontWeight="bold"
          >
            {''}
          </Text>
          <Text
            ref={(el) => void (techRefs.current[k] = el as unknown as TextObject | null)}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.055}
            color="#ffe9a3"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.004}
            outlineColor="#000"
          >
            {''}
          </Text>
        </group>
      ))}
    </group>
  )
}
