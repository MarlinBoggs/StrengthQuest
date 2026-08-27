// Shared types for the Log Workout form and its presentational components.

export type Exercise = {
  id: number
  name: string
  is_primary: boolean
  skill_id: number
  tracks_duration: boolean
  allows_weight: boolean
}

export type SetEntry = {
  weight: string
  reps: string
  rpe: string
  completed: boolean
  xpAwarded: number
}

export type CardioSetEntry = {
  durationMinutes: string
  intensity: 'low' | 'med' | 'high'
  completed: boolean
  xpAwarded: number
}

export type ExerciseEntry = {
  exerciseId: string
  mode: 'strength' | 'cardio'
  sets: SetEntry[]
  cardioSets: CardioSetEntry[]
}

export type ActiveXpDrop = {
  id: number
  exerciseIdx: number
  setIdx: number
  amount: number
  colorHex: string
}

// Assigned once, on the first completed set of the session, and stays pinned
// regardless of what skills get logged afterward (mixed sessions all damage
// this one boss). See RestCombatSpec.md — boss identity can't be derived from
// current state alone since nothing records completion order.
export type BossState = {
  name: string
  skillId: number
  hpMax: number
}

// One row in the combat log. Phrasing is rolled once at append time and
// never re-rolled — this is tracked, append-only state (same category as
// ActiveXpDrop), not derived.
export type CombatLogEntry = {
  id: number
  text: string
  hp?: string
  cls?: 'intro' | 'kill' | 'overkill' | 'escape' | 'event'
}

// One row per exercise from get_last_exercise_performance — the character's
// most recent logged performance for that exercise. `sets` is populated for
// weight/reps exercises (strength + rep-based mobility); `durationMinutes`/
// `intensity` for duration-tracked cardio/hiit/mobility exercises. Branch is
// exercises.tracks_duration, mirroring how the form already decides log mode.
export type LastPerformance = {
  workoutDate: string
  durationMinutes: number | null
  intensity: 'low' | 'med' | 'high' | null
  sets: { weight: number | null; reps: number | null; rpe: number | null }[] | null
}

export function formatDaysAgo(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.round((today.getTime() - date.getTime()) / (24 * 60 * 60 * 1000))
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days}d ago`
}

export function formatLastPerformanceSummary(lp: LastPerformance): string {
  if (lp.sets && lp.sets.length > 0) {
    return lp.sets.map((s) => `${s.weight ?? 0}×${s.reps ?? 0}`).join(', ')
  }
  if (lp.durationMinutes != null) {
    const label = lp.intensity === 'high' ? 'High' : lp.intensity === 'low' ? 'Low' : 'Med'
    return `${lp.durationMinutes} min · ${label}`
  }
  return ''
}

export const emptyCardioSet = (): CardioSetEntry => ({
  durationMinutes: '',
  intensity: 'med',
  completed: false,
  xpAwarded: 0,
})

export const emptySet = (): SetEntry => ({
  weight: '',
  reps: '',
  rpe: '',
  completed: false,
  xpAwarded: 0,
})

export const emptyEntry = (): ExerciseEntry => ({
  exerciseId: '',
  mode: 'strength',
  sets: [emptySet()],
  cardioSets: [emptyCardioSet()],
})

// True while an entry is still in its just-added, never-edited state — the
// Prefill button only shows then, so it never clobbers a set the user started.
export function isEntryUntouched(entry: ExerciseEntry): boolean {
  if (entry.mode === 'cardio') {
    return entry.cardioSets.every((cs) => !cs.completed && cs.durationMinutes === '')
  }
  return entry.sets.every((s) => !s.completed && s.weight === '' && s.reps === '' && s.rpe === '')
}
