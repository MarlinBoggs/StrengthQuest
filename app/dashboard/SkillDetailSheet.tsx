'use client'

import { useEffect, useRef, useState } from 'react'
import { tierColor, type SkillPanelModel } from './theme'

type Props = {
  skill: SkillPanelModel
  onClose: () => void
}

export default function SkillDetailSheet({ skill, onClose }: Props) {
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

  const color = tierColor(skill.tierName)

  // Six-notch window of the tier ladder containing the current tier
  const total = skill.tierNames.length
  const windowStart = Math.min(
    Math.max(0, skill.currentTierIdx - 2),
    Math.max(0, total - 6)
  )
  const ladder = skill.tierNames.slice(windowStart, windowStart + 6)
  const nextTierName = skill.tierNames[skill.currentTierIdx + 1] ?? null

  return (
    <div className="fixed inset-0 z-50">
      <div className="sq-sheet-overlay" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${skill.name} skill details`}
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
              <h2 className="sq-heading truncate">{skill.name}</h2>
              {skill.tierName && (
                <span
                  className="sq-label sq-bevel-in px-2 py-1 shrink-0"
                  style={{ color, background: 'var(--dbg)' }}
                >
                  {skill.tierName}
                </span>
              )}
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

          {/* Hero lift (strength skills only) */}
          {skill.hero && (
            <div className="sq-panel-raised p-4 space-y-3">
              <p className="sq-label" style={{ color: 'var(--dgold)' }}>
                ♛ {skill.hero.exerciseName}
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <p className="sq-label">Best Set</p>
                  <p className="sq-num" style={{ color: 'var(--dink)' }}>
                    {skill.hero.bestWeight} × {skill.hero.bestReps}
                  </p>
                </div>
                <div>
                  <p className="sq-label">Max</p>
                  <p className="sq-num" style={{ color: 'var(--dink)' }}>
                    {skill.hero.maxWeight !== null ? `${skill.hero.maxWeight} lbs` : '—'}
                  </p>
                </div>
                <div>
                  <p className="sq-label">Est. 1RM</p>
                  <p className="sq-num" style={{ color: 'var(--dink)' }}>
                    {skill.hero.est1rm} lbs
                  </p>
                </div>
                <div>
                  <p className="sq-label">×BW</p>
                  <p className="sq-num" style={{ color: 'var(--dink)' }}>
                    {skill.hero.bwRatio !== null ? `${skill.hero.bwRatio.toFixed(2)}×` : '—'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tier ladder */}
          {ladder.length > 0 && (
            <div>
              <p className="sq-label mb-2">Tier</p>
              <div className="flex gap-1.5" role="list" aria-label="Tier ladder">
                {ladder.map((name, i) => {
                  const idx = windowStart + i
                  const isCurrent = idx === skill.currentTierIdx
                  const reached = idx <= skill.currentTierIdx
                  return (
                    <div
                      key={name}
                      role="listitem"
                      aria-label={`${name}${isCurrent ? ' (current)' : ''}`}
                      title={name}
                      className="flex-1"
                      style={{
                        height: '14px',
                        borderRadius: '2px',
                        background: tierColor(name),
                        opacity: reached ? 1 : 0.3,
                        outline: isCurrent ? '2px solid var(--dink)' : 'none',
                        outlineOffset: '1px',
                      }}
                    />
                  )
                })}
              </div>
              <div className="flex justify-between mt-2" style={{ fontSize: '13px' }}>
                <span style={{ color }}>{skill.tierName ?? '—'}</span>
                {nextTierName && (
                  <span style={{ color: 'var(--dink-muted)' }}>
                    {skill.milestoneText ?? `Next: ${nextTierName}`}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Accessories */}
          {skill.accessories.length > 0 && (
            <div>
              <p className="sq-label mb-2">Accessories · {skill.accessories.length}</p>
              <div className="sq-panel-raised divide-y" style={{ borderColor: 'var(--dbevel-dark)' }}>
                {skill.accessories.map((a) => (
                  <div
                    key={a.id}
                    className="flex justify-between items-center gap-3 px-3 py-2.5"
                    style={{ borderColor: 'var(--dbevel-dark)' }}
                  >
                    <span className="truncate" style={{ color: 'var(--dink)' }}>
                      {a.name}
                    </span>
                    <span className="sq-num shrink-0" style={{ color: 'var(--dink-muted)' }}>
                      {a.weight} × {a.reps}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
