-- StrengthQuest - Standardize Tier Names
-- Migration 015: Align all skills to OSRS tier naming convention
-- Created: 2026-04-10
--
-- Old: Bronze, Iron, Steel, Silver, Gold, Platinum, Mithril, Dragon, Obsidian, Diamond, Titanium, Greek God
-- New: Bronze, Iron, Steel, Mithril, Adamantite, Rune, Dragon, Obsidian, Barrows, Bandos, Torva, Greek God
--
-- Multiplier thresholds are unchanged — only names are updated.

-- ============================================================================
-- Push (Barbell Bench Press)
-- ============================================================================
UPDATE skills SET tier_thresholds = '{
  "primary_exercise": "Barbell Bench Press",
  "tiers": [
    {"name": "Bronze",     "min_multiplier": 0,    "max_multiplier": 0.5},
    {"name": "Iron",       "min_multiplier": 0.5,  "max_multiplier": 0.75},
    {"name": "Steel",      "min_multiplier": 0.75, "max_multiplier": 0.95},
    {"name": "Mithril",    "min_multiplier": 0.95, "max_multiplier": 1.1},
    {"name": "Adamantite", "min_multiplier": 1.1,  "max_multiplier": 1.25},
    {"name": "Rune",       "min_multiplier": 1.25, "max_multiplier": 1.4},
    {"name": "Dragon",     "min_multiplier": 1.4,  "max_multiplier": 1.6},
    {"name": "Obsidian",   "min_multiplier": 1.6,  "max_multiplier": 1.8},
    {"name": "Barrows",    "min_multiplier": 1.8,  "max_multiplier": 2.0},
    {"name": "Bandos",     "min_multiplier": 2.0,  "max_multiplier": 2.25},
    {"name": "Torva",      "min_multiplier": 2.25, "max_multiplier": 2.5},
    {"name": "Greek God",  "min_multiplier": 2.5,  "max_multiplier": null}
  ]
}'::JSONB WHERE id = 1;

-- ============================================================================
-- Pull (Conventional Deadlift)
-- ============================================================================
UPDATE skills SET tier_thresholds = '{
  "primary_exercise": "Conventional Deadlift",
  "tiers": [
    {"name": "Bronze",     "min_multiplier": 0,    "max_multiplier": 0.75},
    {"name": "Iron",       "min_multiplier": 0.75, "max_multiplier": 1.1},
    {"name": "Steel",      "min_multiplier": 1.1,  "max_multiplier": 1.4},
    {"name": "Mithril",    "min_multiplier": 1.4,  "max_multiplier": 1.65},
    {"name": "Adamantite", "min_multiplier": 1.65, "max_multiplier": 1.95},
    {"name": "Rune",       "min_multiplier": 1.95, "max_multiplier": 2.25},
    {"name": "Dragon",     "min_multiplier": 2.25, "max_multiplier": 2.55},
    {"name": "Obsidian",   "min_multiplier": 2.55, "max_multiplier": 2.85},
    {"name": "Barrows",    "min_multiplier": 2.85, "max_multiplier": 3.15},
    {"name": "Bandos",     "min_multiplier": 3.15, "max_multiplier": 3.5},
    {"name": "Torva",      "min_multiplier": 3.5,  "max_multiplier": 3.85},
    {"name": "Greek God",  "min_multiplier": 3.85, "max_multiplier": null}
  ]
}'::JSONB WHERE id = 2;

-- ============================================================================
-- Legs (Barbell Back Squat)
-- ============================================================================
UPDATE skills SET tier_thresholds = '{
  "primary_exercise": "Barbell Back Squat",
  "tiers": [
    {"name": "Bronze",     "min_multiplier": 0,    "max_multiplier": 0.65},
    {"name": "Iron",       "min_multiplier": 0.65, "max_multiplier": 0.95},
    {"name": "Steel",      "min_multiplier": 0.95, "max_multiplier": 1.2},
    {"name": "Mithril",    "min_multiplier": 1.2,  "max_multiplier": 1.45},
    {"name": "Adamantite", "min_multiplier": 1.45, "max_multiplier": 1.7},
    {"name": "Rune",       "min_multiplier": 1.7,  "max_multiplier": 2.0},
    {"name": "Dragon",     "min_multiplier": 2.0,  "max_multiplier": 2.3},
    {"name": "Obsidian",   "min_multiplier": 2.3,  "max_multiplier": 2.6},
    {"name": "Barrows",    "min_multiplier": 2.6,  "max_multiplier": 2.9},
    {"name": "Bandos",     "min_multiplier": 2.9,  "max_multiplier": 3.25},
    {"name": "Torva",      "min_multiplier": 3.25, "max_multiplier": 3.6},
    {"name": "Greek God",  "min_multiplier": 3.6,  "max_multiplier": null}
  ]
}'::JSONB WHERE id = 3;

-- ============================================================================
-- Migrate existing user_skills records to new tier names
-- Order matters: rename from bottom up to avoid collisions
-- (e.g. old "Mithril" → "Dragon", but we must not clobber the old "Dragon")
-- ============================================================================
-- First pass: rename to temporary names to avoid collisions
UPDATE user_skills SET current_tier = '_Titanium'  WHERE current_tier = 'Titanium';
UPDATE user_skills SET current_tier = '_Diamond'   WHERE current_tier = 'Diamond';
UPDATE user_skills SET current_tier = '_Obsidian'  WHERE current_tier = 'Obsidian';
UPDATE user_skills SET current_tier = '_Dragon'    WHERE current_tier = 'Dragon';
UPDATE user_skills SET current_tier = '_Mithril'   WHERE current_tier = 'Mithril';
UPDATE user_skills SET current_tier = '_Platinum'  WHERE current_tier = 'Platinum';
UPDATE user_skills SET current_tier = '_Gold'      WHERE current_tier = 'Gold';
UPDATE user_skills SET current_tier = '_Silver'    WHERE current_tier = 'Silver';

-- Second pass: map temporaries to final names
UPDATE user_skills SET current_tier = 'Mithril'    WHERE current_tier = '_Silver';
UPDATE user_skills SET current_tier = 'Adamantite' WHERE current_tier = '_Gold';
UPDATE user_skills SET current_tier = 'Rune'       WHERE current_tier = '_Platinum';
UPDATE user_skills SET current_tier = 'Dragon'     WHERE current_tier = '_Mithril';
UPDATE user_skills SET current_tier = 'Obsidian'   WHERE current_tier = '_Dragon';
UPDATE user_skills SET current_tier = 'Barrows'    WHERE current_tier = '_Obsidian';
UPDATE user_skills SET current_tier = 'Bandos'     WHERE current_tier = '_Diamond';
UPDATE user_skills SET current_tier = 'Torva'      WHERE current_tier = '_Titanium';
