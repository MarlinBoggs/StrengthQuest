'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  calculateStrengthSetXp,
  calculateCardioSetXp,
  type CardioIntensity,
} from '@/lib/utils/calculate-xp'
import { logWorkout, type WorkoutResult } from './actions'
import PostWorkoutSummary from './PostWorkoutSummary'
import ExerciseCard from './ExerciseCard'
import SessionXpHeader from './SessionXpHeader'
import {
  emptyCardioSet,
  emptyEntry,
  emptySet,
  type ActiveXpDrop,
  type CardioSetEntry,
  type Exercise,
  type ExerciseEntry,
  type SetEntry,
} from './form-types'

const DRAFT_STORAGE_PREFIX = 'sq:workout-draft:'
const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000

// Session XP is derived from `exercises`, so drafts only need the entries + date.
// Older drafts may carry an extra `sessionSkillXp` key — it is simply ignored on read.
type DraftPayload = {
  exercises: ExerciseEntry[]
  date: string
  savedAt: number
}

function formatRelativeTime(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  return `${hours} hr ago`
}

type Props = {
  characterId: string
  bodyweightLbs: number
  allExercises: Exercise[]
  skillNames: Record<number, string>
  skillColors: Record<number, string>
  skillOrder: number[]
  skillXp: Record<number, { currentXp: number; currentLevel: number }>
}

