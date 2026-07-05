'use client'

import { useState } from 'react'
import { createCharacter } from './actions'

type CharacterClass = {
  id: number
  name: string
  description: string | null
}

type Props = {
  characterClasses: CharacterClass[]
}

export default function CharacterCreationForm({ characterClasses }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)

    try {
      const result = await createCharacter(formData)

      if (result?.error) {
        setError(result.error)
        setLoading(false)
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div
          className="rounded-lg p-4"
          style={{
            background: 'rgba(220, 38, 38, 0.1)',
            border: '1px solid rgba(220, 38, 38, 0.3)',
          }}
        >
          <p className="text-sm font-medium" style={{ color: '#fca5a5' }}>{error}</p>
        </div>
      )}

      {/* Character Name */}
      <div>
        <label htmlFor="name" className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
          Character Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          minLength={3}
          maxLength={30}
          className="input-dark w-full px-3 py-2.5 rounded-lg text-sm"
          placeholder="Enter your character name"
          disabled={loading}
        />
        <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>3-30 characters</p>
      </div>

      {/* Character Class */}
      <div>
        <label htmlFor="classId" className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
          Character Class
        </label>
        <select
          id="classId"
          name="classId"
          required
          className="input-dark w-full px-3 py-2.5 rounded-lg text-sm"
          disabled={loading}
        >
          <option value="">Select a class</option>
          {characterClasses.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name}
              {cls.description && ` — ${cls.description}`}
            </option>
          ))}
        </select>
      </div>

      {/* Bodyweight */}
      <div>
        <label htmlFor="bodyweight" className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
          Bodyweight (lbs)
        </label>
        <input
          type="number"
          id="bodyweight"
          name="bodyweight"
          required
          min={50}
          max={500}
          step={0.1}
          className="input-dark w-full px-3 py-2.5 rounded-lg text-sm"
          placeholder="Enter your bodyweight"
          disabled={loading}
        />
        <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>50-500 lbs (used for tier calculations)</p>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="btn-gold w-full py-3 rounded-lg text-sm font-bold uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
      >
        {loading ? 'Creating Character...' : 'Begin Your Quest'}
      </button>
    </form>
  )
}
