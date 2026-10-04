import { OrbitControls, RoundedBox, Text } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { pedalDef, type PedalInstance } from '../audio/pedals'

interface Props {
  chain: PedalInstance[]
  selected: string | null
  onSelect: (uid: string | null) => void
  onToggle: (uid: string) => void
  /** Turn a knob by dragging it on the board. `t` is 0..1 across the knob's range. */
  onKnob: (uid: string, paramId: string, t: number) => void
  /** Drop a pedal at a new insertion index (before the item at that index). */
  onMove: (uid: string, insertIndex: number) => void
  /** 0..1 signal level at the input, for the cable pulse. */
  levelRef: React.MutableRefObject<number>
  /** The quiz hides what the mystery pedal is. */
  hideTypes?: boolean
}

interface DragState {
  uid: string
  startX: number
  pointerStartX: number
}

function Knob({
  position,
  value,
  onDrag,
}: {
  position: [number, number, number]
  value: number
  onDrag: (t: number) => void
}) {
  // Knob rotates from -135° to +135° like a real pot. Drag up/down to turn it.
  const angle = -Math.PI * 0.75 + value * Math.PI * 1.5
  const start = useRef<{ y: number; v: number } | null>(null)
  const { gl } = useThree()
  return (
    <group position={position} rotation={[0, -angle, 0]}>
      <mesh
        onPointerDown={(e) => {
          e.stopPropagation()
          ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
          start.current = { y: e.clientY, v: value }
          gl.domElement.style.cursor = 'ns-resize'
        }}
        onPointerMove={(e) => {
          if (!start.current) return
          e.stopPropagation()
          const dy = start.current.y - e.clientY
          onDrag(Math.max(0, Math.min(1, start.current.v + dy / 150)))
        }}
        onPointerUp={(e) => {
          e.stopPropagation()
          start.current = null
          gl.domElement.style.cursor = ''
        }}
        onPointerOver={() => (gl.domElement.style.cursor = 'ns-resize')}
        onPointerOut={() => !start.current && (gl.domElement.style.cursor = '')}
      >
        <cylinderGeometry args={[0.1, 0.11, 0.09, 20]} />
        <meshStandardMaterial color="#1f2937" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.05, -0.065]}>
        <boxGeometry args={[0.022, 0.012, 0.075]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
    </group>
  )
}

