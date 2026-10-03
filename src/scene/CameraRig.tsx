import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { SCALE_LENGTH, fretX } from './geometry'

export type CameraPreset = 'lap' | 'neck' | 'front' | 'top'

export const CAMERA_PRESETS: Record<CameraPreset, { label: string; position: [number, number, number]; target: [number, number, number]; help: string }> = {
  lap: {
    label: 'Lap view',
    position: [3.3, 2.2, 2.0],
    target: [1.7, -0.05, 0.05],
    help: 'Looking down at the guitar in your lap, headstock to the left.',
  },
  neck: {
    label: 'Neck close-up',
    position: [1.7, 2.3, 1.5],
    target: [1.4, 0, 0],
    help: 'Close on the first five frets.',
  },
  front: {
    label: 'Teacher view',
    position: [2.4, 3.4, -3.8],
    target: [2.2, 0, 0],
    help: 'Facing the player, as if watching a teacher.',
  },
  top: {
    label: 'Top down',
    position: [fretX(10), 6.2, 0.001],
    target: [fretX(10), 0, 0],
    help: 'Straight down, like a tab diagram.',
  },
}

/** Horizontal stretch of neck (scene units) to fit on a portrait screen, per preset. */
const PORTRAIT_SPAN: Record<CameraPreset, number> = { lap: 4.6, neck: 2.6, front: 4.6, top: 4.2 }
const PORTRAIT_CENTER: Record<CameraPreset, number> = { lap: 2.1, neck: 1.1, front: 2.1, top: 1.9 }

interface Props {
  preset: CameraPreset
  /** Bump this to re-apply the same preset. */
  nonce: number
}

export function CameraRig({ preset, nonce }: Props) {
  const controls = useRef<OrbitControlsImpl>(null)
  const camera = useThree((s) => s.camera)
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height))
  const portrait = aspect < 1

  useEffect(() => {
    const p = CAMERA_PRESETS[preset]
    const target = new THREE.Vector3(...p.target)
    const position = new THREE.Vector3(...p.position)
    camera.up.set(0, 1, 0)
    if (portrait) {
      // Keep the lap orientation on tall screens, but frame a shorter stretch of
      // neck so it fits the narrow width: pull the camera back along its line of
      // sight until the wanted span fits horizontally.
      const span = PORTRAIT_SPAN[preset]
      const centerX = PORTRAIT_CENTER[preset]
      const dir = position.clone().sub(target).normalize()
      target.set(centerX, 0, 0)
      const vfov = THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov ?? 42)
      const distance = span / 2 / (Math.tan(vfov / 2) * aspect)
      position.copy(target).addScaledVector(dir, distance)
    }
    camera.position.copy(position)
    controls.current?.target.copy(target)
    controls.current?.update()
  }, [preset, nonce, camera, portrait, aspect])

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.12}
      minDistance={0.6}
      maxDistance={14}
      maxPolarAngle={Math.PI * 0.49}
      target={[SCALE_LENGTH / 3, 0, 0]}
    />
  )
}
