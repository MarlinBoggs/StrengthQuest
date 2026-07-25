'use client'

import { calculate1RM } from '@/lib/utils/calculate-1rm'
import type { ActiveXpDrop, SetEntry } from './form-types'

type Props = {
  set: SetEntry
  setIdx: number
  loading: boolean
  drops: ActiveXpDrop[]
  onUpdate: (field: 'weight' | 'reps' | 'rpe', value: string) => void
  onToggle: () => void
  onRemove: () => void
}

export default function SetRow({ set, setIdx, loading, drops, onUpdate, onToggle, onRemove }: Props) {
  const w = parseFloat(set.weight)
  const r = parseInt(set.reps)
  const estimated1rm = !isNaN(w) && w > 0 && !isNaN(r) && r > 0 ? calculate1RM(w, r) : null

  return (
    <div
      className="relative rounded px-1.5 py-1"
      style={{
        background: set.completed ? 'rgba(201, 162, 39, 0.1)' : 'transparent',
        boxShadow: set.completed ? 'inset 0 0 0 1px rgba(201, 162, 39, 0.3)' : 'none',
      }}
    >
      {drops
        .filter((drop) => drop.setIdx === setIdx)
        .map((drop) => (
          <div
            key={drop.id}
            className="pointer-events-none absolute right-3 top-0 font-bold sq-num"
            style={{
              fontSize: '15px',
              color: drop.colorHex,
              textShadow: '0 0 8px rgba(0, 0, 0, 0.35)',
              animation: 'sq-xp-rise 0.9s ease-out forwards',
              zIndex: 5,
            }}
          >
            +{drop.amount} XP
          </div>
        ))}

      <div className="flex items-center gap-1 sm:gap-2">
        <span
          className="w-5 shrink-0 text-right sq-num"
          style={{ fontSize: '13px', color: 'var(--dink-muted)' }}
        >
          {setIdx + 1}
        </span>
        <input
          type="number"
          inputMode="decimal"
          placeholder="lbs"
          value={set.weight}
          onChange={(e) => onUpdate('weight', e.target.value)}
          className="sq-input w-16 sm:w-20 px-1.5 py-2 text-center sq-num"
          disabled={loading || set.completed}
          step="0.5"
          min="0"
          aria-label={`Set ${setIdx + 1} weight in pounds`}
        />
        <span style={{ fontSize: '13px', color: 'var(--dink-muted)' }}>&times;</span>
        <input
          type="number"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="reps"
          value={set.reps}
          onChange={(e) => onUpdate('reps', e.target.value)}
          className="sq-input w-12 sm:w-16 px-1.5 py-2 text-center sq-num"
          disabled={loading || set.completed}
          min="1"
          aria-label={`Set ${setIdx + 1} reps`}
        />
        <select
          value={set.rpe}
          onChange={(e) => onUpdate('rpe', e.target.value)}
          className="sq-input w-14 sm:w-16 px-1 py-2 sq-num"
          disabled={loading || set.completed}
          aria-label={`Set ${setIdx + 1} RPE`}
        >
          <option value="">RPE</option>
          {[6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        {estimated1rm !== null && (
          <span
            className="hidden sm:inline w-14 text-right sq-num"
            style={{ fontSize: '13px', color: 'var(--dink-muted)' }}
          >
            ~{estimated1rm.toFixed(0)}
          </span>
        )}
        <button
          type="button"
          onClick={onToggle}
          className="ml-auto shrink-0 rounded font-bold uppercase tracking-wider px-2.5 sm:px-3 transition-colors"
          style={{
            fontSize: '13px',
            minHeight: '44px',
            minWidth: '44px',
            background: set.completed ? 'rgba(201, 162, 39, 0.12)' : 'var(--dgold)',
            color: set.completed ? 'var(--dgold)' : '#171008',
            boxShadow: set.completed ? 'inset 0 0 0 1px rgba(201, 162, 39, 0.35)' : 'none',
          }}
          disabled={loading}
          aria-label={set.completed ? `Edit set ${setIdx + 1}` : `Mark set ${setIdx + 1} done`}
        >
          {set.completed ? '✎' : '✓'}
          <span className="hidden sm:inline ml-1">{set.completed ? 'Edit' : 'Done'}</span>
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 flex items-center justify-center transition-colors"
          style={{ fontSize: '15px', minHeight: '44px', width: '28px', color: 'var(--dink-muted)' }}
          disabled={loading}
          aria-label={`Remove set ${setIdx + 1}`}
        >
          &times;
        </button>
      </div>
    </div>
  )
}
