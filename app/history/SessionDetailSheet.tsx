'use client'

import { useEffect, useRef, useState } from 'react'
import type { WorkoutSummary } from './types'

type Props = {
  workout: WorkoutSummary
  onClose: () => void
}

function formatFullDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function intensityLabel(intensity: 'low' | 'med' | 'high' | null): string {
  return intensity === 'high' ? 'High' : intensity === 'low' ? 'Low' : 'Med'
}

export default function SessionDetailSheet({ workout, onClose }: Props) {
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

  const skillColor: Record<number, string> = {}
  for (const s of workout.skills) skillColor[s.skill_id] = s.color_hex

  return (
    <div className="fixed inset-0 z-50">
      <div className="sq-sheet-overlay" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Workout session details"
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
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="sq-heading truncate">{formatFullDate(workout.workout_date)}</h2>
              <p className="mt-1" style={{ fontSize: '13px', color: 'var(--dgold)' }}>
                +{workout.total_xp} XP{workout.achieved_pr ? ' · PR!' : ''}
              </p>
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

          {/* Exercises */}
          <div className="space-y-3">
            {workout.exercises.map((ex) => (
              <div
                key={ex.exercise_id}
                className="sq-panel-raised p-3"
                style={{ borderLeft: `3px solid ${skillColor[ex.skill_id] ?? 'var(--dbevel-light)'}` }}
              >
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--dink)' }}>{ex.exercise_name}</p>

                {ex.tracks_duration ? (
                  <p className="mt-1 sq-num" style={{ fontSize: '13px', color: 'var(--dink-muted)' }}>
                    {ex.duration_minutes} min · {intensityLabel(ex.intensity)} intensity
                  </p>
                ) : (
                  <div className="mt-2 space-y-1">
                    {(ex.sets ?? []).map((s) => (
                      <div
                        key={s.set_number}
                        className="flex items-center justify-between gap-2"
                        style={{ fontSize: '13px', color: 'var(--dink-muted)' }}
                      >
                        <span className="sq-num" style={{ color: 'var(--dink)' }}>
                          {s.weight ?? 0} × {s.reps ?? 0}
                        </span>
                        <span className="flex gap-3">
                          {s.rpe != null && <span>RPE {s.rpe}</span>}
                          {s.calculated_1rm != null && <span>~{Math.round(s.calculated_1rm)} 1RM</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
