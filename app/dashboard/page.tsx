import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { XP_THRESHOLDS } from '@/lib/utils/xp-thresholds'
import ThemeToggle from '@/app/components/ThemeToggle'
import SkillsPanel from './SkillsPanel'
import type { SkillPanelModel } from './theme'

interface TierEntry {
  name: string
  min_multiplier?: number
  max_multiplier?: number | null
  min_xp?: number
  max_xp?: number | null
}

interface TierThresholds {
  primary_exercise?: string
  tiers: TierEntry[]
}

interface TierProgressResult {
  nextTierName: string
  lbsNeeded: number
  progressPct: number
  currentMultiplier: number
  nextMultiplier: number
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: character } = await supabase
    .from('characters')
    .select('*, character_classes(name)')
    .eq('user_id', user.id)
    .single()

  if (!character) redirect('/character-creation')

  const { data: userSkills } = await supabase
    .from('user_skills')
    .select('*, skills(name, slug, color_hex, is_active, phase, skill_type, tier_thresholds)')
    .eq('character_id', character.id)
    .order('skill_id')

  // Fetch per-exercise best 1RMs
  const { data: exercisePrs } = await supabase
    .rpc('get_exercise_prs', { p_character_id: character.id })

  const activeSkills = userSkills?.filter((us: any) => us.skills.is_active) ?? []
  const activeStrengthSkills = activeSkills.filter((us: any) => us.skills.skill_type === 'strength')
  const inactiveSkills = userSkills?.filter((us: any) => !us.skills.is_active) ?? []
  const className = (character.character_classes as any)?.name ?? 'Unknown Class'

  // Group exercise PRs by skill_id
  const prsBySkill: Record<number, Array<{ exercise_id: number; exercise_name: string; is_primary: boolean; best_1rm: number; best_weight: number; best_reps: number; max_weight_lifted: number }>> = {}
  if (exercisePrs) {
    for (const pr of exercisePrs) {
      if (!prsBySkill[pr.skill_id]) prsBySkill[pr.skill_id] = []
      prsBySkill[pr.skill_id].push(pr)
    }
  }

  // Compute real total strength = sum of max weight lifted on primary exercises
  let realTotalStrength = 0
  if (exercisePrs) {
    for (const pr of exercisePrs) {
      if (pr.is_primary && pr.max_weight_lifted) {
        realTotalStrength += Number(pr.max_weight_lifted)
      }
    }
  }

  const totalStrengthBreakdown = [...activeStrengthSkills]
    .sort((a: any, b: any) => {
      const sbdRank = (us: any) => {
        const name = (
          prsBySkill[us.skill_id]?.find((p: any) => p.is_primary)?.exercise_name ??
          us.skills.slug ??
          ''
        ).toLowerCase()

        if (name.includes('squat') || name.includes('legs')) return 0
        if (name.includes('bench') || name.includes('push')) return 1
        if (name.includes('deadlift') || name.includes('pull')) return 2
        return 3
      }

      return sbdRank(a) - sbdRank(b)
    })
    .map((us: any) => {
      const pr = prsBySkill[us.skill_id]?.find((p: any) => p.is_primary)
      const name = (pr?.exercise_name ?? '').toLowerCase()
      const short = name.includes('squat')
        ? 'SQ'
        : name.includes('bench')
          ? 'BP'
          : name.includes('deadlift')
            ? 'DL'
            : String(us.skills.name).slice(0, 2).toUpperCase()
      const weight = pr?.max_weight_lifted ?? pr?.best_weight

      return {
        label: short,
        value: weight ? `${weight}` : '-',
      }
    })

  // Helper: compute tier progress for a strength skill (multiplier-gated tiers)
  function computeTierProgress(
    tierThresholds: TierThresholds | null | undefined,
    best1rm: number | null | undefined,
    bodyweightLbs: number | null | undefined
  ): TierProgressResult | null {
    if (!tierThresholds || !best1rm || !bodyweightLbs || bodyweightLbs <= 0) return null
    const tiers = tierThresholds.tiers
    if (!Array.isArray(tiers) || tiers.length === 0) return null
    if (typeof tiers[0]?.min_multiplier !== 'number') return null

    const currentMultiplier = best1rm / bodyweightLbs
    let currentTierIdx = tiers.length - 1
    for (let i = 0; i < tiers.length; i++) {
      const t = tiers[i]
      if (
        currentMultiplier >= (t.min_multiplier ?? 0) &&
        (t.max_multiplier == null || currentMultiplier < t.max_multiplier)
      ) {
        currentTierIdx = i
        break
      }
    }

    const currentTier = tiers[currentTierIdx]
    const nextTier = tiers[currentTierIdx + 1] ?? null
    if (!nextTier || currentTier.max_multiplier == null) return null // at max tier

    const nextMultiplier = currentTier.max_multiplier
    const lbsNeededRaw = nextMultiplier * bodyweightLbs - best1rm
    const lbsNeeded = Math.ceil(Math.max(0, lbsNeededRaw) / 5) * 5 // round up to nearest 5

    const bandWidth = nextMultiplier - (currentTier.min_multiplier ?? 0)
    const progressPct =
      bandWidth > 0
        ? Math.min(
            100,
            Math.round(
              ((currentMultiplier - (currentTier.min_multiplier ?? 0)) / bandWidth) * 100
            )
          )
        : 0

    return { nextTierName: nextTier.name, lbsNeeded, progressPct, currentMultiplier, nextMultiplier }
  }

  // Build presentation view models for the skill tiles + detail sheets
  const skillModels: SkillPanelModel[] = activeSkills.map((us: any) => {
    const skill = us.skills
    const skillPrs = prsBySkill[us.skill_id] ?? []
    const primaryPr = skillPrs.find((p: any) => p.is_primary)
    const accessoryPrs = skillPrs.filter((p: any) => !p.is_primary)

    // XP bar (level progress, shared thresholds)
    const currentLevelXp = XP_THRESHOLDS[us.current_level - 1]
    const nextLevelXp = us.current_level >= 10 ? currentLevelXp : XP_THRESHOLDS[us.current_level]
    const isMaxLevel = us.current_level >= 10
    const xpInLevel = us.current_xp - currentLevelXp
    const xpNeeded = nextLevelXp - currentLevelXp
    const xpPct = isMaxLevel
      ? 100
      : Math.round((xpInLevel / xpNeeded) * 100)

    // Tier ladder positions
    const tiers: TierEntry[] = (skill.tier_thresholds as TierThresholds | null)?.tiers ?? []
    const tierNames = tiers.map((t) => t.name)
    let currentTierIdx = us.current_tier ? tierNames.indexOf(us.current_tier) : -1
    if (currentTierIdx < 0) currentTierIdx = 0

    // Milestone line: strength = lbs to next tier; cardio = XP to next tier
    let milestoneText: string | null = null
    let milestoneTier: string | null = null
    if (skill.skill_type === 'strength') {
      const tierProgress = computeTierProgress(
        skill.tier_thresholds as TierThresholds | null,
        primaryPr?.best_1rm,
        character.bodyweight_lbs
      )
      if (tierProgress) {
        milestoneText = `${tierProgress.lbsNeeded} lbs to ${tierProgress.nextTierName}`
        milestoneTier = tierProgress.nextTierName
      }
    } else {
      const currentTier = tiers[currentTierIdx]
      const nextTier = tiers[currentTierIdx + 1]
      if (currentTier && nextTier && currentTier.max_xp != null) {
        const xpToNext = currentTier.max_xp - us.current_xp
        if (xpToNext > 0) {
          milestoneText = `${xpToNext} XP to ${nextTier.name}`
          milestoneTier = nextTier.name
        }
      }
    }

    return {
      skillId: us.skill_id,
      name: skill.name,
      slug: skill.slug,
      skillType: skill.skill_type,
      level: us.current_level,
      isMaxLevel,
      xpInLevel,
      xpNeeded,
      xpPct,
      tierName: us.current_tier ?? null,
      tierNames,
      currentTierIdx,
      milestoneText,
      milestoneTier,
      hero: primaryPr
        ? {
            exerciseName: primaryPr.exercise_name,
            bestWeight: primaryPr.best_weight,
            bestReps: primaryPr.best_reps,
            maxWeight: primaryPr.max_weight_lifted ?? null,
            est1rm: Math.round(primaryPr.best_1rm),
            bwRatio:
              character.bodyweight_lbs && character.bodyweight_lbs > 0
                ? primaryPr.best_1rm / character.bodyweight_lbs
                : null,
          }
        : null,
      accessories: accessoryPrs.map((pr: any) => ({
        id: pr.exercise_id,
        name: pr.exercise_name,
        weight: pr.best_weight,
        reps: pr.best_reps,
      })),
    }
  })

  return (
    <div className="sq-dash min-h-screen">
      {/* Compact app bar */}
      <nav style={{ background: 'var(--dpanel)', borderBottom: '2px solid var(--dbevel-dark)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-12 items-center">
            <h1 className="font-display tracking-widest uppercase" style={{ fontSize: '15px' }}>
              <span style={{ color: 'var(--dgold)' }}>Strength</span>
              <span style={{ color: 'var(--dink)' }}>Quest</span>
            </h1>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="sq-panel-raised px-3 font-medium"
                  style={{ fontSize: '13px', color: 'var(--dink-muted)', minHeight: '32px' }}
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6 pb-28 md:pb-8">

        {/* Character banner */}
        <div className="sq-panel p-4 sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="sq-heading uppercase">{character.name}</h2>
              <span
                className="sq-label sq-bevel-in inline-flex items-center gap-1.5 px-2.5 py-1 mt-2"
                style={{ background: 'var(--dbg)', color: 'var(--dgold)' }}
              >
                ⚔ {className} · Lv {character.character_level}
              </span>
            </div>
            <a
              href="/log-workout"
              className="sq-btn-gold hidden md:inline-flex items-center justify-center px-6 uppercase tracking-wider"
              style={{ fontSize: '15px', minHeight: '44px' }}
            >
              ⚔ Log Workout
            </a>
          </div>

          <div className="mt-5 pt-4" style={{ borderTop: '2px solid var(--dbevel-dark)' }}>
            {realTotalStrength > 0 ? (
              <div className="space-y-3">
                <p className="sq-label">Total Strength</p>
                <p className="sq-hero-num">
                  {Math.round(realTotalStrength)}
                  <span
                    className="ml-2 font-sans font-normal"
                    style={{ fontSize: '15px', color: 'var(--dink-muted)' }}
                  >
                    lbs
                  </span>
                </p>
                <div className="grid grid-cols-3 gap-2 max-w-md">
                  {totalStrengthBreakdown.map((item) => (
                    <div
                      key={item.label}
                      className="sq-bevel-in px-2.5 py-2"
                      style={{ background: 'var(--dbg)' }}
                    >
                      <p className="sq-label">{item.label}</p>
                      <p className="sq-num" style={{ fontSize: '15px', color: 'var(--dink)' }}>
                        {item.value}
                        <span className="ml-1" style={{ fontSize: '13px', color: 'var(--dink-muted)' }}>
                          lbs
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '15px', color: 'var(--dink-muted)' }}>
                Log your first workout to begin
              </p>
            )}
          </div>
        </div>

        {/* Skill tiles + detail sheet */}
        <SkillsPanel skills={skillModels} />

        {/* Phase 2 Coming Soon */}
        {inactiveSkills.length > 0 && (
          <div className="sq-panel p-4">
            <p className="sq-label mb-3">Coming Soon</p>
            <div className="flex gap-5 flex-wrap">
              {inactiveSkills.map((us: any) => (
                <span key={us.skill_id} style={{ fontSize: '15px', color: 'var(--dink-muted)' }}>
                  {us.skills.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Sticky mobile CTA */}
      <div
        className="fixed bottom-0 inset-x-0 z-40 md:hidden"
        style={{
          background: 'var(--dpanel)',
          borderTop: '2px solid var(--dbevel-light)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="p-3">
          <a
            href="/log-workout"
            className="sq-btn-gold flex items-center justify-center w-full uppercase tracking-wider"
            style={{ fontSize: '15px', minHeight: '48px' }}
          >
            ⚔ Log Workout
          </a>
        </div>
      </div>
    </div>
  )
}
