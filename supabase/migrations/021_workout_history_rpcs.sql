-- StrengthQuest - Adventure Log: Workout History RPCs
-- Migration 021
--
-- Adds three read-only RPCs powering the "Adventure Log" feature:
--   1. get_last_exercise_performance — "Last time" prefill in log-workout
--   2. get_workout_history           — dashboard teaser + /history route
--   3. get_skill_trend               — per-skill sparkline in SkillDetailSheet
--
-- Also persists per-set/per-entry XP (previously computed client+server side
-- via lib/utils/calculate-xp.ts and summed into workouts.total_xp, but never
-- stored on the individual row) so get_skill_trend can read historical XP
-- for cardio/hiit/mobility skills without recomputing the formula in SQL —
-- migration 018 deliberately moved away from a SQL-side formula, and this
-- keeps that: the RPCs already receive xpAwarded per set/entry, this just
-- stores what they're already given.

-- ============================================================================
-- 1. Persist per-set / per-entry XP (nullable — historical rows stay NULL)
-- ============================================================================
ALTER TABLE workout_sets ADD COLUMN IF NOT EXISTS xp_awarded INTEGER;
ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS xp_awarded INTEGER;

COMMENT ON COLUMN workout_sets.xp_awarded IS
  'XP awarded for this set, as computed by lib/utils/calculate-xp.ts and passed
   in by the server action. Populated for sets logged via log_multi_skill_workout
   (strength + rep-based mobility). NULL on rows logged before migration 021.';
COMMENT ON COLUMN workout_exercises.xp_awarded IS
  'XP awarded for this duration-tracked entry, as computed by
   lib/utils/calculate-xp.ts. Populated for entries logged via
   log_cardio_workout. NULL for strength/rep-based exercises (XP lives on
   workout_sets.xp_awarded instead) and for rows logged before migration 021.';

