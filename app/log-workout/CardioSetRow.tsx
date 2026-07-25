'use client'

import type { ActiveXpDrop, CardioSetEntry } from './form-types'

type Props = {
  set: CardioSetEntry
  setIdx: number
  loading: boolean
  drops: ActiveXpDrop[]
  onUpdate: (field: 'durationMinutes' | 'intensity', value: string) => void
  onToggle: () => void
  onRemove: () => void
}

export default function CardioSetRow({ set, setIdx, loading, drops, onUpdate, onToggle, onRemove }: Props) {
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
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="min"
          value={set.durationMinutes}
          onChange={(e) => onUpdate('durationMinutes', e.target.value)}
          className="sq-input w-14 sm:w-20 px-1.5 py-2 text-center sq-num"
          disabled={loading || set.completed}
          min="1"
          max="300"
          aria-label={`Set ${setIdx + 1} duration in minutes`}
        />
        <span style={{ fontSize: '13px', color: 'var(--dink-muted)' }}>min</span>
        <div className="flex items-center gap-1">
          {(['low', 'med', 'high'] as const).map((lvl) => {
            const active = set.intensity === lvl
            return (
              <button
                key={lvl}
                type="button"
                onClick={() => onUpdate('intensity', lvl)}
                className="rounded text-center font-semibold uppercase tracking-wider px-1.5 sm:px-3 transition-colors"
                style={{
                  fontSize: '13px',
                  minHeight: '44px',
                  border: `1px solid ${active ? 'var(--dgold)' : 'var(--dbevel-light)'}`,
                  background: active ? 'rgba(201, 162, 39, 0.12)' : 'transparent',
                  color: active ? 'var(--dgold)' : 'var(--dink-muted)',
                }}
                disabled={loading || set.completed}
                aria-pressed={active}
              >
                {lvl}
              </button>
            )
          })}
        </div>
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
