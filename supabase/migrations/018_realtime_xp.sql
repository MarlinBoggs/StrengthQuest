-- StrengthQuest - Real-Time XP Infrastructure
-- Migration 018: Per-set XP summation + drop intensity/length from XP math
-- Created: 2026-04-18
--
-- Shifts XP from proportional distribution of `(intensity * 5) + (length/5)` to
-- a straight sum of per-set XP values calculated in the TypeScript server
-- action (via lib/utils/calculate-xp.ts). Intensity and length are removed
-- from both the API and the XP formula — they were proxies for effort, and
-- per-set difficulty IS the effort signal now. The columns stay on the
-- `workouts` table for historical data but become nullable.
--
-- Changes:
--   1. Relax `workouts.intensity` and `workouts.length_minutes` to nullable.
--   2. Recreate `log_multi_skill_workout` to accept xpAwarded per set and
--      sum it instead of distributing a bulk base XP.
--   3. Recreate `log_cardio_workout` to accept xpAwarded per entry and sum
--      it instead of re-computing duration × multiplier × scale_factor.
--
-- Out of scope (see Backlog.md):
--   - The difficulty-based XP formula itself. The placeholder bodies in
--     `calculate-xp.ts` are unchanged by this migration.
--   - Critical hits.
--   - The real-PR bonus regression introduced by migration 016 — this RPC
--     keeps estimated-1RM PR detection as-is.

-- ============================================================================
-- 1. Relax workouts.intensity and workouts.length_minutes to nullable
-- ============================================================================
ALTER TABLE workouts ALTER COLUMN intensity DROP NOT NULL;
ALTER TABLE workouts ALTER COLUMN length_minutes DROP NOT NULL;

-- Existing CHECK constraints pass on NULL (PostgreSQL's default CHECK
-- semantics), so no constraint changes are needed.

-- ============================================================================
-- 2. Recreate log_multi_skill_workout — per-set XP summation
-- ============================================================================
DROP FUNCTION IF EXISTS log_multi_skill_workout(UUID, DATE, INTEGER, INTEGER, JSONB);
DROP FUNCTION IF EXISTS log_multi_skill_workout(UUID, DATE, JSONB);

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

      IF v_top_set_1rm IS NULL OR v_set_1rm > v_top_set_1rm THEN
        v_top_set_id := v_set_id;
        v_top_set_1rm := v_set_1rm;
      END IF;

      v_set_xp := COALESCE((v_set->>'xpAwarded')::INTEGER, 0);

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
      IF v_achieved_pr THEN
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

        v_tier_changed := (v_old_tier IS DISTINCT FROM v_new_tier);
      END IF;

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

GRANT EXECUTE ON FUNCTION log_multi_skill_workout(UUID, DATE, JSONB) TO authenticated;

COMMENT ON FUNCTION log_multi_skill_workout(UUID, DATE, JSONB) IS
  'Logs a strength workout. Each set in p_exercises carries its own xpAwarded
   (pre-computed server-side from lib/utils/calculate-xp.ts). Workout base XP
   is the sum of per-set XP; +50 PR bonus still applies per skill whose
   primary-exercise 1RM beat its prior best.';

-- ============================================================================
-- 3. Recreate log_cardio_workout — trust per-entry xpAwarded
-- ============================================================================
DROP FUNCTION IF EXISTS log_cardio_workout(UUID, DATE, JSONB);

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

GRANT EXECUTE ON FUNCTION log_cardio_workout(UUID, DATE, JSONB) TO authenticated;

COMMENT ON FUNCTION log_cardio_workout(UUID, DATE, JSONB) IS
  'Logs a cardio/mobility workout. Each entry in p_exercises carries its own
   xpAwarded (pre-computed server-side from lib/utils/calculate-xp.ts). Workout
   XP is the sum of per-entry XP. No PR detection.';
