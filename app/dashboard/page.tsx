import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { XP_THRESHOLDS } from '@/lib/utils/xp-thresholds'
import ThemeToggle from '@/app/components/ThemeToggle'
import SkillCard from './SkillCard'

interface TierEntry {
  name: string
  min_multiplier: number
  max_multiplier: number | null
}

interface TierThresholds {
  primary_exercise: string
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
        ? 'Squat'
        : name.includes('bench')
          ? 'Bench'
          : name.includes('deadlift')
            ? 'Deadlift'
            : us.skills.name
      const weight = pr?.max_weight_lifted ?? pr?.best_weight

      return {
        label: short,
        value: weight ? `${weight}` : '-',
      }
    })

  // Helper: compute tier progress for a skill
  function computeTierProgress(
    tierThresholds: TierThresholds | null | undefined,
    best1rm: number | null | undefined,
    bodyweightLbs: number | null | undefined
  ): TierProgressResult | null {
    if (!tierThresholds || !best1rm || !bodyweightLbs || bodyweightLbs <= 0) return null
    const tiers = tierThresholds.tiers
    if (!Array.isArray(tiers) || tiers.length === 0) return null

    const currentMultiplier = best1rm / bodyweightLbs
    let currentTierIdx = tiers.length - 1
    for (let i = 0; i < tiers.length; i++) {
      const t = tiers[i]
      if (
        currentMultiplier >= t.min_multiplier &&
        (t.max_multiplier === null || currentMultiplier < t.max_multiplier)
      ) {
        currentTierIdx = i
        break
      }
    }

    const currentTier = tiers[currentTierIdx]
    const nextTier = tiers[currentTierIdx + 1] ?? null
    if (!nextTier || currentTier.max_multiplier === null) return null // at max tier

    const nextMultiplier = currentTier.max_multiplier
    const lbsNeededRaw = nextMultiplier * bodyweightLbs - best1rm
    const lbsNeeded = Math.ceil(Math.max(0, lbsNeededRaw) / 5) * 5 // round up to nearest 5

    const bandWidth = nextMultiplier - currentTier.min_multiplier
    const progressPct =
      bandWidth > 0
        ? Math.min(
            100,
            Math.round(
              ((currentMultiplier - currentTier.min_multiplier) / bandWidth) * 100
            )
          )
        : 0

    return { nextTierName: nextTier.name, lbsNeeded, progressPct, currentMultiplier, nextMultiplier }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-abyss)' }}>
      {/* Navbar */}
      <nav style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-mid)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 items-center">
            <h1 className="font-display text-lg tracking-widest uppercase">
              <span style={{ color: 'var(--gold-bright)' }}>Strength</span>
              <span style={{ color: 'var(--text-primary)' }}>Quest</span>
            </h1>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                {character.name}_{className}
              </span>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-medium rounded-sm transition-colors"
                  style={{
                    color: 'var(--text-secondary)',
                    background: 'var(--bg-elevated)',
                    boxShadow: 'inset 1px 1px 0 var(--border-highlight), inset -1px -1px 0 var(--border-shadow), 0 0 0 1px var(--border-mid)',
                    borderRadius: '2px',
                  }}
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">

        {/* Character Hero */}
        <div className="card-dark p-6 sm:p-8 relative overflow-hidden">

          <div className="relative">
            {/* Class/Level badge */}
            <div className="mb-3">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 font-display text-xs font-bold tracking-wider uppercase"
                style={{
                  background: 'var(--bg-elevated)',
                  color: 'var(--gold-bright)',
                  boxShadow: 'inset 1px 1px 0 var(--border-highlight), inset -1px -1px 0 var(--border-shadow), 0 0 0 1px var(--border-mid)',
                  borderRadius: '2px',
                }}
              >
                ⚔ {className} · Level {character.character_level}
              </span>
            </div>

            {/* Character name */}
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-wide uppercase" style={{ color: 'var(--text-primary)' }}>
              {character.name}
            </h2>

            {/* Bodyweight */}
            <p className="mt-1 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              {character.bodyweight_lbs} lbs
            </p>
          </div>

          <div
            className="mt-6 pt-4 relative flex flex-col gap-4 items-start sm:flex-row sm:items-end sm:justify-between"
            style={{ borderTop: '1px solid var(--border-mid)' }}
          >
            <div className="w-full sm:w-auto">
              {realTotalStrength > 0 ? (
                <div className="space-y-3">
                  <span className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Total Strength
                  </span>
                  <p className="text-2xl font-bold font-display tracking-wide" style={{ color: 'var(--gold)' }}>
                    {Math.round(realTotalStrength)}
                    <span className="text-sm font-sans ml-1" style={{ color: 'var(--text-secondary)' }}>lbs</span>
                  </p>
                  <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
                    {totalStrengthBreakdown.map((item) => (
                      <div
                        key={item.label}
                        className="min-w-0 px-2.5 py-2 rounded-sm"
                        style={{
                          background: 'var(--bg-elevated)',
                          boxShadow: 'inset 1px 1px 0 var(--border-highlight), inset -1px -1px 0 var(--border-shadow), 0 0 0 1px var(--border-mid)',
                        }}
                      >
                        <p
                          className="text-[10px] uppercase tracking-[0.18em] font-semibold"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {item.label}
                        </p>
                        <p
                          className="text-sm sm:text-base font-display font-bold tracking-wide"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {item.value}
                          <span className="ml-1 text-[10px] font-sans font-medium" style={{ color: 'var(--text-secondary)' }}>
                            lbs
                          </span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Log your first workout to begin
                </p>
              )}
            </div>
            <a
              href="/log-workout"
              className="btn-gold w-full sm:w-auto px-6 py-2.5 rounded-sm text-center text-sm font-bold uppercase tracking-wider"
            >
              ⚔ Log Workout
            </a>
          </div>
        </div>

        {/* Active Skill Cards */}
        <div>
          <h3
            className="font-display text-sm uppercase tracking-[0.2em] font-bold mb-4"
            style={{ color: 'var(--text-muted)' }}
          >
            Skills
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {activeSkills.map((us: any) => {
              const skill = us.skills
              const colorHex = skill.color_hex
              const skillPrs = prsBySkill[us.skill_id] ?? []

              // Tier progress
              const primaryPr = skillPrs.find((p: any) => p.is_primary)
              const accessoryPrs = skillPrs.filter((p: any) => !p.is_primary)
              const tierProgress = computeTierProgress(
                skill.tier_thresholds as TierThresholds | null,
                primaryPr?.best_1rm,
                character.bodyweight_lbs
              )

              // XP bar calculation
              const currentLevelXp = XP_THRESHOLDS[us.current_level - 1]
              const nextLevelXp = us.current_level >= 10 ? currentLevelXp : XP_THRESHOLDS[us.current_level]
              const xpProgress = us.current_level >= 10
                ? 100
                : Math.round(((us.current_xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100)
              const xpInLevel = us.current_xp - currentLevelXp
              const xpNeeded = nextLevelXp - currentLevelXp

              return (
                <SkillCard
                  key={us.skill_id}
                  skillName={skill.name}
                  colorHex={colorHex}
                  currentTier={us.current_tier}
                  currentLevel={us.current_level}
                  currentXp={us.current_xp}
                  bodyweightLbs={character.bodyweight_lbs}
                  primaryPr={primaryPr}
                  accessoryPrs={accessoryPrs}
                  tierProgress={tierProgress}
                />
              )
            })}
          </div>
        </div>

        {/* Phase 2 Coming Soon */}
        {inactiveSkills.length > 0 && (
          <div className="card-dark p-5">
            <p
              className="text-xs uppercase tracking-[0.15em] font-semibold mb-3"
              style={{ color: 'var(--text-muted)' }}
            >
              Coming Soon
            </p>
            <div className="flex gap-5">
              {inactiveSkills.map((us: any) => {
                const skill = us.skills
                return (
                  <div key={us.skill_id} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                    <span
                      className="w-2 h-2 rounded-full opacity-40"
                      style={{ backgroundColor: skill.color_hex }}
                    />
                    {skill.name}
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
