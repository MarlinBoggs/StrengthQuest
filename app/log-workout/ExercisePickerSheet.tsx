'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { formatDaysAgo, formatLastPerformanceSummary, type Exercise, type LastPerformance } from './form-types'

type Props = {
  allExercises: Exercise[]
  skillNames: Record<number, string>
  skillOrder: number[]
  lastPerformanceByExercise: Record<string, LastPerformance>
  currentId: string
  onSelect: (exerciseId: string) => void
  onClose: () => void
}

export default function ExercisePickerSheet({
  allExercises,
  skillNames,
  skillOrder,
  lastPerformanceByExercise,
  currentId,
  onSelect,
  onClose,
}: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const dragStartY = useRef<number | null>(null)
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [query, setQuery] = useState('')

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

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    return skillOrder
      .map((sid) => ({
        skillId: sid,
        skillName: skillNames[sid] ?? '',
        exercises: allExercises.filter(
          (ex) => ex.skill_id === sid && (q === '' || ex.name.toLowerCase().includes(q))
        ),
      }))
      .filter((g) => g.exercises.length > 0)
  }, [allExercises, skillNames, skillOrder, query])

  return (
    <div className="fixed inset-0 z-50">
      <div className="sq-sheet-overlay" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Select exercise"
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

        <div className="px-4 pb-6 pt-2 md:pt-4 space-y-4">
          {/* Header: search + close */}
          <div className="flex items-center gap-3">
            <input
              type="search"
              placeholder="Search exercises…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="sq-input flex-1 min-w-0 px-3 py-2.5"
              aria-label="Search exercises"
            />
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

          {/* Grouped results */}
          {groups.length > 0 ? (
            groups.map((group) => (
              <div key={group.skillId}>
                <p className="sq-label mb-1.5">{group.skillName}</p>
                <div className="space-y-1">
                  {group.exercises.map((ex) => {
                    const selected = String(ex.id) === currentId
                    const lp = lastPerformanceByExercise[String(ex.id)]
                    return (
                      <button
                        key={ex.id}
                        type="button"
                        onClick={() => onSelect(String(ex.id))}
                        className="w-full flex items-center justify-between gap-3 rounded px-3 py-1.5 text-left transition-colors"
                        style={{
                          fontSize: '15px',
                          minHeight: '44px',
                          color: selected ? 'var(--dgold)' : 'var(--dink)',
                          background: selected ? 'rgba(201, 162, 39, 0.1)' : 'var(--dpanel-raised)',
                          boxShadow: selected ? 'inset 0 0 0 1px rgba(201, 162, 39, 0.35)' : 'none',
                        }}
                        aria-current={selected || undefined}
                      >
                        <span className="flex flex-col min-w-0">
                          <span className="truncate">{ex.name}</span>
                          {lp && (
                            <span className="truncate" style={{ fontSize: '12px', color: 'var(--dink-muted)' }}>
                              Last: {formatLastPerformanceSummary(lp)} · {formatDaysAgo(lp.workoutDate)}
                            </span>
                          )}
                        </span>
                        {ex.is_primary && <span aria-label="Hero lift" title="Hero lift">⚔</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          ) : (
            <p style={{ fontSize: '15px', color: 'var(--dink-muted)' }}>
              No exercises match “{query}”
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
