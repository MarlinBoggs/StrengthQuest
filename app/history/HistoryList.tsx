'use client'

import { useEffect, useMemo, useState } from 'react'
import SessionDetailSheet from './SessionDetailSheet'
import type { WorkoutSummary } from './types'

type Props = {
  workouts: WorkoutSummary[]
  initialOpenId: string | null
}

function formatSessionDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function monthLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default function HistoryList({ workouts, initialOpenId }: Props) {
  const [openId, setOpenId] = useState<string | null>(initialOpenId)

  // Deep link from the dashboard teaser (/history?open=<id>) opens straight
  // into that session's detail sheet.
  useEffect(() => {
    setOpenId(initialOpenId)
  }, [initialOpenId])

  const openWorkout = workouts.find((w) => w.workout_id === openId) ?? null

  const groups = useMemo(() => {
    const map = new Map<string, WorkoutSummary[]>()
    for (const w of workouts) {
      const key = monthLabel(w.workout_date)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(w)
    }
    return Array.from(map.entries())
  }, [workouts])

  if (workouts.length === 0) {
    return (
      <div className="sq-panel p-6 text-center">
        <p style={{ fontSize: '15px', color: 'var(--dink-muted)' }}>
          No workouts logged yet.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {groups.map(([month, sessions]) => (
        <div key={month}>
          <p className="sq-label mb-2">{month}</p>
          <div className="space-y-2">
            {sessions.map((w) => (
              <button
                key={w.workout_id}
                type="button"
                onClick={() => setOpenId(w.workout_id)}
                className="sq-panel w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors"
                style={{ minHeight: '56px' }}
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
                          fontSize: '11px',
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
                <span className="sq-num shrink-0" style={{ fontSize: '15px', color: 'var(--dgold)' }}>
                  +{w.total_xp} XP
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {openWorkout && (
        <SessionDetailSheet workout={openWorkout} onClose={() => setOpenId(null)} />
      )}
    </div>
  )
}
