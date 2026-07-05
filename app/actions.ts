'use server'

import { createClient } from '@/lib/supabase/server'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type WaitlistResult =
  | { ok: true; duplicate: boolean }
  | { error: string }

export async function joinWaitlist(email: string): Promise<WaitlistResult> {
  const normalized = (email ?? '').trim().toLowerCase()

  if (!EMAIL_RE.test(normalized) || normalized.length > 254) {
    return { error: 'That email doesn’t look right, adventurer.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('waitlist').insert({ email: normalized })

  if (error) {
    // 23505 = unique violation: already on the scroll, treat as success
    if (error.code === '23505') {
      return { ok: true, duplicate: true }
    }
    console.error('Waitlist signup error:', error)
    return { error: 'The scribe dropped his quill. Please try again.' }
  }

  return { ok: true, duplicate: false }
}
