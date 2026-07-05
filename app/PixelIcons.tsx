import type { CSSProperties } from 'react'

// Original pixel-art-style SVG icons drawn on a 16×16 grid.
// crispEdges keeps the pixels chunky at any render size; fill inherits
// currentColor so skill colors flow in from the parent.

type IconProps = {
  size?: number
  className?: string
  style?: CSSProperties
}

function PixelIcon({
  d,
  size = 24,
  className,
  style,
  evenOdd,
}: IconProps & { d: string; evenOdd?: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      className={className}
      style={style}
      shapeRendering="crispEdges"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d={d} fillRule={evenOdd ? 'evenodd' : undefined} />
    </svg>
  )
}

/** Push — a clenched fist, knuckles up */
export function FistIcon(props: IconProps) {
  return (
    <PixelIcon
      {...props}
      d="M4 3h2v1H4z M7 3h2v1H7z M10 3h2v1H10z M3 4h10v5H3z M13 5h1v3H13z M4 9h9v1H4z M5 10h7v1H5z M6 11h5v1H6z"
    />
  )
}

/** Pull — an anchor */
export function AnchorIcon(props: IconProps) {
  return (
    <PixelIcon
      {...props}
      d="M7 1h2v1H7z M6 2h1v1H6z M9 2h1v1H9z M7 3h2v1H7z M7 4h2v8H7z M4 5h8v1H4z M3 9h1v2H3z M12 9h1v2H12z M4 11h3v1H4z M9 11h3v1H9z M5 12h6v1H5z"
    />
  )
}

/** Legs — a boot */
export function BootIcon(props: IconProps) {
  return (
    <PixelIcon
      {...props}
      d="M4 1h7v1H4z M5 2h5v7H5z M5 9h6v1H5z M5 10h8v1H5z M5 11h9v1H5z M4 12h10v1H4z"
    />
  )
}

/** Endurance — a flame */
export function FlameIcon(props: IconProps) {
  return (
    <PixelIcon
      {...props}
      d="M8 1h1v1H8z M7 2h2v1H7z M7 3h3v1H7z M6 4h3v1H6z M10 4h1v1H10z M5 5h5v1H5z M5 6h6v1H5z M4 7h8v1H4z M4 8h9v1H4z M3 9h10v2H3z M4 11h9v1H4z M5 12h7v1H5z M6 13h5v1H6z"
    />
  )
}

/** Hit Points — a heart */
export function HeartIcon(props: IconProps) {
  return (
    <PixelIcon
      {...props}
      d="M3 2h3v1H3z M10 2h3v1H10z M2 3h5v1H2z M9 3h5v1H9z M2 4h12v3H2z M3 7h10v1H3z M4 8h8v1H4z M5 9h6v1H5z M6 10h4v1H6z M7 11h2v1H7z"
    />
  )
}

/** Defense — a shield */
export function ShieldIcon(props: IconProps) {
  return (
    <PixelIcon
      {...props}
      d="M4 1h8v1H4z M3 2h10v6H3z M4 8h8v1H4z M5 9h6v1H5z M6 10h4v1H6z M7 11h2v1H7z"
    />
  )
}

/** Quest log — a scroll with writing */
export function ScrollIcon(props: IconProps) {
  return (
    <PixelIcon
      {...props}
      evenOdd
      d="M2 2h12v2H2z M3 4h10v8H3z M5 6h6v1H5z M5 8h6v1H5z M5 10h4v1H5z M2 12h12v2H2z"
    />
  )
}

/** XP drop — a four-point spark */
export function SparkIcon(props: IconProps) {
  return (
    <PixelIcon
      {...props}
      d="M7 1h2v1H7z M6 2h4v1H6z M5 3h6v1H5z M4 4h8v2H4z M3 6h10v2H3z M4 8h8v2H4z M5 10h6v1H5z M6 11h4v1H6z M7 12h2v1H7z"
    />
  )
}

/** Level up — a crown */
export function CrownIcon(props: IconProps) {
  return (
    <PixelIcon
      {...props}
      d="M3 3h1v1H3z M7 3h2v1H7z M12 3h1v1H12z M3 4h2v1H3z M7 4h2v1H7z M11 4h2v1H11z M3 5h10v3H3z M4 8h8v1H4z"
    />
  )
}
