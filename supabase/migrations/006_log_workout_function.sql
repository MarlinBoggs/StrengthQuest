-- StrengthQuest - Log Workout Function
-- Migration 006: Atomic workout logging with PR detection, XP, and tier calculation
-- Created: 2026-02-23

-- ============================================================================
-- FUNCTION: log_workout
-- ============================================================================
-- Atomically:
--   1. Inserts workout + exercises + sets
--   2. Detects PRs (primary exercise only)
--   3. Calculates and awards XP
--   4. Checks for level-up
--   5. Updates tier on PR
--
-- Parameters:
--   p_character_id: Character UUID
--   p_skill_id: Skill ID (1=Push, 2=Pull, 3=Legs)
--   p_workout_date: Date of workout
--   p_intensity: 1-10
--   p_length_minutes: 5-120
--   p_exercises: JSONB array of exercises with sets
--
-- Returns: JSONB with workout results
-- ============================================================================

CREATE OR REPLACE FUNCTION log_workout(
  p_character_id UUID,
  p_skill_id INTEGER,
  p_workout_date DATE,
  p_intensity INTEGER,
  p_length_minutes INTEGER,
  p_exercises JSONB
)
RETURNS JSONB AS $$
DECLARE
  -- XP thresholds for levels 1-10 (cumulative)
  v_xp_thresholds INTEGER[] := ARRAY[0, 100, 250, 500, 850, 1350, 2000, 2850, 3900, 5200];

  -- Workout variables
  v_workout_id UUID;
  v_base_xp INTEGER;
  v_pr_bonus_xp INTEGER := 0;
  v_total_xp INTEGER;

  -- Exercise/set loop variables
  v_exercise JSONB;
  v_set JSONB;
  v_exercise_id INTEGER;
  v_workout_exercise_id UUID;
  v_set_number INTEGER;
  v_exercise_order INTEGER := 0;
  v_top_set_id UUID;
  v_top_set_1rm DECIMAL(7,2);
  v_set_id UUID;
  v_set_1rm DECIMAL(7,2);

  -- PR detection variables
  v_primary_exercise_id INTEGER;
  v_primary_max_1rm DECIMAL(7,2);
  v_primary_max_weight DECIMAL(6,2);
  v_primary_max_reps INTEGER;
  v_old_pr DECIMAL(7,2);
  v_achieved_pr BOOLEAN := FALSE;
  v_pr_exercise_name TEXT;

  -- Tier variables
  v_old_tier VARCHAR(20);
  v_new_tier VARCHAR(20);
  v_tier_changed BOOLEAN := FALSE;
  v_multiplier DECIMAL(6,4);
  v_bodyweight DECIMAL(5,1);
  v_tier_thresholds JSONB;
  v_tier JSONB;

  -- Level variables
  v_old_level INTEGER;
  v_new_level INTEGER;
  v_old_xp INTEGER;
  v_new_total_xp INTEGER;
  v_achieved_level_up BOOLEAN := FALSE;
  v_i INTEGER;

