-- Migration 011: Recalculate user_skills PRs from actual workout data
--
-- Fixes stale PR values caused by:
-- 1. Migration 009 fixed workout_sets.calculated_1rm but didn't update user_skills
-- 2. Migration 010 changed PR detection to any rep count, but workouts logged
--    under the old reps=1 restriction had their PRs missed
--
-- This recalculates current_pr_weight, current_pr_reps, and current_pr_calculated_1rm
-- from the best actual set data. The update_total_strength trigger then fires
-- automatically to fix characters.total_strength_1rm.

-- Step 1: Recalculate user_skills PRs from best primary exercise sets
UPDATE user_skills us
SET current_pr_weight = best.weight_lbs,
    current_pr_reps = best.reps,
    current_pr_calculated_1rm = best.calculated_1rm
FROM (
  SELECT DISTINCT ON (w.character_id, e.skill_id)
    w.character_id,
    e.skill_id,
    ws.weight_lbs,
    ws.reps,
    ws.calculated_1rm
  FROM workout_sets ws
  JOIN workout_exercises wex ON ws.workout_exercise_id = wex.id
  JOIN workouts w ON wex.workout_id = w.id
  JOIN exercises e ON wex.exercise_id = e.id
  WHERE e.is_primary = TRUE
    AND ws.calculated_1rm IS NOT NULL
    AND ws.calculated_1rm > 0
  ORDER BY w.character_id, e.skill_id, ws.calculated_1rm DESC
) best
WHERE us.character_id = best.character_id
  AND us.skill_id = best.skill_id;
