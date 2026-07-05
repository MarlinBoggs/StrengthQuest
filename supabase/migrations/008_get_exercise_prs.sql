-- Migration 008: RPC function to get best calculated 1RM per exercise for a character
-- Used by the dashboard to display per-exercise PRs on skill cards

CREATE OR REPLACE FUNCTION get_exercise_prs(p_character_id UUID)
RETURNS TABLE (
  exercise_id INTEGER,
  exercise_name VARCHAR,
  skill_id INTEGER,
  is_primary BOOLEAN,
  best_1rm DECIMAL(7,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id AS exercise_id,
    e.name AS exercise_name,
    e.skill_id,
    e.is_primary,
    MAX(ws.calculated_1rm) AS best_1rm
  FROM workout_sets ws
  JOIN workout_exercises wex ON ws.workout_exercise_id = wex.id
  JOIN workouts w ON wex.workout_id = w.id
  JOIN exercises e ON wex.exercise_id = e.id
  WHERE w.character_id = p_character_id
    AND ws.calculated_1rm IS NOT NULL
    AND ws.calculated_1rm > 0
  GROUP BY e.id, e.name, e.skill_id, e.is_primary
  ORDER BY e.skill_id, e.is_primary DESC, MAX(ws.calculated_1rm) DESC;
END;
$$;
