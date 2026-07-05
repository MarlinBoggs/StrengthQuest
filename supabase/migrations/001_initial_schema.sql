-- StrengthQuest - Initial Database Schema
-- Migration 001: Create all core tables
-- Created: 2026-02-20

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- REFERENCE TABLES (Lookups)
-- ============================================================================

-- Character Classes (6 classes, cosmetic in MVP)
CREATE TABLE character_classes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  icon_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Skills (6 total: 3 active for MVP, 3 inactive for Phase 2)
CREATE TABLE skills (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  slug VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  color_hex VARCHAR(7) NOT NULL,

  -- Skill Type Configuration
  skill_type VARCHAR(20) NOT NULL CHECK (skill_type IN ('strength', 'cardio', 'hiit', 'mobility')),

  -- Tier System (JSON for flexibility)
  tier_thresholds JSONB,

  -- Phase Gating
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  phase INTEGER NOT NULL DEFAULT 1 CHECK (phase IN (1, 2)),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Exercises (per skill)
CREATE TABLE exercises (
  id SERIAL PRIMARY KEY,
  skill_id INTEGER NOT NULL REFERENCES skills(id),

  -- Exercise Details
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,

  -- Exercise Type
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  exercise_category VARCHAR(20) CHECK (exercise_category IN ('strength', 'cardio', 'hiit', 'mobility')),

  -- Strength Exercise Config
  allows_weight BOOLEAN NOT NULL DEFAULT TRUE,
  allows_reps BOOLEAN NOT NULL DEFAULT TRUE,

  -- Cardio Exercise Config (Phase 2)
  tracks_distance BOOLEAN NOT NULL DEFAULT FALSE,
  tracks_duration BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exercises_skill_id ON exercises(skill_id);
CREATE INDEX idx_exercises_is_primary ON exercises(is_primary);

-- Total Strength Tiers (Powerlifting Total: Bench + Squat + Deadlift)
CREATE TABLE total_strength_tiers (
  id SERIAL PRIMARY KEY,
  tier_name VARCHAR(20) NOT NULL UNIQUE,
  min_multiplier DECIMAL(4,2) NOT NULL,
  max_multiplier DECIMAL(4,2),
  display_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- USER DATA TABLES
-- ============================================================================

-- Characters (one per user)
CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Character Identity
  name VARCHAR(30) NOT NULL CHECK (char_length(name) >= 3),
  class_id INTEGER NOT NULL REFERENCES character_classes(id),

  -- Physical Attributes
  bodyweight_lbs DECIMAL(5,1) NOT NULL CHECK (bodyweight_lbs >= 50 AND bodyweight_lbs <= 500),

  -- Computed Fields
  character_level INTEGER NOT NULL DEFAULT 1 CHECK (character_level >= 1 AND character_level <= 10),
  total_strength_1rm DECIMAL(7,2) DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_characters_user_id ON characters(user_id);
CREATE INDEX idx_characters_class_id ON characters(class_id);

-- User Skills (progression per skill per character)
CREATE TABLE user_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  skill_id INTEGER NOT NULL REFERENCES skills(id),

  -- Progression Metrics
  current_xp INTEGER NOT NULL DEFAULT 0 CHECK (current_xp >= 0),
  current_level INTEGER NOT NULL DEFAULT 1 CHECK (current_level >= 1 AND current_level <= 10),

  -- Tier Metrics (Strength Skills)
  current_pr_weight DECIMAL(6,2),
  current_pr_reps INTEGER,
  current_pr_calculated_1rm DECIMAL(7,2),
  current_tier VARCHAR(20),
  tier_multiplier DECIMAL(4,2),

  -- Benchmark Metrics (Cardio/HIIT/Mobility - Phase 2)
  benchmark_value DECIMAL(10,2),
  benchmark_unit VARCHAR(20),

  -- Timestamps
  last_workout_at TIMESTAMPTZ,
  pr_achieved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(character_id, skill_id)
);

CREATE INDEX idx_user_skills_character_id ON user_skills(character_id);
CREATE INDEX idx_user_skills_skill_id ON user_skills(skill_id);
CREATE INDEX idx_user_skills_level ON user_skills(current_level);

-- Workouts (individual training sessions)
CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  skill_id INTEGER NOT NULL REFERENCES skills(id),

  -- Workout Metadata
  workout_date DATE NOT NULL,
  intensity INTEGER NOT NULL CHECK (intensity >= 1 AND intensity <= 10),
  length_minutes INTEGER NOT NULL CHECK (length_minutes >= 5 AND length_minutes <= 120),

  -- XP Calculation
  base_xp INTEGER NOT NULL,
  pr_bonus_xp INTEGER NOT NULL DEFAULT 0,
  total_xp INTEGER NOT NULL,

  -- Status Flags
  achieved_pr BOOLEAN NOT NULL DEFAULT FALSE,
  achieved_level_up BOOLEAN NOT NULL DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workouts_character_id ON workouts(character_id);
CREATE INDEX idx_workouts_skill_id ON workouts(skill_id);
CREATE INDEX idx_workouts_date ON workouts(workout_date DESC);
CREATE INDEX idx_workouts_character_date ON workouts(character_id, workout_date DESC);

-- Workout Exercises (exercises within a workout)
CREATE TABLE workout_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id),

  -- Exercise Order (for display)
  exercise_order INTEGER NOT NULL DEFAULT 1,

  -- Top Set Tracking (for strength exercises)
  top_set_id UUID,

  -- Cardio Metrics (Phase 2)
  total_distance DECIMAL(10,2),
  distance_unit VARCHAR(10),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workout_exercises_workout_id ON workout_exercises(workout_id);
CREATE INDEX idx_workout_exercises_exercise_id ON workout_exercises(exercise_id);
CREATE UNIQUE INDEX idx_workout_exercises_unique ON workout_exercises(workout_id, exercise_id);

-- Workout Sets (individual sets within an exercise)
CREATE TABLE workout_sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_exercise_id UUID NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,

  -- Set Details
  set_number INTEGER NOT NULL,

  -- Strength Metrics
  weight_lbs DECIMAL(6,2),
  reps INTEGER,
  rpe DECIMAL(3,1) CHECK (rpe >= 6.0 AND rpe <= 10.0),
  calculated_1rm DECIMAL(7,2),

  -- Cardio Metrics (Phase 2)
  distance DECIMAL(10,2),
  distance_unit VARCHAR(10),
  duration_seconds INTEGER,

  -- HIIT Metrics (Phase 2)
  intervals_completed INTEGER,
  avg_heart_rate INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workout_sets_exercise_id ON workout_sets(workout_exercise_id);
CREATE INDEX idx_workout_sets_1rm ON workout_sets(calculated_1rm DESC);

-- Add foreign key constraint for top_set_id (circular reference, added after workout_sets table exists)
ALTER TABLE workout_exercises
  ADD CONSTRAINT fk_workout_exercises_top_set
  FOREIGN KEY (top_set_id) REFERENCES workout_sets(id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS FOR AUTO-UPDATES
-- ============================================================================

-- Trigger: Update updated_at on characters
CREATE TRIGGER update_characters_updated_at
  BEFORE UPDATE ON characters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Update updated_at on user_skills
CREATE TRIGGER update_user_skills_updated_at
  BEFORE UPDATE ON user_skills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Update updated_at on workouts
CREATE TRIGGER update_workouts_updated_at
  BEFORE UPDATE ON workouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE characters IS 'User characters - one per user, stores character identity and base stats';
COMMENT ON TABLE user_skills IS 'Skill progression tracking - 6 records per character (one per skill)';
COMMENT ON TABLE workouts IS 'Individual workout sessions with metadata and XP tracking';
COMMENT ON TABLE workout_exercises IS 'Exercises logged within a workout session';
COMMENT ON TABLE workout_sets IS 'Individual sets within an exercise (weight, reps, calculated 1RM)';
COMMENT ON TABLE character_classes IS 'Reference table for 6 character classes (cosmetic in MVP)';
COMMENT ON TABLE skills IS 'Reference table for 6 skills (3 active in MVP, 3 inactive for Phase 2)';
COMMENT ON TABLE exercises IS 'Reference table for all exercises across all skills';
COMMENT ON TABLE total_strength_tiers IS 'Tier thresholds for Total Strength (Bench + Squat + Deadlift) based on bodyweight multipliers';

COMMENT ON COLUMN workout_sets.calculated_1rm IS 'Auto-calculated via trigger: weight * (1 + (reps / 30)), reps capped at 10';
COMMENT ON COLUMN characters.character_level IS 'Average of all skill levels (rounded down), auto-updated via trigger';
COMMENT ON COLUMN characters.total_strength_1rm IS 'Sum of Push/Pull/Legs 1RMs, auto-updated via trigger';
