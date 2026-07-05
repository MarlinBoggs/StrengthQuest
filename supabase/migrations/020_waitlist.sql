-- StrengthQuest - Waitlist table for the validation landing page
-- Migration 020
-- Created: 2026-07-05
--
-- Simple email capture for the early-access waitlist. Anonymous visitors
-- insert via the landing page server action (anon key). No SELECT policy —
-- emails are never readable through the public API; view them in the
-- Supabase dashboard or with the service role.

CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL CHECK (
    char_length(email) <= 254
    AND email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Case-insensitive uniqueness; the server action lowercases before insert,
-- but this guards against direct inserts too.
CREATE UNIQUE INDEX waitlist_email_unique ON waitlist (lower(email));

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone may add themselves to the scroll. Nobody may read it back.
CREATE POLICY "Anyone can join the waitlist"
  ON waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
