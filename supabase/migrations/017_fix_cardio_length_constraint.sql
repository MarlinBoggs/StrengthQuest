-- StrengthQuest - Fix cardio workout length constraint
-- Migration 017: Allow short cardio sessions
-- Created: 2026-04-14
--
-- Problem: workouts.length_minutes had CHECK (length_minutes >= 5 AND <= 120),
-- which rejected:
--   - Cardio sessions shorter than 5 minutes (e.g. quick mobility)
--   - Cardio sessions longer than 120 minutes (long runs)
--   - The placeholder INSERT in log_cardio_workout (which used length_minutes=1)
--
-- Fix: Relax the constraint to 1..300 minutes. Both log_multi_skill_workout
-- and log_cardio_workout still validate their own narrower ranges in-RPC,
-- so this only loosens what the database accepts at the row level.

ALTER TABLE workouts DROP CONSTRAINT IF EXISTS workouts_length_minutes_check;
ALTER TABLE workouts ADD CONSTRAINT workouts_length_minutes_check
  CHECK (length_minutes >= 1 AND length_minutes <= 300);

-- Also pre-compute total duration in log_cardio_workout so we never insert a
-- placeholder. Recreate the function with a two-pass approach: STEP 1 sums the
-- exercises before the INSERT, STEP 2 inserts with the real value.

DROP FUNCTION IF EXISTS log_cardio_workout(UUID, DATE, JSONB);