BEGIN
  -- =========================================================================
  -- STEP 1: Calculate base XP
  -- =========================================================================
  v_base_xp := (p_intensity * 5) + (p_length_minutes / 5);

  -- =========================================================================
  -- STEP 2: Insert workout row
  -- =========================================================================
  INSERT INTO workouts (character_id, skill_id, workout_date, intensity, length_minutes,
                        base_xp, pr_bonus_xp, total_xp, achieved_pr, achieved_level_up)
  VALUES (p_character_id, p_skill_id, p_workout_date, p_intensity, p_length_minutes,
          v_base_xp, 0, v_base_xp, FALSE, FALSE)
  RETURNING id INTO v_workout_id;

  -- =========================================================================
  -- STEP 3: Find primary exercise for this skill
  -- =========================================================================
  SELECT id, name INTO v_primary_exercise_id, v_pr_exercise_name
  FROM exercises
  WHERE skill_id = p_skill_id AND is_primary = TRUE
  LIMIT 1;

  -- =========================================================================
  -- STEP 4: Loop through exercises and sets
  -- =========================================================================
  v_primary_max_1rm := NULL;

  FOR v_exercise IN SELECT * FROM jsonb_array_elements(p_exercises)
  LOOP
    v_exercise_order := v_exercise_order + 1;
    v_exercise_id := (v_exercise->>'exerciseId')::INTEGER;

    -- Insert workout_exercise
    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    VALUES (v_workout_id, v_exercise_id, v_exercise_order)
    RETURNING id INTO v_workout_exercise_id;

    -- Loop through sets for this exercise
    v_set_number := 0;
    v_top_set_id := NULL;
    v_top_set_1rm := NULL;

    FOR v_set IN SELECT * FROM jsonb_array_elements(v_exercise->'sets')
    LOOP
      v_set_number := v_set_number + 1;

      -- Insert workout_set (the calculate_1rm trigger fires automatically)
      INSERT INTO workout_sets (
        workout_exercise_id, set_number, weight_lbs, reps, rpe
      )
      VALUES (
        v_workout_exercise_id,
        v_set_number,
        (v_set->>'weight')::DECIMAL(6,2),
        (v_set->>'reps')::INTEGER,
        CASE WHEN v_set->>'rpe' IS NOT NULL AND v_set->>'rpe' != ''
             THEN (v_set->>'rpe')::DECIMAL(3,1)
             ELSE NULL
        END
      )
      RETURNING id, calculated_1rm INTO v_set_id, v_set_1rm;

      -- Track top set for this exercise
      IF v_top_set_1rm IS NULL OR v_set_1rm > v_top_set_1rm THEN
        v_top_set_id := v_set_id;
        v_top_set_1rm := v_set_1rm;
      END IF;

      -- Track primary exercise max for PR detection
      IF v_exercise_id = v_primary_exercise_id THEN
        IF v_primary_max_1rm IS NULL OR v_set_1rm > v_primary_max_1rm THEN
          v_primary_max_1rm := v_set_1rm;
          v_primary_max_weight := (v_set->>'weight')::DECIMAL(6,2);
          v_primary_max_reps := (v_set->>'reps')::INTEGER;
        END IF;
      END IF;
    END LOOP;

    -- Update top_set_id for this exercise
    IF v_top_set_id IS NOT NULL THEN
      UPDATE workout_exercises SET top_set_id = v_top_set_id
      WHERE id = v_workout_exercise_id;
    END IF;
  END LOOP;

  -- =========================================================================
  -- STEP 5: Get current user_skill data
  -- =========================================================================
  SELECT current_pr_calculated_1rm, current_tier, current_level, current_xp
  INTO v_old_pr, v_old_tier, v_old_level, v_old_xp
  FROM user_skills
  WHERE character_id = p_character_id AND skill_id = p_skill_id;

  -- =========================================================================
  -- STEP 6: PR Detection
  -- =========================================================================
  IF v_primary_max_1rm IS NOT NULL THEN
    IF v_old_pr IS NULL OR v_primary_max_1rm > v_old_pr THEN
      v_achieved_pr := TRUE;
      v_pr_bonus_xp := 50;

      -- Update user_skills with new PR
      UPDATE user_skills
      SET current_pr_weight = v_primary_max_weight,
          current_pr_reps = v_primary_max_reps,
          current_pr_calculated_1rm = v_primary_max_1rm,
          pr_achieved_at = NOW()
      WHERE character_id = p_character_id AND skill_id = p_skill_id;
      -- Note: update_total_strength trigger fires automatically
    END IF;
  END IF;

  -- =========================================================================
  -- STEP 7: Calculate total XP and update workout
  -- =========================================================================
  v_total_xp := v_base_xp + v_pr_bonus_xp;

  -- =========================================================================
  -- STEP 8: Add XP to user_skills and check level-up
  -- =========================================================================
  v_new_total_xp := v_old_xp + v_total_xp;

  -- Calculate new level from XP thresholds
  v_new_level := 1;
  FOR v_i IN REVERSE array_length(v_xp_thresholds, 1)..1
  LOOP
    IF v_new_total_xp >= v_xp_thresholds[v_i] THEN
      v_new_level := v_i;
      EXIT;
    END IF;
  END LOOP;

  IF v_new_level > v_old_level THEN
    v_achieved_level_up := TRUE;
  END IF;

  -- Update user_skills with new XP and level
  UPDATE user_skills
  SET current_xp = v_new_total_xp,
      current_level = v_new_level
  WHERE character_id = p_character_id AND skill_id = p_skill_id;
  -- Note: update_character_level trigger fires automatically

  -- =========================================================================
  -- STEP 9: Calculate tier (if PR was achieved)
  -- =========================================================================
  IF v_achieved_pr THEN
    -- Get bodyweight for multiplier calculation
    SELECT bodyweight_lbs INTO v_bodyweight
    FROM characters WHERE id = p_character_id;

    -- Get tier thresholds from skills table
    SELECT tier_thresholds INTO v_tier_thresholds
    FROM skills WHERE id = p_skill_id;

    -- Calculate multiplier
    v_multiplier := v_primary_max_1rm / v_bodyweight;

    -- Find matching tier
    v_new_tier := NULL;
    FOR v_tier IN SELECT * FROM jsonb_array_elements(v_tier_thresholds->'tiers')
    LOOP
      IF v_multiplier >= (v_tier->>'min_multiplier')::DECIMAL
         AND (v_tier->>'max_multiplier' IS NULL
              OR v_tier->>'max_multiplier' = 'null'
              OR v_multiplier < (v_tier->>'max_multiplier')::DECIMAL) THEN
        v_new_tier := v_tier->>'name';
      END IF;
    END LOOP;

    -- Update tier in user_skills
    IF v_new_tier IS NOT NULL THEN
      UPDATE user_skills
      SET current_tier = v_new_tier,
          tier_multiplier = v_multiplier
      WHERE character_id = p_character_id AND skill_id = p_skill_id;
    END IF;

    v_tier_changed := (v_old_tier IS DISTINCT FROM v_new_tier);
  ELSE
    v_new_tier := v_old_tier;
  END IF;

  -- =========================================================================
  -- STEP 10: Update workout record with final values
  -- =========================================================================
  UPDATE workouts
  SET pr_bonus_xp = v_pr_bonus_xp,
      total_xp = v_total_xp,
      achieved_pr = v_achieved_pr,
      achieved_level_up = v_achieved_level_up
  WHERE id = v_workout_id;

  -- =========================================================================
  -- STEP 11: Return results
  -- =========================================================================
  RETURN jsonb_build_object(
    'workout_id', v_workout_id,
    'base_xp', v_base_xp,
    'pr_bonus_xp', v_pr_bonus_xp,
    'total_xp', v_total_xp,
    'achieved_pr', v_achieved_pr,
    'old_pr', v_old_pr,
    'new_pr', v_primary_max_1rm,
    'pr_exercise_name', v_pr_exercise_name,
    'achieved_level_up', v_achieved_level_up,
    'old_level', v_old_level,
    'new_level', v_new_level,
    'old_tier', v_old_tier,
    'new_tier', v_new_tier,
    'tier_changed', v_tier_changed,
    'new_total_xp', v_new_total_xp
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION log_workout TO authenticated;

COMMENT ON FUNCTION log_workout IS 'Atomically logs a workout with exercises and sets, detects PRs, awards XP, checks level-up, and updates tier. Returns JSONB with all results.';
