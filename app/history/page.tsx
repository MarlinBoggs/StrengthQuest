import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import HistoryList from './HistoryList'
import type { WorkoutSummary } from './types'

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string }>
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: character } = await supabase
    .from('characters')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!character) redirect('/character-creation')

  const { data: workouts } = await supabase
    .rpc('get_workout_history', { p_character_id: character.id, p_limit: 50 })

  const { open } = await searchParams

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
        <div className="flex items-center justify-between mb-4">
          <h2 className="sq-heading uppercase">History</h2>
          <div className="flex gap-1.5">
            <span
              className="sq-label sq-bevel-in px-2.5 py-1"
              style={{ background: 'var(--dbg)', color: 'var(--dgold)' }}
            >
              List
            </span>
            <span
              className="sq-label px-2.5 py-1"
              style={{ color: 'var(--dink-muted)', opacity: 0.5 }}
              title="Calendar view — coming soon"
            >
              Calendar
            </span>
          </div>
        </div>

        <HistoryList
          workouts={(workouts ?? []) as WorkoutSummary[]}
          initialOpenId={open ?? null}
        />
      </main>
    </div>
  )
}
