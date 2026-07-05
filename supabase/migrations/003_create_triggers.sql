-- StrengthQuest - Database Triggers
-- Migration 003: Create triggers for auto-calculations
-- Created: 2026-02-20

-- ============================================================================
-- TRIGGER 1: Auto-Calculate 1RM on Set Insert/Update
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_1rm()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate if weight and reps are provided
  IF NEW.weight_lbs IS NOT NULL AND NEW.reps IS NOT NULL THEN
    -- Formula: 1RM = Weight × (1 + (Reps / 30))
    -- Cap reps at 10 for calculation (high-rep sets test endurance, not max strength)
    NEW.calculated_1rm = NEW.weight_lbs * (1 + (LEAST(NEW.reps, 10)::DECIMAL / 30));
  ELSE
    NEW.calculated_1rm = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to workout_sets table
CREATE TRIGGER trigger_calculate_1rm
  BEFORE INSERT OR UPDATE OF weight_lbs, reps ON workout_sets
  FOR EACH ROW
  EXECUTE FUNCTION calculate_1rm();

COMMENT ON FUNCTION calculate_1rm() IS 'Auto-calculates estimated 1RM using Epley formula: Weight × (1 + (Reps/30)). Reps are capped at 10 for realistic strength estimation.';

-- ============================================================================
-- TRIGGER 2: Update Character Level When Skills Change
-- ============================================================================

CREATE OR REPLACE FUNCTION update_character_level()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate character level = average of all ACTIVE skill levels (rounded down)
  UPDATE characters
  SET character_level = (
    SELECT FLOOR(AVG(us.current_level))
    FROM user_skills us
    JOIN skills s ON us.skill_id = s.id
    WHERE us.character_id = NEW.character_id
      AND s.is_active = TRUE  -- Only count active skills (Push/Pull/Legs in MVP)
  )
  WHERE id = NEW.character_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to user_skills table
CREATE TRIGGER trigger_update_character_level
  AFTER INSERT OR UPDATE OF current_level ON user_skills
  FOR EACH ROW
  EXECUTE FUNCTION update_character_level();

COMMENT ON FUNCTION update_character_level() IS 'Recalculates character level as the average of all active skill levels (rounded down). In MVP, only counts Push/Pull/Legs. In Phase 2, will include all 6 skills.';

-- ============================================================================
-- TRIGGER 3: Update Total Strength When PRs Change
-- ============================================================================

CREATE OR REPLACE FUNCTION update_total_strength()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate Total Strength = sum of Push/Pull/Legs 1RMs
  UPDATE characters
  SET total_strength_1rm = (
    SELECT COALESCE(SUM(current_pr_calculated_1rm), 0)
    FROM user_skills
    WHERE character_id = NEW.character_id
      AND skill_id IN (1, 2, 3)  -- Push (1), Pull (2), Legs (3)
  )
  WHERE id = NEW.character_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to user_skills table
CREATE TRIGGER trigger_update_total_strength
  AFTER INSERT OR UPDATE OF current_pr_calculated_1rm ON user_skills
  FOR EACH ROW
  EXECUTE FUNCTION update_total_strength();

COMMENT ON FUNCTION update_total_strength() IS 'Recalculates Total Strength as the sum of Bench/Deadlift/Squat 1RMs (Push/Pull/Legs primary exercises). Used for Total Strength tier calculation.';

-- ============================================================================
-- TRIGGER 4: Update Last Workout Timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_last_workout_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- Update last_workout_at in user_skills when a workout is logged
  UPDATE user_skills
  SET last_workout_at = NEW.created_at
  WHERE character_id = NEW.character_id
    AND skill_id = NEW.skill_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to workouts table
CREATE TRIGGER trigger_update_last_workout_timestamp
  AFTER INSERT ON workouts
  FOR EACH ROW
  EXECUTE FUNCTION update_last_workout_timestamp();

COMMENT ON FUNCTION update_last_workout_timestamp() IS 'Updates the last_workout_at timestamp in user_skills when a new workout is logged for that skill.';

-- ============================================================================
-- VERIFICATION QUERIES (optional - comment out after verification)
-- ============================================================================

-- Test 1RM calculation manually:
-- INSERT INTO workout_sets (workout_exercise_id, set_number, weight_lbs, reps) VALUES
--   ('test-uuid', 1, 225, 5);
-- Expected calculated_1rm: 225 * (1 + (5/30)) = 225 * 1.167 = 262.5

-- Test rep capping at 10:
-- INSERT INTO workout_sets (workout_exercise_id, set_number, weight_lbs, reps) VALUES
--   ('test-uuid', 2, 135, 20);
-- Expected calculated_1rm: 135 * (1 + (10/30)) = 135 * 1.333 = 180 (reps capped at 10)

-- Verify triggers exist:
-- SELECT trigger_name, event_manipulation, event_object_table
-- FROM information_schema.triggers
-- WHERE trigger_schema = 'public'
-- ORDER BY event_object_table, trigger_name;