CREATE OR REPLACE FUNCTION log_cardio_workout(
  p_character_id UUID,
  p_workout_date DATE,
  p_exercises JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_xp_thresholds INTEGER[] := ARRAY[0, 100, 250, 500, 850, 1350, 2000, 2850, 3900, 5200];

  -- Workout
  v_workout_id UUID;
  v_total_duration INTEGER := 0;
  v_total_xp INTEGER := 0;

  -- Exercise loop
  v_exercise JSONB;
  v_exercise_id INTEGER;
  v_exercise_skill_id INTEGER;
  v_exercise_skill_name TEXT;
  v_workout_exercise_id UUID;
  v_exercise_order INTEGER := 0;
  v_duration INTEGER;
  v_intensity TEXT;
  v_intensity_multiplier DECIMAL(4,2);

  -- Per-skill accumulation (keyed by skill_id text)
  v_skill_data JSONB := '{}'::JSONB;
  v_skill_key TEXT;
  v_skill_entry JSONB;

  -- Pass 2 variables
  v_skill_keys TEXT[];
  v_skill_id INTEGER;
  v_skill_name TEXT;
  v_scale_factor DECIMAL(5,2);
  v_skill_total_duration INTEGER;
  v_skill_xp INTEGER;
  v_tier_thresholds JSONB;

  -- Level/tier variables
  v_old_level INTEGER;
  v_new_level INTEGER;
  v_old_xp INTEGER;
  v_new_total_xp INTEGER;
  v_old_tier VARCHAR(20);
  v_new_tier VARCHAR(20);
  v_tier JSONB;
  v_achieved_level_up BOOLEAN;
  v_tier_changed BOOLEAN;
  v_i INTEGER;

  -- Results
  v_skill_results JSONB := '[]'::JSONB;
  v_skill_result JSONB;

BEGIN
  -- =========================================================================
  -- STEP 0: Security & input validation
  -- =========================================================================

  IF NOT EXISTS (
    SELECT 1 FROM characters
    WHERE id = p_character_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: character does not belong to current user';
  END IF;

  IF p_exercises IS NULL OR jsonb_array_length(p_exercises) = 0 THEN
    RAISE EXCEPTION 'At least one exercise is required';
  END IF;

  FOR v_exercise IN SELECT * FROM jsonb_array_elements(p_exercises)
  LOOP
    v_duration := (v_exercise->>'durationMinutes')::INTEGER;
    IF v_duration IS NULL OR v_duration < 1 OR v_duration > 300 THEN
      RAISE EXCEPTION 'durationMinutes must be between 1 and 300, got %', v_duration;
    END IF;

    v_intensity := v_exercise->>'intensity';
    IF v_intensity NOT IN ('low', 'med', 'high') THEN
      RAISE EXCEPTION 'intensity must be low, med, or high, got %', v_intensity;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM exercises e
      JOIN skills s ON e.skill_id = s.id
      WHERE e.id = (v_exercise->>'exerciseId')::INTEGER
        AND s.skill_type IN ('cardio', 'hiit', 'mobility')
    ) THEN
      RAISE EXCEPTION 'exerciseId % is not a valid cardio/hiit/mobility exercise',
        (v_exercise->>'exerciseId')::INTEGER;
    END IF;

    v_total_duration := v_total_duration + v_duration;
  END LOOP;

  -- Clamp to constraint range (defensive — validation above already keeps it >= 1)
  v_total_duration := GREATEST(LEAST(v_total_duration, 300), 1);

  -- =========================================================================
  -- STEP 1: Insert workout row with the real total duration up front
  -- =========================================================================
  INSERT INTO workouts (
    character_id, skill_id, workout_date,
    intensity, length_minutes, base_xp, pr_bonus_xp, total_xp,
    achieved_pr, achieved_level_up
  )
  VALUES (
    p_character_id, NULL, p_workout_date,
    5, v_total_duration, 0, 0, 0,
    FALSE, FALSE
  )
  RETURNING id INTO v_workout_id;

  -- =========================================================================
  -- STEP 2: PASS 1 - Insert workout_exercise rows, accumulate per-skill data
  -- =========================================================================
  FOR v_exercise IN SELECT * FROM jsonb_array_elements(p_exercises)
  LOOP
    v_exercise_order := v_exercise_order + 1;
    v_exercise_id    := (v_exercise->>'exerciseId')::INTEGER;
    v_duration       := (v_exercise->>'durationMinutes')::INTEGER;
    v_intensity      := v_exercise->>'intensity';

    v_intensity_multiplier := CASE v_intensity
      WHEN 'low'  THEN 0.75
      WHEN 'high' THEN 1.50
      ELSE             1.00
    END;

    SELECT e.skill_id, s.name
    INTO v_exercise_skill_id, v_exercise_skill_name
    FROM exercises e
    JOIN skills s ON e.skill_id = s.id
    WHERE e.id = v_exercise_id;

    INSERT INTO workout_exercises (
      workout_id, exercise_id, exercise_order,
      duration_minutes, intensity
    )
    VALUES (
      v_workout_id, v_exercise_id, v_exercise_order,
      v_duration, v_intensity
    )
    RETURNING id INTO v_workout_exercise_id;

    v_skill_key := v_exercise_skill_id::TEXT;
    IF NOT v_skill_data ? v_skill_key THEN
      v_skill_data := v_skill_data || jsonb_build_object(
        v_skill_key, jsonb_build_object(
          'skill_name',              v_exercise_skill_name,
          'total_duration',          0,
          'weighted_duration',       0.0
        )
      );
    END IF;

    v_skill_entry := v_skill_data->v_skill_key;
    v_skill_entry := jsonb_set(v_skill_entry, '{total_duration}',
      to_jsonb((v_skill_entry->>'total_duration')::INTEGER + v_duration));
    v_skill_entry := jsonb_set(v_skill_entry, '{weighted_duration}',
      to_jsonb((v_skill_entry->>'weighted_duration')::DECIMAL
               + (v_duration::DECIMAL * v_intensity_multiplier)));
    v_skill_data := jsonb_set(v_skill_data, ARRAY[v_skill_key], v_skill_entry);
  END LOOP;

  -- =========================================================================
  -- STEP 3: PASS 2 - Per skill: calculate XP, update level and tier
  -- =========================================================================
  SELECT array_agg(key) INTO v_skill_keys FROM jsonb_object_keys(v_skill_data) AS key;

  IF v_skill_keys IS NOT NULL THEN
    FOREACH v_skill_key IN ARRAY v_skill_keys
    LOOP
      v_skill_id    := v_skill_key::INTEGER;
      v_skill_entry := v_skill_data->v_skill_key;
      v_skill_name  := v_skill_entry->>'skill_name';
      v_skill_total_duration := (v_skill_entry->>'total_duration')::INTEGER;

      SELECT tier_thresholds INTO v_tier_thresholds
      FROM skills WHERE id = v_skill_id;

      v_scale_factor := (v_tier_thresholds->>'scale_factor')::DECIMAL;

      v_skill_xp := ROUND(
        (v_skill_entry->>'weighted_duration')::DECIMAL * v_scale_factor
      );

      SELECT current_xp, current_level, current_tier
      INTO v_old_xp, v_old_level, v_old_tier
      FROM user_skills
      WHERE character_id = p_character_id AND skill_id = v_skill_id;

      v_new_total_xp := v_old_xp + v_skill_xp;

      v_new_level := 1;
      FOR v_i IN REVERSE array_length(v_xp_thresholds, 1)..1
      LOOP
        IF v_new_total_xp >= v_xp_thresholds[v_i] THEN
          v_new_level := v_i;
          EXIT;
        END IF;
      END LOOP;

      v_achieved_level_up := v_new_level > v_old_level;

      v_new_tier := v_old_tier;
      FOR v_tier IN SELECT * FROM jsonb_array_elements(v_tier_thresholds->'tiers')
      LOOP
        IF v_new_total_xp >= (v_tier->>'min_xp')::INTEGER
           AND (v_tier->>'max_xp' IS NULL
                OR v_tier->>'max_xp' = 'null'
                OR v_new_total_xp < (v_tier->>'max_xp')::INTEGER) THEN
          v_new_tier := v_tier->>'name';
        END IF;
      END LOOP;

      v_tier_changed := (v_old_tier IS DISTINCT FROM v_new_tier);

      UPDATE user_skills
      SET current_xp    = v_new_total_xp,
          current_level = v_new_level,
          current_tier  = v_new_tier,
          last_workout_at = NOW()
      WHERE character_id = p_character_id AND skill_id = v_skill_id;

      v_total_xp := v_total_xp + v_skill_xp;

      v_skill_result := jsonb_build_object(
        'skill_id',         v_skill_id,
        'skill_name',       v_skill_name,
        'duration_minutes', v_skill_total_duration,
        'skill_xp',         v_skill_xp,
        'old_level',        v_old_level,
        'new_level',        v_new_level,
        'achieved_level_up',v_achieved_level_up,
        'old_tier',         v_old_tier,
        'new_tier',         v_new_tier,
        'tier_changed',     v_tier_changed,
        'new_total_xp',     v_new_total_xp
      );

      v_skill_results := v_skill_results || v_skill_result;
    END LOOP;
  END IF;

  -- =========================================================================
  -- STEP 4: Finalize workout XP totals
  -- =========================================================================
  UPDATE workouts
  SET total_xp        = v_total_xp,
      base_xp         = v_total_xp,
      achieved_level_up = EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_skill_results) r
        WHERE (r->>'achieved_level_up')::BOOLEAN = TRUE
      )
  WHERE id = v_workout_id;

  RETURN jsonb_build_object(
    'workout_id',    v_workout_id,
    'total_xp',      v_total_xp,
    'skill_results', v_skill_results
  );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION log_cardio_workout TO authenticated;

COMMENT ON FUNCTION log_cardio_workout IS
  'Logs a cardio/mobility workout. Pre-computes total duration before INSERT to satisfy
   workouts.length_minutes constraint. XP = duration × intensity_multiplier × scale_factor
   per skill. Updates user_skills XP, level, and XP-based tier. No PR detection.';
