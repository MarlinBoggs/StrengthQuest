// Shapes returned by the get_workout_history RPC (supabase/migrations/021).

export type WorkoutSetSummary = {
  set_number: number
  weight: number | null
  reps: number | null
  rpe: number | null
  calculated_1rm: number | null
}

export type WorkoutExerciseSummary = {
  exercise_id: number
  exercise_name: string
  skill_id: number
  tracks_duration: boolean
  duration_minutes: number | null
  intensity: 'low' | 'med' | 'high' | null
  sets: WorkoutSetSummary[] | null
}

export type WorkoutSkillTag = {
  skill_id: number
  name: string
  color_hex: string
}

export type WorkoutSummary = {
  workout_id: string
  workout_date: string
  total_xp: number
  achieved_pr: boolean
  achieved_level_up: boolean
  skills: WorkoutSkillTag[]
  exercises: WorkoutExerciseSummary[]
}
