'use client'

import CardioSetRow from './CardioSetRow'
import ExercisePickerButton from './ExercisePickerButton'
import SetRow from './SetRow'
import {
  formatDaysAgo,
  formatLastPerformanceSummary,
  isEntryUntouched,
  type ActiveXpDrop,
  type Exercise,
  type ExerciseEntry,
  type LastPerformance,
} from './form-types'

type Props = {
  exercise: ExerciseEntry
  loading: boolean
  skillId: number | null
  skillName: string | null
  skillColor: string | null
  drops: ActiveXpDrop[]
  allExercises: Exercise[]
  skillNames: Record<number, string>
  skillOrder: number[]
  lastPerformanceByExercise: Record<string, LastPerformance>
  onPrefill: () => void
  onSelectExercise: (exerciseId: string) => void
  onRemoveExercise: () => void
  onUpdateSet: (setIdx: number, field: 'weight' | 'reps' | 'rpe', value: string) => void
  onToggleSet: (setIdx: number) => void
  onRemoveSet: (setIdx: number) => void
  onAddSet: () => void
  onUpdateCardioSet: (setIdx: number, field: 'durationMinutes' | 'intensity', value: string) => void
  onToggleCardioSet: (setIdx: number) => void
  onRemoveCardioSet: (setIdx: number) => void
  onAddCardioSet: () => void
}

export default function ExerciseCard({
  exercise,
  loading,
  skillId,
  skillName,
  skillColor,
  drops,
  allExercises,
  skillNames,
  skillOrder,
  lastPerformanceByExercise,
  onPrefill,
  onSelectExercise,
  onRemoveExercise,
  onUpdateSet,
  onToggleSet,
  onRemoveSet,
  onAddSet,
  onUpdateCardioSet,
  onToggleCardioSet,
  onRemoveCardioSet,
  onAddCardioSet,
}: Props) {
  const isCardio = exercise.mode === 'cardio'
  const lastPerformance = lastPerformanceByExercise[exercise.exerciseId] ?? null
  const showPrefill = !!exercise.exerciseId && !!lastPerformance && isEntryUntouched(exercise)

  return (
    <div
      className="sq-panel p-3 sm:p-4"
      style={skillColor ? { borderLeft: `3px solid ${skillColor}` } : undefined}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex flex-1 min-w-0 items-center gap-2">
          <ExercisePickerButton
            exerciseId={exercise.exerciseId}
            allExercises={allExercises}
            skillNames={skillNames}
            skillOrder={skillOrder}
            lastPerformanceByExercise={lastPerformanceByExercise}
            disabled={loading}
            onSelect={onSelectExercise}
          />
          {skillId && skillName && (
            <span
              className="hidden sm:inline-flex shrink-0 font-semibold px-2 py-0.5 rounded"
              style={{
                fontSize: '13px',
                backgroundColor: `${skillColor}20`,
                color: skillColor ?? 'var(--dink)',
              }}
            >
              {skillName}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onRemoveExercise}
          className="shrink-0 flex items-center justify-center font-medium transition-colors"
          style={{ fontSize: '13px', minHeight: '44px', minWidth: '44px', color: 'var(--dink-muted)' }}
          disabled={loading}
          aria-label="Remove exercise"
        >
          Remove
        </button>
      </div>

      {showPrefill && lastPerformance && (
        <button
          type="button"
          onClick={onPrefill}
          className="w-full flex items-center justify-between gap-2 mb-3 px-3 py-2 rounded transition-colors"
          style={{ fontSize: '13px', minHeight: '44px', background: 'var(--dbg)', border: '1px dashed var(--dbevel-light)' }}
          disabled={loading}
        >
          <span className="truncate" style={{ color: 'var(--dink-muted)' }}>
            Last: {formatLastPerformanceSummary(lastPerformance)} · {formatDaysAgo(lastPerformance.workoutDate)}
          </span>
          <span className="shrink-0 font-semibold uppercase tracking-wider" style={{ color: 'var(--dgold)' }}>
            Prefill
          </span>
        </button>
      )}

      <div className="space-y-1">
        {isCardio
          ? exercise.cardioSets.map((cSet, setIdx) => (
              <CardioSetRow
                key={setIdx}
                set={cSet}
                setIdx={setIdx}
                loading={loading}
                drops={drops}
                onUpdate={(field, value) => onUpdateCardioSet(setIdx, field, value)}
                onToggle={() => onToggleCardioSet(setIdx)}
                onRemove={() => onRemoveCardioSet(setIdx)}
              />
            ))
          : exercise.sets.map((set, setIdx) => (
              <SetRow
                key={setIdx}
                set={set}
                setIdx={setIdx}
                loading={loading}
                drops={drops}
                onUpdate={(field, value) => onUpdateSet(setIdx, field, value)}
                onToggle={() => onToggleSet(setIdx)}
                onRemove={() => onRemoveSet(setIdx)}
              />
            ))}
      </div>

      <div className="mt-2">
        <button
          type="button"
          onClick={isCardio ? onAddCardioSet : onAddSet}
          className="sq-label px-1.5 transition-colors"
          style={{ minHeight: '44px', color: 'var(--dink-muted)' }}
          disabled={loading}
        >
          + Add Set
        </button>
      </div>
    </div>
  )
}
