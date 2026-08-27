import type { WorkoutSummary } from '@/app/history/types'

type Props = {
  sessions: WorkoutSummary[]
}

function formatSessionDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function RecentSessionsTeaser({ sessions }: Props) {
  if (sessions.length === 0) return null

  return (
    <section className="sq-panel p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="sq-label">Recent Sessions</p>
        <a href="/history" style={{ fontSize: '13px', color: 'var(--dgold)' }}>
          View full history →
        </a>
      </div>
      <div className="space-y-2">
        {sessions.map((w) => (
          <a
            key={w.workout_id}
            href={`/history?open=${w.workout_id}`}
            className="sq-bevel-in flex items-center justify-between gap-3 px-3 py-2 transition-colors"
            style={{ background: 'var(--dbg)', minHeight: '44px' }}
          >
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <span className="shrink-0" style={{ fontSize: '15px', color: 'var(--dink)' }}>
                {formatSessionDate(w.workout_date)}
              </span>
              <div className="flex gap-1 flex-wrap">
                {w.skills.map((s) => (
                  <span
                    key={s.skill_id}
                    className="shrink-0 font-semibold px-1.5 py-0.5 rounded"
                    style={{
                      fontSize: '10px',
                      backgroundColor: `${s.color_hex}20`,
                      color: s.color_hex,
                    }}
                  >
                    {s.name}
                  </span>
                ))}
              </div>
              {w.achieved_pr && <span aria-label="PR" title="Personal record">🏆</span>}
            </div>
            <span className="sq-num shrink-0" style={{ fontSize: '13px', color: 'var(--dgold)' }}>
              +{w.total_xp} XP
            </span>
          </a>
        ))}
      </div>
    </section>
  )
}