function Pedal({
  p,
  x,
  selected,
  hidden,
  onSelect,
  onToggle,
  onKnob,
  onDragStart,
  dragOffset,
}: {
  p: PedalInstance
  x: number
  selected: boolean
  hidden: boolean
  onSelect: () => void
  onToggle: () => void
  onKnob: (paramId: string, t: number) => void
  onDragStart: (e: ThreeEvent<PointerEvent>) => void
  dragOffset: number
}) {
  const def = pedalDef(p.type)
  const big = def.category === 'amp' || def.category === 'cab'
  const w = big ? 1.9 : 0.75
  const d = big ? 1.1 : 1.2
  const h = big ? 0.9 : 0.42
  const knobs = def.params.filter((k) => !k.options).slice(0, big ? 6 : 4)
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    if (!ref.current) return
    ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, selected || dragOffset !== 0 ? 0.14 : 0, 0.15)
    ref.current.position.x = x + dragOffset
  })
  const color = hidden ? '#374151' : p.enabled ? def.color : '#3f3f46'
  return (
    <group ref={ref} position={[x, 0, 0]}>
      <group
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
        onPointerDown={(e) => {
          if (def.fixed) return
          e.stopPropagation()
          onDragStart(e)
        }}
        onPointerOver={() => (document.body.style.cursor = def.fixed ? 'pointer' : 'grab')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        <RoundedBox args={[w, h, d]} radius={0.04} smoothness={3} position={[0, h / 2, 0]} castShadow>
          <meshStandardMaterial color={color} roughness={0.45} metalness={0.15} emissive={selected ? def.color : '#000'} emissiveIntensity={selected ? 0.25 : 0} />
        </RoundedBox>
        {big && def.category === 'cab' && (
          <mesh position={[0, h / 2, d / 2 + 0.001]}>
            <planeGeometry args={[w * 0.9, h * 0.8]} />
            <meshStandardMaterial color="#1c1917" roughness={1} />
          </mesh>
        )}
        {!hidden &&
          knobs.map((k, i) => {
            const cols = big ? knobs.length : Math.min(knobs.length, 2)
            const row = big ? 0 : Math.floor(i / 2)
            const col = big ? i : i % 2
            const span = big ? w * 0.8 : 0.4
            const kx = cols === 1 ? 0 : -span / 2 + (span * col) / (cols - 1)
            const kz = big ? -0.1 : -0.35 + row * 0.26
            const raw = (p.params[k.id] - k.min) / (k.max - k.min)
            const v = k.log ? Math.log(p.params[k.id] / k.min) / Math.log(k.max / k.min) : raw
            return <Knob key={k.id} position={[kx, h + 0.04, kz]} value={Math.max(0, Math.min(1, v))} onDrag={(t) => onKnob(k.id, t)} />
          })}
        {/* Footswitch */}
        <mesh
          position={[0, h + 0.03, big ? d / 2 - 0.15 : 0.4]}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
          onPointerOver={() => (document.body.style.cursor = 'pointer')}
        >
          <cylinderGeometry args={[big ? 0.05 : 0.09, big ? 0.05 : 0.09, 0.05, 20]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[big ? -w / 2 + 0.15 : -0.25, h + 0.02, big ? d / 2 - 0.15 : 0.2]}>
          <sphereGeometry args={[0.035, 12, 12]} />
          <meshStandardMaterial color={p.enabled ? '#ef4444' : '#450a0a'} emissive={p.enabled ? '#ef4444' : '#000'} emissiveIntensity={p.enabled ? 2 : 0} />
        </mesh>
        <Text position={[0, h + 0.012, big ? 0.32 : -0.02]} rotation={[-Math.PI / 2, 0, 0]} fontSize={big ? 0.13 : 0.085} color={p.enabled && !hidden ? '#0b0f14' : '#9ca3af'} anchorX="center" anchorY="middle" fontWeight="bold" maxWidth={w * 0.95}>
          {hidden ? '?' : def.name}
        </Text>
      </group>
    </group>
  )
}

