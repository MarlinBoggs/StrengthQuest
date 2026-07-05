'use client'

import type { CSSProperties } from 'react'
import { useInView } from './useInView'
import { CrownIcon } from './PixelIcons'

const PARTICLES: { dx: string; dy: string; pd: string }[] = [
  { dx: '-64px', dy: '-46px', pd: '0s' },
  { dx: '58px', dy: '-52px', pd: '0.3s' },
  { dx: '-38px', dy: '-70px', pd: '0.6s' },
  { dx: '44px', dy: '-30px', pd: '0.9s' },
  { dx: '-70px', dy: '-14px', pd: '1.2s' },
  { dx: '70px', dy: '-18px', pd: '1.5s' },
  { dx: '-20px', dy: '-60px', pd: '1.8s' },
  { dx: '26px', dy: '-66px', pd: '2.1s' },
]

export default function LevelUpMoment() {
  const { ref, inView } = useInView<HTMLDivElement>(0.5)
  const visible = inView ? 'is-visible' : ''

  return (
    <div ref={ref} className={`sq-reveal ${visible}`}>
      <div
        className={`sq-levelup-panel card-dark relative max-w-md mx-auto px-8 py-8 text-center ${visible}`}
      >
        <div
          className="absolute left-1/2 top-1/2 pointer-events-none"
          aria-hidden="true"
        >
          {PARTICLES.map((p, i) => (
            <span
              key={i}
              className="sq-particle-dot"
              style={
                { '--dx': p.dx, '--dy': p.dy, '--pd': p.pd } as CSSProperties
              }
            />
          ))}
        </div>

        <span className="inline-flex" style={{ color: 'var(--gold-bright)' }}>
          <CrownIcon size={36} />
        </span>
        <p
          className="text-xs font-bold uppercase tracking-[0.3em] mt-3"
          style={{ color: 'var(--gold)' }}
        >
          Level up!
        </p>
        <p
          className="font-display text-xl sm:text-2xl font-bold mt-2 leading-snug"
          style={{ color: 'var(--text-primary)' }}
        >
          Congratulations, your{' '}
          <span style={{ color: '#DC2626' }}>Push</span> level is now 4!
        </p>
        <p className="text-sm mt-3" style={{ color: 'var(--text-secondary)' }}>
          New tier unlocked:{' '}
          <span style={{ color: 'var(--gold-bright)', fontWeight: 700 }}>
            Steel
          </span>
        </p>
      </div>
    </div>
  )
}
