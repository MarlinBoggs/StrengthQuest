'use client'

import type { ComponentType, CSSProperties } from 'react'
import { useInView } from './useInView'
import {
  FistIcon,
  AnchorIcon,
  BootIcon,
  FlameIcon,
  HeartIcon,
  ShieldIcon,
} from './PixelIcons'

type IconType = ComponentType<{ size?: number; className?: string; style?: CSSProperties }>

// Landing-page tier ladder (original names — ported into the app later)
const TIER_LADDER = [
  'Stone',
  'Copper',
  'Iron',
  'Steel',
  'Cobalt',
  'Obsidian',
  'Meteoric',
  'Wyrmforged',
  'Colossus',
  'Demigod',
  'Godforged',
  'Mythic',
]

// XP figures follow the real level thresholds [ …500, 850, 1350, 2000… ]
const HERO_SKILLS: {
  name: string
  Icon: IconType
  color: string
  level: number
  tier: string
  xpNow: string
  xpNext: string
  pct: number
  float: string
  floatDelay: string
  barDelay: string
}[] = [
  {
    name: 'Push',
    Icon: FistIcon,
    color: '#DC2626',
    level: 4,
    tier: 'Steel',
    xpNow: '712',
    xpNext: '850',
    pct: 62,
    float: '+42 XP',
    floatDelay: '0.4s',
    barDelay: '0.1s',
  },
  {
    name: 'Pull',
    Icon: AnchorIcon,
    color: '#2563EB',
    level: 6,
    tier: 'Obsidian',
    xpNow: '1,830',
    xpNext: '2,000',
    pct: 74,
    float: '+51 XP',
    floatDelay: '2.1s',
    barDelay: '0.25s',
  },
  {
    name: 'Legs',
    Icon: BootIcon,
    color: '#16A34A',
    level: 5,
    tier: 'Cobalt',
    xpNow: '1,265',
    xpNext: '1,350',
    pct: 83,
    float: '+38 XP',
    floatDelay: '3.6s',
    barDelay: '0.4s',
  },
]

const MINI_SKILLS: {
  name: string
  Icon: IconType
  color: string
  level: number
  pct: number
}[] = [
  { name: 'Endurance', Icon: FlameIcon, color: '#F97316', level: 3, pct: 45 },
  { name: 'Hit Points', Icon: HeartIcon, color: '#9333EA', level: 2, pct: 70 },
  { name: 'Defense', Icon: ShieldIcon, color: '#0D9488', level: 3, pct: 30 },
]

const SHOWCASED_TIERS = new Set(HERO_SKILLS.map((s) => s.tier))

export default function SkillShowcase() {
  const { ref, inView } = useInView<HTMLDivElement>(0.25)

  return (
    <div ref={ref} className={`sq-reveal ${inView ? 'is-visible' : ''}`}>
      {/* The big three */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {HERO_SKILLS.map((s) => (
          <div key={s.name} className="skill-card relative overflow-hidden p-5">
            <div
              className="absolute top-0 left-0 right-0"
              style={{ height: 2, background: s.color }}
            />
            <span
              className="sq-float-xp absolute font-bold text-sm pointer-events-none"
              style={{ color: s.color, right: 20, top: 44, animationDelay: s.floatDelay }}
              aria-hidden="true"
            >
              {s.float}
            </span>

            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="card-dark p-2 inline-flex"
                  style={{ color: s.color }}
                >
                  <s.Icon size={28} />
                </div>
                <div>
                  <h3
                    className="font-display font-bold uppercase tracking-wider"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {s.name}
                  </h3>
                  <span
                    className="inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 mt-1"
                    style={{
                      color: s.color,
                      background: `${s.color}14`,
                      boxShadow: `0 0 0 1px ${s.color}55`,
                      borderRadius: 1,
                    }}
                  >
                    {s.tier} Tier
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div
                  className="font-display text-3xl font-bold leading-none"
                  style={{ color: 'var(--gold-bright)' }}
                >
                  {s.level}
                </div>
                <div
                  className="text-[10px] uppercase tracking-widest mt-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Level
                </div>
              </div>
            </div>

            <div className="mt-5">
              <div className="xp-bar-track">
                <div
                  className="xp-bar-fill"
                  style={{
                    width: inView ? `${s.pct}%` : '0%',
                    background: `linear-gradient(90deg, ${s.color}, ${s.color}cc)`,
                    transition: 'width 1.1s cubic-bezier(0.22, 1, 0.36, 1)',
                    transitionDelay: s.barDelay,
                  }}
                />
              </div>
              <div
                className="flex justify-between text-xs mt-1.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                <span>
                  {s.xpNow} / {s.xpNext} XP
                </span>
                <span style={{ color: 'var(--text-muted)' }}>
                  Next: Lv {s.level + 1}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* The support skills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
        {MINI_SKILLS.map((s) => (
          <div key={s.name} className="skill-card flex items-center gap-3 px-4 py-3">
            <span style={{ color: s.color }}>
              <s.Icon size={20} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline">
                <span
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {s.name}
                </span>
                <span
                  className="font-display text-sm font-bold"
                  style={{ color: 'var(--gold-bright)' }}
                >
                  {s.level}
                </span>
              </div>
              <div className="xp-bar-track mt-1.5" style={{ height: 5 }}>
                <div
                  className="xp-bar-fill"
                  style={{
                    width: inView ? `${s.pct}%` : '0%',
                    background: s.color,
                    transition: 'width 1.1s cubic-bezier(0.22, 1, 0.36, 1)',
                    transitionDelay: '0.55s',
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* The tier ladder */}
      <div className="card-dark px-4 py-4 mt-6 text-center">
        <p
          className="text-[10px] uppercase tracking-[0.25em] mb-2"
          style={{ color: 'var(--text-muted)' }}
        >
          The Tier Ladder
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {TIER_LADDER.map((tier, i) => (
            <span key={tier}>
              <span
                style={
                  tier === 'Mythic'
                    ? { color: 'var(--gold-bright)', fontWeight: 700 }
                    : SHOWCASED_TIERS.has(tier)
                      ? { color: 'var(--text-secondary)', fontWeight: 600 }
                      : undefined
                }
              >
                {tier}
              </span>
              {i < TIER_LADDER.length - 1 && (
                <span aria-hidden="true"> · </span>
              )}
            </span>
          ))}
        </p>
      </div>
    </div>
  )
}
