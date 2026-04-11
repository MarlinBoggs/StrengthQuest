import Link from "next/link";
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-abyss)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center min-h-screen py-12">
          <div className="text-center">
            <h1
              className="font-display text-6xl sm:text-7xl font-bold tracking-wider uppercase"
              style={{
                color: 'var(--gold)',
                textShadow: '0 0 30px rgba(240, 180, 41, 0.15)',
              }}
            >
              <span style={{ color: 'var(--gold-bright)' }}>Strength</span><span style={{ color: 'var(--text-primary)' }}>Quest</span>
            </h1>
            <p className="text-xl mt-3" style={{ color: 'var(--text-primary)' }}>
              Level up your strength IRL
            </p>
            <p className="text-base mt-1" style={{ color: 'var(--text-secondary)' }}>
              RPG progression for the big 3 lifts. Make workouts addictive again.
            </p>

            <div className="flex gap-4 justify-center mt-8">
              {user ? (
                <Link
                  href="/dashboard"
                  className="btn-gold px-8 py-3 rounded-lg font-bold uppercase tracking-wider text-sm"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="btn-gold px-8 py-3 rounded-lg font-bold uppercase tracking-wider text-sm"
                  >
                    Get Started
                  </Link>
                  <Link
                    href="/login"
                    className="px-8 py-3 rounded-lg font-semibold text-sm transition-colors"
                    style={{
                      border: '1px solid var(--border-default)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-4xl">
              {[
                {
                  title: 'Push / Pull / Legs',
                  desc: 'Three skills to master: Bench, Deadlift, and Squat',
                },
                {
                  title: 'Earn XP & Level Up',
                  desc: 'Every workout earns XP. Level up your skills and track PRs.',
                },
                {
                  title: 'Tier System',
                  desc: 'From Novice to Elite. How high can you climb?',
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="card-dark p-6"
                >
                  <h3
                    className="font-display text-lg font-bold tracking-wider uppercase mb-2"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {card.title}
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {card.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
