-- Migration 009: Fix 1RM calculation for single reps + PRs only count actual 1 rep maxes
--
-- Three fixes:
-- 1. calculate_1rm trigger: For 1 rep, return weight directly (not weight * 1.033)
-- 2. Recalculate all existing calculated_1rm values
-- 3. log_multi_skill_workout: Only detect PRs when the set is a true 1 rep max (reps = 1)

-- ============================================================================
-- FIX 1: Update the 1RM trigger to handle single reps correctly
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_1rm()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.weight_lbs IS NOT NULL AND NEW.reps IS NOT NULL THEN
    IF NEW.reps <= 1 THEN
      -- Single rep: 1RM equals the weight lifted
      NEW.calculated_1rm = NEW.weight_lbs;
    ELSE
      -- Multi-rep: Epley formula with reps capped at 10
      NEW.calculated_1rm = NEW.weight_lbs * (1 + (LEAST(NEW.reps, 10)::DECIMAL / 30));
    END IF;
  ELSE
    NEW.calculated_1rm = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FIX 2: Recalculate all existing workout_sets.calculated_1rm
-- ============================================================================
UPDATE workout_sets
SET calculated_1rm = CASE
  WHEN weight_lbs IS NOT NULL AND reps IS NOT NULL THEN
    CASE
      WHEN reps <= 1 THEN weight_lbs
      ELSE weight_lbs * (1 + (LEAST(reps, 10)::DECIMAL / 30))
    END
  ELSE NULL
END;

