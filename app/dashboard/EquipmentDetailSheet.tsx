'use client'

import { useEffect, useRef, useState } from 'react'
import EquipmentIcon from './EquipmentIcon'
import { tierColor } from './theme'
import type { EquipmentSlotModel } from './equipment'

type Props = {
  slot: EquipmentSlotModel
  onClose: () => void
}

export default function EquipmentDetailSheet({ slot, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const dragStartY = useRef<number | null>(null)
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragStartY.current = e.clientY
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartY.current === null) return
    setDragY(Math.max(0, e.clientY - dragStartY.current))
  }
  const handlePointerUp = () => {
    setDragging(false)
    dragStartY.current = null
    if (dragY > 90) onClose()
    else setDragY(0)
  }

  const equipped = slot.tierIdx >= 0
  const color = equipped ? tierColor(slot.tierName) : 'var(--dink-muted)'

  return (
    <div className="fixed inset-0 z-50">
      <div className="sq-sheet-overlay" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${slot.label} equipment details`}
        className="sq-sheet"
        style={{
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: dragging ? 'none' : 'transform 0.2s ease',
        }}
      >
        {/* Drag handle (mobile) */}
        <div
          className="flex justify-center pt-2 pb-1 md:hidden"
          style={{ touchAction: 'none', cursor: 'grab' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          aria-hidden="true"
        >
          <div
            style={{
              width: '40px',
              height: '4px',
              borderRadius: '2px',
              background: 'var(--dbevel-light)',
            }}
          />
        </div>

        <div className="px-4 pb-6 pt-2 md:pt-4 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <EquipmentIcon slot={slot.slot} color={color} empty={!equipped} size={36} />
              <div className="min-w-0">
                <h2 className="sq-heading truncate">
                  {slot.itemName ?? `${slot.label} — Empty`}
                </h2>
                <p className="sq-label mt-0.5">{slot.sourceLabel}</p>
              </div>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="sq-panel-raised shrink-0 flex items-center justify-center"
              style={{ width: '44px', height: '44px', color: 'var(--dink)', fontSize: '15px' }}
            >
              ✕
            </button>
          </div>

          {/* Empty-slot hook */}
          {!equipped && slot.emptyText && (
            <p style={{ fontSize: '15px', color: 'var(--dink-muted)' }}>{slot.emptyText}</p>
          )}

          {/* Item ladder */}
          {slot.ladder.length > 0 && (
            <div>
              <p className="sq-label mb-2">Armory</p>
              <div
                className="sq-panel-raised divide-y overflow-y-auto"
                style={{ borderColor: 'var(--dbevel-dark)', maxHeight: '40vh' }}
                role="list"
                aria-label={`${slot.label} item ladder`}
              >
                {slot.ladder.map((rung, i) => {
                  const isCurrent = i === slot.tierIdx
                  return (
                    <div
                      key={rung.tier}
                      role="listitem"
                      className="flex items-center gap-3 px-3 py-2"
                      style={{
                        borderColor: 'var(--dbevel-dark)',
                        opacity: rung.unlocked ? 1 : 0.4,
                        background: isCurrent ? 'var(--dbg)' : undefined,
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '2px',
                          background: tierColor(rung.tier),
                          flexShrink: 0,
                        }}
                      />
                      <span
                        className="truncate"
                        style={{ fontSize: '15px', color: 'var(--dink)' }}
                      >
                        {rung.itemName}
                      </span>
                      <span
                        className="sq-label ml-auto shrink-0"
                        style={{ color: isCurrent ? 'var(--dgold)' : 'var(--dink-muted)' }}
                      >
                        {isCurrent ? 'Equipped' : rung.unlocked ? 'Owned' : 'Locked'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Next unlock */}
          {slot.nextUnlockText && (
            <p className="sq-num" style={{ fontSize: '13px', color: 'var(--dgold)' }}>
              Next unlock: {slot.nextUnlockText}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