function Cables({ xs, levelRef }: { xs: number[]; levelRef: React.MutableRefObject<number> }) {
  const mats = useRef<THREE.MeshStandardMaterial[]>([])
  const pulses = useRef<THREE.Mesh[]>([])
  useFrame(({ clock }) => {
    const lvl = levelRef.current
    mats.current.forEach((m) => m && (m.emissiveIntensity = 0.2 + lvl * 2.5))
    pulses.current.forEach((p, i) => {
      if (!p) return
      const a = xs[i]
      const b = xs[i + 1]
      const t = (clock.elapsedTime * 1.4 + i * 0.37) % 1
      p.position.x = a + (b - a) * t
      p.visible = lvl > 0.02
      p.scale.setScalar(0.6 + lvl * 1.5)
    })
  })
  return (
    <group>
      {xs.slice(0, -1).map((a, i) => {
        const b = xs[i + 1]
        return (
          <group key={i}>
            <mesh position={[(a + b) / 2, 0.03, 0.62]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.012, 0.012, Math.abs(b - a), 8]} />
              <meshStandardMaterial ref={(m) => void (m && (mats.current[i] = m))} color="#111827" emissive="#facc15" emissiveIntensity={0.2} />
            </mesh>
            <mesh ref={(m) => void (m && (pulses.current[i] = m))} position={[a, 0.03, 0.62]}>
              <sphereGeometry args={[0.03, 10, 10]} />
              <meshBasicMaterial color="#fde68a" />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

/** Handles pedal drags on an invisible ground plane so the pedal follows the pointer along the board. */
function DragLayer({ drag, onMoveX, onEnd, controls }: { drag: DragState | null; onMoveX: (x: number) => void; onEnd: () => void; controls: React.RefObject<OrbitControlsImpl | null> }) {
  useFrame(() => {
    if (controls.current) controls.current.enabled = !drag
  })
  if (!drag) return null
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.2, 0]}
      onPointerMove={(e) => onMoveX(e.point.x)}
      onPointerUp={onEnd}
      onPointerLeave={onEnd}
    >
      <planeGeometry args={[80, 80]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}

export function Board({ chain, selected, onSelect, onToggle, onKnob, onMove, levelRef, hideTypes = false }: Props) {
  const controls = useRef<OrbitControlsImpl>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [dragX, setDragX] = useState(0)

  const xs = useMemo(() => {
    const out: number[] = []
    let x = 0
    for (const p of chain) {
      const def = pedalDef(p.type)
      const big = def.category === 'amp' || def.category === 'cab'
      const w = big ? 2.2 : 1
      x += w / 2
      out.push(x)
      x += w / 2 + 0.3
    }
    const total = x
    return out.map((v) => v - total / 2)
  }, [chain])
  const width = Math.max(6, xs.length ? xs[xs.length - 1] - xs[0] + 4 : 6)
  const cableXs = [xs[0] - 1.6, ...xs, (xs[xs.length - 1] ?? 0) + 1.6]

  const endDrag = () => {
    if (!drag) return
    const i = chain.findIndex((p) => p.uid === drag.uid)
    const currentX = xs[i] + (dragX - drag.pointerStartX)
    // Insert before the first pedal whose slot center is to the right of where we dropped.
    let insert = chain.length
    for (let k = 0; k < chain.length; k++) {
      if (k === i) continue
      if (currentX < xs[k]) {
        insert = k
        break
      }
    }
    // The guitar stays first.
    insert = Math.max(1, insert)
    if (insert !== i && insert !== i + 1) onMove(drag.uid, insert)
    setDrag(null)
    setDragX(0)
    document.body.style.cursor = ''
  }

  return (
    <Canvas shadows camera={{ fov: 40, position: [0, 5.2, 6.2], near: 0.1, far: 60 }} dpr={[1, 2]} onPointerMissed={() => onSelect(null)}>
      <color attach="background" args={['#0a0d12']} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 8, 4]} intensity={1.4} castShadow shadow-mapSize={[2048, 2048]} />
      <pointLight position={[-4, 3, 2]} intensity={5} color="#ffd9b0" distance={14} />
      <mesh position={[0, -0.06, 0.1]} receiveShadow>
        <boxGeometry args={[width, 0.12, 3]} />
        <meshStandardMaterial color="#1f2328" roughness={0.9} />
      </mesh>
      <Text position={[xs[0] - 1.9 || -3, 0.02, 0.62]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.14} color="#8b94a5" anchorX="center">
        in →
      </Text>
      <Text position={[(xs[xs.length - 1] ?? 0) + 1.9, 0.02, 0.62]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.14} color="#8b94a5" anchorX="center">
        → speakers
      </Text>
      <Cables xs={cableXs} levelRef={levelRef} />
      {chain.map((p, i) => (
        <Pedal
          key={p.uid}
          p={p}
          x={xs[i]}
          selected={p.uid === selected}
          hidden={hideTypes && !pedalDef(p.type).fixed && pedalDef(p.type).category !== 'amp' && pedalDef(p.type).category !== 'cab'}
          onSelect={() => onSelect(p.uid)}
          onToggle={() => onToggle(p.uid)}
          onKnob={(id, t) => onKnob(p.uid, id, t)}
          onDragStart={(e) => {
            setDrag({ uid: p.uid, startX: xs[i], pointerStartX: e.point.x })
            setDragX(e.point.x)
            document.body.style.cursor = 'grabbing'
          }}
          dragOffset={drag?.uid === p.uid ? dragX - drag.pointerStartX : 0}
        />
      ))}
      <DragLayer drag={drag} onMoveX={setDragX} onEnd={endDrag} controls={controls} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.13, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#0e1219" roughness={1} />
      </mesh>
      <OrbitControls ref={controls} makeDefault enableDamping maxPolarAngle={Math.PI * 0.48} minDistance={2} maxDistance={16} target={[0, 0, 0]} />
    </Canvas>
  )
}