-- ============================================================================
-- FIX 3: Update log_multi_skill_workout to only count PRs for reps = 1
-- ============================================================================
CREATE OR REPLACE FUNCTION log_multi_skill_workout(
  p_character_id UUID,
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
  v_total_xp INTEGER := 0;

  -- Exercise/set loop variables
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
  v_set_reps INTEGER;

  -- Per-skill tracking (JSONB object keyed by skill_id)
  v_skill_data JSONB := '{}'::JSONB;
  v_skill_entry JSONB;
  v_primary_exercise_id INTEGER;
  v_primary_exercise_name TEXT;

  -- Pass 2 variables
  v_skill_key TEXT;
  v_skill_id INTEGER;
  v_skill_name TEXT;
  v_skill_set_count INTEGER;
  v_total_sets INTEGER := 0;
  v_skill_base_xp INTEGER;
  v_xp_assigned INTEGER := 0;
  v_skill_pr_bonus INTEGER;
  v_skill_xp INTEGER;

  -- PR detection
  v_primary_max_1rm DECIMAL(7,2);
  v_primary_max_weight DECIMAL(6,2);
  v_primary_max_reps INTEGER;
  v_old_pr DECIMAL(7,2);
  v_achieved_pr BOOLEAN;
  v_pr_exercise_name TEXT;

  -- Tier variables
  v_old_tier VARCHAR(20);
  v_new_tier VARCHAR(20);
  v_tier_changed BOOLEAN;
  v_multiplier DECIMAL(6,4);
  v_bodyweight DECIMAL(5,1);
  v_tier_thresholds JSONB;
  v_tier JSONB;

  -- Level variables
  v_old_level INTEGER;
  v_new_level INTEGER;
  v_old_xp INTEGER;
  v_new_total_xp INTEGER;
  v_achieved_level_up BOOLEAN;
  v_i INTEGER;

  -- Results
  v_skill_results JSONB := '[]'::JSONB;
  v_skill_result JSONB;

  -- Skill keys array for iteration
  v_skill_keys TEXT[];

BEGIN
  -- =========================================================================
  -- STEP 1: Calculate base XP
  -- =========================================================================
  v_base_xp := (p_intensity * 5) + (p_length_minutes / 5);

  -- =========================================================================
  -- STEP 2: Insert workout row (skill_id = NULL for multi-skill)
  -- =========================================================================
  INSERT INTO workouts (character_id, skill_id, workout_date, intensity, length_minutes,
                        base_xp, pr_bonus_xp, total_xp, achieved_pr, achieved_level_up)
  VALUES (p_character_id, NULL, p_workout_date, p_intensity, p_length_minutes,
          v_base_xp, 0, v_base_xp, FALSE, FALSE)
  RETURNING id INTO v_workout_id;

  -- =========================================================================
  -- STEP 3: PASS 1 - Insert exercises/sets, track per-skill data
  -- =========================================================================
  FOR v_exercise IN SELECT * FROM jsonb_array_elements(p_exercises)
  LOOP
    v_exercise_order := v_exercise_order + 1;
    v_exercise_id := (v_exercise->>'exerciseId')::INTEGER;

    -- Look up this exercise's skill_id and check if it's primary
    SELECT e.skill_id, s.name, e.is_primary, e.id, e.name
    INTO v_exercise_skill_id, v_exercise_skill_name, v_achieved_pr, v_primary_exercise_id, v_primary_exercise_name
    FROM exercises e
    JOIN skills s ON e.skill_id = s.id
    WHERE e.id = v_exercise_id;

    -- Initialize skill tracking entry if first exercise for this skill
    v_skill_key := v_exercise_skill_id::TEXT;
    IF NOT v_skill_data ? v_skill_key THEN
      -- Look up primary exercise for this skill
      SELECT id, name INTO v_primary_exercise_id, v_primary_exercise_name
      FROM exercises
      WHERE skill_id = v_exercise_skill_id AND is_primary = TRUE
      LIMIT 1;

      v_skill_data := v_skill_data || jsonb_build_object(
        v_skill_key, jsonb_build_object(
          'skill_name', v_exercise_skill_name,
          'set_count', 0,
          'primary_exercise_id', v_primary_exercise_id,
          'primary_name', v_primary_exercise_name,
          'primary_max_1rm', NULL,
          'primary_max_weight', NULL,
          'primary_max_reps', NULL
        )
      );
    END IF;

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
      v_set_reps := (v_set->>'reps')::INTEGER;

      -- Insert workout_set (the calculate_1rm trigger fires automatically)
      INSERT INTO workout_sets (
        workout_exercise_id, set_number, weight_lbs, reps, rpe
      )
      VALUES (
        v_workout_exercise_id,
        v_set_number,
        (v_set->>'weight')::DECIMAL(6,2),
        v_set_reps,
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

      -- Increment set count for this skill
      v_skill_entry := v_skill_data->v_skill_key;
      v_skill_entry := jsonb_set(v_skill_entry, '{set_count}',
        to_jsonb((v_skill_entry->>'set_count')::INTEGER + 1));

      -- Track primary exercise max for PR detection (ONLY for single rep sets)
      IF v_exercise_id = (v_skill_entry->>'primary_exercise_id')::INTEGER
         AND v_set_reps = 1 THEN
        IF v_skill_entry->>'primary_max_1rm' IS NULL
           OR v_skill_entry->'primary_max_1rm' = 'null'::JSONB
           OR v_set_1rm > (v_skill_entry->>'primary_max_1rm')::DECIMAL THEN
          v_skill_entry := jsonb_set(v_skill_entry, '{primary_max_1rm}', to_jsonb(v_set_1rm));
          v_skill_entry := jsonb_set(v_skill_entry, '{primary_max_weight}', to_jsonb((v_set->>'weight')::DECIMAL(6,2)));
          v_skill_entry := jsonb_set(v_skill_entry, '{primary_max_reps}', to_jsonb(v_set_reps));
        END IF;
      END IF;

      v_skill_data := jsonb_set(v_skill_data, ARRAY[v_skill_key], v_skill_entry);

      v_total_sets := v_total_sets + 1;
    END LOOP;

    -- Update top_set_id for this exercise
    IF v_top_set_id IS NOT NULL THEN
      UPDATE workout_exercises SET top_set_id = v_top_set_id
      WHERE id = v_workout_exercise_id;
    END IF;
  END LOOP;

  -- =========================================================================
  -- STEP 4: Get bodyweight (needed for tier calculation)
  -- =========================================================================
  SELECT bodyweight_lbs INTO v_bodyweight
  FROM characters WHERE id = p_character_id;

  -- =========================================================================
  -- STEP 5: PASS 2 - For each skill, calculate XP, check PR, update tier
  -- =========================================================================
  -- Get skill keys as array
  SELECT array_agg(key) INTO v_skill_keys FROM jsonb_object_keys(v_skill_data) AS key;

  IF v_skill_keys IS NOT NULL THEN
    FOREACH v_skill_key IN ARRAY v_skill_keys
    LOOP
      v_skill_id := v_skill_key::INTEGER;
      v_skill_entry := v_skill_data->v_skill_key;
      v_skill_name := v_skill_entry->>'skill_name';
      v_skill_set_count := (v_skill_entry->>'set_count')::INTEGER;

      -- Calculate proportional base XP
      v_skill_base_xp := ROUND(v_base_xp::DECIMAL * v_skill_set_count / v_total_sets);

      -- Reset per-skill PR tracking
      v_skill_pr_bonus := 0;
      v_achieved_pr := FALSE;
      v_pr_exercise_name := v_skill_entry->>'primary_name';
      v_tier_changed := FALSE;

      -- Get current user_skill data
      SELECT current_pr_calculated_1rm, current_tier, current_level, current_xp
      INTO v_old_pr, v_old_tier, v_old_level, v_old_xp
      FROM user_skills
      WHERE character_id = p_character_id AND skill_id = v_skill_id;

      -- PR Detection (only triggers for reps = 1 sets on primary exercise)
      IF v_skill_entry->>'primary_max_1rm' IS NOT NULL
         AND v_skill_entry->'primary_max_1rm' != 'null'::JSONB THEN
        v_primary_max_1rm := (v_skill_entry->>'primary_max_1rm')::DECIMAL(7,2);
        v_primary_max_weight := (v_skill_entry->>'primary_max_weight')::DECIMAL(6,2);
        v_primary_max_reps := (v_skill_entry->>'primary_max_reps')::INTEGER;

        IF v_old_pr IS NULL OR v_primary_max_1rm > v_old_pr THEN
          v_achieved_pr := TRUE;
          v_skill_pr_bonus := 50;

          -- Update user_skills with new PR
          UPDATE user_skills
          SET current_pr_weight = v_primary_max_weight,
              current_pr_reps = v_primary_max_reps,
              current_pr_calculated_1rm = v_primary_max_1rm,
              pr_achieved_at = NOW()
          WHERE character_id = p_character_id AND skill_id = v_skill_id;
          -- Note: update_total_strength trigger fires automatically
        END IF;
      END IF;

      -- Calculate skill total XP
      v_skill_xp := v_skill_base_xp + v_skill_pr_bonus;
      v_xp_assigned := v_xp_assigned + v_skill_base_xp;

      -- Add XP to user_skills and check level-up
      v_new_total_xp := v_old_xp + v_skill_xp;

      -- Calculate new level from XP thresholds
      v_new_level := 1;
      FOR v_i IN REVERSE array_length(v_xp_thresholds, 1)..1
      LOOP
        IF v_new_total_xp >= v_xp_thresholds[v_i] THEN
          v_new_level := v_i;
          EXIT;
        END IF;
      END LOOP;

      v_achieved_level_up := v_new_level > v_old_level;

      -- Update user_skills with new XP and level
      UPDATE user_skills
      SET current_xp = v_new_total_xp,
          current_level = v_new_level,
          last_workout_at = NOW()
      WHERE character_id = p_character_id AND skill_id = v_skill_id;
      -- Note: update_character_level trigger fires automatically

      -- Calculate tier (if PR was achieved)
      v_new_tier := v_old_tier;
      IF v_achieved_pr THEN
        -- Get tier thresholds from skills table
        SELECT tier_thresholds INTO v_tier_thresholds
        FROM skills WHERE id = v_skill_id;

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
          WHERE character_id = p_character_id AND skill_id = v_skill_id;
        END IF;

        v_tier_changed := (v_old_tier IS DISTINCT FROM v_new_tier);
      END IF;

      -- Accumulate total XP
      v_total_xp := v_total_xp + v_skill_xp;

      -- Build per-skill result
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
  -- STEP 6: Handle XP rounding remainder
  -- =========================================================================
  IF v_xp_assigned < v_base_xp AND jsonb_array_length(v_skill_results) > 0 THEN
    DECLARE
      v_remainder INTEGER := v_base_xp - v_xp_assigned;
      v_first_skill_id INTEGER;
      v_first_result JSONB;
    BEGIN
      v_first_result := v_skill_results->0;
      v_first_skill_id := (v_first_result->>'skill_id')::INTEGER;

      UPDATE user_skills
      SET current_xp = current_xp + v_remainder
      WHERE character_id = p_character_id AND skill_id = v_first_skill_id;

      v_first_result := jsonb_set(v_first_result, '{base_xp}',
        to_jsonb((v_first_result->>'base_xp')::INTEGER + v_remainder));
      v_first_result := jsonb_set(v_first_result, '{skill_xp}',
        to_jsonb((v_first_result->>'skill_xp')::INTEGER + v_remainder));
      v_first_result := jsonb_set(v_first_result, '{new_total_xp}',
        to_jsonb((v_first_result->>'new_total_xp')::INTEGER + v_remainder));
      v_skill_results := jsonb_set(v_skill_results, '{0}', v_first_result);

      v_total_xp := v_total_xp + v_remainder;
    END;
  END IF;

  -- =========================================================================
  -- STEP 7: Update workout record with final values
  -- =========================================================================
  UPDATE workouts
  SET total_xp = v_total_xp,
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

  -- =========================================================================
  -- STEP 8: Return results
  -- =========================================================================
  RETURN jsonb_build_object(
    'workout_id', v_workout_id,
    'base_xp', v_base_xp,
    'total_xp', v_total_xp,
    'skill_results', v_skill_results
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
