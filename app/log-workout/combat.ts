/**
 * Combat Frame — pure logic. No React, no DOM. Mirrors calculate-xp.ts's role
 * as the single source of truth for a formula: called from WorkoutForm's
 * event handlers, never duplicated elsewhere.
 *
 * See RestCombatSpec.md for the design this implements.
 */

import type { CombatLogEntry } from './form-types'

// Frontend-only flavor data — no DB state in v1 (see spec). Same category of
// hardcoded skillId -> presentation mapping as CLASS_WEAPONS in
// app/dashboard/equipment.ts.
export const BOSS_TABLE: Record<number, string> = {
  1: 'Forge Wretch',    // Push
  2: 'Chain Warden',    // Pull
  3: 'Goblin Warband',  // Legs
  4: 'The Long Road',   // Endurance
  5: 'Bloodhound Pack', // Hit Points
  6: 'Stone Sentinel',  // Defense
}

export function bossNameForSkill(skillId: number): string {
  return BOSS_TABLE[skillId] ?? 'Unknown Foe'
}

export type BossHpResult = {
  hp: number
  median: number
  floored: boolean
}

/**
 * bossHp = max(150, round(0.8 x median(last 5 sessions' total_xp)))
 *
 * Median over mean (one monster session shouldn't inflate the bar for
 * weeks), 0.8 so a typical session kills it with room to spare, 150 floor
 * for new characters or a lighter stretch. `recentSessionXp` must never
 * include the in-progress session — median([]) is intentionally never
 * attempted (undefined, not 0) for a brand-new character with no history.
 */
export function deriveBossHp(recentSessionXp: number[]): BossHpResult {
  if (recentSessionXp.length === 0) {
    return { hp: 150, median: 0, floored: true }
  }
  const sorted = [...recentSessionXp].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  const raw = Math.round(0.8 * median)
  return { hp: Math.max(150, raw), median, floored: raw < 150 }
}

type BossPhrase = (bossName: string) => string
type HitPhrase = (bossName: string, damage: number) => string

const HIT_PHRASES: HitPhrase[] = [
  (b, d) => `You strike the ${b} for ${d} damage.`,
  (b, d) => `A solid hit lands on the ${b} — ${d} damage.`,
  (b, d) => `The ${b} reels from ${d} damage.`,
  (b, d) => `You catch the ${b} off guard for ${d} damage.`,
  (b, d) => `Your form holds — ${d} damage to the ${b}.`,
]
const HEAVY_HIT_PHRASES: HitPhrase[] = [
  (b, d) => `A crushing blow rocks the ${b} for ${d} damage!`,
  (b, d) => `The ${b} staggers under ${d} damage!`,
  (b, d) => `You drive deep — ${d} damage to the ${b}!`,
  (b, d) => `The ${b} reels back, ${d} damage!`,
]
const INTRO_PHRASES: BossPhrase[] = [
  (b) => `A ${b} blocks your path!`,
  (b) => `The ${b} rises to meet you!`,
  (b) => `You've drawn the attention of a ${b}!`,
]
const KILL_PHRASES: BossPhrase[] = [
  (b) => `The ${b} collapses. Boss defeated!`,
  (b) => `The ${b} falls before you. Victory!`,
  (b) => `With a final blow, the ${b} is destroyed!`,
]
const POST_KILL_PHRASES: BossPhrase[] = [
  (b) => `The fallen ${b} does not stir.`,
  (b) => `Only silence remains where the ${b} stood.`,
  (b) => `You've nothing left to prove here.`,
]
const ESCAPE_PHRASES: BossPhrase[] = [
  (b) => `The ${b} slips away into the shadows.`,
  (b) => `The ${b} lives to fight another day.`,
  (b) => `You're out of time — the ${b} escapes.`,
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

let logIdCounter = 0
function nextLogId(): number {
  logIdCounter += 1
  return logIdCounter
}

function entry(
  text: string,
  opts?: { hp?: string; cls?: CombatLogEntry['cls']; sourceKey?: string }
): CombatLogEntry {
  return { id: nextLogId(), text, hp: opts?.hp, cls: opts?.cls, sourceKey: opts?.sourceKey }
}

/**
 * Every line below takes `sourceKey` — the set that produced it (see
 * CombatLogEntry). WorkoutForm's reconciliation effect prunes an entry
 * whenever its source set is no longer completed (edited, toggled off, or
 * cleared), so un-checking a set removes its combat-log lines too, not
 * just the derived HP bar.
 */
export function introLine(bossName: string, sourceKey: string): CombatLogEntry {
  return entry(pick(INTRO_PHRASES)(bossName), { cls: 'intro', sourceKey })
}

/**
 * A normal or heavy hit that does NOT kill the boss. `heavy` should be
 * true when damage exceeds ~12% of bossHpMax in one set. `detail` is a
 * pre-formatted description of the set ("185 × 5" for strength, "30 min ·
 * Med" for cardio) — kept as a plain string so this stays agnostic to
 * strength vs. cardio set shape.
 */
export function hitLine(
  bossName: string,
  exerciseName: string,
  detail: string,
  damage: number,
  heavy: boolean,
  hpRemaining: number,
  hpMax: number,
  sourceKey: string
): CombatLogEntry[] {
  const phrase = heavy ? pick(HEAVY_HIT_PHRASES) : pick(HIT_PHRASES)
  return [
    entry(phrase(bossName, damage), { sourceKey }),
    entry(`${exerciseName} lands true — ${detail}.`, { hp: `${hpRemaining}/${hpMax}`, sourceKey }),
  ]
}

/**
 * The hit that drops HP to 0. `over` is any damage beyond hpMax on this
 * same set (overkill is purely cosmetic — see spec).
 */
export function killLine(
  bossName: string,
  exerciseName: string,
  detail: string,
  damage: number,
  heavy: boolean,
  hpMax: number,
  over: number,
  sourceKey: string
): CombatLogEntry[] {
  const phrase = heavy ? pick(HEAVY_HIT_PHRASES) : pick(HIT_PHRASES)
  const lines = [
    entry(phrase(bossName, damage), { sourceKey }),
    entry(`${exerciseName} lands true — ${detail}.`, { hp: `0/${hpMax}`, sourceKey }),
    entry(pick(KILL_PHRASES)(bossName), { cls: 'kill', sourceKey }),
  ]
  if (over > 0) lines.push(entry(`Overkill +${over}.`, { cls: 'overkill', sourceKey }))
  return lines
}

/** Flavor-only line for damage landed after the boss is already dead. */
export function overkillLine(bossName: string, sourceKey: string): CombatLogEntry {
  return entry(pick(POST_KILL_PHRASES)(bossName), { cls: 'overkill', sourceKey })
}

/** Ending the session with the boss still alive — never framed as a penalty. */
export function escapeLine(bossName: string): CombatLogEntry[] {
  return [
    entry(pick(ESCAPE_PHRASES)(bossName), { cls: 'escape' }),
    entry('No penalty — try again next session.', { cls: 'escape' }),
  ]
}