-- ============================================================================
-- 2. Recreate log_multi_skill_workout — persist xp_awarded on workout_sets
-- ============================================================================
CREATE OR REPLACE FUNCTION log_multi_skill_workout(
  p_character_id UUID,
  p_workout_date DATE,
  p_exercises JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_xp_thresholds INTEGER[] := ARRAY[0, 100, 250, 500, 850, 1350, 2000, 2850, 3900, 5200];

  v_workout_id UUID;
  v_base_xp INTEGER := 0;
  v_total_xp INTEGER := 0;

  v_exercise JSONB;
  v_set JSONB;
  v_exercise_id INTEGER;
  v_exercise_skill_id INTEGER;
  v_exercise_skill_name TEXT;
  v_workout_exercise_id UUID;
  v_set_number INTEGER;
  v_exercise_order INTEGER := 0;
  v_top_set_id UUID;
  v_top_set_1rm DECIMAL(7,2);
  v_set_id UUID;
  v_set_1rm DECIMAL(7,2);
  v_set_xp INTEGER;

  v_skill_data JSONB := '{}'::JSONB;
  v_skill_entry JSONB;
  v_primary_exercise_id INTEGER;
  v_primary_exercise_name TEXT;

  v_skill_key TEXT;
  v_skill_id INTEGER;
  v_skill_type TEXT;
  v_skill_name TEXT;
  v_skill_set_count INTEGER;
  v_skill_base_xp INTEGER;
  v_skill_pr_bonus INTEGER;
  v_skill_xp INTEGER;

  v_primary_max_1rm DECIMAL(7,2);
  v_primary_max_weight DECIMAL(6,2);
  v_primary_max_reps INTEGER;
  v_old_pr DECIMAL(7,2);
  v_achieved_pr BOOLEAN;
  v_pr_exercise_name TEXT;

  v_old_tier VARCHAR(20);
  v_new_tier VARCHAR(20);
  v_tier_changed BOOLEAN;
  v_multiplier DECIMAL(6,4);
  v_bodyweight DECIMAL(5,1);
  v_tier_thresholds JSONB;
  v_tier JSONB;

  v_old_level INTEGER;
  v_new_level INTEGER;
  v_old_xp INTEGER;
  v_new_total_xp INTEGER;
  v_achieved_level_up BOOLEAN;
  v_i INTEGER;

  v_skill_results JSONB := '[]'::JSONB;
  v_skill_result JSONB;
  v_skill_keys TEXT[];

BEGIN
  -- =========================================================================
  -- STEP 0: Security — verify character belongs to the calling user
  -- =========================================================================
  IF NOT EXISTS (
    SELECT 1 FROM characters
    WHERE id = p_character_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: character does not belong to current user';
  END IF;

  -- =========================================================================
  -- STEP 1: Insert workout row (intensity/length intentionally NULL)
  -- =========================================================================
  INSERT INTO workouts (character_id, skill_id, workout_date, intensity, length_minutes,
                        base_xp, pr_bonus_xp, total_xp, achieved_pr, achieved_level_up)
  VALUES (p_character_id, NULL, p_workout_date, NULL, NULL,
          0, 0, 0, FALSE, FALSE)
  RETURNING id INTO v_workout_id;

  -- =========================================================================
  -- STEP 2: PASS 1 — insert exercises/sets, accumulate per-skill XP + PR data
  -- =========================================================================
  FOR v_exercise IN SELECT * FROM jsonb_array_elements(p_exercises)
  LOOP
    v_exercise_order := v_exercise_order + 1;
    v_exercise_id := (v_exercise->>'exerciseId')::INTEGER;

    SELECT e.skill_id, s.name
    INTO v_exercise_skill_id, v_exercise_skill_name
    FROM exercises e
    JOIN skills s ON e.skill_id = s.id
    WHERE e.id = v_exercise_id;

    v_skill_key := v_exercise_skill_id::TEXT;
    IF NOT v_skill_data ? v_skill_key THEN
      SELECT id, name INTO v_primary_exercise_id, v_primary_exercise_name
      FROM exercises
      WHERE skill_id = v_exercise_skill_id AND is_primary = TRUE
      LIMIT 1;

      v_skill_data := v_skill_data || jsonb_build_object(
        v_skill_key, jsonb_build_object(
          'skill_name', v_exercise_skill_name,
          'set_count', 0,
          'base_xp', 0,
          'primary_exercise_id', v_primary_exercise_id,
          'primary_name', v_primary_exercise_name,
          'primary_max_1rm', NULL,
          'primary_max_weight', NULL,
          'primary_max_reps', NULL
        )
      );
    END IF;

    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
    VALUES (v_workout_id, v_exercise_id, v_exercise_order)
    RETURNING id INTO v_workout_exercise_id;

    v_set_number := 0;
    v_top_set_id := NULL;
    v_top_set_1rm := NULL;

    FOR v_set IN SELECT * FROM jsonb_array_elements(v_exercise->'sets')
    LOOP
      v_set_number := v_set_number + 1;
      v_set_xp := COALESCE((v_set->>'xpAwarded')::INTEGER, 0);

      INSERT INTO workout_sets (
        workout_exercise_id, set_number, weight_lbs, reps, rpe, xp_awarded
      )
      VALUES (
        v_workout_exercise_id,
        v_set_number,
        (v_set->>'weight')::DECIMAL(6,2),
        (v_set->>'reps')::INTEGER,
        CASE WHEN v_set->>'rpe' IS NOT NULL AND v_set->>'rpe' != ''
             THEN (v_set->>'rpe')::DECIMAL(3,1)
             ELSE NULL
        END,
        v_set_xp
      )
      RETURNING id, calculated_1rm INTO v_set_id, v_set_1rm;

      IF v_top_set_1rm IS NULL OR v_set_1rm > v_top_set_1rm THEN
        v_top_set_id := v_set_id;
        v_top_set_1rm := v_set_1rm;
      END IF;

      v_skill_entry := v_skill_data->v_skill_key;
      v_skill_entry := jsonb_set(v_skill_entry, '{set_count}',
        to_jsonb((v_skill_entry->>'set_count')::INTEGER + 1));
      v_skill_entry := jsonb_set(v_skill_entry, '{base_xp}',
        to_jsonb((v_skill_entry->>'base_xp')::INTEGER + v_set_xp));

      IF v_exercise_id = (v_skill_entry->>'primary_exercise_id')::INTEGER THEN
        IF v_skill_entry->>'primary_max_1rm' IS NULL
           OR v_skill_entry->'primary_max_1rm' = 'null'::JSONB
           OR v_set_1rm > (v_skill_entry->>'primary_max_1rm')::DECIMAL THEN
          v_skill_entry := jsonb_set(v_skill_entry, '{primary_max_1rm}', to_jsonb(v_set_1rm));
          v_skill_entry := jsonb_set(v_skill_entry, '{primary_max_weight}', to_jsonb((v_set->>'weight')::DECIMAL(6,2)));
          v_skill_entry := jsonb_set(v_skill_entry, '{primary_max_reps}', to_jsonb((v_set->>'reps')::INTEGER));
        END IF;
      END IF;

      v_skill_data := jsonb_set(v_skill_data, ARRAY[v_skill_key], v_skill_entry);
      v_base_xp := v_base_xp + v_set_xp;
    END LOOP;

    IF v_top_set_id IS NOT NULL THEN
      UPDATE workout_exercises SET top_set_id = v_top_set_id
      WHERE id = v_workout_exercise_id;
    END IF;
  END LOOP;

  -- =========================================================================
  -- STEP 3: Bodyweight (for tier multiplier)
  -- =========================================================================
  SELECT bodyweight_lbs INTO v_bodyweight
  FROM characters WHERE id = p_character_id;

  -- =========================================================================
  -- STEP 4: PASS 2 — per skill: apply PR bonuses, update level/tier
  -- =========================================================================
  SELECT array_agg(key) INTO v_skill_keys FROM jsonb_object_keys(v_skill_data) AS key;

  IF v_skill_keys IS NOT NULL THEN
    FOREACH v_skill_key IN ARRAY v_skill_keys
    LOOP
      v_skill_id := v_skill_key::INTEGER;
      v_skill_entry := v_skill_data->v_skill_key;
      v_skill_name := v_skill_entry->>'skill_name';
      v_skill_set_count := (v_skill_entry->>'set_count')::INTEGER;
      v_skill_base_xp := (v_skill_entry->>'base_xp')::INTEGER;

      SELECT skill_type INTO v_skill_type FROM skills WHERE id = v_skill_id;

      v_skill_pr_bonus := 0;
      v_achieved_pr := FALSE;
      v_pr_exercise_name := v_skill_entry->>'primary_name';
      v_tier_changed := FALSE;

      SELECT current_pr_calculated_1rm, current_tier, current_level, current_xp
      INTO v_old_pr, v_old_tier, v_old_level, v_old_xp
      FROM user_skills
      WHERE character_id = p_character_id AND skill_id = v_skill_id;

      IF v_skill_entry->>'primary_max_1rm' IS NOT NULL
         AND v_skill_entry->'primary_max_1rm' != 'null'::JSONB THEN
        v_primary_max_1rm := (v_skill_entry->>'primary_max_1rm')::DECIMAL(7,2);
        v_primary_max_weight := (v_skill_entry->>'primary_max_weight')::DECIMAL(6,2);
        v_primary_max_reps := (v_skill_entry->>'primary_max_reps')::INTEGER;

        IF v_old_pr IS NULL OR v_primary_max_1rm > v_old_pr THEN
          v_achieved_pr := TRUE;
          v_skill_pr_bonus := 50;

          UPDATE user_skills
          SET current_pr_weight = v_primary_max_weight,
              current_pr_reps = v_primary_max_reps,
              current_pr_calculated_1rm = v_primary_max_1rm,
              pr_achieved_at = NOW()
          WHERE character_id = p_character_id AND skill_id = v_skill_id;
        END IF;
      END IF;

      v_skill_xp := v_skill_base_xp + v_skill_pr_bonus;
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

      UPDATE user_skills
      SET current_xp = v_new_total_xp,
          current_level = v_new_level,
          last_workout_at = NOW()
      WHERE character_id = p_character_id AND skill_id = v_skill_id;

      v_new_tier := v_old_tier;

      -- Strength skills: multiplier-gated tier, re-evaluated only on PR
      IF v_skill_type = 'strength' AND v_achieved_pr THEN
        SELECT tier_thresholds INTO v_tier_thresholds
        FROM skills WHERE id = v_skill_id;

        v_multiplier := v_primary_max_1rm / v_bodyweight;

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

        IF v_new_tier IS NOT NULL THEN
          UPDATE user_skills
          SET current_tier = v_new_tier,
              tier_multiplier = v_multiplier
          WHERE character_id = p_character_id AND skill_id = v_skill_id;
        END IF;
      END IF;

      -- Cardio/hiit/mobility skills: XP-milestone tier, re-evaluated every workout
      IF v_skill_type IN ('cardio', 'hiit', 'mobility') THEN
        SELECT tier_thresholds INTO v_tier_thresholds
        FROM skills WHERE id = v_skill_id;

        FOR v_tier IN SELECT * FROM jsonb_array_elements(v_tier_thresholds->'tiers')
        LOOP
          IF v_new_total_xp >= (v_tier->>'min_xp')::INTEGER
             AND (v_tier->>'max_xp' IS NULL
                  OR v_tier->>'max_xp' = 'null'
                  OR v_new_total_xp < (v_tier->>'max_xp')::INTEGER) THEN
            v_new_tier := v_tier->>'name';
          END IF;
        END LOOP;

        IF v_new_tier IS DISTINCT FROM v_old_tier THEN
          UPDATE user_skills
          SET current_tier = v_new_tier
          WHERE character_id = p_character_id AND skill_id = v_skill_id;
        END IF;
      END IF;

      v_tier_changed := (v_old_tier IS DISTINCT FROM v_new_tier);

      v_total_xp := v_total_xp + v_skill_xp;

      v_skill_result := jsonb_build_object(
        'skill_id', v_skill_id,
        'skill_name', v_skill_name,
        'set_count', v_skill_set_count,
        'base_xp', v_skill_base_xp,
        'pr_bonus_xp', v_skill_pr_bonus,
        'skill_xp', v_skill_xp,
        'achieved_pr', v_achieved_pr,
        'old_pr', v_old_pr,
        'new_pr', CASE WHEN v_achieved_pr THEN v_primary_max_1rm ELSE NULL END,
        'pr_exercise_name', v_pr_exercise_name,
        'old_tier', v_old_tier,
        'new_tier', v_new_tier,
        'tier_changed', v_tier_changed,
        'old_level', v_old_level,
        'new_level', v_new_level,
        'achieved_level_up', v_achieved_level_up,
        'new_total_xp', v_new_total_xp
      );

      v_skill_results := v_skill_results || v_skill_result;
    END LOOP;
  END IF;

  -- =========================================================================
  -- STEP 5: Finalize workout XP totals
  -- =========================================================================
  UPDATE workouts
  SET total_xp = v_total_xp,
      base_xp = v_base_xp,
      pr_bonus_xp = v_total_xp - v_base_xp,
      achieved_pr = EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_skill_results) r
        WHERE (r->>'achieved_pr')::BOOLEAN = TRUE
      ),
      achieved_level_up = EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_skill_results) r
        WHERE (r->>'achieved_level_up')::BOOLEAN = TRUE
      )
  WHERE id = v_workout_id;

  RETURN jsonb_build_object(
    'workout_id', v_workout_id,
    'base_xp', v_base_xp,
    'total_xp', v_total_xp,
    'skill_results', v_skill_results
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. Recreate log_cardio_workout — persist xp_awarded on workout_exercises
-- ============================================================================
CREATE OR REPLACE FUNCTION log_cardio_workout(
  p_character_id UUID,
  p_workout_date DATE,
  p_exercises JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_xp_thresholds INTEGER[] := ARRAY[0, 100, 250, 500, 850, 1350, 2000, 2850, 3900, 5200];

  v_workout_id UUID;
  v_total_xp INTEGER := 0;

  v_exercise JSONB;
  v_exercise_id INTEGER;
  v_exercise_skill_id INTEGER;
  v_exercise_skill_name TEXT;
  v_workout_exercise_id UUID;
  v_exercise_order INTEGER := 0;
  v_duration INTEGER;
  v_intensity TEXT;
  v_entry_xp INTEGER;

  v_skill_data JSONB := '{}'::JSONB;
  v_skill_key TEXT;
  v_skill_entry JSONB;

  v_skill_keys TEXT[];
  v_skill_id INTEGER;
  v_skill_name TEXT;
  v_skill_total_duration INTEGER;
  v_skill_xp INTEGER;
  v_tier_thresholds JSONB;

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

  v_skill_results JSONB := '[]'::JSONB;
  v_skill_result JSONB;

BEGIN
  -- =========================================================================
  -- STEP 0: Security + input validation
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
  END LOOP;

  -- =========================================================================
  -- STEP 1: Insert workout row (intensity/length intentionally NULL)
  -- =========================================================================
  INSERT INTO workouts (
    character_id, skill_id, workout_date,
    intensity, length_minutes, base_xp, pr_bonus_xp, total_xp,
    achieved_pr, achieved_level_up
  )
  VALUES (
    p_character_id, NULL, p_workout_date,
    NULL, NULL, 0, 0, 0,
    FALSE, FALSE
  )
  RETURNING id INTO v_workout_id;

  -- =========================================================================
  -- STEP 2: PASS 1 — insert workout_exercise rows, accumulate per skill
  -- =========================================================================
  FOR v_exercise IN SELECT * FROM jsonb_array_elements(p_exercises)
  LOOP
    v_exercise_order := v_exercise_order + 1;
    v_exercise_id    := (v_exercise->>'exerciseId')::INTEGER;
    v_duration       := (v_exercise->>'durationMinutes')::INTEGER;
    v_intensity      := v_exercise->>'intensity';
    v_entry_xp       := COALESCE((v_exercise->>'xpAwarded')::INTEGER, 0);

    SELECT e.skill_id, s.name
    INTO v_exercise_skill_id, v_exercise_skill_name
    FROM exercises e
    JOIN skills s ON e.skill_id = s.id
    WHERE e.id = v_exercise_id;

    INSERT INTO workout_exercises (
      workout_id, exercise_id, exercise_order,
      duration_minutes, intensity, xp_awarded
    )
    VALUES (
      v_workout_id, v_exercise_id, v_exercise_order,
      v_duration, v_intensity, v_entry_xp
    )
    RETURNING id INTO v_workout_exercise_id;

    v_skill_key := v_exercise_skill_id::TEXT;
    IF NOT v_skill_data ? v_skill_key THEN
      v_skill_data := v_skill_data || jsonb_build_object(
        v_skill_key, jsonb_build_object(
          'skill_name',     v_exercise_skill_name,
          'total_duration', 0,
          'skill_xp',       0
        )
      );
    END IF;

    v_skill_entry := v_skill_data->v_skill_key;
    v_skill_entry := jsonb_set(v_skill_entry, '{total_duration}',
      to_jsonb((v_skill_entry->>'total_duration')::INTEGER + v_duration));
    v_skill_entry := jsonb_set(v_skill_entry, '{skill_xp}',
      to_jsonb((v_skill_entry->>'skill_xp')::INTEGER + v_entry_xp));
    v_skill_data := jsonb_set(v_skill_data, ARRAY[v_skill_key], v_skill_entry);
  END LOOP;

  -- =========================================================================
  -- STEP 3: PASS 2 — per skill: apply level/tier updates
  -- =========================================================================
  SELECT array_agg(key) INTO v_skill_keys FROM jsonb_object_keys(v_skill_data) AS key;

  IF v_skill_keys IS NOT NULL THEN
    FOREACH v_skill_key IN ARRAY v_skill_keys
    LOOP
      v_skill_id    := v_skill_key::INTEGER;
      v_skill_entry := v_skill_data->v_skill_key;
      v_skill_name  := v_skill_entry->>'skill_name';
      v_skill_total_duration := (v_skill_entry->>'total_duration')::INTEGER;
      v_skill_xp    := (v_skill_entry->>'skill_xp')::INTEGER;

      SELECT tier_thresholds INTO v_tier_thresholds
      FROM skills WHERE id = v_skill_id;

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
  SET total_xp = v_total_xp,
      base_xp  = v_total_xp,
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

-- ============================================================================
-- 4. get_last_exercise_performance — bulk "Last time" data for log-workout
--
-- One row per exercise the character has ever logged, from their most recent
-- workout_exercise for that exercise. Branches on exercises.tracks_duration
-- (not skill_type) per the migration 019 convention, so mobility exercises
-- that use reps/weight (Back Extension, Step Downs, etc.) correctly return
-- `sets`, not duration/intensity.
-- ============================================================================
CREATE OR REPLACE FUNCTION get_last_exercise_performance(p_character_id UUID)
RETURNS TABLE (
  exercise_id INTEGER,
  workout_date DATE,
  duration_minutes INTEGER,
  intensity VARCHAR(10),
  sets JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM characters
    WHERE id = p_character_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: character does not belong to current user';
  END IF;

  RETURN QUERY
  SELECT DISTINCT ON (wex.exercise_id)
    wex.exercise_id,
    w.workout_date,
    wex.duration_minutes,
    wex.intensity,
    CASE WHEN e.tracks_duration THEN NULL ELSE (
      SELECT jsonb_agg(
        jsonb_build_object('weight', ws.weight_lbs, 'reps', ws.reps, 'rpe', ws.rpe)
        ORDER BY ws.set_number
      )
      FROM workout_sets ws
      WHERE ws.workout_exercise_id = wex.id
    ) END AS sets
  FROM workout_exercises wex
  JOIN workouts w ON wex.workout_id = w.id
  JOIN exercises e ON wex.exercise_id = e.id
  WHERE w.character_id = p_character_id
  ORDER BY wex.exercise_id, w.workout_date DESC, wex.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_last_exercise_performance(UUID) TO authenticated;

-- ============================================================================
-- 5. get_workout_history — nested session list for dashboard teaser + /history
--
-- Fully nested (exercises + sets assembled server-side) so a session's detail
-- sheet renders instantly off already-fetched data, same as SkillDetailSheet /
-- EquipmentDetailSheet work off preloaded props rather than fetching on open.
-- ============================================================================
CREATE OR REPLACE FUNCTION get_workout_history(p_character_id UUID, p_limit INT DEFAULT 50)
RETURNS TABLE (
  workout_id UUID,
  workout_date DATE,
  total_xp INTEGER,
  achieved_pr BOOLEAN,
  achieved_level_up BOOLEAN,
  skills JSONB,
  exercises JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM characters
    WHERE id = p_character_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: character does not belong to current user';
  END IF;

  RETURN QUERY
  SELECT
    w.id,
    w.workout_date,
    w.total_xp,
    w.achieved_pr,
    w.achieved_level_up,
    (
      SELECT jsonb_agg(sk ORDER BY (sk->>'skill_id')::INT)
      FROM (
        SELECT DISTINCT jsonb_build_object(
          'skill_id', s.id, 'name', s.name, 'color_hex', s.color_hex
        ) AS sk
        FROM workout_exercises wex2
        JOIN exercises e2 ON wex2.exercise_id = e2.id
        JOIN skills s ON e2.skill_id = s.id
        WHERE wex2.workout_id = w.id
      ) sub
    ) AS skills,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'exercise_id', e3.id,
          'exercise_name', e3.name,
          'skill_id', e3.skill_id,
          'tracks_duration', e3.tracks_duration,
          'duration_minutes', wex3.duration_minutes,
          'intensity', wex3.intensity,
          'sets', (
            SELECT jsonb_agg(
              jsonb_build_object(
                'set_number', ws.set_number, 'weight', ws.weight_lbs,
                'reps', ws.reps, 'rpe', ws.rpe, 'calculated_1rm', ws.calculated_1rm
              )
              ORDER BY ws.set_number
            )
            FROM workout_sets ws WHERE ws.workout_exercise_id = wex3.id
          )
        )
        ORDER BY wex3.exercise_order
      )
      FROM workout_exercises wex3
      JOIN exercises e3 ON wex3.exercise_id = e3.id
      WHERE wex3.workout_id = w.id
    ) AS exercises
  FROM workouts w
  WHERE w.character_id = p_character_id
  ORDER BY w.workout_date DESC, w.created_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_workout_history(UUID, INT) TO authenticated;

-- ============================================================================
-- 6. get_skill_trend — per-skill sparkline data
--
-- Strength skills: est. 1RM (top_set_id -> calculated_1rm) per workout that
-- included the skill's primary exercise — sessions with only accessory work
-- for that skill contribute no point, matching how Hero Lift/PR already only
-- track the primary lift.
--
-- Cardio/hiit/mobility skills: total XP earned for that skill per workout,
-- summed across BOTH possible storage locations (duration-tracked entries on
-- workout_exercises.xp_awarded, rep-tracked entries on workout_sets.xp_awarded)
-- since a single mobility skill can mix both styles (migration 019). A mixed
-- session naturally contributes one point per skill it touched — no special
-- handling needed since the WHERE clause filters to one skill_id per call.
-- ============================================================================
CREATE OR REPLACE FUNCTION get_skill_trend(p_character_id UUID, p_skill_id INT, p_limit INT DEFAULT 10)
RETURNS TABLE (workout_date DATE, value NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_skill_type TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM characters
    WHERE id = p_character_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: character does not belong to current user';
  END IF;

  SELECT skill_type INTO v_skill_type FROM skills WHERE id = p_skill_id;

  IF v_skill_type = 'strength' THEN
    RETURN QUERY
    SELECT w.workout_date, ws.calculated_1rm
    FROM workout_exercises wex
    JOIN workouts w ON wex.workout_id = w.id
    JOIN exercises e ON wex.exercise_id = e.id
    JOIN workout_sets ws ON ws.id = wex.top_set_id
    WHERE w.character_id = p_character_id
      AND e.skill_id = p_skill_id
      AND e.is_primary = TRUE
    ORDER BY w.workout_date DESC
    LIMIT p_limit;
  ELSE
    RETURN QUERY
    SELECT w.workout_date,
      SUM(
        COALESCE(wex.xp_awarded, 0) +
        COALESCE((SELECT SUM(ws.xp_awarded) FROM workout_sets ws WHERE ws.workout_exercise_id = wex.id), 0)
      )::NUMERIC AS value
    FROM workout_exercises wex
    JOIN workouts w ON wex.workout_id = w.id
    JOIN exercises e ON wex.exercise_id = e.id
    WHERE w.character_id = p_character_id
      AND e.skill_id = p_skill_id
    GROUP BY w.workout_date, w.id
    ORDER BY w.workout_date DESC
    LIMIT p_limit;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION get_skill_trend(UUID, INT, INT) TO authenticated;
