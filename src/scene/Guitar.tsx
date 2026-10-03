import { Text } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'
import { noteName } from '../model/song'
import {
  BRIDGE_SPREAD,
  FRET_COUNT,
  INLAY_FRETS,
  NUT_SPREAD,
  SCALE_LENGTH,
  STRING_HEIGHT,
  fretX,
  fretboardEndX,
  stringZ,
} from './geometry'

interface Props {
  tuning: number[]
}

export function Guitar({ tuning }: Props) {
  const stringCount = tuning.length
  const endX = fretboardEndX()

  const fretboardGeometry = useMemo(() => {
    const halfNut = NUT_SPREAD / 2 + 0.04
    const halfEnd = (NUT_SPREAD + (BRIDGE_SPREAD - NUT_SPREAD) * (endX / SCALE_LENGTH)) / 2 + 0.04
    const shape = new THREE.Shape()
    shape.moveTo(0, -halfNut)
    shape.lineTo(0, halfNut)
    shape.lineTo(endX, halfEnd)
    shape.lineTo(endX, -halfEnd)
    shape.closePath()
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.09, bevelEnabled: false })
    geo.rotateX(Math.PI / 2) // extrude along -y so the top face is at y = 0
    return geo
  }, [endX])

  const strings = useMemo(() => {
    const x0 = -0.45
    const x1 = SCALE_LENGTH + 0.02
    return Array.from({ length: stringCount }, (_, i) => {
      const z0 = stringZ(i, 0, stringCount)
      const z1 = stringZ(i, SCALE_LENGTH, stringCount)
      const dx = x1 - x0
      const dz = z1 - z0
      const length = Math.hypot(dx, dz)
      const angle = Math.atan2(dz, dx)
      // Wound bass strings are thicker.
      const radius = 0.004 + ((stringCount - 1 - i) / (stringCount - 1)) * 0.007
      return { mid: [(x0 + x1) / 2, STRING_HEIGHT, (z0 + z1) / 2] as [number, number, number], length, angle, radius, i }
    })
  }, [stringCount])

  return (
    <group>
      {/* Fretboard */}
      <mesh geometry={fretboardGeometry} receiveShadow castShadow>
        <meshStandardMaterial color="#3b2418" roughness={0.65} metalness={0.05} />
      </mesh>

      {/* Neck underneath */}
      <mesh position={[endX / 2, -0.2, 0]} castShadow>
        <boxGeometry args={[endX, 0.22, 0.38]} />
        <meshStandardMaterial color="#8a5a33" roughness={0.7} />
      </mesh>

      {/* Headstock */}
      <mesh position={[-0.75, -0.05, 0]} castShadow>
        <boxGeometry args={[1.5, 0.12, 0.62]} />
        <meshStandardMaterial color="#2a1a10" roughness={0.6} />
      </mesh>
      {Array.from({ length: stringCount }, (_, i) => (
        <mesh key={i} position={[-0.45 - (i % 3) * 0.32 - 0.25, 0.08, i < 3 ? 0.28 : -0.28]}>
          <cylinderGeometry args={[0.03, 0.03, 0.1, 16]} />
          <meshStandardMaterial color="#d8d8d8" metalness={0.9} roughness={0.25} />
        </mesh>
      ))}

      {/* Nut */}
      <mesh position={[-0.03, 0.03, 0]}>
        <boxGeometry args={[0.06, 0.07, NUT_SPREAD + 0.08]} />
        <meshStandardMaterial color="#efe7d6" roughness={0.5} />
      </mesh>

      {/* Frets */}
      {Array.from({ length: FRET_COUNT }, (_, k) => {
        const n = k + 1
        const x = fretX(n)
        const width = NUT_SPREAD + (BRIDGE_SPREAD - NUT_SPREAD) * (x / SCALE_LENGTH) + 0.08
        return (
          <mesh key={n} position={[x, 0.012, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.014, 0.014, width, 12]} />
            <meshStandardMaterial color="#cfd3d6" metalness={0.95} roughness={0.3} />
          </mesh>
        )
      })}

      {/* Inlays */}
      {INLAY_FRETS.map((n) => {
        const x = (fretX(n - 1) + fretX(n)) / 2
        const dots = n === 12 ? [-0.1, 0.1] : [0]
        return dots.map((z) => (
          <mesh key={`${n}-${z}`} position={[x, 0.002, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.028, 24]} />
            <meshStandardMaterial color="#f3ead8" roughness={0.4} />
          </mesh>
        ))
      })}

      {/* Fret numbers along the player's edge */}
      {INLAY_FRETS.map((n) => (
        <Text
          key={`label-${n}`}
          position={[(fretX(n - 1) + fretX(n)) / 2, 0.01, NUT_SPREAD / 2 + 0.16 + (0.1 * fretX(n)) / SCALE_LENGTH]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.09}
          color="#9aa4b2"
          anchorX="center"
          anchorY="middle"
        >
          {String(n)}
        </Text>
      ))}

      {/* String names at the nut */}
      {tuning.map((midi, i) => (
        <Text
          key={`name-${i}`}
          position={[-0.32, STRING_HEIGHT + 0.02, stringZ(i, 0, stringCount)]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.07}
          color="#c7cdd6"
          anchorX="center"
          anchorY="middle"
        >
          {noteName(midi, false)}
        </Text>
      ))}

      {/* Strings */}
      {strings.map((s) => (
        <mesh key={s.i} position={s.mid} rotation={[0, -s.angle, Math.PI / 2]}>
          <cylinderGeometry args={[s.radius, s.radius, s.length, 8]} />
          <meshStandardMaterial color={s.i < 3 ? '#b8a27a' : '#d9dde2'} metalness={0.9} roughness={0.35} />
        </mesh>
      ))}

      {/* Body (simplified) */}
      <group position={[SCALE_LENGTH + 0.6, -0.16, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} receiveShadow>
          <cylinderGeometry args={[1.9, 1.9, 0.3, 48]} />
          <meshStandardMaterial color="#b5793f" roughness={0.55} />
        </mesh>
        <mesh position={[-1.3, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1.45, 1.45, 0.3, 48]} />
          <meshStandardMaterial color="#b5793f" roughness={0.55} />
        </mesh>
        {/* Sound hole */}
        <mesh position={[-1.4, 0.155, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.46, 40]} />
          <meshStandardMaterial color="#120a06" />
        </mesh>
        <mesh position={[-1.4, 0.156, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.46, 0.56, 40]} />
          <meshStandardMaterial color="#2b1a10" />
        </mesh>
        {/* Bridge */}
        <mesh position={[-0.6, 0.18, 0]}>
          <boxGeometry args={[0.3, 0.06, BRIDGE_SPREAD + 0.4]} />
          <meshStandardMaterial color="#1c120b" roughness={0.6} />
        </mesh>
        <mesh position={[-0.6, 0.23, 0]}>
          <boxGeometry args={[0.04, 0.06, BRIDGE_SPREAD + 0.1]} />
          <meshStandardMaterial color="#efe7d6" />
        </mesh>
      </group>
    </group>
  )
}
