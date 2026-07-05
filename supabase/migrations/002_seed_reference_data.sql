-- StrengthQuest - Seed Reference Data
-- Migration 002: Populate character classes, skills, and exercises
-- Created: 2026-02-20

-- ============================================================================
-- CHARACTER CLASSES (6 classes, cosmetic in MVP)
-- ============================================================================

INSERT INTO character_classes (name, description) VALUES
  ('Deadlift Knight', 'Master of the Pull. Unyielding strength from the ground up.'),
  ('Bench Berserker', 'Champion of the Push. Unmatched pressing power.'),
  ('Bicep Bandit', 'Specialist in arm work. Aesthetic and strong.'),
  ('Quad King', 'Ruler of leg day. Built from the ground up.'),
  ('Grip Gladiator', 'Expert in grip strength and endurance.'),
  ('Iron Titan', 'Balanced warrior. Master of all lifts.');

-- ============================================================================
-- TOTAL STRENGTH TIERS (Powerlifting Total: Bench + Squat + Deadlift)
-- ============================================================================

INSERT INTO total_strength_tiers (tier_name, min_multiplier, max_multiplier, display_order) VALUES
  ('Bronze', 0.0, 1.5, 1),
  ('Iron', 1.5, 2.25, 2),
  ('Steel', 2.25, 3.0, 3),
  ('Silver', 3.0, 3.75, 4),
  ('Gold', 3.75, 4.5, 5),
  ('Platinum', 4.5, 5.25, 6),
  ('Mithril', 5.25, 6.0, 7),
  ('Dragon', 6.0, 6.75, 8),
  ('Obsidian', 6.75, 7.5, 9),
  ('Diamond', 7.5, 8.25, 10),
  ('Titanium', 8.25, 9.0, 11),
  ('Greek God', 9.0, NULL, 12);

-- ============================================================================
-- SKILLS (6 total: 3 active for MVP, 3 inactive for Phase 2)
-- ============================================================================

-- Phase 1 (MVP): Strength Skills - ACTIVE
INSERT INTO skills (name, slug, description, color_hex, skill_type, phase, is_active, tier_thresholds) VALUES
  ('Push', 'push', 'Bench press and pressing movements', '#DC2626', 'strength', 1, TRUE,
   '{"primary_exercise": "Barbell Bench Press", "tiers": [
     {"name": "Bronze", "min_multiplier": 0, "max_multiplier": 0.5},
     {"name": "Iron", "min_multiplier": 0.5, "max_multiplier": 0.75},
     {"name": "Steel", "min_multiplier": 0.75, "max_multiplier": 0.95},
     {"name": "Silver", "min_multiplier": 0.95, "max_multiplier": 1.1},
     {"name": "Gold", "min_multiplier": 1.1, "max_multiplier": 1.25},
     {"name": "Platinum", "min_multiplier": 1.25, "max_multiplier": 1.4},
     {"name": "Mithril", "min_multiplier": 1.4, "max_multiplier": 1.6},
     {"name": "Dragon", "min_multiplier": 1.6, "max_multiplier": 1.8},
     {"name": "Obsidian", "min_multiplier": 1.8, "max_multiplier": 2.0},
     {"name": "Diamond", "min_multiplier": 2.0, "max_multiplier": 2.25},
     {"name": "Titanium", "min_multiplier": 2.25, "max_multiplier": 2.5},
     {"name": "Greek God", "min_multiplier": 2.5, "max_multiplier": null}
   ]}'),
  ('Pull', 'pull', 'Deadlift and pulling movements', '#2563EB', 'strength', 1, TRUE,
   '{"primary_exercise": "Conventional Deadlift", "tiers": [
     {"name": "Bronze", "min_multiplier": 0, "max_multiplier": 0.75},
     {"name": "Iron", "min_multiplier": 0.75, "max_multiplier": 1.1},
     {"name": "Steel", "min_multiplier": 1.1, "max_multiplier": 1.4},
     {"name": "Silver", "min_multiplier": 1.4, "max_multiplier": 1.65},
     {"name": "Gold", "min_multiplier": 1.65, "max_multiplier": 1.95},
     {"name": "Platinum", "min_multiplier": 1.95, "max_multiplier": 2.25},
     {"name": "Mithril", "min_multiplier": 2.25, "max_multiplier": 2.55},
     {"name": "Dragon", "min_multiplier": 2.55, "max_multiplier": 2.85},
     {"name": "Obsidian", "min_multiplier": 2.85, "max_multiplier": 3.15},
     {"name": "Diamond", "min_multiplier": 3.15, "max_multiplier": 3.5},
     {"name": "Titanium", "min_multiplier": 3.5, "max_multiplier": 3.85},
     {"name": "Greek God", "min_multiplier": 3.85, "max_multiplier": null}
   ]}'),
  ('Legs', 'legs', 'Squat and leg movements', '#16A34A', 'strength', 1, TRUE,
   '{"primary_exercise": "Barbell Back Squat", "tiers": [
     {"name": "Bronze", "min_multiplier": 0, "max_multiplier": 0.65},
     {"name": "Iron", "min_multiplier": 0.65, "max_multiplier": 0.95},
     {"name": "Steel", "min_multiplier": 0.95, "max_multiplier": 1.2},
     {"name": "Silver", "min_multiplier": 1.2, "max_multiplier": 1.45},
     {"name": "Gold", "min_multiplier": 1.45, "max_multiplier": 1.7},
     {"name": "Platinum", "min_multiplier": 1.7, "max_multiplier": 2.0},
     {"name": "Mithril", "min_multiplier": 2.0, "max_multiplier": 2.3},
     {"name": "Dragon", "min_multiplier": 2.3, "max_multiplier": 2.6},
     {"name": "Obsidian", "min_multiplier": 2.6, "max_multiplier": 2.9},
     {"name": "Diamond", "min_multiplier": 2.9, "max_multiplier": 3.25},
     {"name": "Titanium", "min_multiplier": 3.25, "max_multiplier": 3.6},
     {"name": "Greek God", "min_multiplier": 3.6, "max_multiplier": null}
   ]}');

