/**
 * Display a set's load. For bodyweight exercises (exercises.is_bodyweight),
 * `weight` is the ADDED load — 0/blank means bodyweight only.
 *
 *   formatLoad(135, false)        → "135"
 *   formatLoad(135, false, true)  → "135 lbs"
 *   formatLoad(0, true)           → "BW"
 *   formatLoad(25, true, true)    → "BW+25 lbs"
 */
export function formatLoad(
  weight: number | string | null | undefined,
  isBodyweight: boolean,
  withUnit = false
): string {
  const w = typeof weight === 'string' ? parseFloat(weight) : weight
  const lbs = w != null && !isNaN(w) && w > 0 ? w : 0
  const unit = withUnit ? ' lbs' : ''
  if (isBodyweight) return lbs > 0 ? `BW+${lbs}${unit}` : 'BW'
  return `${lbs}${unit}`
}
