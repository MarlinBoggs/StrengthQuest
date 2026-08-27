import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import WorkoutForm from './WorkoutForm'

export default async function LogWorkoutPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: character } = await supabase
    .from('characters')
    .select('id, bodyweight_lbs')
    .eq('user_id', user.id)
    .single()

  if (!character) redirect('/character-creation')

  const { data: skills } = await supabase
    .from('skills')
    .select('id, name, slug, color_hex')
    .eq('is_active', true)
    .order('id')

  const activeSkillIds = (skills ?? []).map(s => s.id)
  const { data: exercises } = await supabase
    .from('exercises')
    .select('id, name, slug, skill_id, is_primary, tracks_duration, allows_weight')
    .in('skill_id', activeSkillIds)
    .order('is_primary', { ascending: false })
    .order('name')

  const skillNames: Record<number, string> = {}
  const skillColors: Record<number, string> = {}
  for (const skill of skills ?? []) {
    skillNames[skill.id] = skill.name
    skillColors[skill.id] = skill.color_hex
  }

  const allExercises = (exercises ?? []).map(ex => ({
    id: ex.id,
    name: ex.name,
    is_primary: ex.is_primary,
    skill_id: ex.skill_id,
    tracks_duration: ex.tracks_duration,
    allows_weight: ex.allows_weight,
  }))

  const { data: userSkills } = await supabase
    .from('user_skills')
    .select('skill_id, current_xp, current_level')
    .eq('character_id', character.id)

  const skillXp: Record<number, { currentXp: number; currentLevel: number }> = {}
  for (const us of userSkills ?? []) {
    skillXp[us.skill_id] = { currentXp: us.current_xp, currentLevel: us.current_level }
  }

  const { data: lastPerformance } = await supabase
    .rpc('get_last_exercise_performance', { p_character_id: character.id })

  const lastPerformanceByExercise: Record<string, {
    workoutDate: string
    durationMinutes: number | null
    intensity: 'low' | 'med' | 'high' | null
    sets: { weight: number | null; reps: number | null; rpe: number | null }[] | null
  }> = {}
  for (const lp of lastPerformance ?? []) {
    lastPerformanceByExercise[String(lp.exercise_id)] = {
      workoutDate: lp.workout_date,
      durationMinutes: lp.duration_minutes,
      intensity: lp.intensity,
      sets: lp.sets,
    }
  }

  // Last 5 completed sessions' total XP — feeds the Combat Frame boss-HP
  // formula (RestCombatSpec.md). Never includes the in-progress session,
  // since this is fetched before any workout on this page is submitted.
  const { data: recentSessions } = await supabase
    .rpc('get_workout_history', { p_character_id: character.id, p_limit: 5 })
  const recentSessionXp = (recentSessions ?? []).map((w: { total_xp: number }) => w.total_xp)

  const skillOrder = activeSkillIds

  return (
    <div className="sq-dash min-h-screen">
      {/* Compact app bar */}
      <nav style={{ background: 'var(--dpanel)', borderBottom: '2px solid var(--dbevel-dark)' }}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-12 items-center">
            <h1 className="font-display tracking-widest uppercase" style={{ fontSize: '15px' }}>
              <span style={{ color: 'var(--dgold)' }}>Strength</span>
              <span style={{ color: 'var(--dink)' }}>Quest</span>
            </h1>
            <a
              href="/dashboard"
              className="flex items-center font-medium transition-colors"
              style={{ fontSize: '13px', minHeight: '44px', color: 'var(--dink-muted)' }}
            >
              Dashboard
            </a>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <h2 className="sq-heading uppercase mb-4">Log Workout</h2>

        <WorkoutForm
          characterId={character.id}
          bodyweightLbs={Number(character.bodyweight_lbs)}
          allExercises={allExercises}
          skillNames={skillNames}
          skillColors={skillColors}
          skillOrder={skillOrder}
          skillXp={skillXp}
          lastPerformanceByExercise={lastPerformanceByExercise}
          recentSessionXp={recentSessionXp}
        />
      </main>
    </div>
  )
}