-- Phase 2: Holistic Fitness Skills - INACTIVE (Coming Soon)
INSERT INTO skills (name, slug, description, color_hex, skill_type, phase, is_active, tier_thresholds) VALUES
  ('Endurance', 'endurance', 'Cardio workouts: running, cycling, rowing', '#F97316', 'cardio', 2, FALSE,
   '{"benchmark_type": "5k_time", "unit": "minutes", "tiers": [
     {"name": "Bronze", "min_time": null, "max_time": 40},
     {"name": "Iron", "min_time": 40, "max_time": 35},
     {"name": "Silver", "min_time": 35, "max_time": 30},
     {"name": "Gold", "min_time": 30, "max_time": 25},
     {"name": "Mithril", "min_time": 25, "max_time": 22},
     {"name": "Dragon", "min_time": 22, "max_time": 20},
     {"name": "Diamond", "min_time": 20, "max_time": 18},
     {"name": "Greek God", "min_time": null, "max_time": 18}
   ]}'),
  ('Hit Points', 'hit-points', 'HIIT sessions and high-intensity training', '#9333EA', 'hiit', 2, FALSE,
   '{"benchmark_type": "tabata_performance", "unit": "performance_score", "tiers": [
     {"name": "Bronze", "min_score": 0, "max_score": 50},
     {"name": "Iron", "min_score": 50, "max_score": 100},
     {"name": "Silver", "min_score": 100, "max_score": 150},
     {"name": "Gold", "min_score": 150, "max_score": 200},
     {"name": "Mithril", "min_score": 200, "max_score": 250},
     {"name": "Dragon", "min_score": 250, "max_score": 300},
     {"name": "Diamond", "min_score": 300, "max_score": 350},
     {"name": "Greek God", "min_score": 350, "max_score": null}
   ]}'),
  ('Defense', 'defense', 'Mobility work: yoga, stretching, rehab', '#0D9488', 'mobility', 2, FALSE,
   '{"benchmark_type": "deep_squat_hold", "unit": "seconds", "tiers": [
     {"name": "Bronze", "min_duration": 0, "max_duration": 30},
     {"name": "Iron", "min_duration": 30, "max_duration": 60},
     {"name": "Silver", "min_duration": 60, "max_duration": 90},
     {"name": "Gold", "min_duration": 90, "max_duration": 120},
     {"name": "Mithril", "min_duration": 120, "max_duration": 180},
     {"name": "Dragon", "min_duration": 180, "max_duration": 240},
     {"name": "Diamond", "min_duration": 240, "max_duration": 300},
     {"name": "Greek God", "min_duration": 300, "max_duration": null}
   ]}');

-- ============================================================================
-- EXERCISES - PUSH SKILL (Skill ID: 1)
-- ============================================================================

