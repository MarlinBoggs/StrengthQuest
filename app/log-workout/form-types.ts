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
