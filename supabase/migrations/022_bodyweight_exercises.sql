-- StrengthQuest - Bodyweight exercises
-- Migration 022
--
-- Pull-ups, push-ups, dips etc. are bodyweight by default. For these exercises
-- workout_sets.weight_lbs means ADDED load: 0 = bodyweight only, 25 = BW+25.
-- The log form defaults the weight field to "BW", so no one has to type 0.
--
-- 1. exercises.is_bodyweight flag (+ allows_weight = TRUE so load stays optional)
-- 2. get_exercise_prs — bodyweight exercises rank by reps (then added load)
--    instead of est. 1RM. Previously sets with weight 0 had calculated_1rm = 0
--    and were filtered out entirely, so bodyweight work never showed a PR.
--    Also adds the auth.uid() ownership check the other RPCs already have.
-- 3. get_workout_history — include is_bodyweight per exercise for display
--
-- Tiers are unaffected: no bodyweight exercise is a primary (hero) lift.

-- ============================================================================
-- 1. Flag bodyweight exercises
-- ============================================================================
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS is_bodyweight BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN exercises.is_bodyweight IS
  'Bodyweight movement. workout_sets.weight_lbs is ADDED load (0 = bodyweight
   only). PRs rank by reps rather than est. 1RM.';

UPDATE exercises
SET is_bodyweight = TRUE,
    allows_weight = TRUE
WHERE slug IN (
  'push-ups',
  'dips',
  'pull-ups',
  'chin-ups',
  'step-downs',
  'spanish-squats'
);

-- ============================================================================
-- 2. get_exercise_prs — rep-based PRs for bodyweight exercises
-- ============================================================================
DROP FUNCTION IF EXISTS get_exercise_prs(UUID);
CREATE OR REPLACE FUNCTION get_exercise_prs(p_character_id UUID)
RETURNS TABLE (
  exercise_id INTEGER,
  exercise_name VARCHAR,
  skill_id INTEGER,
  is_primary BOOLEAN,
  is_bodyweight BOOLEAN,
  best_1rm DECIMAL(7,2),
  best_weight DECIMAL(6,2),
  best_reps INTEGER,
  max_weight_lifted DECIMAL(6,2)
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
  SELECT DISTINCT ON (e.id)
    e.id AS exercise_id,
    e.name AS exercise_name,
    e.skill_id,
    e.is_primary,
    e.is_bodyweight,
    ws.calculated_1rm AS best_1rm,
    ws.weight_lbs AS best_weight,
    ws.reps AS best_reps,
    (SELECT MAX(ws2.weight_lbs) FROM workout_sets ws2
     JOIN workout_exercises wex2 ON ws2.workout_exercise_id = wex2.id
     JOIN workouts w2 ON wex2.workout_id = w2.id
     WHERE w2.character_id = p_character_id AND wex2.exercise_id = e.id
    ) AS max_weight_lifted
  FROM workout_sets ws
  JOIN workout_exercises wex ON ws.workout_exercise_id = wex.id
  JOIN workouts w ON wex.workout_id = w.id
  JOIN exercises e ON wex.exercise_id = e.id
  WHERE w.character_id = p_character_id
    AND ws.reps IS NOT NULL
    AND ws.reps > 0
    AND (e.is_bodyweight OR (ws.calculated_1rm IS NOT NULL AND ws.calculated_1rm > 0))
  ORDER BY
    e.id,
    -- Bodyweight: most reps wins, added load breaks ties. These CASEs are NULL
    -- for weighted exercises, so those fall through to est. 1RM as before.
    CASE WHEN e.is_bodyweight THEN ws.reps END DESC NULLS LAST,
    CASE WHEN e.is_bodyweight THEN COALESCE(ws.weight_lbs, 0) END DESC NULLS LAST,
    ws.calculated_1rm DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_exercise_prs(UUID) TO authenticated;

-- ============================================================================
-- 3. get_workout_history — add is_bodyweight to each exercise
--    (identical to migration 021 otherwise)
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
          'is_bodyweight', e3.is_bodyweight,
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
