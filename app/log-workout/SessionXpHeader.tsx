'use client'

import { XP_THRESHOLDS, getLevelForXp } from '@/lib/utils/xp-thresholds'

type Props = {
  visible: boolean
  sessionSkillXp: Record<number, number>
  skillXp: Record<number, { currentXp: number; currentLevel: number }>
  skillNames: Record<number, string>
  skillColors: Record<number, string>
  completedSetCount: number
  totalWeightLifted: number
}

export default function SessionXpHeader({
  visible,
  sessionSkillXp,
  skillXp,
  skillNames,
  skillColors,
  completedSetCount,
  totalWeightLifted,
}: Props) {
  if (!visible) return null

  const totalSessionXp = Object.values(sessionSkillXp).reduce((sum, v) => sum + v, 0)
  const activeSkills = Object.entries(sessionSkillXp).filter(([, xp]) => xp > 0)

  return (
    <div
      className="sq-panel px-4 py-3"
      style={{ position: 'sticky', top: 0, zIndex: 10 }}
    >
      {activeSkills.length > 0 ? (
        <div className="space-y-3">
          {activeSkills.map(([sidStr, gained]) => {
            const sid = parseInt(sidStr)
            const real = skillXp[sid] ?? { currentXp: 0, currentLevel: 1 }
            const totalXp = real.currentXp + gained
            const effectiveLevel = getLevelForXp(totalXp)
            const currentLevelXp = XP_THRESHOLDS[effectiveLevel - 1]
            const nextLevelXp = effectiveLevel >= 10
              ? currentLevelXp
              : XP_THRESHOLDS[effectiveLevel]
            const range = nextLevelXp - currentLevelXp
            const progress = effectiveLevel >= 10
              ? 100
              : Math.min(100, Math.round(((totalXp - currentLevelXp) / range) * 100))
            const colorHex = skillColors[sid] ?? 'var(--dgold)'

            return (
              <div key={sid}>
                <div className="flex items-center justify-between mb-1">
                  <span className="sq-label" style={{ color: colorHex }}>
                    {skillNames[sid]}{' '}
                    <span style={{ color: 'var(--dink-muted)' }}>Lv.{effectiveLevel}</span>
                  </span>
                  <span className="sq-label sq-num" style={{ color: colorHex }}>
                    +{gained} XP
                  </span>
                </div>
                <div
                  className="sq-xp-track"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                  aria-label={`${skillNames[sid]} level progress`}
                >
                  <div
                    className="sq-xp-fill"
                    style={{
                      width: `${progress}%`,
                      background: `linear-gradient(90deg, ${colorHex}cc, ${colorHex})`,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p style={{ fontSize: '13px', color: 'var(--dink-muted)' }}>
          Tap ✓ on a set to start earning XP
        </p>
      )}

      <div
        className="flex items-center justify-between mt-3 pt-3"
        style={{ borderTop: '2px solid var(--dbevel-dark)' }}
      >
        <span className="sq-label sq-num">
          {completedSetCount} sets · {totalWeightLifted.toLocaleString()} lbs
        </span>
        <span className="font-display font-bold sq-num" style={{ fontSize: '15px', color: 'var(--dgold)' }}>
          +{totalSessionXp} XP
        </span>
      </div>
    </div>
  )
}
