'use client'

import { useRouter } from 'next/navigation'
import type { WorkoutResult } from './actions'

type Props = {
  result: WorkoutResult
  skillNames: Record<number, string>
  onLogAnother: () => void
}

export default function PostWorkoutSummary({ result, skillNames, onLogAnother }: Props) {
  const router = useRouter()

  const skillsSummary = result.skill_results
    .map((sr) => skillNames[sr.skill_id] ?? sr.skill_name)
    .join(' + ')

  const hasAnyAchievement = result.skill_results.some(
    (sr) => sr.achieved_pr || sr.achieved_real_pr || sr.tier_changed || sr.achieved_level_up
  )

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(6, 6, 11, 0.85)', backdropFilter: 'blur(4px)' }}>
      <div
        className="max-w-md w-full p-8 max-h-[90vh] overflow-y-auto rounded-xl"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-default)',
          boxShadow: '0 0 40px rgba(240, 180, 41, 0.08), 0 25px 50px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div
            className="inline-block text-3xl mb-2"
            style={{ filter: 'drop-shadow(0 0 8px rgba(240, 180, 41, 0.4))' }}
          >
            ⚔
          </div>
          <h2
            className="font-display text-2xl font-bold tracking-wider uppercase"
            style={{ color: 'var(--gold-bright)' }}
          >
            Workout Complete
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {skillsSummary}
          </p>
        </div>

        {/* XP Summary */}
        <div
          className="rounded-lg p-4 mb-5"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div className="space-y-2 text-sm">
            {result.skill_results.map((sr) => (
              <div key={sr.skill_id} className="flex justify-between items-center">
                <span style={{ color: 'var(--text-secondary)' }}>
                  {sr.skill_name}
                  <span className="ml-1" style={{ color: 'var(--text-muted)' }}>
                    {sr.duration_minutes != null
                      ? `(${sr.duration_minutes} min)`
                      : `(${sr.set_count} sets)`}
                  </span>
                </span>
                <span className="font-semibold" style={{ color: 'var(--gold)' }}>
                  +{sr.skill_xp} XP
                  {(sr.pr_bonus_xp > 0 || sr.real_pr_bonus_xp > 0) && (
                    <span className="ml-1 text-xs" style={{ color: 'var(--gold-bright)' }}>
                      (+{sr.pr_bonus_xp + sr.real_pr_bonus_xp} PR)
                    </span>
                  )}
                </span>
              </div>
            ))}
            <div
              className="pt-2 mt-2 flex justify-between items-center"
              style={{ borderTop: '1px solid var(--border-subtle)' }}
            >
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Total</span>
              <span className="font-bold text-base" style={{ color: 'var(--gold-bright)' }}>
                +{result.total_xp} XP
              </span>
            </div>
          </div>
        </div>

        {/* Per-skill achievements */}
        {hasAnyAchievement && (
          <div className="space-y-3 mb-5">
            {result.skill_results.map((sr) => (
              <div key={sr.skill_id} className="space-y-3">
                {/* PR Achievement */}
                {sr.achieved_pr && (
                  <div
                    className="rounded-lg p-4 text-center"
                    style={{
                      background: 'rgba(240, 180, 41, 0.08)',
                      border: '1px solid rgba(240, 180, 41, 0.25)',
                      boxShadow: '0 0 20px rgba(240, 180, 41, 0.06)',
                    }}
                  >
                    <p
                      className="text-xs font-bold uppercase tracking-widest mb-1"
                      style={{ color: 'var(--gold-bright)' }}
                    >
                      New {sr.skill_name} PR!
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {sr.pr_exercise_name}
                    </p>
                    <div className="mt-2 text-center">
                      <span className="text-lg font-bold font-display" style={{ color: 'var(--gold-bright)' }}>
                        {sr.new_pr_weight} x {sr.new_pr_reps}
                      </span>
                      {sr.new_pr_reps && sr.new_pr_reps > 1 && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          ~{Math.round(sr.new_pr ?? 0)} lb est. 1RM
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Real PR (Max Weight) Achievement */}
                {sr.achieved_real_pr && (
                  <div
                    className="rounded-lg p-4 text-center"
                    style={{
                      background: 'rgba(240, 180, 41, 0.08)',
                      border: '1px solid rgba(240, 180, 41, 0.25)',
                      boxShadow: '0 0 20px rgba(240, 180, 41, 0.06)',
                    }}
                  >
                    <p
                      className="text-xs font-bold uppercase tracking-widest mb-1"
                      style={{ color: 'var(--gold-bright)' }}
                    >
                      New {sr.skill_name} Max!
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {sr.pr_exercise_name}
                    </p>
                    <div className="mt-2 text-center">
                      <span className="text-lg font-bold font-display" style={{ color: 'var(--gold-bright)' }}>
                        {sr.new_max_weight} lb
                      </span>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        Heaviest weight lifted
                      </p>
                    </div>
                  </div>
                )}

                {/* Tier Change */}
                {sr.tier_changed && (
                  <div
                    className="rounded-lg p-4 text-center"
                    style={{
                      background: 'rgba(168, 85, 247, 0.08)',
                      border: '1px solid rgba(168, 85, 247, 0.25)',
                      boxShadow: '0 0 20px rgba(168, 85, 247, 0.06)',
                    }}
                  >
                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#c084fc' }}>
                      {sr.skill_name} Tier Up!
                    </p>
                    <p className="text-sm font-semibold mt-1" style={{ color: '#e9d5ff' }}>
                      {sr.old_tier ?? 'None'} &rarr; {sr.new_tier}
                    </p>
                  </div>
                )}

                {/* Level Up */}
                {sr.achieved_level_up && (
                  <div
                    className="rounded-lg p-4 text-center"
                    style={{
                      background: 'rgba(34, 197, 94, 0.08)',
                      border: '1px solid rgba(34, 197, 94, 0.25)',
                      boxShadow: '0 0 20px rgba(34, 197, 94, 0.06)',
                    }}
                  >
                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#4ade80' }}>
                      {sr.skill_name} Level Up!
                    </p>
                    <p className="text-sm font-semibold mt-1" style={{ color: '#bbf7d0' }}>
                      Lv. {sr.old_level} &rarr; Lv. {sr.new_level}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold uppercase tracking-wider transition-colors"
            style={{
              border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)',
              background: 'transparent',
            }}
          >
            Dashboard
          </button>
          <button
            onClick={onLogAnother}
            className="btn-gold flex-1 px-4 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider"
          >
            Log Another
          </button>
        </div>
      </div>
    </div>
  )
}
