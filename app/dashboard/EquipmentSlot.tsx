'use client'

import EquipmentIcon from './EquipmentIcon'
import { tierColor } from './theme'
import type { EquipmentSlotModel } from './equipment'

type Props = {
  slot: EquipmentSlotModel
  onClick: () => void
}

export default function EquipmentSlot({ slot, onClick }: Props) {
  const equipped = slot.tierIdx >= 0
  const color = equipped ? tierColor(slot.tierName) : 'var(--dbevel-light)'

  if (slot.placeholder) {
    return (
      <div
        className="sq-bevel-in flex items-center justify-center"
        style={{ width: '64px', height: '64px', background: 'var(--dbg)' }}
        aria-label={`${slot.label} slot, coming soon`}
        title={`${slot.label} — coming soon`}
      >
        <span style={{ color: 'var(--dbevel-light)', fontSize: '15px' }}>?</span>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-label={
        equipped
          ? `${slot.label}: ${slot.itemName}. View details`
          : `${slot.label} slot, empty. View details`
      }
      title={slot.itemName ?? `${slot.label} — empty`}
      className="sq-bevel-in flex items-center justify-center"
      style={{
        width: '64px',
        height: '64px',
        background: 'var(--dbg)',
        boxShadow: equipped ? `inset 0 0 0 1px ${color}` : undefined,
      }}
    >
      <EquipmentIcon slot={slot.slot} color={color} empty={!equipped} size={40} />
    </button>
  )
}
