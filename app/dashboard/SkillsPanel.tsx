'use client'

import { useState } from 'react'
import SkillTile from './SkillTile'
import SkillDetailSheet from './SkillDetailSheet'
import type { SkillPanelModel } from './theme'

type Props = {
  skills: SkillPanelModel[]
}

export default function SkillsPanel({ skills }: Props) {
  const [openSkillId, setOpenSkillId] = useState<number | null>(null)
  const openSkill = skills.find((s) => s.skillId === openSkillId) ?? null

  return (
    <section>
      <h3 className="sq-label mb-3">Skills</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 auto-rows-fr">
        {skills.map((skill) => (
          <SkillTile
            key={skill.skillId}
            skill={skill}
            onClick={() => setOpenSkillId(skill.skillId)}
          />
        ))}
      </div>

      {openSkill && (
        <SkillDetailSheet skill={openSkill} onClose={() => setOpenSkillId(null)} />
      )}
    </section>
  )
}