INSERT INTO exercises (skill_id, name, slug, is_primary, exercise_category, allows_weight, allows_reps) VALUES
  -- Primary Exercise (affects tier)
  (1, 'Barbell Bench Press', 'barbell-bench-press', TRUE, 'strength', TRUE, TRUE),

  -- Supporting Exercises
  (1, 'Incline Barbell Bench Press', 'incline-barbell-bench-press', FALSE, 'strength', TRUE, TRUE),
  (1, 'Dumbbell Bench Press', 'dumbbell-bench-press', FALSE, 'strength', TRUE, TRUE),
  (1, 'Incline Dumbbell Bench Press', 'incline-dumbbell-bench-press', FALSE, 'strength', TRUE, TRUE),
  (1, 'Barbell Overhead Press', 'barbell-overhead-press', FALSE, 'strength', TRUE, TRUE),
  (1, 'Dumbbell Overhead Press', 'dumbbell-overhead-press', FALSE, 'strength', TRUE, TRUE),
  (1, 'Dips', 'dips', FALSE, 'strength', TRUE, TRUE),
  (1, 'Push-ups', 'push-ups', FALSE, 'strength', TRUE, TRUE),
  (1, 'Skull Crushers', 'skull-crushers', FALSE, 'strength', TRUE, TRUE),
  (1, 'Cable Flys', 'cable-flys', FALSE, 'strength', TRUE, TRUE),
  (1, 'Tricep Extensions', 'tricep-extensions', FALSE, 'strength', TRUE, TRUE),
  (1, 'Tricep Pulldowns', 'tricep-pulldowns', FALSE, 'strength', TRUE, TRUE);

-- ============================================================================
-- EXERCISES - PULL SKILL (Skill ID: 2)
-- ============================================================================

INSERT INTO exercises (skill_id, name, slug, is_primary, exercise_category, allows_weight, allows_reps) VALUES
  -- Primary Exercise (affects tier)
  (2, 'Conventional Deadlift', 'conventional-deadlift', TRUE, 'strength', TRUE, TRUE),

  -- Supporting Exercises
  (2, 'Romanian Deadlift', 'romanian-deadlift', FALSE, 'strength', TRUE, TRUE),
  (2, 'Sumo Deadlift', 'sumo-deadlift', FALSE, 'strength', TRUE, TRUE),
  (2, 'Trap Bar Deadlift', 'trap-bar-deadlift', FALSE, 'strength', TRUE, TRUE),
  (2, 'Barbell Row', 'barbell-row', FALSE, 'strength', TRUE, TRUE),
  (2, 'Dumbbell Row', 'dumbbell-row', FALSE, 'strength', TRUE, TRUE),
  (2, 'Pull-ups', 'pull-ups', FALSE, 'strength', TRUE, TRUE),
  (2, 'Chin-ups', 'chin-ups', FALSE, 'strength', TRUE, TRUE),
  (2, 'Lat Pulldown', 'lat-pulldown', FALSE, 'strength', TRUE, TRUE),
  (2, 'Cable Row', 'cable-row', FALSE, 'strength', TRUE, TRUE),
  (2, 'Face Pulls', 'face-pulls', FALSE, 'strength', TRUE, TRUE);

-- ============================================================================
-- EXERCISES - LEGS SKILL (Skill ID: 3)
-- ============================================================================

INSERT INTO exercises (skill_id, name, slug, is_primary, exercise_category, allows_weight, allows_reps) VALUES
  -- Primary Exercise (affects tier)
  (3, 'Barbell Back Squat', 'barbell-back-squat', TRUE, 'strength', TRUE, TRUE),

  -- Supporting Exercises
  (3, 'Front Squat', 'front-squat', FALSE, 'strength', TRUE, TRUE),
  (3, 'Goblet Squat', 'goblet-squat', FALSE, 'strength', TRUE, TRUE),
  (3, 'Bulgarian Split Squat', 'bulgarian-split-squat', FALSE, 'strength', TRUE, TRUE),
  (3, 'Leg Press', 'leg-press', FALSE, 'strength', TRUE, TRUE),
  (3, 'Hack Squat', 'hack-squat', FALSE, 'strength', TRUE, TRUE),
  (3, 'Barbell Lunges', 'barbell-lunges', FALSE, 'strength', TRUE, TRUE),
  (3, 'Dumbbell Lunges', 'dumbbell-lunges', FALSE, 'strength', TRUE, TRUE),
  (3, 'Step-ups', 'step-ups', FALSE, 'strength', TRUE, TRUE),
  (3, 'Calf Raises', 'calf-raises', FALSE, 'strength', TRUE, TRUE);

