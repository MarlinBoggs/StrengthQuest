import type { TrendPoint } from './theme'

type Props = {
  points: TrendPoint[]
  color: string
  height?: number
}

// Hidden below 3 points — a single dot or flat line at that size communicates
// nothing, so it's better to show no chart than a misleading one.
export default function Sparkline({ points, color, height = 32 }: Props) {
  if (points.length < 3) return null

  const width = 200
  const values = points.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const coords = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * width
      const y = height - ((p.value - min) / range) * height
      return `${x},${y}`
    })
    .join(' ')

  const lastValue = values[values.length - 1]
  const lastY = height - ((lastValue - min) / range) * height

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      role="img"
      aria-label="Trend over recent sessions"
    >
      <polyline
        points={coords}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={width} cy={lastY} r="3" fill={color} />
    </svg>
  )
}
