import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CharacterCreationForm from './CharacterCreationForm'

export default async function CharacterCreationPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: existingCharacter } = await supabase
    .from('characters')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (existingCharacter) redirect('/dashboard')

  const { data: characterClasses, error } = await supabase
    .from('character_classes')
    .select('id, name, description')
    .order('id')

  if (error || !characterClasses) {
    throw new Error('Failed to load character classes')
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-abyss)' }}>
      {/* Navbar */}
      <nav style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 items-center">
            <h1 className="font-display text-lg tracking-widest uppercase" style={{ color: 'var(--gold)' }}>
              <span style={{ color: 'var(--gold-bright)' }}>Strength</span><span style={{ color: 'var(--text-primary)' }}>Quest</span>
            </h1>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="card-dark p-8">
          <div className="text-center mb-8">
            <div
              className="inline-block text-3xl mb-3"
              style={{ filter: 'drop-shadow(0 0 8px rgba(240, 180, 41, 0.4))' }}
            >
              ⚔
            </div>
            <h1
              className="font-display text-3xl font-bold tracking-wider uppercase"
              style={{ color: 'var(--text-primary)' }}
            >
              Create Your Character
            </h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Begin your StrengthQuest journey
            </p>
          </div>

          <CharacterCreationForm characterClasses={characterClasses} />
        </div>
      </main>
    </div>
  )
}
