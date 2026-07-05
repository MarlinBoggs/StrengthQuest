/**
 * Calculate estimated 1RM using Epley formula.
 * Formula: Weight × (1 + (Reps / 30))
 * For 1 rep, returns the weight directly (no estimation needed).
 * Reps are capped at 10 for realistic strength estimation.
 */
export function calculate1RM(weight: number, reps: number): number {
  if (reps <= 1) return weight
  const cappedReps = Math.min(reps, 10)
  return weight * (1 + cappedReps / 30)
}
