// Original pixel-style placeholder icons (16x16 grid). Replace with custom art later.
// Frame stroke color = the skill's current tier color.

type Rect = [x: number, y: number, w: number, h: number]

const GLYPHS: Record<string, Rect[]> = {
  // Push — fist
  fist: [
    [4, 4, 8, 2],
    [3, 6, 10, 4],
    [11, 6, 2, 3],
    [4, 10, 8, 2],
    [5, 12, 6, 1],
  ],
  // Pull — rope
  rope: [
    [7, 2, 2, 2],
    [6, 4, 4, 2],
    [7, 6, 2, 1],
    [5, 7, 6, 3],
    [7, 10, 2, 1],
    [6, 11, 4, 2],
  ],
  // Legs — boot
  boot: [
    [5, 2, 4, 8],
    [5, 10, 8, 3],
    [4, 13, 9, 1],
  ],
  // Endurance — flame
  flame: [
    [7, 2, 2, 2],
    [6, 4, 4, 2],
    [5, 6, 6, 3],
    [4, 9, 8, 3],
    [6, 12, 4, 1],
  ],
  // Hit Points — heart
  heart: [
    [4, 3, 3, 2],
    [9, 3, 3, 2],
    [3, 5, 10, 3],
    [4, 8, 8, 2],
    [6, 10, 4, 2],
    [7, 12, 2, 1],
  ],
  // Defense — shield
  shield: [
    [4, 2, 8, 2],
    [4, 4, 8, 4],
    [5, 8, 6, 2],
    [6, 10, 4, 2],
    [7, 12, 2, 1],
  ],
}

function glyphFor(name: string): Rect[] {
  const n = name.toLowerCase()
  if (n.includes('push')) return GLYPHS.fist
  if (n.includes('pull')) return GLYPHS.rope
  if (n.includes('leg')) return GLYPHS.boot
  if (n.includes('endur')) return GLYPHS.flame
  if (n.includes('hit') || n.includes('hp')) return GLYPHS.heart
  if (n.includes('def')) return GLYPHS.shield
  return GLYPHS.fist
}

type Props = {
  skillName: string
  frameColor: string
  size?: number
}

export default function SkillIcon({ skillName, frameColor, size = 44 }: Props) {
  const rects = glyphFor(skillName)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="0" y="0" width="16" height="16" fill="var(--dbevel-dark)" />
      <rect
        x="0.5"
        y="0.5"
        width="15"
        height="15"
        fill="none"
        stroke={frameColor}
        strokeWidth="1"
      />
      {rects.map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill="var(--dink)" />
      ))}
    </svg>
  )
}