export default function WorkoutForm({
  characterId,
  bodyweightLbs,
  allExercises,
  skillNames,
  skillColors,
  skillOrder,
  skillXp,
}: Props) {
  const draftKey = `${DRAFT_STORAGE_PREFIX}${characterId}`

  const [workoutDate, setWorkoutDate] = useState(() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  })
  const [exercises, setExercises] = useState<ExerciseEntry[]>([emptyEntry()])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<WorkoutResult | null>(null)
  const [activeDrops, setActiveDrops] = useState<ActiveXpDrop[]>([])
  const [draftRestore, setDraftRestore] = useState<{ draft: DraftPayload; ageMs: number } | null>(null)
  const [draftHydrated, setDraftHydrated] = useState(false)
  const xpDropIdRef = useRef(0)

  // --- Helpers ---
  const getExerciseInfo = (exerciseId: string) => {
    if (!exerciseId) return null
    return allExercises.find((e) => e.id === parseInt(exerciseId)) ?? null
  }

  const getExerciseSkillId = (exerciseId: string) => {
    return getExerciseInfo(exerciseId)?.skill_id ?? null
  }

  // Per-skill session XP, derived from completed sets — `exercises` is the single
  // source of truth, so bars can never desync from what's actually marked done.
  const sessionSkillXp = useMemo(() => {
    const totals: Record<number, number> = {}
    for (const ex of exercises) {
      const skillId = getExerciseSkillId(ex.exerciseId)
      if (!skillId) continue
      const list = ex.mode === 'cardio' ? ex.cardioSets : ex.sets
      for (const s of list) {
        if (s.completed) totals[skillId] = (totals[skillId] ?? 0) + s.xpAwarded
      }
    }
    return totals
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercises, allExercises])

  const completedSetCount = exercises.reduce(
    (total, exercise) =>
      exercise.mode === 'cardio'
        ? total + exercise.cardioSets.filter((cs) => cs.completed).length
        : total + exercise.sets.filter((set) => set.completed).length,
    0
  )

  const totalWeightLifted = exercises.reduce((sum, ex) =>
    sum + ex.sets.filter(s => s.completed).reduce((s2, set) => {
      const w = parseFloat(set.weight) || 0
      const r = parseInt(set.reps) || 0
      return s2 + w * r
    }, 0), 0)

  const hasAnySelectedExercise = exercises.some((ex) => ex.exerciseId !== '')

  // --- localStorage draft: read on mount ---
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(draftKey)
      if (!raw) {
        setDraftHydrated(true)
        return
      }
      const draft = JSON.parse(raw) as DraftPayload
      const ageMs = Date.now() - (draft.savedAt ?? 0)
      if (ageMs > DRAFT_MAX_AGE_MS || !Array.isArray(draft?.exercises)) {
        window.localStorage.removeItem(draftKey)
        setDraftHydrated(true)
        return
      }
      setDraftRestore({ draft, ageMs })
    } catch {
      window.localStorage.removeItem(draftKey)
      setDraftHydrated(true)
    }
  }, [draftKey])

  // --- localStorage draft: write on every meaningful change ---
  useEffect(() => {
    if (!draftHydrated) return
    const anyContent =
      exercises.some((ex) => ex.exerciseId !== '') ||
      exercises.some((ex) =>
        ex.mode === 'cardio'
          ? ex.cardioSets.some((cs) => cs.completed)
          : ex.sets.some((s) => s.completed)
      )
    if (!anyContent) {
      window.localStorage.removeItem(draftKey)
      return
    }
    const payload: DraftPayload = {
      exercises,
      date: workoutDate,
      savedAt: Date.now(),
    }
    try {
      window.localStorage.setItem(draftKey, JSON.stringify(payload))
    } catch {
      // quota or serialization failure — drop silently
    }
  }, [exercises, workoutDate, draftKey, draftHydrated])

  const restoreDraft = () => {
    if (!draftRestore) return
    setExercises(draftRestore.draft.exercises)
    setWorkoutDate(draftRestore.draft.date)
    setDraftRestore(null)
    setDraftHydrated(true)
  }

  const discardDraft = () => {
    window.localStorage.removeItem(draftKey)
    setDraftRestore(null)
    setDraftHydrated(true)
  }

  // --- Dev: preset keyboard shortcuts (Ctrl+1..6) ---
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return

    const findId = (name: string) => {
      const ex = allExercises.find((e) => e.name.toLowerCase() === name.toLowerCase())
      return ex ? String(ex.id) : ''
    }
    const findSkillType = (name: string) => {
      const ex = allExercises.find((e) => e.name.toLowerCase() === name.toLowerCase())
      if (!ex) return 'strength'
      return ex.tracks_duration ? 'cardio' : 'strength'
    }
    const s = (w: string, r: string, rpe = ''): SetEntry => ({ weight: w, reps: r, rpe, completed: false, xpAwarded: 0 })
    const c = (dur: string, int: 'low' | 'med' | 'high' = 'med'): CardioSetEntry => ({ durationMinutes: dur, intensity: int, completed: false, xpAwarded: 0 })
    const mkEntry = (name: string, sets: SetEntry[] = [], cardioSets: CardioSetEntry[] = []): ExerciseEntry => ({
      exerciseId: findId(name),
      mode: findSkillType(name) as 'strength' | 'cardio',
      sets: sets.length ? sets : [emptySet()],
      cardioSets: cardioSets.length ? cardioSets : [emptyCardioSet()],
    })

    const presets: Record<string, ExerciseEntry[]> = {
      '1': [ // Push Day
        mkEntry('Barbell Bench Press', [s('225', '5', '8'), s('225', '5', '8.5'), s('245', '3', '9')]),
        mkEntry('Incline Dumbbell Bench Press', [s('75', '8'), s('80', '8'), s('80', '6')]),
        mkEntry('Tricep Extensions', [s('40', '12'), s('45', '10')]),
      ],
      '2': [ // Pull Day
        mkEntry('Conventional Deadlift', [s('315', '5', '7.5'), s('365', '3', '8.5'), s('405', '1', '9.5')]),
        mkEntry('Barbell Row', [s('185', '8'), s('185', '8'), s('195', '6')]),
        mkEntry('Lat Pulldown', [s('150', '10'), s('160', '8')]),
      ],
      '3': [ // Legs Day
        mkEntry('Barbell Back Squat', [s('275', '5', '7'), s('295', '5', '8'), s('315', '3', '9')]),
        mkEntry('Leg Press', [s('450', '10'), s('500', '8'), s('540', '6')]),
        mkEntry('Calf Raises', [s('135', '15'), s('155', '12')]),
      ],
      '4': [ // Cardio Mix
        mkEntry('5K Run', [], [c('30', 'med')]),
        mkEntry('Sprint Intervals', [], [c('3', 'high'), c('4', 'high'), c('3', 'high'), c('4', 'high'), c('3', 'high')]),
        mkEntry('Yoga Session', [], [c('45', 'low')]),
      ],
      '5': [ // Full Mixed
        mkEntry('Barbell Bench Press', [s('205', '8'), s('225', '5')]),
        mkEntry('Barbell Back Squat', [s('255', '8'), s('275', '5')]),
        mkEntry('5K Run', [], [c('25', 'med')]),
        mkEntry('Yoga Session', [], [c('30', 'low')]),
      ],
      '6': [ // Stress Test — 10 sets per skill
        mkEntry('Barbell Bench Press', [
          s('135', '10'), s('155', '8'), s('175', '6'), s('185', '5'), s('205', '3'),
          s('215', '3'), s('225', '1'), s('205', '3'), s('175', '6'), s('155', '8'),
        ]),
        mkEntry('Conventional Deadlift', [
          s('135', '10'), s('185', '8'), s('225', '5'), s('275', '5'), s('315', '3'),
          s('345', '3'), s('365', '1'), s('315', '3'), s('275', '5'), s('225', '8'),
        ]),
        mkEntry('Barbell Back Squat', [
          s('135', '10'), s('185', '8'), s('225', '5'), s('245', '5'), s('275', '3'),
          s('295', '3'), s('315', '1'), s('275', '3'), s('225', '5'), s('185', '8'),
        ]),
        mkEntry('5K Run', [], [
          c('5', 'low'), c('5', 'med'), c('5', 'med'), c('5', 'high'), c('5', 'high'),
          c('4', 'high'), c('4', 'high'), c('3', 'med'), c('3', 'med'), c('3', 'low'),
        ]),
        mkEntry('Sprint Intervals', [], [
          c('2', 'high'), c('3', 'high'), c('2', 'high'), c('3', 'high'), c('2', 'high'),
          c('3', 'high'), c('2', 'high'), c('3', 'high'), c('2', 'high'), c('3', 'high'),
        ]),
        mkEntry('Yoga Session', [], [
          c('5', 'low'), c('5', 'low'), c('5', 'med'), c('5', 'med'), c('5', 'low'),
          c('5', 'low'), c('5', 'med'), c('5', 'low'), c('5', 'low'), c('5', 'low'),
        ]),
      ],
    }

    // Session XP is derived from `exercises`, so pre-completing sets is enough —
    // the header bars pick the XP up automatically.
    const autoComplete = (preset: ExerciseEntry[]): ExerciseEntry[] =>
      preset.map((ex) => {
        const info = allExercises.find((ae) => String(ae.id) === ex.exerciseId)
        if (ex.mode === 'strength') {
          const sets = ex.sets.map((set) => {
            const reps = parseInt(set.reps) || 0
            const weight = parseFloat(set.weight) || 0
            const rpe = set.rpe ? parseFloat(set.rpe) : null
            const xp = calculateStrengthSetXp(weight, reps, rpe, bodyweightLbs, !!info?.is_primary)
            return { ...set, completed: true, xpAwarded: xp }
          })
          return { ...ex, sets }
        } else {
          const cardioSets = ex.cardioSets.map((cs) => {
            const dur = parseInt(cs.durationMinutes) || 0
            const xp = calculateCardioSetXp(dur, cs.intensity as CardioIntensity)
            return { ...cs, completed: true, xpAwarded: xp }
          })
          return { ...ex, cardioSets }
        }
      })

    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey || !presets[e.key]) return
      e.preventDefault()
      setExercises(e.key === '6' ? autoComplete(presets['6']) : presets[e.key])
      setActiveDrops([])
      setError(null)
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [allExercises, bodyweightLbs])

  const createXpDrop = (exerciseIdx: number, setIdx: number, amount: number, colorHex: string) => {
    xpDropIdRef.current += 1
    const id = xpDropIdRef.current
    setActiveDrops((current) => [...current, { id, exerciseIdx, setIdx, amount, colorHex }])
    setTimeout(() => {
      setActiveDrops((current) => current.filter((drop) => drop.id !== id))
    }, 900)
  }

  const markSetCompleted = (exerciseIdx: number, setIdx: number) => {
    const exercise = exercises[exerciseIdx]
    const set = exercise.sets[setIdx]
    const reps = parseInt(set.reps)
    const weight = set.weight === '' ? 0 : parseFloat(set.weight)

    if (isNaN(reps) || reps <= 0) {
      setError('Enter reps before marking a set done')
      return
    }
    if (isNaN(weight) || weight < 0) {
      setError('Weight must be 0 or greater')
      return
    }

    if (set.completed) return

    setError(null)
    const info = getExerciseInfo(exercise.exerciseId)
    const rpe = set.rpe ? parseFloat(set.rpe) : null
    const awardedXp = calculateStrengthSetXp(weight, reps, rpe, bodyweightLbs, !!info?.is_primary)
    const skillId = getExerciseSkillId(exercise.exerciseId)
    const colorHex = skillId ? skillColors[skillId] : 'var(--dgold)'

    setExercises((current) =>
      current.map((entry, entryIdx) =>
        entryIdx === exerciseIdx
          ? {
              ...entry,
              sets: entry.sets.map((currentSet, currentSetIdx) =>
                currentSetIdx === setIdx
                  ? { ...currentSet, completed: true, xpAwarded: awardedXp }
                  : currentSet
              ),
            }
          : entry
      )
    )
    createXpDrop(exerciseIdx, setIdx, awardedXp, colorHex)
  }

  const markSetEditable = (exerciseIdx: number, setIdx: number) => {
    setExercises((current) =>
      current.map((entry, entryIdx) =>
        entryIdx === exerciseIdx
          ? {
              ...entry,
              sets: entry.sets.map((currentSet, currentSetIdx) =>
                currentSetIdx === setIdx
                  ? { ...currentSet, completed: false, xpAwarded: 0 }
                  : currentSet
              ),
            }
          : entry
      )
    )
  }

  const markCardioSetCompleted = (exerciseIdx: number, setIdx: number) => {
    const exercise = exercises[exerciseIdx]
    const set = exercise.cardioSets[setIdx]
    const duration = parseInt(set.durationMinutes)
    if (isNaN(duration) || duration <= 0) {
      setError('Enter duration before marking done')
      return
    }
    if (set.completed) return
    setError(null)
    const awardedXp = calculateCardioSetXp(duration, set.intensity as CardioIntensity)
    const skillId = getExerciseSkillId(exercise.exerciseId)
    const colorHex = skillId ? skillColors[skillId] : 'var(--dgold)'
    setExercises((current) =>
      current.map((entry, idx) =>
        idx === exerciseIdx
          ? { ...entry, cardioSets: entry.cardioSets.map((cs, i) => i === setIdx ? { ...cs, completed: true, xpAwarded: awardedXp } : cs) }
          : entry
      )
    )
    createXpDrop(exerciseIdx, setIdx, awardedXp, colorHex)
  }

  const markCardioSetEditable = (exerciseIdx: number, setIdx: number) => {
    setExercises((current) =>
      current.map((entry, idx) =>
        idx === exerciseIdx
          ? { ...entry, cardioSets: entry.cardioSets.map((cs, i) => i === setIdx ? { ...cs, completed: false, xpAwarded: 0 } : cs) }
          : entry
      )
    )
  }

  const addCardioSet = (exerciseIdx: number) => {
    const updated = [...exercises]
    const lastSet = updated[exerciseIdx].cardioSets[updated[exerciseIdx].cardioSets.length - 1]
    updated[exerciseIdx] = {
      ...updated[exerciseIdx],
      cardioSets: [...updated[exerciseIdx].cardioSets, { ...lastSet, completed: false, xpAwarded: 0 }],
    }
    setExercises(updated)
  }

  const removeCardioSet = (exerciseIdx: number, setIdx: number) => {
    const updated = [...exercises]
    updated[exerciseIdx] = {
      ...updated[exerciseIdx],
      cardioSets:
        updated[exerciseIdx].cardioSets.length > 1
          ? updated[exerciseIdx].cardioSets.filter((_, i) => i !== setIdx)
          : [emptyCardioSet()],
    }
    setExercises(updated)
  }

  // --- Exercise/Set management ---
  const addExercise = () => {
    setExercises([...exercises, emptyEntry()])
  }

  const removeExercise = (idx: number) => {
    setExercises((current) =>
      current.length > 1 ? current.filter((_, i) => i !== idx) : [emptyEntry()]
    )
  }

  const updateExerciseId = (idx: number, id: string) => {
    const updated = [...exercises]
    const info = id ? allExercises.find((e) => e.id === parseInt(id)) : null
    const mode: 'strength' | 'cardio' = info?.tracks_duration ? 'cardio' : 'strength'
    updated[idx] = { ...updated[idx], exerciseId: id, mode }
    setExercises(updated)
  }

  const addSet = (exerciseIdx: number) => {
    const updated = [...exercises]
    updated[exerciseIdx] = {
      ...updated[exerciseIdx],
      sets: [
        ...updated[exerciseIdx].sets,
        {
          ...updated[exerciseIdx].sets[updated[exerciseIdx].sets.length - 1],
          completed: false,
          xpAwarded: 0,
        },
      ],
    }
    setExercises(updated)
  }

  const removeSet = (exerciseIdx: number, setIdx: number) => {
    const updated = [...exercises]
    updated[exerciseIdx] = {
      ...updated[exerciseIdx],
      sets:
        updated[exerciseIdx].sets.length > 1
          ? updated[exerciseIdx].sets.filter((_, i) => i !== setIdx)
          : [emptySet()],
    }
    setExercises(updated)
  }

  const updateSet = (
    exerciseIdx: number,
    setIdx: number,
    field: 'weight' | 'reps' | 'rpe',
    value: string
  ) => {
    const updated = [...exercises]
    updated[exerciseIdx] = {
      ...updated[exerciseIdx],
      sets: updated[exerciseIdx].sets.map((s, i) =>
        i === setIdx
          ? { ...s, [field]: value, completed: false, xpAwarded: 0 }
          : s
      ),
    }
    setExercises(updated)
  }

  const updateCardioSet = (
    exerciseIdx: number,
    setIdx: number,
    field: 'durationMinutes' | 'intensity',
    value: string
  ) => {
    const updated = [...exercises]
    updated[exerciseIdx] = {
      ...updated[exerciseIdx],
      cardioSets: updated[exerciseIdx].cardioSets.map((cs, i) =>
        i === setIdx ? { ...cs, [field]: value, completed: false, xpAwarded: 0 } : cs
      ),
    }
    setExercises(updated)
  }

  const toggleSet = (exerciseIdx: number, setIdx: number) => {
    if (exercises[exerciseIdx].sets[setIdx].completed) markSetEditable(exerciseIdx, setIdx)
    else markSetCompleted(exerciseIdx, setIdx)
  }

  const toggleCardioSet = (exerciseIdx: number, setIdx: number) => {
    if (exercises[exerciseIdx].cardioSets[setIdx].completed) markCardioSetEditable(exerciseIdx, setIdx)
    else markCardioSetCompleted(exerciseIdx, setIdx)
  }

  // --- Submit ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const filled = exercises.filter((ex) => ex.exerciseId !== '')
    if (filled.length === 0) {
      setError('Please select at least one exercise')
      return
    }

    setLoading(true)

    try {
      const strengthExercises = filled
        .filter((ex) => ex.mode === 'strength')
        .map((ex) => ({
          exerciseId: parseInt(ex.exerciseId),
          sets: ex.sets.map((s) => ({
            weight: s.weight === '' ? 0 : parseFloat(s.weight),
            reps: parseInt(s.reps),
            rpe: s.rpe ? parseFloat(s.rpe) : null,
          })),
        }))

      const cardioExercises = filled
        .filter((ex) => ex.mode === 'cardio')
        .map((ex) => {
          const totalDuration = ex.cardioSets.reduce((sum, cs) => sum + (parseInt(cs.durationMinutes) || 0), 0)
          const highestIntensity = ex.cardioSets.some((cs) => cs.intensity === 'high')
            ? 'high' as const
            : ex.cardioSets.some((cs) => cs.intensity === 'med')
              ? 'med' as const
              : 'low' as const
          return {
            exerciseId: parseInt(ex.exerciseId),
            durationMinutes: totalDuration,
            intensity: highestIntensity,
          }
        })

      const payload = {
        characterId,
        workoutDate,
        strengthExercises,
        cardioExercises,
      }

      const res = await logWorkout(payload)

      if ('error' in res) {
        setError(res.error)
        setLoading(false)
      } else {
        try {
          window.localStorage.removeItem(draftKey)
        } catch {
          // ignore
        }
        setResult(res)
        setLoading(false)
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
      setLoading(false)
    }
  }

  const resetForm = () => {
    setResult(null)
    setExercises([emptyEntry()])
    setActiveDrops([])
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    setWorkoutDate(`${year}-${month}-${day}`)
  }

  // --- Render ---
  return (
    <>
      {result && (
        <PostWorkoutSummary
          result={result}
          skillNames={skillNames}
          onLogAnother={resetForm}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {draftRestore && (
          <div className="sq-panel-raised p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--dgold)' }}>
                Resume in-progress workout?
              </p>
              <p className="mt-1" style={{ fontSize: '13px', color: 'var(--dink-muted)' }}>
                Saved {formatRelativeTime(draftRestore.ageMs)}.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={restoreDraft}
                className="sq-btn-gold px-4 font-bold uppercase tracking-wider"
                style={{ fontSize: '13px', minHeight: '44px' }}
              >
                Resume
              </button>
              <button
                type="button"
                onClick={discardDraft}
                className="sq-bevel-in px-4 font-semibold uppercase tracking-wider"
                style={{ fontSize: '13px', minHeight: '44px', color: 'var(--dink-muted)', background: 'var(--dbg)' }}
              >
                Discard
              </button>
            </div>
          </div>
        )}

        <SessionXpHeader
          visible={hasAnySelectedExercise}
          sessionSkillXp={sessionSkillXp}
          skillXp={skillXp}
          skillNames={skillNames}
          skillColors={skillColors}
          completedSetCount={completedSetCount}
          totalWeightLifted={totalWeightLifted}
        />

        {error && (
          <div
            className="rounded p-4"
            style={{
              background: 'rgba(220, 38, 38, 0.1)',
              border: '1px solid rgba(220, 38, 38, 0.3)',
            }}
          >
            <p style={{ fontSize: '15px', fontWeight: 500, color: '#fca5a5' }}>{error}</p>
          </div>
        )}

        {/* Date */}
        <div>
          <label htmlFor="date" className="sq-label block mb-2">
            Date
          </label>
          <input
            type="date"
            id="date"
            value={workoutDate}
            onChange={(e) => setWorkoutDate(e.target.value)}
            className="sq-input w-full px-3 py-2"
            disabled={loading}
          />
        </div>

        {/* Exercises */}
        <div className="space-y-4">
          {exercises.map((exercise, exIdx) => {
            const skillId = getExerciseSkillId(exercise.exerciseId)
            return (
              <ExerciseCard
                key={exIdx}
                exercise={exercise}
                loading={loading}
                skillId={skillId}
                skillName={skillId ? skillNames[skillId] ?? null : null}
                skillColor={skillId ? skillColors[skillId] ?? null : null}
                drops={activeDrops.filter((d) => d.exerciseIdx === exIdx)}
                allExercises={allExercises}
                skillNames={skillNames}
                skillOrder={skillOrder}
                onSelectExercise={(id) => updateExerciseId(exIdx, id)}
                onRemoveExercise={() => removeExercise(exIdx)}
                onUpdateSet={(setIdx, field, value) => updateSet(exIdx, setIdx, field, value)}
                onToggleSet={(setIdx) => toggleSet(exIdx, setIdx)}
                onRemoveSet={(setIdx) => removeSet(exIdx, setIdx)}
                onAddSet={() => addSet(exIdx)}
                onUpdateCardioSet={(setIdx, field, value) => updateCardioSet(exIdx, setIdx, field, value)}
                onToggleCardioSet={(setIdx) => toggleCardioSet(exIdx, setIdx)}
                onRemoveCardioSet={(setIdx) => removeCardioSet(exIdx, setIdx)}
                onAddCardioSet={() => addCardioSet(exIdx)}
              />
            )
          })}

          <button
            type="button"
            onClick={addExercise}
            className="w-full rounded font-semibold uppercase tracking-wider transition-colors"
            style={{
              fontSize: '13px',
              minHeight: '48px',
              border: '2px dashed var(--dbevel-light)',
              color: 'var(--dink-muted)',
              background: 'transparent',
            }}
            disabled={loading}
          >
            + Add Exercise
          </button>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !hasAnySelectedExercise}
          className="sq-btn-gold w-full font-bold uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ fontSize: '15px', minHeight: '48px' }}
        >
          {loading ? 'Logging Workout...' : 'Complete Workout'}
        </button>
      </form>
    </>
  )
}
