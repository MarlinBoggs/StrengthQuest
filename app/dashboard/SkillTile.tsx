'use client'

import { useEffect, useState } from 'react'
import SkillIcon from './SkillIcon'
import { tierColor, type SkillPanelModel } from './theme'

type Props = {
  skill: SkillPanelModel
  onClick: () => void
}

export default function SkillTile({ skill, onClick }: Props) {
  // Animate the XP bar from 0 to its value on mount
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const frameColor = tierColor(skill.tierName)
  const milestoneColor = tierColor(skill.milestoneTier)

  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-label={`${skill.name}, level ${skill.level}${skill.tierName ? `, ${skill.tierName} tier` : ''}. View details`}
      className="sq-tile w-full h-full flex flex-col items-center text-center gap-1.5 px-3 pt-4 pb-3"
      style={{ minHeight: '196px' }}
    >
      <SkillIcon skillName={skill.name} frameColor={frameColor} size={44} />

      <span className="sq-label mt-1">{skill.name}</span>

      <span className="sq-tile-level">{skill.level}</span>

      <div className="w-full mt-auto">
        <div
          className="text-right sq-num mb-1"
          style={{ fontSize: '13px', color: 'var(--dink-muted)' }}
        >
          {skill.isMaxLevel ? 'MAX' : `${skill.xpInLevel} / ${skill.xpNeeded}`}
        </div>
        <div
          className="sq-xp-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={skill.xpNeeded}
          aria-valuenow={skill.xpInLevel}
          aria-label={`${skill.name} XP progress`}
        >
          <div
            className="sq-xp-fill"
            style={{ width: mounted ? `${skill.xpPct}%` : '0%' }}
          />
        </div>
        <div
          className="mt-1.5 truncate sq-num"
          style={{ fontSize: '13px', minHeight: '18px', color: milestoneColor }}
        >
          {skill.milestoneText ?? ' '}
        </div>
      </div>
    </button>
  )
}
