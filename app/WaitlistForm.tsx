'use client'

import { useState } from 'react'
import { joinWaitlist } from './actions'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Status = 'idle' | 'loading' | 'success' | 'duplicate'

export default function WaitlistForm({
  variant = 'hero',
}: {
  variant?: 'hero' | 'footer'
}) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!EMAIL_RE.test(trimmed)) {
      setError('Enter a real email, adventurer.')
      return
    }
    setError(null)
    setStatus('loading')
    const result = await joinWaitlist(trimmed)
    if ('error' in result) {
      setStatus('idle')
      setError(result.error)
    } else {
      setStatus(result.duplicate ? 'duplicate' : 'success')
    }
  }

  if (status === 'success' || status === 'duplicate') {
    return (
      <div
        className="card-dark px-6 py-4 text-center w-full max-w-md mx-auto"
        role="status"
      >
        <p
          className="font-display font-bold tracking-wider"
          style={{ color: 'var(--gold-bright)' }}
        >
          {status === 'success'
            ? '✦ Your name has been added to the scroll'
            : '✦ Your name is already on the scroll'}
        </p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          We’ll send word when the gates open.
        </p>
      </div>
    )
  }

  const inputId = `waitlist-email-${variant}`
  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col sm:flex-row gap-3 w-full max-w-md mx-auto"
    >
      <div className="flex-1">
        <label htmlFor={inputId} className="sr-only">
          Email address
        </label>
        <input
          id={inputId}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          className="input-dark w-full px-4 py-3 text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === 'loading'}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
        />
        {error && (
          <p
            id={`${inputId}-error`}
            className="text-xs mt-1.5 text-left"
            style={{ color: '#f87171' }}
          >
            {error}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={status === 'loading'}
        className="btn-gold px-6 py-3 rounded-sm font-bold uppercase tracking-wider text-sm whitespace-nowrap"
      >
        {status === 'loading'
          ? 'Inscribing…'
          : variant === 'hero'
            ? 'Join the waitlist'
            : 'Reserve my spot'}
      </button>
    </form>
  )
}
