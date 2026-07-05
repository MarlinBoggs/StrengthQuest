'use server'

import { createClient } from '@/lib/supabase/server'
import {
  calculateStrengthSetXp,
  calculateCardioSetXp,
  type CardioIntensity,
} from '@/lib/utils/calculate-xp'

export type StrengthExerciseInput = {
  exerciseId: number
  sets: Array<{
    weight: number
    reps: number
    rpe: number | null
  }>
}

export type CardioExerciseInput = {
  exerciseId: number
  durationMinutes: number
  intensity: 'low' | 'med' | 'high'
}

export type WorkoutPayload = {
  characterId: string
  workoutDate: string
  strengthExercises: StrengthExerciseInput[]
  cardioExercises: CardioExerciseInput[]
}

export type SkillResult = {
  skill_id: number
  skill_name: string
  set_count: number
  duration_minutes: number | null
  base_xp: number
  pr_bonus_xp: number
  real_pr_bonus_xp: number
  skill_xp: number
  achieved_pr: boolean
  old_pr: number | null
  new_pr: number | null
  new_pr_weight: number | null
  new_pr_reps: number | null
  achieved_real_pr: boolean
  old_max_weight: number | null
  new_max_weight: number | null
  pr_exercise_name: string | null
  old_tier: string | null
  new_tier: string | null
  tier_changed: boolean
  old_level: number
  new_level: number
  achieved_level_up: boolean
  new_total_xp: number
}

export type WorkoutResult = {
  workout_id: string
  base_xp: number
  total_xp: number
  skill_results: SkillResult[]
}

type CardioRpcSkillResult = {
  skill_id: number
  skill_name: string
  duration_minutes: number
  skill_xp: number
  old_level: number
  new_level: number
  achieved_level_up: boolean
  old_tier: string | null
  new_tier: string | null
  tier_changed: boolean
  new_total_xp: number
}

function normalizeCardioResult(sr: CardioRpcSkillResult): SkillResult {
  return {
    skill_id: sr.skill_id,
    skill_name: sr.skill_name,
    set_count: 0,
    duration_minutes: sr.duration_minutes,
    base_xp: sr.skill_xp,
    pr_bonus_xp: 0,
    real_pr_bonus_xp: 0,
    skill_xp: sr.skill_xp,
    achieved_pr: false,
    old_pr: null,
    new_pr: null,
    new_pr_weight: null,
    new_pr_reps: null,
    achieved_real_pr: false,
    old_max_weight: null,
    new_max_weight: null,
    pr_exercise_name: null,
    old_tier: sr.old_tier,
    new_tier: sr.new_tier,
    tier_changed: sr.tier_changed,
    old_level: sr.old_level,
    new_level: sr.new_level,
    achieved_level_up: sr.achieved_level_up,
    new_total_xp: sr.new_total_xp,
  }
}

function mapWorkoutRpcError(message?: string) {
  if (!message) return 'Failed to log workout'

  if (
    message.includes('log_multi_skill_workout') &&
    (message.includes('does not exist') ||
      message.includes('p_intensity') ||
      message.includes('p_length_minutes'))
  ) {
    return 'Strength logging requires supabase migration 018_realtime_xp. Apply it and retry.'
  }

  if (
    message.includes('workouts_length_minutes_check') ||
    message.includes('violates check constraint "workouts_length_minutes_check"')
  ) {
    return 'Cardio logging requires the latest database migration. Apply supabase migration 018_realtime_xp to allow NULL length_minutes.'
  }

  return message
}

