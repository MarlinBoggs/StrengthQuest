'use client'

import { tierColor } from '@/app/dashboard/theme'
import { XP_THRESHOLDS } from '@/lib/utils/xp-thresholds'
import type { WorkoutResult } from './actions'
import type { BossState, Exercise, ExerciseEntry, SetEntry } from './form-types'

type Props = {
  visible: boolean
  result: WorkoutResult
  exercises: ExerciseEntry[]
  allExercises: Exercise[]
  workoutDate: string
  skillNames: Record<number, string>
  skillColors: Record<number, string>
  totalWeightLifted: number
  completedSetCount: number
  boss: BossState | null
  bossDefeated: boolean
  onClose: () => void
}

// Picks exactly one headline for the card — rarest/most impressive first.
// A card that leads with everything reads as a report; a card that leads
// with the single best true thing about this session reads as a flex.
// No fallback to total XP — that's already the "XP" stat tile below, so
// with no achievement to lead with, the card just skips straight to stats.
type HeroBanner =
  | { kind: 'tier'; skillName: string; newTier: string }
  | { kind: 'realPr'; skillName: string; exerciseName: string | null; weight: number | null }
  | { kind: 'pr'; skillName: string; exerciseName: string | null; weight: number | null; reps: number | null; est1rm: number | null }
  | { kind: 'levelUp'; skillName: string; newLevel: number }
  | { kind: 'boss'; bossName: string }

function selectHeroBanner(result: WorkoutResult, boss: BossState | null, bossDefeated: boolean): HeroBanner | null {
  const tier = result.skill_results.find((sr) => sr.tier_changed && sr.new_tier)
  if (tier) return { kind: 'tier', skillName: tier.skill_name, newTier: tier.new_tier as string }

  const realPr = result.skill_results.find((sr) => sr.achieved_real_pr)
  if (realPr) {
    return {
      kind: 'realPr',
      skillName: realPr.skill_name,
      exerciseName: realPr.pr_exercise_name,
      weight: realPr.new_max_weight,
    }
  }

  const pr = result.skill_results.find((sr) => sr.achieved_pr)
  if (pr) {
    return {
      kind: 'pr',
      skillName: pr.skill_name,
      exerciseName: pr.pr_exercise_name,
      weight: pr.new_pr_weight,
      reps: pr.new_pr_reps,
      est1rm: pr.new_pr,
    }
  }

  const levelUp = result.skill_results.find((sr) => sr.achieved_level_up)
  if (levelUp) return { kind: 'levelUp', skillName: levelUp.skill_name, newLevel: levelUp.new_level }

  if (bossDefeated && boss) return { kind: 'boss', bossName: boss.name }

  return null
}

type ExerciseSummaryLine = {
  key: string
  name: string
  isPrimary: boolean
  detail: string
}

// All completed sets, grouped: identical weight+reps+RPE collapse into a
// "×N" multiplier ("135 lbs × 10 × 2"); anything that differs (including
// just RPE) is its own comma-separated entry in the order first performed
// ("135 lbs × 10, 225 lbs × 10"). RPE only shows when it was actually
// entered — it's optional and usually left blank.
function formatStrengthSets(sets: SetEntry[]): string {
  const groups: { weight: string; reps: string; rpe: string; count: number }[] = []
  for (const s of sets) {
    if (!s.completed) continue
    const weight = s.weight || '0'
    const reps = s.reps || '0'
    const rpe = s.rpe || ''
    const existing = groups.find((g) => g.weight === weight && g.reps === reps && g.rpe === rpe)
    if (existing) existing.count += 1
    else groups.push({ weight, reps, rpe, count: 1 })
  }
  return groups
    .map((g) => {
      const rpeSuffix = g.rpe ? ` @ RPE ${g.rpe}` : ''
      const countSuffix = g.count > 1 ? ` × ${g.count}` : ''
      return `${g.weight} lbs × ${g.reps}${rpeSuffix}${countSuffix}`
    })
    .join(', ')
}

