'use client'

import { useEffect, useRef, useState } from 'react'
import { calculate1RM } from '@/lib/utils/calculate-1rm'
import {
  calculateStrengthSetXp,
  calculateCardioSetXp,
  type CardioIntensity,
} from '@/lib/utils/calculate-xp'
import { XP_THRESHOLDS, getLevelForXp } from '@/lib/utils/xp-thresholds'
import { logWorkout, type WorkoutResult } from './actions'
import PostWorkoutSummary from './PostWorkoutSummary'

const DRAFT_STORAGE_PREFIX = 'sq:workout-draft:'
const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000

type DraftPayload = {
  exercises: ExerciseEntry[]
  sessionSkillXp: Record<number, number>
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

type Exercise = {
  id: number
  name: string
  is_primary: boolean
  skill_id: number
  tracks_duration: boolean
  allows_weight: boolean
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

type SetEntry = {
  weight: string
  reps: string
  rpe: string
  completed: boolean
  xpAwarded: number
}

type CardioSetEntry = {
  durationMinutes: string
  intensity: 'low' | 'med' | 'high'
  completed: boolean
  xpAwarded: number
}

type ExerciseEntry = {
  exerciseId: string
  mode: 'strength' | 'cardio'
  sets: SetEntry[]
  cardioSets: CardioSetEntry[]
}

const emptyCardioSet = (): CardioSetEntry => ({
  durationMinutes: '',
  intensity: 'med',
  completed: false,
  xpAwarded: 0,
})

const emptyEntry = (): ExerciseEntry => ({
  exerciseId: '',
  mode: 'strength',
  sets: [{ weight: '', reps: '', rpe: '', completed: false, xpAwarded: 0 }],
  cardioSets: [emptyCardioSet()],
})

type ActiveXpDrop = {
  id: number
  exerciseIdx: number
  setIdx: number
  amount: number
  colorHex: string
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
  const [sessionSkillXp, setSessionSkillXp] = useState<Record<number, number>>({})
  const [activeDrops, setActiveDrops] = useState<ActiveXpDrop[]>([])
  const [draftRestore, setDraftRestore] = useState<{ draft: DraftPayload; ageMs: number } | null>(null)
  const [draftHydrated, setDraftHydrated] = useState(false)
  const xpDropIdRef = useRef(0)

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
      if (ageMs > DRAFT_MAX_AGE_MS) {
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
      Object.values(sessionSkillXp).some((v) => v > 0)
    if (!anyContent) {
      window.localStorage.removeItem(draftKey)
      return
    }
    const payload: DraftPayload = {
      exercises,
      sessionSkillXp,
      date: workoutDate,
      savedAt: Date.now(),
    }
    try {
      window.localStorage.setItem(draftKey, JSON.stringify(payload))
    } catch {
      // quota or serialization failure — drop silently
    }
  }, [exercises, sessionSkillXp, workoutDate, draftKey, draftHydrated])

  const restoreDraft = () => {
    if (!draftRestore) return
    setExercises(draftRestore.draft.exercises)
    setSessionSkillXp(draftRestore.draft.sessionSkillXp)
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
      sets: sets.length ? sets : [{ weight: '', reps: '', rpe: '', completed: false, xpAwarded: 0 }],
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

    const autoComplete = (preset: ExerciseEntry[]): { entries: ExerciseEntry[], skillTotals: Record<number, number> } => {
      const skillTotals: Record<number, number> = {}
      const entries = preset.map((ex) => {
        const info = allExercises.find((ae) => String(ae.id) === ex.exerciseId)
        const sid = info?.skill_id
        if (ex.mode === 'strength') {
          const sets = ex.sets.map((set) => {
            const reps = parseInt(set.reps) || 0
            const weight = parseFloat(set.weight) || 0
            const rpe = set.rpe ? parseFloat(set.rpe) : null
            const xp = calculateStrengthSetXp(weight, reps, rpe, bodyweightLbs, !!info?.is_primary)
            if (sid) skillTotals[sid] = (skillTotals[sid] ?? 0) + xp
            return { ...set, completed: true, xpAwarded: xp }
          })
          return { ...ex, sets }
        } else {
          const cardioSets = ex.cardioSets.map((cs) => {
            const dur = parseInt(cs.durationMinutes) || 0
            const xp = calculateCardioSetXp(dur, cs.intensity as CardioIntensity)
            if (sid) skillTotals[sid] = (skillTotals[sid] ?? 0) + xp
            return { ...cs, completed: true, xpAwarded: xp }
          })
          return { ...ex, cardioSets }
        }
      })
      return { entries, skillTotals }
    }

    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey || !presets[e.key]) return
      e.preventDefault()
      if (e.key === '6') {
        const { entries, skillTotals } = autoComplete(presets['6'])
        setExercises(entries)
        setSessionSkillXp(skillTotals)
      } else {
        setExercises(presets[e.key])
        setSessionSkillXp({})
      }
      setActiveDrops([])
      setError(null)
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [allExercises, bodyweightLbs])

  // --- Helpers ---
  const getExerciseInfo = (exerciseId: string) => {
    if (!exerciseId) return null
    return allExercises.find((e) => e.id === parseInt(exerciseId)) ?? null
  }

  const getExerciseSkillId = (exerciseId: string) => {
    return getExerciseInfo(exerciseId)?.skill_id ?? null
  }

  const completedSetCount = exercises.reduce(
    (total, exercise) =>
      exercise.mode === 'cardio'
        ? total + exercise.cardioSets.filter((cs) => cs.completed).length
        : total + exercise.sets.filter((set) => set.completed).length,
    0
  )

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
    const colorHex = skillId ? skillColors[skillId] : 'var(--gold)'

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
    if (skillId) {
      setSessionSkillXp((current) => ({ ...current, [skillId]: (current[skillId] ?? 0) + awardedXp }))
    }
    createXpDrop(exerciseIdx, setIdx, awardedXp, colorHex)
  }

  const markSetEditable = (exerciseIdx: number, setIdx: number) => {
    const exercise = exercises[exerciseIdx]
    const awardedXp = exercise.sets[setIdx].xpAwarded
    const skillId = getExerciseSkillId(exercise.exerciseId)
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
    if (skillId) {
      setSessionSkillXp((current) => ({ ...current, [skillId]: Math.max(0, (current[skillId] ?? 0) - awardedXp) }))
    }
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
    const colorHex = skillId ? skillColors[skillId] : 'var(--gold)'
    setExercises((current) =>
      current.map((entry, idx) =>
        idx === exerciseIdx
          ? { ...entry, cardioSets: entry.cardioSets.map((cs, i) => i === setIdx ? { ...cs, completed: true, xpAwarded: awardedXp } : cs) }
          : entry
      )
    )
    if (skillId) {
      setSessionSkillXp((current) => ({ ...current, [skillId]: (current[skillId] ?? 0) + awardedXp }))
    }
    createXpDrop(exerciseIdx, setIdx, awardedXp, colorHex)
  }

  const markCardioSetEditable = (exerciseIdx: number, setIdx: number) => {
    const exercise = exercises[exerciseIdx]
    const awardedXp = exercise.cardioSets[setIdx].xpAwarded
    const skillId = getExerciseSkillId(exercise.exerciseId)
    setExercises((current) =>
      current.map((entry, idx) =>
        idx === exerciseIdx
          ? { ...entry, cardioSets: entry.cardioSets.map((cs, i) => i === setIdx ? { ...cs, completed: false, xpAwarded: 0 } : cs) }
          : entry
      )
    )
    if (skillId && awardedXp > 0) {
      setSessionSkillXp((current) => ({ ...current, [skillId]: Math.max(0, (current[skillId] ?? 0) - awardedXp) }))
    }
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
    const removedSet = updated[exerciseIdx].cardioSets[setIdx]
    if (removedSet.completed && removedSet.xpAwarded > 0) {
      const skillId = getExerciseSkillId(updated[exerciseIdx].exerciseId)
      if (skillId) {
        setSessionSkillXp((current) => ({ ...current, [skillId]: Math.max(0, (current[skillId] ?? 0) - removedSet.xpAwarded) }))
      }
    }
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
    const removed = exercises[idx]
    const skillId = getExerciseSkillId(removed.exerciseId)
    const forfeitedXp =
      removed.mode === 'cardio'
        ? removed.cardioSets.reduce((sum, cs) => sum + (cs.completed ? cs.xpAwarded : 0), 0)
        : removed.sets.reduce((sum, s) => sum + (s.completed ? s.xpAwarded : 0), 0)
    if (skillId && forfeitedXp > 0) {
      setSessionSkillXp((current) => ({
        ...current,
        [skillId]: Math.max(0, (current[skillId] ?? 0) - forfeitedXp),
      }))
    }
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
    const removedSet = updated[exerciseIdx].sets[setIdx]
    if (removedSet.completed && removedSet.xpAwarded > 0) {
      const skillId = getExerciseSkillId(updated[exerciseIdx].exerciseId)
      if (skillId) {
        setSessionSkillXp((current) => ({ ...current, [skillId]: Math.max(0, (current[skillId] ?? 0) - removedSet.xpAwarded) }))
      }
    }
    updated[exerciseIdx] = {
      ...updated[exerciseIdx],
      sets:
        updated[exerciseIdx].sets.length > 1
          ? updated[exerciseIdx].sets.filter((_, i) => i !== setIdx)
          : [{ weight: '', reps: '', rpe: '', completed: false, xpAwarded: 0 }],
    }
    setExercises(updated)
  }

  const updateSet = (
    exerciseIdx: number,
    setIdx: number,
    field: keyof SetEntry,
    value: string
  ) => {
    const updated = [...exercises]
    const targetSet = updated[exerciseIdx].sets[setIdx]
    if (targetSet.completed && targetSet.xpAwarded > 0) {
      const skillId = getExerciseSkillId(updated[exerciseIdx].exerciseId)
      if (skillId) {
        setSessionSkillXp((current) => ({ ...current, [skillId]: Math.max(0, (current[skillId] ?? 0) - targetSet.xpAwarded) }))
      }
    }
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
    const targetSet = updated[exerciseIdx].cardioSets[setIdx]
    if (targetSet.completed && targetSet.xpAwarded > 0) {
      const skillId = getExerciseSkillId(updated[exerciseIdx].exerciseId)
      if (skillId) {
        setSessionSkillXp((current) => ({ ...current, [skillId]: Math.max(0, (current[skillId] ?? 0) - targetSet.xpAwarded) }))
      }
    }
    updated[exerciseIdx] = {
      ...updated[exerciseIdx],
      cardioSets: updated[exerciseIdx].cardioSets.map((cs, i) =>
        i === setIdx ? { ...cs, [field]: value, completed: false, xpAwarded: 0 } : cs
      ),
    }
    setExercises(updated)
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
    setSessionSkillXp({})
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {draftRestore && (
          <div
            className="rounded-lg p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            style={{
              background: 'rgba(240, 180, 41, 0.08)',
              border: '1px solid var(--gold-dim)',
            }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--gold-bright)' }}>
                Resume in-progress workout?
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                Saved {formatRelativeTime(draftRestore.ageMs)}.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={restoreDraft}
                className="px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider"
                style={{ background: 'var(--gold)', color: '#201608' }}
              >
                Resume
              </button>
              <button
                type="button"
                onClick={discardDraft}
                className="px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider"
                style={{
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-default)',
                }}
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {(() => {
          const totalSessionXp = Object.values(sessionSkillXp).reduce((sum, v) => sum + v, 0)
          const activeSkills = Object.entries(sessionSkillXp).filter(([, xp]) => xp > 0)
          const totalWeightLifted = exercises.reduce((sum, ex) =>
            sum + ex.sets.filter(s => s.completed).reduce((s2, set) => {
              const w = parseFloat(set.weight) || 0
              const r = parseInt(set.reps) || 0
              return s2 + w * r
            }, 0), 0)

          if (activeSkills.length === 0 && completedSetCount === 0) return null

          return (
            <div
              style={{
                position: 'sticky',
                top: '0',
                zIndex: 10,
                marginLeft: '-24px',
                marginRight: '-24px',
                padding: '12px 24px',
                background: 'var(--bg-card)',
                borderBottom: '1px solid var(--border-default)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
              }}
            >
              {activeSkills.length > 0 && (
                <div className="space-y-3">
                  {activeSkills.map(([sidStr, gained]) => {
                    const sid = parseInt(sidStr)
                    const real = skillXp[sid] ?? { currentXp: 0, currentLevel: 1 }
                    const totalXp = real.currentXp + gained
                    const effectiveLevel = getLevelForXp(totalXp)
                    const currentLevelXp = XP_THRESHOLDS[effectiveLevel - 1]
                    const nextLevelXp = effectiveLevel >= 10
                      ? currentLevelXp
                      : XP_THRESHOLDS[effectiveLevel]
                    const range = nextLevelXp - currentLevelXp
                    const progress = effectiveLevel >= 10
                      ? 100
                      : Math.min(100, Math.round(((totalXp - currentLevelXp) / range) * 100))
                    const colorHex = skillColors[sid] ?? 'var(--gold)'

                    return (
                      <div key={sid}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: colorHex }}>
                            {skillNames[sid]} <span style={{ color: 'var(--text-muted)' }}>Lv.{effectiveLevel}</span>
                          </span>
                          <span className="text-xs font-bold" style={{ color: colorHex }}>
                            +{gained} XP
                          </span>
                        </div>
                        <div className="xp-bar-track">
                          <div
                            className="xp-bar-fill"
                            style={{
                              width: `${progress}%`,
                              background: `linear-gradient(90deg, ${colorHex}cc, ${colorHex})`,
                              boxShadow: `0 0 6px ${colorHex}40`,
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              <div className={`flex items-center justify-between${activeSkills.length > 0 ? ' mt-3 pt-3' : ''}`} style={activeSkills.length > 0 ? { borderTop: '1px solid var(--border-subtle)' } : {}}>
                <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
                  {completedSetCount} sets · {totalWeightLifted.toLocaleString()} lbs
                </span>
                <span className="text-sm font-display font-bold" style={{ color: 'var(--gold)' }}>
                  +{totalSessionXp} XP
                </span>
              </div>
            </div>
          )
        })()}

        {error && (
          <div
            className="rounded-lg p-4"
            style={{
              background: 'rgba(220, 38, 38, 0.1)',
              border: '1px solid rgba(220, 38, 38, 0.3)',
            }}
          >
            <p className="text-sm font-medium" style={{ color: '#fca5a5' }}>{error}</p>
          </div>
        )}

        {/* Date */}
        <div>
          <label htmlFor="date" className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
            Date
          </label>
          <input
            type="date"
            id="date"
            value={workoutDate}
            onChange={(e) => setWorkoutDate(e.target.value)}
            className="input-dark w-full px-3 py-2 rounded-lg text-sm"
            disabled={loading}
          />
        </div>

        {/* Exercises */}
        <div className="space-y-4">
          {exercises.map((exercise, exIdx) => {
            const skillId = getExerciseSkillId(exercise.exerciseId)
            const skillColor = skillId ? skillColors[skillId] : undefined
            const isCardio = exercise.mode === 'cardio'

            return (
              <div
                key={exIdx}
                className="rounded-lg p-4 transition-all duration-200"
                style={{
                  background: 'var(--bg-elevated)',
                  borderTop: '1px solid var(--border-subtle)',
                  borderRight: '1px solid var(--border-subtle)',
                  borderBottom: '1px solid var(--border-subtle)',
                  borderLeft: skillColor ? `3px solid ${skillColor}` : '1px solid var(--border-subtle)',
                  ...(skillColor ? { boxShadow: `0 0 15px ${skillColor}10, 0 0 4px ${skillColor}08` } : {}),
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex flex-1 min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                    <select
                      value={exercise.exerciseId}
                      onChange={(e) => updateExerciseId(exIdx, e.target.value)}
                      className="input-dark w-full min-w-0 flex-1 px-3 py-2 rounded-lg text-sm"
                      disabled={loading}
                    >
                      <option value="">Select exercise</option>
                      {skillOrder.map((sid) => (
                        <optgroup key={sid} label={skillNames[sid]}>
                          {allExercises
                            .filter((ex) => ex.skill_id === sid)
                            .map((ex) => (
                              <option key={ex.id} value={ex.id}>
                                {ex.name}{ex.is_primary ? ' ⚔' : ''}
                              </option>
                            ))}
                        </optgroup>
                      ))}
                    </select>
                    {skillId && (
                      <span
                        className="inline-flex max-w-full self-start text-xs font-semibold px-2 py-0.5 rounded break-words sm:self-auto"
                        style={{ backgroundColor: `${skillColors[skillId]}20`, color: skillColors[skillId] }}
                      >
                        {skillNames[skillId]}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeExercise(exIdx)}
                    className="ml-2 text-xs font-medium transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseOver={(e) => (e.currentTarget.style.color = '#ef4444')}
                    onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                    disabled={loading}
                  >
                    Remove
                  </button>
                </div>

                {isCardio ? (
                  /* Cardio sets */
                  <>
                    <div className="space-y-2">
                      {exercise.cardioSets.map((cSet, setIdx) => (
                        <div
                          key={setIdx}
                          className="relative rounded-lg p-3 sm:p-2"
                          style={{
                            background: cSet.completed ? 'rgba(240, 180, 41, 0.08)' : 'transparent',
                            boxShadow: cSet.completed ? 'inset 0 0 0 1px rgba(240, 180, 41, 0.25)' : 'none',
                          }}
                        >
                          {activeDrops
                            .filter((drop) => drop.exerciseIdx === exIdx && drop.setIdx === setIdx)
                            .map((drop) => (
                              <div
                                key={drop.id}
                                className="pointer-events-none absolute right-3 top-0 text-sm font-bold"
                                style={{
                                  color: drop.colorHex,
                                  textShadow: '0 0 8px rgba(0, 0, 0, 0.35)',
                                  animation: 'sq-xp-rise 0.9s ease-out forwards',
                                }}
                              >
                                +{drop.amount} XP
                              </div>
                            ))}
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <span
                              className="text-xs w-6 text-right font-medium"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              {setIdx + 1}
                            </span>
                            <div className="flex items-center gap-2 min-w-0">
                              <input
                                type="number"
                                placeholder="min"
                                value={cSet.durationMinutes}
                                onChange={(e) => updateCardioSet(exIdx, setIdx, 'durationMinutes', e.target.value)}
                                className="input-dark w-24 sm:w-20 px-2 py-1.5 rounded text-sm"
                                disabled={loading || cSet.completed}
                                min="1"
                                max="300"
                              />
                              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>min</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 w-full sm:flex sm:w-auto sm:items-center sm:gap-1">
                              {(['low', 'med', 'high'] as const).map((lvl) => {
                                const active = cSet.intensity === lvl
                                return (
                                  <button
                                    key={lvl}
                                    type="button"
                                    onClick={() => updateCardioSet(exIdx, setIdx, 'intensity', lvl)}
                                    className="min-w-0 text-center text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded transition-colors"
                                    style={{
                                      border: `1px solid ${active ? 'var(--gold)' : 'var(--border-default)'}`,
                                      background: active ? 'rgba(240, 180, 41, 0.12)' : 'transparent',
                                      color: active ? 'var(--gold-bright)' : 'var(--text-secondary)',
                                    }}
                                    disabled={loading || cSet.completed}
                                  >
                                    {lvl}
                                  </button>
                                )
                              })}
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                cSet.completed
                                  ? markCardioSetEditable(exIdx, setIdx)
                                  : markCardioSetCompleted(exIdx, setIdx)
                              }
                              className="px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-colors sm:ml-auto"
                              style={{
                                background: cSet.completed ? 'rgba(240, 180, 41, 0.12)' : 'var(--gold)',
                                color: cSet.completed ? 'var(--gold-bright)' : '#201608',
                                boxShadow: cSet.completed ? 'inset 0 0 0 1px rgba(240, 180, 41, 0.28)' : 'none',
                              }}
                              disabled={loading}
                            >
                              {cSet.completed ? 'Edit' : 'Done'}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeCardioSet(exIdx, setIdx)}
                              className="text-sm transition-colors"
                              style={{ color: 'var(--text-muted)' }}
                              onMouseOver={(e) => (e.currentTarget.style.color = '#ef4444')}
                              onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                              disabled={loading}
                            >
                              &times;
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => addCardioSet(exIdx)}
                        className="text-xs font-semibold uppercase tracking-wider transition-colors"
                        style={{ color: 'var(--text-secondary)' }}
                        onMouseOver={(e) => (e.currentTarget.style.color = 'var(--gold)')}
                        onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                        disabled={loading}
                      >
                        + Add Set
                      </button>
                    </div>
                  </>
                ) : (
                  /* Strength sets */
                  <>
                    <div className="space-y-2">
                      {exercise.sets.map((set, setIdx) => {
                        const w = parseFloat(set.weight)
                        const r = parseInt(set.reps)
                        const estimated1rm =
                          !isNaN(w) && w > 0 && !isNaN(r) && r > 0
                            ? calculate1RM(w, r)
                            : null

                        return (
                          <div
                            key={setIdx}
                            className="relative rounded-lg p-3 sm:p-2"
                            style={{
                              background: set.completed ? 'rgba(240, 180, 41, 0.08)' : 'transparent',
                              boxShadow: set.completed ? 'inset 0 0 0 1px rgba(240, 180, 41, 0.25)' : 'none',
                            }}
                          >
                            {activeDrops
                              .filter((drop) => drop.exerciseIdx === exIdx && drop.setIdx === setIdx)
                              .map((drop) => (
                                <div
                                  key={drop.id}
                                  className="pointer-events-none absolute right-3 top-0 text-sm font-bold"
                                  style={{
                                    color: drop.colorHex,
                                    textShadow: '0 0 8px rgba(0, 0, 0, 0.35)',
                                    animation: 'sq-xp-rise 0.9s ease-out forwards',
                                  }}
                                >
                                  +{drop.amount} XP
                                </div>
                              ))}

                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <span
                              className="text-xs w-6 text-right font-medium"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              {setIdx + 1}
                            </span>
                            <input
                              type="number"
                              placeholder="lbs"
                              value={set.weight}
                              onChange={(e) =>
                                updateSet(exIdx, setIdx, 'weight', e.target.value)
                              }
                              className="input-dark w-24 sm:w-20 px-2 py-1.5 rounded text-sm"
                              disabled={loading || set.completed}
                              step="0.5"
                              min="0"
                            />
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>&times;</span>
                            <input
                              type="number"
                              placeholder="reps"
                              value={set.reps}
                              onChange={(e) =>
                                updateSet(exIdx, setIdx, 'reps', e.target.value)
                              }
                              className="input-dark w-20 sm:w-16 px-2 py-1.5 rounded text-sm"
                              disabled={loading || set.completed}
                              min="1"
                            />
                            <select
                              value={set.rpe}
                              onChange={(e) =>
                                updateSet(exIdx, setIdx, 'rpe', e.target.value)
                              }
                              className="input-dark w-20 px-2 py-1.5 rounded text-sm"
                              disabled={loading || set.completed}
                            >
                              <option value="">RPE</option>
                              {[6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((v) => (
                                <option key={v} value={v}>
                                  {v}
                                </option>
                              ))}
                            </select>
                            {estimated1rm !== null && (
                              <span
                                className="text-xs w-16 text-right font-medium"
                                style={{ color: 'var(--text-secondary)' }}
                              >
                                ~{estimated1rm.toFixed(0)}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                set.completed
                                  ? markSetEditable(exIdx, setIdx)
                                  : markSetCompleted(exIdx, setIdx)
                              }
                              className="px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-colors sm:ml-auto"
                              style={{
                                background: set.completed ? 'rgba(240, 180, 41, 0.12)' : 'var(--gold)',
                                color: set.completed ? 'var(--gold-bright)' : '#201608',
                                boxShadow: set.completed ? 'inset 0 0 0 1px rgba(240, 180, 41, 0.28)' : 'none',
                              }}
                              disabled={loading}
                            >
                              {set.completed ? 'Edit' : 'Done'}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeSet(exIdx, setIdx)}
                              className="text-sm transition-colors"
                              style={{ color: 'var(--text-muted)' }}
                              onMouseOver={(e) => (e.currentTarget.style.color = '#ef4444')}
                              onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                              disabled={loading}
                            >
                              &times;
                            </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => addSet(exIdx)}
                        className="text-xs font-semibold uppercase tracking-wider transition-colors"
                        style={{ color: 'var(--text-secondary)' }}
                        onMouseOver={(e) => (e.currentTarget.style.color = 'var(--gold)')}
                        onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                        disabled={loading}
                      >
                        + Add Set
                      </button>
                    </div>
                  </>
                )}
              </div>
            )
          })}

          <button
            type="button"
            onClick={addExercise}
            className="w-full py-3 rounded-lg text-sm font-semibold uppercase tracking-wider transition-all duration-200"
            style={{
              border: '2px dashed var(--border-default)',
              color: 'var(--text-secondary)',
              background: 'transparent',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'var(--gold-dim)'
              e.currentTarget.style.color = 'var(--gold)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-default)'
              e.currentTarget.style.color = 'var(--text-secondary)'
            }}
            disabled={loading}
          >
            + Add Exercise
          </button>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !exercises.some((ex) => ex.exerciseId !== '')}
          className="btn-gold w-full py-3.5 rounded-lg text-sm font-bold uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {loading ? 'Logging Workout...' : 'Complete Workout'}
        </button>
      </form>
    </>
  )
}
