/**
 * Per-set XP calculation. Shared between the client (log-workout form) and
 * the server (action validation + RPC re-derivation).
 *
 * The bodies below are placeholders that mirror the current prototype formulas.
 * The real difficulty-based formula is a separate backlog exercise — see
 * `Backlog.md` -> "XP Formula Design". Once that lands, update these bodies
 * AND the matching logic inside `log_multi_skill_workout` / `log_cardio_workout`
 * so client and server agree by construction.
 *
 * `bodyweightLbs` is accepted now so callers don't have to change signatures
 * later; the placeholder strength formula doesn't use it yet.
 */

export type CardioIntensity = 'low' | 'med' | 'high'

export const CARDIO_INTENSITY_MULTIPLIERS: Record<CardioIntensity, number> = {
  low: 0.75,
  med: 1.0,
  high: 1.5,
}

export const CARDIO_SCALE_FACTOR = 2.0

export function calculateStrengthSetXp(
  weight: number,
  reps: number,
  _rpe: number | null,
  _bodyweightLbs: number,
  isPrimary: boolean,
): number {
  const safeWeight = Number.isFinite(weight) ? weight : 0
  const safeReps = Number.isFinite(reps) ? reps : 0

  const baseXp = isPrimary ? 14 : 8
  const repBonus = Math.min(6, Math.floor(safeReps / 3))
  const weightBonus =
    safeWeight >= 225 ? 4 : safeWeight >= 135 ? 2 : safeWeight > 0 ? 1 : 0

  return baseXp + repBonus + weightBonus
}

export function calculateCardioSetXp(
  durationMinutes: number,
  intensity: CardioIntensity,
  scaleFactor: number = CARDIO_SCALE_FACTOR,
): number {
  const safeDuration = Number.isFinite(durationMinutes) ? durationMinutes : 0
  const multiplier = CARDIO_INTENSITY_MULTIPLIERS[intensity] ?? 1.0
  return Math.round(safeDuration * multiplier * scaleFactor)
}
