'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createCharacter(formData: FormData) {
  const supabase = await createClient()

  // Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (!user || authError) {
    return { error: 'Not authenticated' }
  }

  // Extract form data
  const name = formData.get('name') as string
  const classId = parseInt(formData.get('classId') as string)
  const bodyweight = parseFloat(formData.get('bodyweight') as string)

  // Server-side validation
  if (!name || name.length < 3 || name.length > 30) {
    return { error: 'Name must be 3-30 characters' }
  }

  if (!classId || classId < 1 || classId > 6) {
    return { error: 'Invalid character class' }
  }

  if (!bodyweight || bodyweight < 50 || bodyweight > 500) {
    return { error: 'Bodyweight must be between 50-500 lbs' }
  }

  // Call RPC function to create character + skills atomically
  const { data, error } = await supabase.rpc('create_character_with_skills', {
    p_user_id: user.id,
    p_name: name,
    p_class_id: classId,
    p_bodyweight_lbs: bodyweight
  })

  if (error) {
    console.error('Character creation error:', error)
    return { error: error.message || 'Failed to create character' }
  }

  // Success - redirect to dashboard
  redirect('/dashboard')
}
