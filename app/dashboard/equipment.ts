// Equipment module — pure presentation layer derived from existing progression data.
// No DB state: unlocks = tiers ever reached (current_tier can never regress today —
// strength tiers derive from PR 1RM and cardio tiers from cumulative XP, both monotonic,
// and bodyweight is only set at character creation. If bodyweight editing ever ships,
// add a user_skills.max_tier_reached column and derive from that instead).

import type { SkillPanelModel } from './theme'

export type EquipmentSlotKey =
  | 'helm'
  | 'cape'
  | 'amulet'
  | 'weapon'
  | 'chest'
  | 'shield'
  | 'legs'
  | 'gloves'
  | 'boots'

export type LadderRung = {
  tier: string
  itemName: string
  unlocked: boolean
}

export type EquipmentSlotModel = {
  slot: EquipmentSlotKey
  label: string
  sourceLabel: string
  tierIdx: number // -1 = nothing unlocked yet
  tierName: string | null
  itemName: string | null
  ladder: LadderRung[]
  nextUnlockText: string | null
  emptyText: string | null
  placeholder: boolean // gloves — reserved for a future skill
}

// Canonical 12-tier ladder (matches migration 015 skill tiers and theme.ts TIER_COLORS)
export const TIER_ORDER = [
  'Bronze',
  'Iron',
  'Steel',
  'Mithril',
  'Adamantite',
  'Rune',
  'Dragon',
  'Obsidian',
  'Barrows',
  'Bandos',
  'Torva',
  'Greek God',
]

// Slot → skill slug mapping. Amulet/weapon are cross-skill; gloves is a reserved placeholder.
const SKILL_SLOTS: { slot: EquipmentSlotKey; label: string; slug: string; noun: string }[] = [
  { slot: 'helm', label: 'Helm', slug: 'hit-points', noun: 'Full Helm' },
  { slot: 'cape', label: 'Cape', slug: 'pull', noun: 'Cape' },
  { slot: 'chest', label: 'Chest', slug: 'push', noun: 'Platebody' },
  { slot: 'shield', label: 'Shield', slug: 'defense', noun: 'Kiteshield' },
  { slot: 'legs', label: 'Legs', slug: 'legs', noun: 'Platelegs' },
  { slot: 'boots', label: 'Boots', slug: 'endurance', noun: 'Boots' },
]

// Amulet: total level (sum of all skill levels, 6 skills × Lv 1-10 = 6..60).
// Top rungs compress because high levels cost exponentially more XP. Tunable.
const AMULET_LEVEL_THRESHOLDS = [10, 15, 20, 25, 30, 35, 40, 45, 50, 54, 57, 60]

// Weapon: total strength multiplier (S+B+D max lifted ÷ bodyweight).
// Same ranges as total_strength_tiers (migration 002), mapped positionally by
// display_order onto the OSRS tier names until that table's names are standardized.
const WEAPON_MULT_THRESHOLDS = [0, 1.5, 2.25, 3.0, 3.75, 4.5, 5.25, 6.0, 6.75, 7.5, 8.25, 9.0]

// Weapon type comes from character class (cosmetic flavor).
const CLASS_WEAPONS: Record<string, string> = {
  'Deadlift Knight': 'Longsword',
  'Bench Berserker': 'Battleaxe',
  'Bicep Bandit': 'Dagger',
  'Quad King': 'Warhammer',
  'Grip Gladiator': 'Scimitar',
  'Iron Titan': 'Greatsword',
}

export type UnlockedItem = { slot: EquipmentSlotKey; tier: string; itemName: string }

// Items newly unlocked by a skill tier-up (used by the post-workout summary).
// Handles multi-tier jumps: None → Steel unlocks Bronze, Iron, and Steel items.
// Skill slots only — amulet/weapon tier-ups aren't reported by the RPCs.
export function newlyUnlockedEquipment(
  skillName: string,
  oldTier: string | null,
  newTier: string | null
): UnlockedItem[] {
  if (!newTier) return []
  const slug = skillName.toLowerCase().replace(/\s+/g, '-')
  const cfg = SKILL_SLOTS.find((s) => s.slug === slug)
  if (!cfg) return []
  const newIdx = TIER_ORDER.indexOf(newTier)
  if (newIdx < 0) return []
  const oldIdx = oldTier ? TIER_ORDER.indexOf(oldTier) : -1

  const items: UnlockedItem[] = []
  for (let i = oldIdx + 1; i <= newIdx; i++) {
    items.push({ slot: cfg.slot, tier: TIER_ORDER[i], itemName: `${TIER_ORDER[i]} ${cfg.noun}` })
  }
  return items
}

function buildLadder(tiers: string[], noun: string, unlockedIdx: number): LadderRung[] {
  return tiers.map((tier, i) => ({
    tier,
    itemName: `${tier} ${noun}`,
    unlocked: i <= unlockedIdx,
  }))
}

