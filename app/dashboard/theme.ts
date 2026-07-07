// Dashboard presentation layer only — tier display colors + view-model types.
// Tier NAMES come from the database untouched; this maps them to muted metallics.

export const TIER_COLORS: Record<string, string> = {
  Bronze: '#A8763E',
  Iron: '#85807A',
  Steel: '#8E979E',
  Mithril: '#7B6FA8',
  Adamantite: '#7EA379',
  Rune: '#5F8FA8',
  Dragon: '#B05648',
  Obsidian: '#8A8178',
  Barrows: '#6E5F7E',
  Bandos: '#7A8560',
  Torva: '#56705F',
  'Greek God': '#C9B26B',
}

export function tierColor(name: string | null | undefined): string {
  return (name && TIER_COLORS[name]) || TIER_COLORS.Bronze
}

export type HeroLift = {
  exerciseName: string
  bestWeight: number
  bestReps: number
  maxWeight: number | null
  est1rm: number
  bwRatio: number | null
}

export type AccessoryLift = {
  id: number
  name: string
  weight: number
  reps: number
}

export type SkillPanelModel = {
  skillId: number
  name: string
  slug: string
  skillType: string
  level: number
  isMaxLevel: boolean
  xpInLevel: number
  xpNeeded: number
  xpPct: number
  tierName: string | null
  tierNames: string[]
  currentTierIdx: number
  milestoneText: string | null
  milestoneTier: string | null
  hero: HeroLift | null
  accessories: AccessoryLift[]
}