export async function logWorkout(
  payload: WorkoutPayload
): Promise<WorkoutResult | { error: string }> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) {
    return { error: 'Not authenticated' }
  }

  const hasStrength = payload.strengthExercises.length > 0
  const hasCardio = payload.cardioExercises.length > 0

  if (!hasStrength && !hasCardio) {
    return { error: 'At least one exercise is required' }
  }

  // Strength validation
  if (hasStrength) {
    const seen = new Set<number>()
    for (const ex of payload.strengthExercises) {
      if (!ex.exerciseId) return { error: 'Each exercise must be selected' }
      if (seen.has(ex.exerciseId)) return { error: 'Duplicate exercises are not allowed' }
      seen.add(ex.exerciseId)

      if (!ex.sets || ex.sets.length === 0) {
        return { error: 'Each exercise must have at least one set' }
      }

      for (const set of ex.sets) {
        if (set.weight === null || set.weight === undefined || isNaN(set.weight) || set.weight < 0) {
          return { error: 'Weight must be 0 or greater' }
        }
        if (!set.reps || set.reps <= 0 || !Number.isInteger(set.reps)) {
          return { error: 'Reps must be a positive whole number' }
        }
        if (set.rpe !== null && set.rpe !== undefined) {
          if (set.rpe < 6 || set.rpe > 10) {
            return { error: 'RPE must be between 6.0 and 10.0' }
          }
        }
      }
    }
  }

  // Cardio validation
  if (hasCardio) {
    const seen = new Set<number>()
    for (const ex of payload.cardioExercises) {
      if (!ex.exerciseId) return { error: 'Each cardio exercise must be selected' }
      if (seen.has(ex.exerciseId)) return { error: 'Duplicate cardio exercises are not allowed' }
      seen.add(ex.exerciseId)

      if (!ex.durationMinutes || ex.durationMinutes < 1 || ex.durationMinutes > 300) {
        return { error: 'Duration must be between 1 and 300 minutes' }
      }
      if (!['low', 'med', 'high'].includes(ex.intensity)) {
        return { error: 'Intensity must be low, med, or high' }
      }
    }
  }

  // Fetch bodyweight + per-exercise flags so the server can re-derive XP.
  // `calculate-xp.ts` is the single source of truth — the RPC just sums.
  let bodyweightLbs = 0
  const isPrimaryByExerciseId: Record<number, boolean> = {}

  if (hasStrength) {
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('bodyweight_lbs')
      .eq('id', payload.characterId)
      .single()
    if (charError || !character) {
      return { error: 'Character not found' }
    }
    bodyweightLbs = Number(character.bodyweight_lbs)

    const exerciseIds = payload.strengthExercises.map((ex) => ex.exerciseId)
    const { data: exRows } = await supabase
      .from('exercises')
      .select('id, is_primary')
      .in('id', exerciseIds)
    for (const row of exRows ?? []) {
      isPrimaryByExerciseId[row.id] = !!row.is_primary
    }
  }

  let strengthResult: WorkoutResult | null = null
  let cardioResult: { workout_id: string; total_xp: number; skill_results: CardioRpcSkillResult[] } | null = null

  if (hasStrength) {
    const rpcExercises = payload.strengthExercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      sets: ex.sets.map((s) => ({
        weight: s.weight,
        reps: s.reps,
        rpe: s.rpe,
        xpAwarded: calculateStrengthSetXp(
          s.weight,
          s.reps,
          s.rpe,
          bodyweightLbs,
          !!isPrimaryByExerciseId[ex.exerciseId],
        ),
      })),
    }))

    const { data, error } = await supabase.rpc('log_multi_skill_workout', {
      p_character_id: payload.characterId,
      p_workout_date: payload.workoutDate,
      p_exercises: rpcExercises,
    })

    if (error) {
      console.error('Strength workout logging error:', error)
      return { error: mapWorkoutRpcError(error.message) }
    }
    strengthResult = data as WorkoutResult
  }

  if (hasCardio) {
    const rpcExercises = payload.cardioExercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      durationMinutes: ex.durationMinutes,
      intensity: ex.intensity,
      xpAwarded: calculateCardioSetXp(ex.durationMinutes, ex.intensity as CardioIntensity),
    }))

    const { data, error } = await supabase.rpc('log_cardio_workout', {
      p_character_id: payload.characterId,
      p_workout_date: payload.workoutDate,
      p_exercises: rpcExercises,
    })

    if (error) {
      console.error('Cardio workout logging error:', error)
      return { error: mapWorkoutRpcError(error.message) }
    }
    cardioResult = data as { workout_id: string; total_xp: number; skill_results: CardioRpcSkillResult[] }
  }

  const mergedSkillResults: SkillResult[] = [
    ...(strengthResult?.skill_results ?? []),
    ...((cardioResult?.skill_results ?? []).map(normalizeCardioResult)),
  ]

  const totalXp = (strengthResult?.total_xp ?? 0) + (cardioResult?.total_xp ?? 0)
  const baseXp = (strengthResult?.base_xp ?? 0) + (cardioResult?.total_xp ?? 0)

  return {
    workout_id: strengthResult?.workout_id ?? cardioResult?.workout_id ?? '',
    base_xp: baseXp,
    total_xp: totalXp,
    skill_results: mergedSkillResults,
  }
}
