import { useState } from 'react'
import { pedalDef, type PedalInstance } from '../audio/pedals'

interface Props {
  chain: PedalInstance[]
  selected: string | null
  bypassAll: boolean
  onSelect: (uid: string) => void
  onToggle: (uid: string) => void
  onRemove: (uid: string) => void
  /** Insert the pedal before the item currently at `insertIndex` (chain.length = at the end). */
  onMove: (uid: string, insertIndex: number) => void
  onBypassAll: () => void
  /** Ear training: hide what the mystery pedals are. */
  hideTypes?: boolean
}

/**
 * The editable signal chain: drag a pedal to reorder, or use the arrows.
 * Every pedal carries its own power and remove buttons so nothing is hidden
 * behind a selection step.
 */
export function ChainStrip({ chain, selected, bypassAll, onSelect, onToggle, onRemove, onMove, onBypassAll, hideTypes = false }: Props) {
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver] = useState<number | null>(null)

  const drop = (index: number) => {
    if (dragging) onMove(dragging, index)
    setDragging(null)
    setOver(null)
  }

  return (
    <div className="chain-editor" onDragLeave={() => setOver(null)}>
      <div className="chain-head">
        <span className="dim small">Signal chain · drag to reorder · guitar on the left, speakers on the right</span>
        <button className={`chip ${bypassAll ? 'on' : ''}`} onClick={onBypassAll} title="Hear the dry guitar for comparison">
          {bypassAll ? 'Bypassed: dry guitar' : 'A/B: bypass all'}
        </button>
      </div>
      <div className="chain-row">
        {chain.map((p, i) => {
          const def = pedalDef(p.type)
          const isSel = p.uid === selected
          const fixed = !!def.fixed
          const hidden = hideTypes && !fixed && def.category !== 'amp' && def.category !== 'cab'
          return (
            <div key={p.uid} className="pedal-slot" onDragOver={(e) => {
              e.preventDefault()
              setOver(Math.max(1, i))
            }} onDrop={() => drop(Math.max(1, i))}>
              {over === i && dragging && dragging !== p.uid && i > 0 && <div className="drop-marker" />}
              <div
                className={`pedal-card ${isSel ? 'on' : ''} ${p.enabled ? '' : 'off'} ${dragging === p.uid ? 'dragging' : ''}`}
                style={{ borderColor: isSel ? def.color : undefined, ['--pc' as string]: hidden ? '#374151' : def.color }}
                draggable={!fixed}
                onDragStart={(e) => {
                  if (fixed) return e.preventDefault()
                  setDragging(p.uid)
                  e.dataTransfer.effectAllowed = 'move'
                  e.dataTransfer.setData('text/plain', p.uid)
                }}
                onDragEnd={() => {
                  setDragging(null)
                  setOver(null)
                }}
                onClick={() => onSelect(p.uid)}
                title="Click to inspect · drag to reorder"
              >
                <span className="grip" aria-hidden>
                  ⋮⋮
                </span>
                <span className="swatch" />
                <span className="pname">
                  {i + 1}. {hidden ? '?' : def.name}
                </span>
                {!fixed && (
                <span className="pedal-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="mini" disabled={i <= 1} onClick={() => onMove(p.uid, i - 1)} title="Move earlier (toward the guitar)">
                    ◀
                  </button>
                  <button className="mini" disabled={i === chain.length - 1} onClick={() => onMove(p.uid, i + 2)} title="Move later (toward the speakers)">
                    ▶
                  </button>
                  <button className={`mini power ${p.enabled ? 'on' : ''}`} onClick={() => onToggle(p.uid)} title={p.enabled ? 'Bypass' : 'Turn on'}>
                    ⏻
                  </button>
                  <button className="mini danger" onClick={() => onRemove(p.uid)} title="Remove from the chain">
                    ✕
                  </button>
                </span>
                )}
              </div>
            </div>
          )
        })}
        <div className="pedal-slot end" onDragOver={(e) => {
          e.preventDefault()
          setOver(chain.length)
        }} onDrop={() => drop(chain.length)}>
          {over === chain.length && dragging && <div className="drop-marker" />}
          <span className="endcap dim small">speakers</span>
        </div>
      </div>
    </div>
  )
}