// One line per exercise: every completed set, compactly grouped above.
function buildExerciseSummary(exercises: ExerciseEntry[], allExercises: Exercise[]): ExerciseSummaryLine[] {
  const lines: ExerciseSummaryLine[] = []
  exercises.forEach((ex, idx) => {
    if (!ex.exerciseId) return
    const info = allExercises.find((e) => String(e.id) === ex.exerciseId)
    if (!info) return

    if (ex.mode === 'cardio') {
      const completed = ex.cardioSets.filter((cs) => cs.completed)
      if (completed.length === 0) return
      const totalDuration = completed.reduce((sum, cs) => sum + (parseInt(cs.durationMinutes) || 0), 0)
      const label = completed.some((cs) => cs.intensity === 'high')
        ? 'High'
        : completed.some((cs) => cs.intensity === 'med')
          ? 'Med'
          : 'Low'
      lines.push({ key: String(idx), name: info.name, isPrimary: false, detail: `${totalDuration} min · ${label}` })
    } else {
      const detail = formatStrengthSets(ex.sets)
      if (!detail) return
      lines.push({ key: String(idx), name: info.name, isPrimary: info.is_primary, detail })
    }
  })
  return lines
}

export default function ShareCard({
  visible,
  result,
  exercises,
  allExercises,
  workoutDate,
  skillNames,
  skillColors,
  totalWeightLifted,
  completedSetCount,
  boss,
  bossDefeated,
  onClose,
}: Props) {
  if (!visible) return null

  const banner = selectHeroBanner(result, boss, bossDefeated)
  const exerciseLines = buildExerciseSummary(exercises, allExercises)
  const dateLabel = new Date(`${workoutDate}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.75)', zIndex: 60 }}
    >
      <div className="sq-panel max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-end mb-1">
          <button
            onClick={onClose}
            aria-label="Close"
            className="sq-panel-raised flex items-center justify-center"
            style={{ width: '32px', height: '32px', color: 'var(--dink)', fontSize: '13px', borderRadius: '3px' }}
          >
            ✕
          </button>
        </div>

        {/* The card itself — everything below this line is "the poster" */}
        <div className="mt-3">
          <div className="flex items-baseline justify-between mb-4">
            <h1 className="font-display tracking-widest uppercase" style={{ fontSize: '17px' }}>
              <span style={{ color: 'var(--dgold)' }}>Strength</span>
              <span style={{ color: 'var(--dink)' }}>Quest</span>
            </h1>
            <span style={{ fontSize: '12px', color: 'var(--dink-muted)' }}>{dateLabel}</span>
          </div>

          {/* Hero banner — one headline, only when there's an achievement to lead with */}
          {banner && <HeroBannerCard banner={banner} />}

          {/* Stat row */}
          <div className={`grid grid-cols-3 gap-2 ${banner ? 'mt-4' : ''}`}>
            <StatTile label="Weight" value={totalWeightLifted.toLocaleString()} unit="lbs" />
            <StatTile label="Sets" value={String(completedSetCount)} />
            <StatTile label="XP" value={`+${result.total_xp}`} accent />
          </div>

          {/* Per-skill XP bars */}
          {result.skill_results.length > 0 && (
            <div className="space-y-3 mt-4">
              {result.skill_results.map((sr) => {
                const currentLevelXp = XP_THRESHOLDS[sr.new_level - 1]
                const nextLevelXp = sr.new_level >= 10 ? currentLevelXp : XP_THRESHOLDS[sr.new_level]
                const range = nextLevelXp - currentLevelXp
                const progress =
                  sr.new_level >= 10
                    ? 100
                    : Math.min(100, Math.round(((sr.new_total_xp - currentLevelXp) / range) * 100))
                const colorHex = skillColors[sr.skill_id] ?? 'var(--dgold)'
                return (
                  <div key={sr.skill_id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="sq-label" style={{ color: colorHex }}>
                        {skillNames[sr.skill_id] ?? sr.skill_name}{' '}
                        <span style={{ color: 'var(--dink-muted)' }}>Lv.{sr.new_level}</span>
                      </span>
                      <span className="sq-label sq-num" style={{ color: colorHex }}>
                        +{sr.skill_xp} XP
                      </span>
                    </div>
                    <div className="sq-xp-track">
                      <div
                        className="sq-xp-fill"
                        style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${colorHex}cc, ${colorHex})` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Workout log — every completed set, grouped */}
          {exerciseLines.length > 0 && (
            <div className="sq-bevel-in p-3 mt-4" style={{ background: 'var(--dbg)' }}>
              <p className="sq-label mb-2">Workout Log</p>
              <div className="space-y-2">
                {exerciseLines.map((line) => (
                  <div key={line.key}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--dink)' }}>
                      {line.name}
                      {line.isPrimary && <span style={{ color: 'var(--dgold)' }}> ⚔</span>}
                    </span>
                    <p className="sq-num" style={{ fontSize: '13px', color: 'var(--dink-muted)' }}>
                      {line.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatTile({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent?: boolean }) {
  return (
    <div className="sq-bevel-in px-2.5 py-2" style={{ background: 'var(--dbg)' }}>
      <p className="sq-label">{label}</p>
      <p className="sq-num" style={{ fontSize: '16px', color: accent ? 'var(--dgold)' : 'var(--dink)' }}>
        {value}
        {unit && (
          <span className="ml-1" style={{ fontSize: '11px', color: 'var(--dink-muted)' }}>
            {unit}
          </span>
        )}
      </p>
    </div>
  )
}

function HeroBannerCard({ banner }: { banner: HeroBanner }) {
  if (banner.kind === 'tier') {
    const color = tierColor(banner.newTier)
    return (
      <div className="rounded p-4 text-center" style={{ background: `${color}14`, border: `1px solid ${color}55` }}>
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color }}>
          {banner.skillName} Tier Up
        </p>
        <p className="text-2xl font-bold font-display" style={{ color }}>
          {banner.newTier}
        </p>
      </div>
    )
  }

  if (banner.kind === 'realPr') {
    return (
      <div
        className="rounded p-4 text-center"
        style={{ background: 'rgba(201, 162, 39, 0.1)', border: '1px solid rgba(201, 162, 39, 0.35)' }}
      >
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--dgold)' }}>
          New {banner.skillName} Max
        </p>
        {banner.exerciseName && (
          <p className="text-xs mb-1" style={{ color: 'var(--dink-muted)' }}>
            {banner.exerciseName}
          </p>
        )}
        <p className="text-2xl font-bold font-display" style={{ color: 'var(--dgold)' }}>
          {banner.weight} lbs
        </p>
      </div>
    )
  }

  if (banner.kind === 'pr') {
    return (
      <div
        className="rounded p-4 text-center"
        style={{ background: 'rgba(201, 162, 39, 0.1)', border: '1px solid rgba(201, 162, 39, 0.35)' }}
      >
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--dgold)' }}>
          New {banner.skillName} PR
        </p>
        {banner.exerciseName && (
          <p className="text-xs mb-1" style={{ color: 'var(--dink-muted)' }}>
            {banner.exerciseName}
          </p>
        )}
        <p className="text-2xl font-bold font-display" style={{ color: 'var(--dgold)' }}>
          {banner.weight} lbs × {banner.reps}
        </p>
        {banner.est1rm != null && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--dink-muted)' }}>
            ~{Math.round(banner.est1rm)} lb est. 1RM
          </p>
        )}
      </div>
    )
  }

  if (banner.kind === 'levelUp') {
    return (
      <div
        className="rounded p-4 text-center"
        style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.35)' }}
      >
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#4ade80' }}>
          {banner.skillName} Level Up
        </p>
        <p className="text-2xl font-bold font-display" style={{ color: '#bbf7d0' }}>
          Lv. {banner.newLevel}
        </p>
      </div>
    )
  }

  // boss
  return (
    <div
      className="rounded p-4 text-center"
      style={{ background: 'rgba(201, 162, 39, 0.1)', border: '1px solid rgba(201, 162, 39, 0.35)' }}
    >
      <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--dgold)' }}>
        Boss Defeated
      </p>
      <p className="text-2xl font-bold font-display" style={{ color: 'var(--dgold)' }}>
        {banner.bossName}
      </p>
    </div>
  )
}
