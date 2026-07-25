// Pixel-style placeholder equipment glyphs (16x16 grid), same style as SkillIcon.
// The glyph is tinted with the equipped item's tier color — a Mithril platebody is
// the chest glyph in Mithril purple. Replace with custom per-tier art later.

import type { EquipmentSlotKey } from './equipment'

type Rect = [x: number, y: number, w: number, h: number]

const GLYPHS: Record<EquipmentSlotKey, Rect[]> = {
  // Full helm — dome, cheek guards, eye slit
  helm: [
    [5, 2, 6, 1],
    [4, 3, 8, 3],
    [3, 6, 10, 2],
    [3, 8, 4, 5],
    [9, 8, 4, 5],
    [7, 11, 2, 2],
  ],
  // Cape — hanging drape
  cape: [
    [4, 2, 8, 2],
    [4, 4, 8, 6],
    [5, 10, 6, 2],
    [6, 12, 4, 2],
  ],
  // Amulet — chain arc + gem
  amulet: [
    [5, 2, 6, 1],
    [4, 3, 2, 3],
    [10, 3, 2, 3],
    [5, 6, 2, 1],
    [9, 6, 2, 1],
    [6, 7, 4, 4],
    [7, 11, 2, 1],
  ],
  // Weapon — vertical sword
  weapon: [
    [7, 1, 2, 8],
    [4, 9, 8, 1],
    [7, 10, 2, 4],
    [6, 14, 4, 1],
  ],
  // Platebody — shoulders + torso
  chest: [
    [3, 3, 10, 2],
    [3, 5, 2, 3],
    [11, 5, 2, 3],
    [5, 5, 6, 6],
    [5, 11, 6, 2],
  ],
  // Kiteshield
  shield: [
    [4, 2, 8, 2],
    [4, 4, 8, 4],
    [5, 8, 6, 2],
    [6, 10, 4, 2],
    [7, 12, 2, 1],
  ],
  // Platelegs — waist + two legs
  legs: [
    [4, 2, 8, 2],
    [4, 4, 3, 9],
    [9, 4, 3, 9],
  ],
  // Gauntlets — cuff, hand, thumb
  gloves: [
    [4, 2, 8, 2],
    [5, 4, 6, 5],
    [11, 5, 2, 3],
    [5, 9, 6, 3],
  ],
  // Boots
  boots: [
    [5, 2, 4, 8],
    [5, 10, 8, 3],
    [4, 13, 9, 1],
  ],
}

type Props = {
  slot: EquipmentSlotKey
  color: string // tier color when equipped
  empty?: boolean // ghost silhouette when nothing unlocked
  size?: number
}

export default function EquipmentIcon({ slot, color, empty = false, size = 44 }: Props) {
  const rects = GLYPHS[slot]
  const fill = empty ? 'var(--dbevel-light)' : color

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {rects.map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={fill} opacity={empty ? 0.45 : 1} />
      ))}
    </svg>
  )
}
