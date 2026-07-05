-- StrengthQuest - Activate Phase 2 Cardio Skills
-- Migration 013: Enable Endurance, Hit Points, Defense skills
-- Created: 2026-04-10

-- ============================================================================
-- STEP 1: Activate Phase 2 skills
-- ============================================================================
UPDATE skills SET is_active = TRUE WHERE id IN (4, 5, 6);

-- ============================================================================
-- STEP 2: Clear is_primary for all Phase 2 exercises
-- No hero lift for cardio skills — all exercises are equal
-- ============================================================================
UPDATE exercises SET is_primary = FALSE WHERE skill_id IN (4, 5, 6);

-- ============================================================================
-- STEP 3: Add duration_minutes to workout_exercises for cardio logging
-- Cardio exercises don't use workout_sets — duration lives here instead
-- ============================================================================
ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS intensity VARCHAR(10)
  CHECK (intensity IN ('low', 'med', 'high'));

-- ============================================================================
-- STEP 4: Update tier thresholds to XP-milestone-based for cardio skills
--
-- XP formula: duration_minutes × intensity_multiplier × scale_factor
--   intensity_multiplier: low=0.75, med=1.0, high=1.5
--   scale_factor stored here per skill
--
-- Tier thresholds are cumulative XP milestones.
-- A 30min medium session earns ~60 XP (scale=2.0), so Bronze→Iron ≈ 4 sessions.
-- Greek God requires ~350+ medium sessions (~2-3 years of consistent cardio).
-- ============================================================================

-- All cardio skills use scale_factor = 2.0 for consistent progression.
-- Same time invested = same tier progress across Endurance, Hit Points, and Defense.
-- Intensity multiplier (0.75/1.0/1.5) still rewards harder effort within each skill.

-- Endurance
UPDATE skills SET tier_thresholds = '{
  "type": "xp",
  "scale_factor": 2.0,
  "tiers": [
    {"name": "Bronze",    "min_xp": 0,     "max_xp": 250},
    {"name": "Iron",      "min_xp": 250,   "max_xp": 600},
    {"name": "Steel",      "min_xp": 600,   "max_xp": 1200},
    {"name": "Mithril",    "min_xp": 1200,  "max_xp": 2100},
    {"name": "Adamantite", "min_xp": 2100,  "max_xp": 3300},
    {"name": "Rune",       "min_xp": 3300,  "max_xp": 4800},
    {"name": "Dragon",     "min_xp": 4800,  "max_xp": 6800},
    {"name": "Obsidian",   "min_xp": 6800,  "max_xp": 9300},
    {"name": "Barrows",    "min_xp": 9300,  "max_xp": 12500},
    {"name": "Bandos",     "min_xp": 12500, "max_xp": 16500},
    {"name": "Torva",      "min_xp": 16500, "max_xp": 21500},
    {"name": "Greek God", "min_xp": 21500, "max_xp": null}
  ]
}'::JSONB WHERE id = 4;

-- Hit Points
UPDATE skills SET tier_thresholds = '{
  "type": "xp",
  "scale_factor": 2.0,
  "tiers": [
    {"name": "Bronze",    "min_xp": 0,     "max_xp": 250},
    {"name": "Iron",      "min_xp": 250,   "max_xp": 600},
    {"name": "Steel",      "min_xp": 600,   "max_xp": 1200},
    {"name": "Mithril",    "min_xp": 1200,  "max_xp": 2100},
    {"name": "Adamantite", "min_xp": 2100,  "max_xp": 3300},
    {"name": "Rune",       "min_xp": 3300,  "max_xp": 4800},
    {"name": "Dragon",     "min_xp": 4800,  "max_xp": 6800},
    {"name": "Obsidian",   "min_xp": 6800,  "max_xp": 9300},
    {"name": "Barrows",    "min_xp": 9300,  "max_xp": 12500},
    {"name": "Bandos",     "min_xp": 12500, "max_xp": 16500},
    {"name": "Torva",      "min_xp": 16500, "max_xp": 21500},
    {"name": "Greek God", "min_xp": 21500, "max_xp": null}
  ]
}'::JSONB WHERE id = 5;

-- Defense
UPDATE skills SET tier_thresholds = '{
  "type": "xp",
  "scale_factor": 2.0,
  "tiers": [
    {"name": "Bronze",    "min_xp": 0,     "max_xp": 250},
    {"name": "Iron",      "min_xp": 250,   "max_xp": 600},
    {"name": "Steel",      "min_xp": 600,   "max_xp": 1200},
    {"name": "Mithril",    "min_xp": 1200,  "max_xp": 2100},
    {"name": "Adamantite", "min_xp": 2100,  "max_xp": 3300},
    {"name": "Rune",       "min_xp": 3300,  "max_xp": 4800},
    {"name": "Dragon",     "min_xp": 4800,  "max_xp": 6800},
    {"name": "Obsidian",   "min_xp": 6800,  "max_xp": 9300},
    {"name": "Barrows",    "min_xp": 9300,  "max_xp": 12500},
    {"name": "Bandos",     "min_xp": 12500, "max_xp": 16500},
    {"name": "Torva",      "min_xp": 16500, "max_xp": 21500},
    {"name": "Greek God", "min_xp": 21500, "max_xp": null}
  ]
}'::JSONB WHERE id = 6;
