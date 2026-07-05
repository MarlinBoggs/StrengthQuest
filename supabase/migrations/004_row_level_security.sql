-- StrengthQuest - Row-Level Security Policies
-- Migration 004: Configure RLS to secure user data
-- Created: 2026-02-20

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY ON USER DATA TABLES
-- ============================================================================

ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CHARACTERS TABLE POLICIES
-- ============================================================================

-- Policy: Users can view only their own character
CREATE POLICY "Users can view own character"
  ON characters
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert only their own character
CREATE POLICY "Users can create own character"
  ON characters
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update only their own character
CREATE POLICY "Users can update own character"
  ON characters
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete only their own character
CREATE POLICY "Users can delete own character"
  ON characters
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- USER_SKILLS TABLE POLICIES
-- ============================================================================

-- Policy: Users can view only their own skill progression
CREATE POLICY "Users can view own skills"
  ON user_skills
  FOR SELECT
  USING (
    character_id IN (
      SELECT id FROM characters WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can insert only their own skill records
CREATE POLICY "Users can create own skills"
  ON user_skills
  FOR INSERT
  WITH CHECK (
    character_id IN (
      SELECT id FROM characters WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update only their own skill progression
CREATE POLICY "Users can update own skills"
  ON user_skills
  FOR UPDATE
  USING (
    character_id IN (
      SELECT id FROM characters WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can delete only their own skill records
CREATE POLICY "Users can delete own skills"
  ON user_skills
  FOR DELETE
  USING (
    character_id IN (
      SELECT id FROM characters WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- WORKOUTS TABLE POLICIES
-- ============================================================================

-- Policy: Users can view only their own workouts
CREATE POLICY "Users can view own workouts"
  ON workouts
  FOR SELECT
  USING (
    character_id IN (
      SELECT id FROM characters WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can insert only their own workouts
CREATE POLICY "Users can create own workouts"
  ON workouts
  FOR INSERT
  WITH CHECK (
    character_id IN (
      SELECT id FROM characters WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update only their own workouts
CREATE POLICY "Users can update own workouts"
  ON workouts
  FOR UPDATE
  USING (
    character_id IN (
      SELECT id FROM characters WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can delete only their own workouts
CREATE POLICY "Users can delete own workouts"
  ON workouts
  FOR DELETE
  USING (
    character_id IN (
      SELECT id FROM characters WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- WORKOUT_EXERCISES TABLE POLICIES
-- ============================================================================

-- Policy: Users can view only exercises from their own workouts
CREATE POLICY "Users can view own workout exercises"
  ON workout_exercises
  FOR SELECT
  USING (
    workout_id IN (
      SELECT w.id FROM workouts w
      JOIN characters c ON w.character_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

-- Policy: Users can insert only exercises into their own workouts
CREATE POLICY "Users can create own workout exercises"
  ON workout_exercises
  FOR INSERT
  WITH CHECK (
    workout_id IN (
      SELECT w.id FROM workouts w
      JOIN characters c ON w.character_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

-- Policy: Users can update only exercises from their own workouts
CREATE POLICY "Users can update own workout exercises"
  ON workout_exercises
  FOR UPDATE
  USING (
    workout_id IN (
      SELECT w.id FROM workouts w
      JOIN characters c ON w.character_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

-- Policy: Users can delete only exercises from their own workouts
CREATE POLICY "Users can delete own workout exercises"
  ON workout_exercises
  FOR DELETE
  USING (
    workout_id IN (
      SELECT w.id FROM workouts w
      JOIN characters c ON w.character_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

-- ============================================================================
-- WORKOUT_SETS TABLE POLICIES
-- ============================================================================

-- Policy: Users can view only sets from their own workout exercises
CREATE POLICY "Users can view own workout sets"
  ON workout_sets
  FOR SELECT
  USING (
    workout_exercise_id IN (
      SELECT we.id FROM workout_exercises we
      JOIN workouts w ON we.workout_id = w.id
      JOIN characters c ON w.character_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

-- Policy: Users can insert only sets into their own workout exercises
CREATE POLICY "Users can create own workout sets"
  ON workout_sets
  FOR INSERT
  WITH CHECK (
    workout_exercise_id IN (
      SELECT we.id FROM workout_exercises we
      JOIN workouts w ON we.workout_id = w.id
      JOIN characters c ON w.character_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

-- Policy: Users can update only sets from their own workout exercises
CREATE POLICY "Users can update own workout sets"
  ON workout_sets
  FOR UPDATE
  USING (
    workout_exercise_id IN (
      SELECT we.id FROM workout_exercises we
      JOIN workouts w ON we.workout_id = w.id
      JOIN characters c ON w.character_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

-- Policy: Users can delete only sets from their own workout exercises
CREATE POLICY "Users can delete own workout sets"
  ON workout_sets
  FOR DELETE
  USING (
    workout_exercise_id IN (
      SELECT we.id FROM workout_exercises we
      JOIN workouts w ON we.workout_id = w.id
      JOIN characters c ON w.character_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

-- ============================================================================
-- REFERENCE TABLES - PUBLIC READ ACCESS
-- ============================================================================

-- Enable RLS on reference tables (but allow public read)
ALTER TABLE character_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view character classes
CREATE POLICY "Authenticated users can view character classes"
  ON character_classes
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: All authenticated users can view skills
CREATE POLICY "Authenticated users can view skills"
  ON skills
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: All authenticated users can view exercises
CREATE POLICY "Authenticated users can view exercises"
  ON exercises
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- VERIFICATION QUERIES (optional - comment out after verification)
-- ============================================================================

-- Verify RLS is enabled on all tables:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- List all policies:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- Test policy (as authenticated user):
-- SELECT * FROM characters;  -- Should only return current user's character
-- SELECT * FROM skills;      -- Should return all skills (public read)
