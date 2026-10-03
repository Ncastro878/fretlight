import { Canvas } from '@react-three/fiber'
import type { Song } from '../model/song'
import type { Transport } from '../player/transport'
import { CameraRig, type CameraPreset } from './CameraRig'
import { Guitar } from './Guitar'
import { Markers } from './Markers'
import { KeyOverlay } from './KeyOverlay'
import type { KeyGuess } from '../analysis/key'

interface Props {
  transport: Transport
  song: Song
  preset: CameraPreset
  presetNonce: number
  showUpcoming: boolean
  showFingers: boolean
  keyGuess: KeyGuess | null
}

export function Scene({ transport, song, preset, presetNonce, showUpcoming, showFingers, keyGuess }: Props) {
  return (
    <Canvas shadows camera={{ fov: 42, near: 0.05, far: 60, position: [3.3, 2.2, 2.0] }} dpr={[1, 2]}>
      <color attach="background" args={['#0a0d12']} />
      <fog attach="fog" args={['#0a0d12', 12, 24]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 6, 4]} intensity={1.6} castShadow shadow-mapSize={[2048, 2048]} />
      <directionalLight position={[-4, 3, -3]} intensity={0.5} color="#9db4ff" />
      <pointLight position={[2, 1.5, 1.5]} intensity={6} distance={8} color="#ffd9b0" />

      <Guitar tuning={song.tuning} />
      {keyGuess && <KeyOverlay keyGuess={keyGuess} tuning={song.tuning} />}
      <Markers transport={transport} song={song} showUpcoming={showUpcoming} showFingers={showFingers} />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[3, -0.5, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#0e1219" roughness={1} />
      </mesh>

      <CameraRig preset={preset} nonce={presetNonce} />
    </Canvas>
  )
}
