import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SkillShowcase from './SkillShowcase'
import LevelUpMoment from './LevelUpMoment'
import BossFight from './BossFight'
import PrGear from './PrGear'

const SIGN_UP_HREF = '/login?mode=signup'

// Primary CTA: signed-out visitors get Sign Up (with Play Now for returning
// players); signed-in players go straight to the dashboard.
function Cta({ signedIn, signUpLabel }: { signedIn: boolean; signUpLabel: string }) {
  if (signedIn) {
    return (
      <Link
        href="/dashboard"
        className="btn-gold inline-block px-8 py-3 rounded-sm font-bold uppercase tracking-wider text-sm"
      >
        Play Now
      </Link>
    )
  }
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
      <Link
        href={SIGN_UP_HREF}
        className="btn-gold inline-block w-full sm:w-auto px-8 py-3 rounded-sm font-bold uppercase tracking-wider text-sm"
      >
        {signUpLabel}
      </Link>
      <Link
        href="/login"
        className="card-dark inline-block w-full sm:w-auto px-8 py-3 rounded-sm font-bold uppercase tracking-wider text-sm transition-colors hover:brightness-125"
        style={{ color: 'var(--text-primary)' }}
      >
        Play Now
      </Link>
    </div>
  )
}

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-abyss)' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex justify-end pt-5">
          <Link
            href={user ? '/dashboard' : '/login'}
            className="btn-gold px-4 py-2 rounded-sm font-bold uppercase tracking-wider text-xs"
          >
            Play Now
          </Link>
        </nav>

        {/* Hero */}
        <section className="text-center pt-14 sm:pt-20 pb-16">
          <p
            className="text-xs font-bold uppercase tracking-[0.35em]"
            style={{ color: 'var(--gold)' }}
          >
            ✦ A new PR awaits ✦
          </p>
          <div
            className="font-display text-4xl sm:text-5xl font-bold tracking-wider uppercase mt-4"
            aria-hidden="true"
          >
            <span style={{ color: 'var(--gold-bright)' }}>Strength</span>
            <span style={{ color: 'var(--text-primary)' }}>Quest</span>
          </div>
          <h1
            className="font-display text-3xl sm:text-5xl font-bold tracking-wide mt-5 leading-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            Level up your strength IRL
          </h1>
          <p
            className="text-base sm:text-lg mt-4 max-w-xl mx-auto"
            style={{ color: 'var(--text-secondary)' }}
          >
            The workout tracker that turns your lifts into RPG skills. Every set
            earns XP, and every new PR earns you gear.
          </p>

          <div className="mt-8">
            <Cta signedIn={!!user} signUpLabel="Sign up free" />
          </div>
          {!user && (
            <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
              Free during early access · Already have an account? Hit Play Now
            </p>
          )}
        </section>

        {/* Skill panel showcase */}
        <section className="py-14">
          <div className="text-center mb-8">
            <p
              className="text-xs font-bold uppercase tracking-[0.3em]"
              style={{ color: 'var(--gold)' }}
            >
              Your stat sheet
            </p>
            <h2
              className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-wider mt-2"
              style={{ color: 'var(--text-primary)' }}
            >
              Your lifts, as skills
            </h2>
            <p className="text-sm mt-3" style={{ color: 'var(--text-secondary)' }}>
              Six skills. Real XP. The grind you already love, pointed at the barbell.
            </p>
          </div>
          <SkillShowcase />
        </section>

        {/* PRs earn gear */}
        <section className="py-14">
          <div className="text-center mb-8">
            <p
              className="text-xs font-bold uppercase tracking-[0.3em]"
              style={{ color: 'var(--gold)' }}
            >
              PRs earn gear
            </p>
            <h2
              className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-wider mt-2"
              style={{ color: 'var(--text-primary)' }}
            >
              Lift more, wear more
            </h2>
            <p
              className="text-sm mt-3 max-w-xl mx-auto"
              style={{ color: 'var(--text-secondary)' }}
            >
              Beat your best lift and you climb a tier. Every tier unlocks new
              armor for your character, and once it&apos;s earned, it&apos;s yours
              for good.
            </p>
          </div>
          <PrGear />
        </section>

        {/* Boss fight */}
        <section className="py-14">
          <div className="text-center mb-8">
            <p
              className="text-xs font-bold uppercase tracking-[0.3em]"
              style={{ color: 'var(--gold)' }}
            >
              Every session is a boss fight
            </p>
            <h2
              className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-wider mt-2"
              style={{ color: 'var(--text-primary)' }}
            >
              Your sets are the damage
            </h2>
            <p
              className="text-sm mt-3 max-w-xl mx-auto"
              style={{ color: 'var(--text-secondary)' }}
            >
              Each workout spawns a boss scaled to your recent sessions. Every
              set you finish hits it for the XP you earned. Put in real work and
              it falls. Cut the session short and it escapes to fight another
              day, with no penalty.
            </p>
          </div>
          <BossFight />
        </section>

        {/* The level-up moment */}
        <section className="py-14">
          <LevelUpMoment />
        </section>

        {/* Final CTA */}
        <section className="py-16 text-center">
          <h2
            className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-wider"
            style={{ color: 'var(--gold-bright)' }}
          >
            {user ? 'Your quest continues' : 'Begin your quest'}
          </h2>
          <p
            className="text-sm mt-3 mb-8"
            style={{ color: 'var(--text-secondary)' }}
          >
            {user
              ? 'Your skills are waiting. Go earn some XP.'
              : 'Create your character in under a minute. Free during early access.'}
          </p>
          <Cta signedIn={!!user} signUpLabel="Create your character" />
        </section>

        {/* Footer */}
        <footer
          className="py-8 text-center text-xs"
          style={{
            borderTop: '1px solid var(--border-subtle)',
            color: 'var(--text-muted)',
          }}
        >
          <p>© {new Date().getFullYear()} StrengthQuest</p>
          <p className="mt-1">Not affiliated with Jagex or RuneScape.</p>
        </footer>
      </div>
    </div>
  )
}
