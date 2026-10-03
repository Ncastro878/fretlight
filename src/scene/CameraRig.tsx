import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
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

interface Props {
  preset: CameraPreset
  /** Bump this to re-apply the same preset. */
  nonce: number
}

export function CameraRig({ preset, nonce }: Props) {
  const controls = useRef<OrbitControlsImpl>(null)
  const camera = useThree((s) => s.camera)

  useEffect(() => {
    const p = CAMERA_PRESETS[preset]
    camera.position.set(...p.position)
    controls.current?.target.set(...p.target)
    controls.current?.update()
  }, [preset, nonce, camera])

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