type BuildArgs = {
  skills: SkillPanelModel[]
  totalLevel: number
  totalStrengthLbs: number
  bodyweightLbs: number | null
  className: string
}

export function buildEquipment({
  skills,
  totalLevel,
  totalStrengthLbs,
  bodyweightLbs,
  className,
}: BuildArgs): EquipmentSlotModel[] {
  const slots: EquipmentSlotModel[] = []

  for (const cfg of SKILL_SLOTS) {
    const skill = skills.find((s) => s.slug === cfg.slug)
    const tiers = skill && skill.tierNames.length > 0 ? skill.tierNames : TIER_ORDER
    // SkillPanelModel clamps currentTierIdx to 0 even when untiered — tierName is the
    // real "has reached a tier" signal.
    const tierIdx = skill?.tierName ? skill.currentTierIdx : -1
    const tierName = tierIdx >= 0 ? tiers[tierIdx] : null

    slots.push({
      slot: cfg.slot,
      label: cfg.label,
      sourceLabel: skill ? `${skill.name} skill` : cfg.slug,
      tierIdx,
      tierName,
      itemName: tierName ? `${tierName} ${cfg.noun}` : null,
      ladder: buildLadder(tiers, cfg.noun, tierIdx),
      nextUnlockText: skill?.milestoneText ?? null,
      emptyText: skill ? `Train ${skill.name} to forge your first ${cfg.noun.toLowerCase()}` : null,
      placeholder: false,
    })
  }

  // Amulet — total level
  let amuletIdx = -1
  for (let i = 0; i < AMULET_LEVEL_THRESHOLDS.length; i++) {
    if (totalLevel >= AMULET_LEVEL_THRESHOLDS[i]) amuletIdx = i
  }
  const amuletNext =
    amuletIdx < TIER_ORDER.length - 1
      ? `${AMULET_LEVEL_THRESHOLDS[amuletIdx + 1] - totalLevel} total levels to ${TIER_ORDER[amuletIdx + 1]}`
      : null
  slots.push({
    slot: 'amulet',
    label: 'Amulet',
    sourceLabel: `Total level ${totalLevel}`,
    tierIdx: amuletIdx,
    tierName: amuletIdx >= 0 ? TIER_ORDER[amuletIdx] : null,
    itemName: amuletIdx >= 0 ? `${TIER_ORDER[amuletIdx]} Amulet` : null,
    ladder: buildLadder(TIER_ORDER, 'Amulet', amuletIdx),
    nextUnlockText: amuletNext,
    emptyText: `Reach total level ${AMULET_LEVEL_THRESHOLDS[0]} to forge your first amulet`,
    placeholder: false,
  })

  // Weapon — total strength multiplier
  const weaponNoun = CLASS_WEAPONS[className] ?? 'Blade'
  let weaponIdx = -1
  let weaponNext: string | null = null
  if (totalStrengthLbs > 0 && bodyweightLbs && bodyweightLbs > 0) {
    const mult = totalStrengthLbs / bodyweightLbs
    for (let i = 0; i < WEAPON_MULT_THRESHOLDS.length; i++) {
      if (mult >= WEAPON_MULT_THRESHOLDS[i]) weaponIdx = i
    }
    if (weaponIdx < TIER_ORDER.length - 1) {
      const lbsRaw = WEAPON_MULT_THRESHOLDS[weaponIdx + 1] * bodyweightLbs - totalStrengthLbs
      const lbs = Math.ceil(Math.max(0, lbsRaw) / 5) * 5
      weaponNext = `${lbs} total lbs to ${TIER_ORDER[weaponIdx + 1]}`
    }
  }
  slots.push({
    slot: 'weapon',
    label: 'Weapon',
    sourceLabel:
      totalStrengthLbs > 0 ? `Total strength ${Math.round(totalStrengthLbs)} lbs` : 'Total strength',
    tierIdx: weaponIdx,
    tierName: weaponIdx >= 0 ? TIER_ORDER[weaponIdx] : null,
    itemName: weaponIdx >= 0 ? `${TIER_ORDER[weaponIdx]} ${weaponNoun}` : null,
    ladder: buildLadder(TIER_ORDER, weaponNoun, weaponIdx),
    nextUnlockText: weaponNext,
    emptyText: 'Log your S/B/D lifts to earn your first weapon',
    placeholder: false,
  })

  // Gloves — reserved (future grip skill or grind rewards)
  slots.push({
    slot: 'gloves',
    label: 'Gloves',
    sourceLabel: '???',
    tierIdx: -1,
    tierName: null,
    itemName: null,
    ladder: [],
    nextUnlockText: null,
    emptyText: null,
    placeholder: true,
  })

  return slots
}
