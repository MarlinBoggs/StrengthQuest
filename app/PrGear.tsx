import EquipmentIcon from '@/app/dashboard/EquipmentIcon'
import { tierColor } from '@/app/dashboard/theme'

// Landing-page illustration of the PR → tier → gear loop (app/dashboard/equipment.ts).
// Earlier tiers are shown as already owned; the last one is the fresh unlock.
const LADDER = ['Iron', 'Steel', 'Mithril']
const UNLOCKED = LADDER[LADDER.length - 1]

export default function PrGear() {
  return (
    <div className="card-dark max-w-md mx-auto p-6 text-center">
      <p
        className="text-xs font-bold uppercase tracking-[0.3em]"
        style={{ color: 'var(--gold)' }}
      >
        ★ New PR ★
      </p>
      <p
        className="font-display text-xl font-bold mt-2"
        style={{ color: 'var(--text-primary)' }}
      >
        Bench Press · 205 × 3
      </p>

      <div className="flex items-end justify-center gap-5 mt-6">
        {LADDER.map((tier) => {
          const isNew = tier === UNLOCKED
          return (
            <div
              key={tier}
              className="flex flex-col items-center gap-1.5"
              style={{ opacity: isNew ? 1 : 0.55 }}
            >
              <EquipmentIcon slot="chest" color={tierColor(tier)} size={isNew ? 56 : 36} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {tier}
              </span>
            </div>
          )
        })}
      </div>

      <p className="text-sm font-bold mt-5" style={{ color: tierColor(UNLOCKED) }}>
        Unlocked: {UNLOCKED} Platebody
      </p>
    </div>
  )
}
