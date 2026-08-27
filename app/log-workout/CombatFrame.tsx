'use client'

import { useEffect, useRef } from 'react'
import type { BossState, CombatLogEntry } from './form-types'

type Props = {
  visible: boolean
  combatMode: boolean
  onCombatModeChange: (on: boolean) => void
  soundEnabled: boolean
  onSoundEnabledChange: (on: boolean) => void
  boss: BossState | null
  bossHpRemaining: number
  overkill: number
  combatLog: CombatLogEntry[]
  skillColors: Record<number, string>
  killPulse: number
}

// Presentational only — no boss/log state of its own. The toggle row always
// renders (once `visible`) so Combat Mode can be turned back on; only the
// boss/HP/log content is gated on combatMode. `killPulse` is an incrementing
// counter (not a boolean) so this can't miss a kill even if two land close
// together — a change in value, not its truthiness, triggers the flash.
export default function CombatFrame({
  visible,
  combatMode,
  onCombatModeChange,
  soundEnabled,
  onSoundEnabledChange,
  boss,
  bossHpRemaining,
  overkill,
  combatLog,
  skillColors,
  killPulse,
}: Props) {
  const frameRef = useRef<HTMLDivElement>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const lastPulse = useRef(killPulse)

  useEffect(() => {
    if (killPulse === lastPulse.current) return
    lastPulse.current = killPulse
    const el = frameRef.current
    if (!el) return
    el.classList.remove('sq-combat-flash')
    void el.offsetWidth // restart the animation even if it's mid-flash
    el.classList.add('sq-combat-flash')
  }, [killPulse])

  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [combatLog])

  if (!visible) return null

  const pct = boss ? Math.max(0, Math.min(100, (bossHpRemaining / boss.hpMax) * 100)) : 0
  const dead = boss !== null && bossHpRemaining <= 0
  const color = boss ? skillColors[boss.skillId] ?? 'var(--dgold)' : 'var(--dgold)'

  return (
    <div ref={frameRef} className="sq-panel-raised p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="sq-label">⚔ Combat</span>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5" style={{ fontSize: '12px', color: 'var(--dink-muted)' }}>
            <input
              type="checkbox"
              checked={combatMode}
              onChange={(e) => onCombatModeChange(e.target.checked)}
              style={{ accentColor: 'var(--dgold)', width: '15px', height: '15px' }}
            />
            Combat Mode
          </label>
          <label className="flex items-center gap-1.5" style={{ fontSize: '12px', color: 'var(--dink-muted)' }}>
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => onSoundEnabledChange(e.target.checked)}
              style={{ accentColor: 'var(--dgold)', width: '15px', height: '15px' }}
            />
            Sound
          </label>
        </div>
      </div>

      {combatMode && (
        <>
          <div className="flex items-center justify-between mb-1.5 gap-2">
            <span className="font-display truncate" style={{ fontSize: '15px', color: 'var(--dink)' }}>
              {boss ? `${boss.name}${dead ? ' — Defeated' : ''}` : 'Awaiting first strike…'}
            </span>
            <span className="sq-num shrink-0" style={{ fontSize: '12px', color: 'var(--dink-muted)' }}>
              {boss ? `${Math.max(0, bossHpRemaining)} / ${boss.hpMax}` : '—'}
              {overkill > 0 && (
                <span className="ml-1.5" style={{ color: 'var(--dgold)', fontWeight: 700 }}>
                  OVERKILL +{overkill}
                </span>
              )}
            </span>
          </div>

          <div
            className="sq-xp-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-label={boss ? `${boss.name} health` : 'No boss engaged'}
          >
            <div
              className="sq-xp-fill"
              style={{ width: `${pct}%`, background: dead ? 'var(--dbevel-light)' : color }}
            />
          </div>

          <div
            ref={logRef}
            className="sq-bevel-in sq-combat-log mt-3"
            style={{ background: 'var(--dbg)' }}
            aria-live="polite"
          >
            {combatLog.length === 0 ? (
              <p style={{ color: 'var(--dink-muted)', opacity: 0.6, fontStyle: 'italic', margin: 0 }}>
                Complete a set to engage a boss…
              </p>
            ) : (
              combatLog.map((line) => (
                <div
                  key={line.id}
                  className={`sq-combat-log-line${line.cls ? ` sq-combat-line--${line.cls}` : ''}`}
                >
                  <span>{line.text}</span>
                  {line.hp && <span style={{ opacity: 0.7, flexShrink: 0 }}>{line.hp}</span>}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