-- ============================================================================
-- EXERCISES - ENDURANCE SKILL (Skill ID: 4) - Phase 2
-- ============================================================================

INSERT INTO exercises (skill_id, name, slug, is_primary, exercise_category, allows_weight, allows_reps, tracks_distance, tracks_duration) VALUES
  -- Primary Exercise (affects tier)
  (4, '5K Run', '5k-run', TRUE, 'cardio', FALSE, FALSE, TRUE, TRUE),

  -- Supporting Exercises
  (4, 'Long Run', 'long-run', FALSE, 'cardio', FALSE, FALSE, TRUE, TRUE),
  (4, 'Tempo Run', 'tempo-run', FALSE, 'cardio', FALSE, FALSE, TRUE, TRUE),
  (4, 'Cycling', 'cycling', FALSE, 'cardio', FALSE, FALSE, TRUE, TRUE),
  (4, 'Rowing', 'rowing', FALSE, 'cardio', FALSE, FALSE, TRUE, TRUE),
  (4, 'Swimming', 'swimming', FALSE, 'cardio', FALSE, FALSE, TRUE, TRUE),
  (4, 'Elliptical', 'elliptical', FALSE, 'cardio', FALSE, FALSE, FALSE, TRUE);

-- ============================================================================
-- EXERCISES - HIT POINTS SKILL (Skill ID: 5) - Phase 2
-- ============================================================================

INSERT INTO exercises (skill_id, name, slug, is_primary, exercise_category, allows_weight, allows_reps, tracks_duration) VALUES
  -- Primary Exercise (affects tier)
  (5, 'Tabata Intervals', 'tabata-intervals', TRUE, 'hiit', FALSE, FALSE, TRUE),

  -- Supporting Exercises
  (5, 'Sprint Intervals', 'sprint-intervals', FALSE, 'hiit', FALSE, FALSE, TRUE),
  (5, 'Assault Bike HIIT', 'assault-bike-hiit', FALSE, 'hiit', FALSE, FALSE, TRUE),
  (5, 'Burpees', 'burpees', FALSE, 'hiit', FALSE, TRUE, TRUE),
  (5, 'Mountain Climbers', 'mountain-climbers', FALSE, 'hiit', FALSE, TRUE, TRUE),
  (5, 'Battle Ropes', 'battle-ropes', FALSE, 'hiit', FALSE, FALSE, TRUE);

-- ============================================================================
-- EXERCISES - DEFENSE SKILL (Skill ID: 6) - Phase 2
-- ============================================================================

INSERT INTO exercises (skill_id, name, slug, is_primary, exercise_category, allows_weight, allows_reps, tracks_duration) VALUES
  -- Primary Exercise (affects tier)
  (6, 'Deep Squat Hold', 'deep-squat-hold', TRUE, 'mobility', FALSE, FALSE, TRUE),

  -- Supporting Exercises
  (6, 'Yoga Session', 'yoga-session', FALSE, 'mobility', FALSE, FALSE, TRUE),
  (6, 'Foam Rolling', 'foam-rolling', FALSE, 'mobility', FALSE, FALSE, TRUE),
  (6, 'Stretching Routine', 'stretching-routine', FALSE, 'mobility', FALSE, FALSE, TRUE),
  (6, 'Mobility Flow', 'mobility-flow', FALSE, 'mobility', FALSE, FALSE, TRUE),
  (6, 'Dead Hang', 'dead-hang', FALSE, 'mobility', FALSE, FALSE, TRUE),
  (6, 'Plank', 'plank', FALSE, 'mobility', FALSE, FALSE, TRUE);

-- ============================================================================
-- VERIFICATION QUERIES (optional - comment out after verification)
-- ============================================================================

-- Verify character classes (should be 6)
-- SELECT * FROM character_classes ORDER BY id;

-- Verify Total Strength tiers (should be 12)
-- SELECT * FROM total_strength_tiers ORDER BY display_order;

-- Verify skills (should be 6: 3 active, 3 inactive)
-- SELECT id, name, slug, skill_type, phase, is_active FROM skills ORDER BY phase, id;

-- Verify exercises count per skill
-- SELECT s.name AS skill, COUNT(e.id) AS exercise_count, COUNT(CASE WHEN e.is_primary THEN 1 END) AS primary_count
-- FROM skills s
-- LEFT JOIN exercises e ON e.skill_id = s.id
-- GROUP BY s.id, s.name
-- ORDER BY s.id;
