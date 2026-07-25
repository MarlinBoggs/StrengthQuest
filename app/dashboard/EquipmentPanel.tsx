'use client'

import { useState } from 'react'
import EquipmentSlot from './EquipmentSlot'
import EquipmentDetailSheet from './EquipmentDetailSheet'
import type { EquipmentSlotKey, EquipmentSlotModel } from './equipment'

type Props = {
  slots: EquipmentSlotModel[]
}

// OSRS equipment-tab layout (null = empty grid cell)
const GRID: (EquipmentSlotKey | null)[][] = [
  [null, 'helm', null],
  ['cape', 'amulet', null],
  ['weapon', 'chest', 'shield'],
  [null, 'legs', null],
  ['gloves', 'boots', null],
]

export default function EquipmentPanel({ slots }: Props) {
  const [openSlot, setOpenSlot] = useState<EquipmentSlotKey | null>(null)
  const bySlot = new Map(slots.map((s) => [s.slot, s]))
  const open = openSlot ? (bySlot.get(openSlot) ?? null) : null

  const unlockedCount = slots.filter((s) => s.tierIdx >= 0).length
  const equippableCount = slots.filter((s) => !s.placeholder).length

  return (
    <section className="sq-panel p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="sq-label">Equipment</h3>
        <span className="sq-num" style={{ fontSize: '13px', color: 'var(--dink-muted)' }}>
          {unlockedCount} / {equippableCount}
        </span>
      </div>

      <div className="flex flex-col items-center gap-2">
        {GRID.map((row, r) => (
          <div key={r} className="flex gap-2">
            {row.map((key, c) => {
              if (!key) {
                return <div key={c} style={{ width: '64px', height: '64px' }} aria-hidden="true" />
              }
              const slot = bySlot.get(key)
              if (!slot) return <div key={c} style={{ width: '64px', height: '64px' }} />
              return <EquipmentSlot key={c} slot={slot} onClick={() => setOpenSlot(key)} />
            })}
          </div>
        ))}
      </div>

      {open && <EquipmentDetailSheet slot={open} onClose={() => setOpenSlot(null)} />}
    </section>
  )
}
