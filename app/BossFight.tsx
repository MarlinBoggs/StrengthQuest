'use client'

import { useEffect, useState } from 'react'
import { useInView } from './useInView'

// Scripted landing-page replay of the Combat Frame (app/log-workout/CombatFrame.tsx).
// Numbers are illustrative; the real boss is sized by deriveBossHp() in combat.ts.
const BOSS = 'Forge Wretch'
const BOSS_HP = 240
const BOSS_COLOR = '#DC2626' // Push

const HITS: { set: string; damage: number; heavy?: boolean }[] = [
  { set: 'Bench 185 × 5', damage: 42 },
  { set: 'Bench 185 × 5', damage: 42 },
  { set: 'Bench 205 × 3', damage: 51, heavy: true },
  { set: 'Incline DB 60 × 10', damage: 38 },
  { set: 'Incline DB 60 × 9', damage: 36 },
  { set: 'Dips BW × 12', damage: 43 },
]

type Line = { text: string; hp?: string; kind?: 'intro' | 'kill' }

function buildLines(): Line[] {
  const lines: Line[] = [{ text: `A ${BOSS} blocks your path!`, kind: 'intro' }]
  let hp = BOSS_HP
  for (const hit of HITS) {
    hp -= hit.damage
    const text = hit.heavy
      ? `${hit.set}: a crushing blow for ${hit.damage} damage!`
      : `${hit.set}: you strike for ${hit.damage} damage.`
    lines.push({ text, hp: `${Math.max(0, hp)} HP` })
    if (hp <= 0) {
      lines.push({ text: `The ${BOSS} collapses. Boss defeated!`, kind: 'kill' })
      break
    }
  }
  return lines
}

const LINES = buildLines()
const TOTAL_DAMAGE = HITS.reduce((sum, h) => sum + h.damage, 0)

const LINE_COLOR: Record<NonNullable<Line['kind']>, string> = {
  intro: 'var(--text-primary)',
  kill: 'var(--gold-bright)',
}

export default function BossFight() {
  const { ref, inView } = useInView<HTMLDivElement>(0.5)
  const [shown, setShown] = useState(0)

  useEffect(() => {
    if (!inView) return
    // Reduced motion: show the finished fight in a single tick.
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let i = 0
    const id = window.setInterval(() => {
      i = reduce ? LINES.length : i + 1
      setShown(i)
      if (i >= LINES.length) window.clearInterval(id)
    }, reduce ? 0 : 900)
    return () => window.clearInterval(id)
  }, [inView])

  const damage = HITS.slice(0, Math.max(0, shown - 1)).reduce((sum, h) => sum + h.damage, 0)
  const hpLeft = Math.max(0, BOSS_HP - damage)
  const dead = shown >= LINES.length && TOTAL_DAMAGE >= BOSS_HP
  const overkill = dead ? TOTAL_DAMAGE - BOSS_HP : 0
  const pct = (hpLeft / BOSS_HP) * 100

  return (
    <div ref={ref} className="card-dark max-w-md mx-auto p-5 text-left">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span
          className="font-display font-bold tracking-wide truncate"
          style={{ color: 'var(--text-primary)' }}
        >
          ⚔ {BOSS}
          {dead && <span style={{ color: 'var(--gold-bright)' }}> · Defeated</span>}
        </span>
        <span className="text-xs shrink-0 tabular-nums" style={{ color: 'var(--text-muted)' }}>
          {hpLeft} / {BOSS_HP}
          {overkill > 0 && (
            <span className="ml-1.5 font-bold" style={{ color: 'var(--gold-bright)' }}>
              OVERKILL +{overkill}
            </span>
          )}
        </span>
      </div>

      <div
        className="xp-bar-track h-3"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={BOSS_HP}
        aria-valuenow={hpLeft}
        aria-label={`${BOSS} health`}
      >
        <div
          className="h-full"
          style={{
            width: `${pct}%`,
            background: dead ? 'var(--border-subtle)' : BOSS_COLOR,
            transition: 'width 0.5s ease',
          }}
        />
      </div>

      <div
        className="mt-4 p-3 text-xs space-y-1.5"
        style={{
          background: 'var(--bg-abyss)',
          minHeight: '11rem',
          boxShadow:
            'inset 1px 1px 0 var(--border-shadow), inset -1px -1px 0 var(--border-highlight)',
        }}
      >
        {shown === 0 && (
          <p className="italic" style={{ color: 'var(--text-muted)' }}>
            Complete a set to engage a boss…
          </p>
        )}
        {LINES.slice(0, shown).map((line, i) => (
          <div
            key={i}
            className="flex justify-between gap-3"
            style={{
              color: line.kind ? LINE_COLOR[line.kind] : 'var(--text-secondary)',
              fontWeight: line.kind ? 700 : 400,
            }}
          >
            <span>{line.text}</span>
            {line.hp && <span className="shrink-0 tabular-nums opacity-70">{line.hp}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
