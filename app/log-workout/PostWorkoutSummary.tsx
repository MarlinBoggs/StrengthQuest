'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import EquipmentIcon from '@/app/dashboard/EquipmentIcon'
import { newlyUnlockedEquipment } from '@/app/dashboard/equipment'
import { tierColor } from '@/app/dashboard/theme'
import { XP_THRESHOLDS } from '@/lib/utils/xp-thresholds'
import type { WorkoutResult } from './actions'
import type { BossState } from './form-types'

type Props = {
  result: WorkoutResult
  skillNames: Record<number, string>
  totalWeightLifted: number
  boss: BossState | null
  bossDefeated: boolean
  onLogAnother: () => void
  onShare: () => void
}

export default function PostWorkoutSummary({
  result,
  skillNames,
  totalWeightLifted,
  boss,
  bossDefeated,
  onLogAnother,
  onShare,
}: Props) {
  const router = useRouter()

  // Bars mount at their pre-session position, then animate to the post-
  // session position a beat later — the fill growing is what communicates
  // the XP gained, not just the end numbers. (prefers-reduced-motion already
  // disables the underlying .sq-xp-fill transition globally.)
  const [animateBars, setAnimateBars] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setAnimateBars(true), 150)
    return () => clearTimeout(t)
  }, [])

  const skillsSummary = result.skill_results
    .map((sr) => skillNames[sr.skill_id] ?? sr.skill_name)
    .join(' + ')

  // Level-up is now communicated on the XP bar itself (badge + reset-to-0
  // fill), not a separate card — keeps it from being said twice.
  const hasAnyAchievement = result.skill_results.some(
    (sr) => sr.achieved_pr || sr.achieved_real_pr || sr.tier_changed
  )

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0, 0, 0, 0.6)' }}>
      <div
        className="sq-panel max-w-md w-full p-8 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <h2
            className="sq-heading font-bold tracking-wider uppercase"
            style={{ color: 'var(--dgold)' }}
          >
            Workout Complete
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--dink-muted)' }}>
            {skillsSummary}
          </p>
        </div>

        {/* Boss fight result */}
        {boss && (
          <div
            className="rounded p-4 text-center mb-5"
            style={
              bossDefeated
                ? { background: 'rgba(201, 162, 39, 0.1)', border: '1px solid rgba(201, 162, 39, 0.35)' }
                : { background: 'var(--dbg)', border: '1px solid var(--dbevel-light)' }
            }
          >
            <p
              className="text-xs font-bold uppercase tracking-widest mb-1"
              style={{ color: bossDefeated ? 'var(--dgold)' : 'var(--dink-muted)' }}
            >
              {bossDefeated ? 'Boss Defeated' : 'Boss Escaped'}
            </p>
            <p
              className="text-lg font-bold font-display"
              style={{ color: bossDefeated ? 'var(--dgold)' : 'var(--dink)' }}
            >
              {boss.name}
            </p>
          </div>
        )}

        {/* XP Summary */}
        <div
          className="sq-bevel-in p-4 mb-5"
          style={{
            background: 'var(--dbg)',
          }}
        >
          <div className="space-y-3 text-sm">
            {result.skill_results.map((sr) => {
              const oldTotalXp = sr.new_total_xp - sr.skill_xp
              const currentLevelXp = XP_THRESHOLDS[sr.new_level - 1]
              const nextLevelXp = sr.new_level >= 10 ? currentLevelXp : XP_THRESHOLDS[sr.new_level]
              const range = nextLevelXp - currentLevelXp
              const endPct = sr.new_level >= 10
                ? 100
                : Math.min(100, Math.max(0, Math.round(((sr.new_total_xp - currentLevelXp) / range) * 100)))
              // A level-up resets the bar to a fresh level, same as every
              // other XP bar in the app — the fill growing from 0 to endPct
              // is what reads as "leveled up", on top of the badge below.
              const startPct = sr.achieved_level_up
                ? 0
                : sr.new_level >= 10
                  ? 100
                  : Math.min(100, Math.max(0, Math.round(((oldTotalXp - currentLevelXp) / range) * 100)))
              const pct = animateBars ? endPct : startPct

              return (
                <div key={sr.skill_id}>
                  <div className="flex justify-between items-center mb-1">
                    <span style={{ color: 'var(--dink-muted)' }}>
                      {sr.skill_name} <span style={{ color: 'var(--dink)' }}>Lv.{sr.new_level}</span>
                      <span className="ml-1" style={{ color: 'var(--dink-muted)' }}>
                        {sr.duration_minutes != null
                          ? `(${sr.duration_minutes} min)`
                          : `(${sr.set_count} sets)`}
                      </span>
                    </span>
                    <span className="font-semibold" style={{ color: 'var(--dgold)' }}>
                      +{sr.skill_xp} XP
                      {(sr.pr_bonus_xp > 0 || sr.real_pr_bonus_xp > 0) && (
                        <span className="ml-1 text-xs" style={{ color: 'var(--dgold)' }}>
                          (+{sr.pr_bonus_xp + sr.real_pr_bonus_xp} PR)
                        </span>
                      )}
                    </span>
                  </div>
                  <div style={{ position: 'relative', paddingTop: sr.achieved_level_up ? '13px' : 0 }}>
                    {sr.achieved_level_up && (
                      <span
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          fontSize: '10px',
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          color: '#4ade80',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        &#9650; Level Up
                      </span>
                    )}
                    <div className="sq-xp-track">
                      <div
                        className="sq-xp-fill"
                        style={{ width: `${pct}%`, background: sr.achieved_level_up ? '#4ade80' : 'var(--dgold)' }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
            <div
              className="pt-2 mt-2 space-y-2"
              style={{ borderTop: '1px solid var(--dbevel-dark)' }}
            >
              {totalWeightLifted > 0 && (
                <div className="flex justify-between items-center">
                  <span className="font-semibold" style={{ color: 'var(--dink)' }}>Weight Lifted</span>
                  <span className="sq-num font-semibold" style={{ color: 'var(--dink)' }}>
                    {totalWeightLifted.toLocaleString()} lbs
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="font-semibold" style={{ color: 'var(--dink)' }}>Total</span>
                <span className="font-bold text-base" style={{ color: 'var(--dgold)' }}>
                  +{result.total_xp} XP
                </span>
              </div>
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
                    className="rounded p-4 text-center"
                    style={{
                      background: 'rgba(201, 162, 39, 0.08)',
                      border: '1px solid rgba(201, 162, 39, 0.25)',
                    }}
                  >
                    <p
                      className="text-xs font-bold uppercase tracking-widest mb-1"
                      style={{ color: 'var(--dgold)' }}
                    >
                      New {sr.skill_name} PR!
                    </p>
                    <p className="text-xs" style={{ color: 'var(--dink-muted)' }}>
                      {sr.pr_exercise_name}
                    </p>
                    <div className="mt-2 text-center">
                      <span className="text-lg font-bold font-display" style={{ color: 'var(--dgold)' }}>
                        {sr.new_pr_weight} x {sr.new_pr_reps}
                      </span>
                      {sr.new_pr_reps && sr.new_pr_reps > 1 && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--dink-muted)' }}>
                          ~{Math.round(sr.new_pr ?? 0)} lb est. 1RM
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Real PR (Max Weight) Achievement */}
                {sr.achieved_real_pr && (
                  <div
                    className="rounded p-4 text-center"
                    style={{
                      background: 'rgba(201, 162, 39, 0.08)',
                      border: '1px solid rgba(201, 162, 39, 0.25)',
                    }}
                  >
                    <p
                      className="text-xs font-bold uppercase tracking-widest mb-1"
                      style={{ color: 'var(--dgold)' }}
                    >
                      New {sr.skill_name} Max!
                    </p>
                    <p className="text-xs" style={{ color: 'var(--dink-muted)' }}>
                      {sr.pr_exercise_name}
                    </p>
                    <div className="mt-2 text-center">
                      <span className="text-lg font-bold font-display" style={{ color: 'var(--dgold)' }}>
                        {sr.new_max_weight} lb
                      </span>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--dink-muted)' }}>
                        Heaviest weight lifted
                      </p>
                    </div>
                  </div>
                )}

                {/* Tier Change + equipment unlock */}
                {sr.tier_changed && (
                  <div
                    className="rounded p-4 text-center"
                    style={{
                      background: 'rgba(168, 85, 247, 0.08)',
                      border: '1px solid rgba(168, 85, 247, 0.25)',
                    }}
                  >
                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#c084fc' }}>
                      {sr.skill_name} Tier Up!
                    </p>
                    <p className="text-sm font-semibold mt-1" style={{ color: '#e9d5ff' }}>
                      {sr.old_tier ?? 'None'} &rarr; {sr.new_tier}
                    </p>
                    {(() => {
                      const unlocked = newlyUnlockedEquipment(sr.skill_name, sr.old_tier, sr.new_tier)
                      if (unlocked.length === 0) return null
                      return (
                        <div
                          className="mt-3 pt-3 space-y-1.5"
                          style={{ borderTop: '1px solid rgba(168, 85, 247, 0.25)' }}
                        >
                          {unlocked.map((item) => (
                            <div key={item.itemName} className="flex items-center justify-center gap-2">
                              <EquipmentIcon slot={item.slot} color={tierColor(item.tier)} size={22} />
                              <span className="text-sm font-semibold" style={{ color: tierColor(item.tier) }}>
                                Unlocked: {item.itemName}
                              </span>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 space-y-3">
          <button
            onClick={onShare}
            className="sq-btn-gold w-full px-4 py-2.5 rounded text-sm font-bold uppercase tracking-wider"
            style={{ minHeight: '44px' }}
          >
            Share Workout
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="sq-panel-raised flex-1 px-4 py-2.5 rounded text-sm font-semibold uppercase tracking-wider transition-colors"
              style={{
                color: 'var(--dink-muted)',
                minHeight: '44px',
              }}
            >
              Dashboard
            </button>
            <button
              onClick={onLogAnother}
              className="sq-panel-raised flex-1 px-4 py-2.5 rounded text-sm font-semibold uppercase tracking-wider transition-colors"
              style={{
                color: 'var(--dink-muted)',
                minHeight: '44px',
              }}
            >
              Log Another
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
