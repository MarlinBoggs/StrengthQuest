'use client'

import { useState } from 'react'
import { XP_THRESHOLDS } from '@/lib/utils/xp-thresholds'

type PrimaryPr = {
  exercise_name: string
  best_1rm: number
  best_weight: number
  best_reps: number
  max_weight_lifted: number
}

type AccessoryPr = {
  exercise_id: number
  exercise_name: string
  best_weight: number
  best_reps: number
  max_weight_lifted: number
}

type TierProgress = {
  nextTierName: string
  lbsNeeded: number
  progressPct: number
  currentMultiplier: number
  nextMultiplier: number
} | null

type Props = {
  skillName: string
  colorHex: string
  currentTier: string | null
  currentLevel: number
  currentXp: number
  bodyweightLbs: number
  primaryPr: PrimaryPr | undefined
  accessoryPrs: AccessoryPr[]
  tierProgress: TierProgress
}

export default function SkillCard({
  skillName,
  colorHex,
  currentTier,
  currentLevel,
  currentXp,
  bodyweightLbs,
  primaryPr,
  accessoryPrs,
  tierProgress,
}: Props) {
  const [showAccessories, setShowAccessories] = useState(false)

  const currentLevelXp = XP_THRESHOLDS[currentLevel - 1]
  const nextLevelXp = currentLevel >= 10 ? currentLevelXp : XP_THRESHOLDS[currentLevel]
  const xpProgress = currentLevel >= 10
    ? 100
    : Math.round(((currentXp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100)
  const xpInLevel = currentXp - currentLevelXp
  const xpNeeded = nextLevelXp - currentLevelXp
  const accessoryPreview = accessoryPrs.slice(0, 1)

  return (
    <div
      className="skill-card p-5 relative overflow-hidden"
      style={{
        borderTop: `3px solid ${colorHex}`,
      }}
    >
      <div className="relative">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-display text-lg font-bold tracking-wider uppercase" style={{ color: 'var(--text-primary)' }}>
            {skillName}
          </h4>
          {currentTier && (
            <span
              className="text-xs font-bold px-2 py-0.5 font-display tracking-wide"
              style={{
                background: 'var(--bg-elevated)',
                color: colorHex,
                boxShadow: 'inset 1px 1px 0 var(--border-highlight), inset -1px -1px 0 var(--border-shadow), 0 0 0 1px var(--border-mid)',
                borderRadius: '2px',
              }}
            >
              {currentTier}
            </span>
          )}
        </div>

        <div className="mb-4">
          <span className="font-display text-2xl font-bold" style={{ color: colorHex }}>
            {currentLevel}
          </span>
          <span className="text-xs uppercase tracking-wider font-semibold ml-1" style={{ color: 'var(--text-secondary)' }}>
            Level
          </span>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span style={{ color: 'var(--text-secondary)' }}>XP Progress</span>
            <span style={{ color: 'var(--text-muted)' }}>
              {currentLevel >= 10 ? 'MAX' : `${xpInLevel} / ${xpNeeded}`}
            </span>
          </div>
          <div className="xp-bar-track">
            <div
              className="xp-bar-fill"
              style={{ width: `${xpProgress}%`, backgroundColor: colorHex, color: colorHex }}
            />
          </div>
        </div>

        {primaryPr && (
          <div
            className="p-3 mb-3"
            style={{
              background: 'var(--bg-elevated)',
              borderLeft: `3px solid ${colorHex}`,
              boxShadow: 'inset 1px 1px 0 var(--border-highlight), inset -1px -1px 0 var(--border-shadow)',
              borderRadius: '2px',
            }}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: colorHex }}>
              Hero Lift: {primaryPr.exercise_name}
            </p>

            <div className="flex justify-between items-baseline mb-0.5 gap-3">
              <span className="text-sm font-bold" style={{ color: 'var(--gold)' }}>
                {primaryPr.best_weight} x {primaryPr.best_reps}
              </span>
              {primaryPr.max_weight_lifted ? (
                <span className="text-xs text-right" style={{ color: 'var(--text-secondary)' }}>
                  Max:{' '}
                  <span className="font-semibold" style={{ color: 'var(--gold)' }}>
                    {primaryPr.max_weight_lifted} lbs
                  </span>
                </span>
              ) : null}
            </div>

            <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
              Est. ~{Math.round(primaryPr.best_1rm)} lb 1RM
              {tierProgress ? (
                <span className="ml-1">
                  · <span style={{ color: 'var(--text-secondary)' }}>{tierProgress.currentMultiplier.toFixed(2)}x BW</span>
                </span>
              ) : null}
            </p>

            {tierProgress ? (
              <>
                <div
                  className="flex justify-between text-[10px] mb-1 gap-2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <span>{currentTier ?? '-'}</span>
                  <span className="text-right" style={{ color: colorHex }}>
                    {tierProgress.nextTierName}: {tierProgress.nextMultiplier.toFixed(2)}x BW
                  </span>
                </div>
                <div
                  className="w-full rounded-full overflow-hidden mb-1"
                  style={{ height: '3px', background: 'var(--bg-elevated)' }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${tierProgress.progressPct}%`,
                      backgroundColor: colorHex,
                      opacity: 0.7,
                    }}
                  />
                </div>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  ~{tierProgress.lbsNeeded} lbs to{' '}
                  <span className="font-semibold" style={{ color: colorHex }}>
                    {tierProgress.nextTierName}
                  </span>
                </p>
              </>
            ) : null}
          </div>
        )}

        {accessoryPrs.length > 0 ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowAccessories((current) => !current)}
              className="w-full px-3 py-2 rounded-sm text-left text-xs font-semibold uppercase tracking-[0.18em] transition-colors"
              style={{
                color: showAccessories ? colorHex : 'var(--text-secondary)',
                background: 'var(--bg-elevated)',
                boxShadow: 'inset 1px 1px 0 var(--border-highlight), inset -1px -1px 0 var(--border-shadow), 0 0 0 1px var(--border-mid)',
              }}
            >
              <span className="flex items-center justify-between gap-3">
                <span>{showAccessories ? 'Hide Accessories' : `Show Accessories (${accessoryPrs.length})`}</span>
                <span aria-hidden="true">{showAccessories ? '-' : '+'}</span>
              </span>
            </button>

            {!showAccessories ? (
              <div className="px-1">
                {accessoryPreview.map((pr) => (
                  <div key={pr.exercise_id} className="flex justify-between items-center gap-2">
                    <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                      {pr.exercise_name}
                    </span>
                    <span className="text-xs font-semibold shrink-0" style={{ color: 'var(--text-muted)' }}>
                      {pr.best_weight} x {pr.best_reps}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {accessoryPrs.map((pr) => (
                  <div key={pr.exercise_id} className="flex justify-between items-center gap-2">
                    <span className="text-xs truncate mr-2" style={{ color: 'var(--text-secondary)' }}>
                      {pr.exercise_name}
                    </span>
                    <span className="text-xs font-semibold shrink-0" style={{ color: 'var(--gold)' }}>
                      {pr.best_weight} x {pr.best_reps}
                      {pr.max_weight_lifted && bodyweightLbs ? (
                        <span className="ml-1.5 font-normal" style={{ color: 'var(--text-muted)' }}>
                          ({(pr.max_weight_lifted / bodyweightLbs).toFixed(2)}x)
                        </span>
                      ) : null}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
