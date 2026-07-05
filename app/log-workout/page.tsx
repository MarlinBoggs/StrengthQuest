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

  const skillOrder = activeSkillIds

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-abyss)' }}>
      {/* Navbar */}
      <nav style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 items-center">
            <h1 className="font-display text-lg tracking-widest uppercase" style={{ color: 'var(--gold)' }}>
              <span style={{ color: 'var(--gold-bright)' }}>Strength</span><span style={{ color: 'var(--text-primary)' }}>Quest</span>
            </h1>
            <a
              href="/dashboard"
              className="text-xs font-medium transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              Dashboard
            </a>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="card-dark p-6">
          <h2 className="font-display text-2xl font-bold tracking-wider uppercase mb-6" style={{ color: 'var(--text-primary)' }}>
            Log Workout
          </h2>

          <WorkoutForm
            characterId={character.id}
            bodyweightLbs={Number(character.bodyweight_lbs)}
            allExercises={allExercises}
            skillNames={skillNames}
            skillColors={skillColors}
            skillOrder={skillOrder}
            skillXp={skillXp}
          />
        </div>
      </main>
    </div>
  )
}
