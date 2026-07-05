/**
 * Cumulative XP required for each level (1-10).
 * Index 0 = Level 1 (0 XP), Index 9 = Level 10 (5200 XP).
 */
export const XP_THRESHOLDS = [0, 100, 250, 500, 850, 1350, 2000, 2850, 3900, 5200] as const

export function getLevelForXp(xp: number): number {
  for (let i = XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= XP_THRESHOLDS[i]) return i + 1
  }
  return 1
}

export function getXpForNextLevel(currentXp: number, currentLevel: number): number | null {
  if (currentLevel >= 10) return null
  return XP_THRESHOLDS[currentLevel] - currentXp
}
