'use client'

import { useRef, useState } from 'react'
import ExercisePickerSheet from './ExercisePickerSheet'
import type { Exercise, LastPerformance } from './form-types'

type Props = {
  exerciseId: string
  allExercises: Exercise[]
  skillNames: Record<number, string>
  skillOrder: number[]
  lastPerformanceByExercise: Record<string, LastPerformance>
  disabled: boolean
  onSelect: (exerciseId: string) => void
}

export default function ExercisePickerButton({
  exerciseId,
  allExercises,
  skillNames,
  skillOrder,
  lastPerformanceByExercise,
  disabled,
  onSelect,
}: Props) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const selected = exerciseId
    ? allExercises.find((ex) => ex.id === parseInt(exerciseId)) ?? null
    : null

  const close = () => {
    setOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        aria-haspopup="dialog"
        className="sq-input w-full min-w-0 flex-1 flex items-center justify-between gap-2 px-3 text-left"
        style={{ minHeight: '44px', color: selected ? 'var(--dink)' : 'var(--dink-muted)' }}
      >
        <span className="truncate">
          {selected ? (
            <>
              {selected.name}
              {selected.is_primary && ' ⚔'}
            </>
          ) : (
            'Select exercise'
          )}
        </span>
        <span aria-hidden="true" style={{ color: 'var(--dink-muted)' }}>▾</span>
      </button>

      {open && (
        <ExercisePickerSheet
          allExercises={allExercises}
          skillNames={skillNames}
          skillOrder={skillOrder}
          lastPerformanceByExercise={lastPerformanceByExercise}
          currentId={exerciseId}
          onSelect={(id) => {
            onSelect(id)
            close()
          }}
          onClose={close}
        />
      )}
    </>
  )
}
