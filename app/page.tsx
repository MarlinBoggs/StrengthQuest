import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import WaitlistForm from './WaitlistForm'
import SkillShowcase from './SkillShowcase'
import LevelUpMoment from './LevelUpMoment'
import { ScrollIcon, SparkIcon, CrownIcon } from './PixelIcons'

const STEPS = [
  {
    Icon: ScrollIcon,
    title: 'Log your workout',
    desc: 'Record your sets and reps like turning in a quest. No spreadsheets, no ceremony.',
  },
  {
    Icon: SparkIcon,
    title: 'Earn XP toward your skills',
    desc: 'The moment you finish a set, the XP drops. No waiting until the end of the session.',
  },
  {
    Icon: CrownIcon,
    title: 'Level up and chase new tiers',
    desc: 'Cross the threshold, claim the fanfare, and climb the ladder from Stone toward Mythic.',
  },
]

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-abyss)' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Existing users still get in the door */}
        <nav className="flex justify-end pt-5">
          {user ? (
            <Link
              href="/dashboard"
              className="btn-gold px-4 py-2 rounded-sm font-bold uppercase tracking-wider text-xs"
            >
              Go to Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-sm transition-colors hover:brightness-125"
              style={{ color: 'var(--text-muted)' }}
            >
              Sign in
            </Link>
          )}
        </nav>

        {/* Hero */}
        <section className="text-center pt-14 sm:pt-20 pb-16">
          <p
            className="text-xs font-bold uppercase tracking-[0.35em]"
            style={{ color: 'var(--gold)' }}
          >
            ✦ A new quest awaits ✦
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
            The workout tracker that turns your lifts into RPG skills — every set
            earns XP toward Push, Pull, and Legs, with levels, tiers, and
            level-up moments.
          </p>

          <div className="mt-8">
            <WaitlistForm variant="hero" />
          </div>
          <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
            Free during early access · No spam — one email when the gates open
          </p>
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
              Six skills. Real XP. The grind you already love — pointed at the barbell.
            </p>
          </div>
          <SkillShowcase />
        </section>

        {/* How it works */}
        <section className="py-14">
          <h2
            className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-wider text-center mb-8"
            style={{ color: 'var(--text-primary)' }}
          >
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {STEPS.map((step, i) => (
              <div key={step.title} className="card-dark p-6 text-center">
                <div
                  className="font-display text-sm font-bold tracking-widest"
                  style={{ color: 'var(--gold-dim)' }}
                >
                  {i + 1}
                </div>
                <span
                  className="inline-flex mt-3"
                  style={{ color: 'var(--gold-bright)' }}
                >
                  <step.Icon size={28} />
                </span>
                <h3
                  className="font-display text-base font-bold uppercase tracking-wider mt-3"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {step.title}
                </h3>
                <p
                  className="text-sm mt-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* The level-up moment */}
        <section className="py-14">
          <LevelUpMoment />
        </section>

        {/* Who it's for */}
        <section className="py-14">
          <div className="card-dark max-w-2xl mx-auto p-8 sm:p-10 text-center">
            <p
              className="font-display text-lg sm:text-xl font-bold leading-relaxed"
              style={{ color: 'var(--text-primary)' }}
            >
              If you’ve ever spent 40 hours grinding a skill in a game, you
              already have everything it takes to get strong.
            </p>
            <p className="text-sm mt-4" style={{ color: 'var(--text-secondary)' }}>
              StrengthQuest just gives your training the XP bar it always
              deserved. Same obsession, new stat sheet — and this one carries
              over to real life.
            </p>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 text-center">
          <h2
            className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-wider"
            style={{ color: 'var(--gold-bright)' }}
          >
            Reserve your spot in the beta
          </h2>
          <p
            className="text-sm mt-3 mb-8"
            style={{ color: 'var(--text-secondary)' }}
          >
            The first wave of adventurers gets in free. Add your name to the scroll.
          </p>
          <WaitlistForm variant="footer" />
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
