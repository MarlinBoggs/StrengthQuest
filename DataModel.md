# StrengthQuest - Data Model & Database Schema

**Document Version:** 2.0
**Last Updated:** April 14, 2026
**Status:** Phase 1 (Strength) + Phase 2 (Cardio) implemented — all 6 skills active
**Database:** Supabase (PostgreSQL)

---

## Table of Contents

1. [Overview](#overview)
2. [Design Philosophy](#design-philosophy)
3. [Entity Relationship Overview](#entity-relationship-overview)
4. [Core Tables](#core-tables)
5. [Skill System Architecture](#skill-system-architecture)
6. [Implementation Phases](#implementation-phases)
7. [Sample Queries](#sample-queries)
8. [Migration Strategy](#migration-strategy)

---

## Overview

This data model supports StrengthQuest's full vision: a 6-skill RPG-style fitness tracker with independent progression systems that roll up to a unified character profile.

### The Six Skills

**Strength Skills (multiplier-gated tiers, PR-driven):**
- **Push** (Bench Press focus) - Red
- **Pull** (Deadlift focus) - Blue
- **Legs** (Squat focus) - Green

**Cardio/Holistic Skills (XP-milestone tiers, duration-driven):**
- **Endurance** (Cardio: runs, cycling, rowing) - Orange
- **Hit Points** (HIIT sessions) - Purple
- **Defense** (Mobility: yoga, stretching, rehab) - Teal

All six skills are active. Cardio skills were activated and made live in migration 013/014.

### Total Strength (Powerlifting Total)

In addition to individual skill tiers, StrengthQuest tracks **Total Strength** - the sum of your Bench + Squat + Deadlift 1RMs (Push + Legs + Pull). This is the standard powerlifting competition metric and has its own tier progression system based on bodyweight multipliers.

### Key Design Principles

1. **Flexible Schema:** One skill system that handles all 6 skill types
2. **Extensible:** Easy to add new skills without schema changes
3. **Performance:** Optimized for common queries (dashboard, skill views)
4. **Integrity:** Enforced relationships and constraints
5. **Future-Proof:** Phase 2 skills designed in from day one

---

## Design Philosophy

### Why This Structure?

**Normalized Relational Design:**
- PostgreSQL excels at relational data (workouts → exercises → sets)
- Strong referential integrity prevents orphaned records
- Efficient queries with proper indexing

**Skill Flexibility:**
- Different skill types need different metrics:
  - Strength: weight × reps (1RM calculation)
  - Endurance: distance + time (pace calculation)
  - HIIT: intervals + heart rate zones
  - Defense: duration + session type
- Single `skills` table with skill-specific configuration
- Single `workouts` table with flexible metadata

**Tier System Abstraction:**
- Each skill has its own tier thresholds
- Stored as JSON for easy updates without migrations
- Allows different tier gates per skill type

---

## Entity Relationship Overview

```
users (Supabase Auth)
  ↓ 1:1
characters
  ↓ 1:many
user_skills (XP, level per skill)
  ↓ 1:many
workouts
  ↓ 1:many
workout_exercises
  ↓ 1:many
workout_sets

Lookup Tables (Reference Data):
- skills (6 skills: Push/Pull/Legs/Endurance/HP/Defense)
- exercises (per skill: Bench Press, Deadlift, etc.)
- character_classes (6 classes: Deadlift Knight, etc.)
```

**Key Relationships:**
- User → Character (1:1, character created on signup)
- Character → UserSkills (1:6, one record per skill)
- UserSkill → Workouts (1:many, workout history)
- Workout → WorkoutExercises (1:many, multiple exercises per session)
- WorkoutExercise → WorkoutSets (1:many, multiple sets per exercise)

---

## Core Tables

### 1. `characters`

Stores character identity and base attributes.

```sql
CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Character Identity
  name VARCHAR(30) NOT NULL CHECK (char_length(name) >= 3),
  class_id INTEGER NOT NULL REFERENCES character_classes(id),

  -- Physical Attributes
  bodyweight_lbs DECIMAL(5,1) NOT NULL CHECK (bodyweight_lbs >= 50 AND bodyweight_lbs <= 500),

  -- Computed Fields
  character_level INTEGER NOT NULL DEFAULT 1 CHECK (character_level >= 1 AND character_level <= 10),
  total_strength_1rm DECIMAL(7,2) DEFAULT 0, -- Sum of bench + squat + deadlift 1RMs

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_characters_user_id ON characters(user_id);
CREATE INDEX idx_characters_class_id ON characters(class_id);

-- Trigger: Update updated_at on modification
CREATE TRIGGER update_characters_updated_at
  BEFORE UPDATE ON characters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Design Notes:**
- `user_id` references Supabase Auth (auth.users table)
- `character_level` = average of 6 skill levels (rounded down), computed via trigger
- `total_strength_1rm` = sum of Push/Pull/Legs primary exercise 1RMs
- Bodyweight constraint (50-500 lbs) prevents invalid data
- Name constraint (3-30 chars) ensures valid character names

---

### 2. `character_classes`

Reference table for the 6 character classes (cosmetic only in MVP).

```sql
CREATE TABLE character_classes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  icon_url TEXT, -- Future: S3 bucket URL for class icons

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Data
INSERT INTO character_classes (name, description) VALUES
  ('Deadlift Knight', 'Master of the Pull. Unyielding strength from the ground up.'),
  ('Bench Berserker', 'Champion of the Push. Unmatched pressing power.'),
  ('Bicep Bandit', 'Specialist in arm work. Aesthetic and strong.'),
  ('Quad King', 'Ruler of leg day. Built from the ground up.'),
  ('Grip Gladiator', 'Expert in grip strength and endurance.'),
  ('Iron Titan', 'Balanced warrior. Master of all lifts.');
```

**Design Notes:**
- Static reference table (6 classes)
- Cosmetic only in MVP (no gameplay perks)
- Future enhancement: could add class-specific XP bonuses

---

### 3. `skills`

Reference table defining the 6 skills and their configuration.

```sql
CREATE TABLE skills (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  slug VARCHAR(50) NOT NULL UNIQUE, -- URL-friendly: 'push', 'endurance', etc.
  description TEXT,
  color_hex VARCHAR(7) NOT NULL, -- UI color: '#FF0000' for red, etc.

  -- Skill Type Configuration
  skill_type VARCHAR(20) NOT NULL CHECK (skill_type IN ('strength', 'cardio', 'hiit', 'mobility')),

  -- Tier System (JSON for flexibility)
  tier_thresholds JSONB, -- Tier definitions per skill type

  -- Phase Gating
  is_active BOOLEAN NOT NULL DEFAULT TRUE, -- False = coming soon (Phase 2)
  phase INTEGER NOT NULL DEFAULT 1 CHECK (phase IN (1, 2)), -- 1 = MVP, 2 = Phase 2

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Data (all skills active)
INSERT INTO skills (name, slug, description, color_hex, skill_type, phase, is_active, tier_thresholds) VALUES
  ('Push', 'push', 'Bench press and pressing movements', '#DC2626', 'strength', 1, TRUE,
   '{"primary_exercise": "Barbell Bench Press", "tiers": [...]}'),
  ('Pull', 'pull', 'Deadlift and pulling movements', '#2563EB', 'strength', 1, TRUE,
   '{"primary_exercise": "Conventional Deadlift", "tiers": [...]}'),
  ('Legs', 'legs', 'Squat and leg movements', '#16A34A', 'strength', 1, TRUE,
   '{"primary_exercise": "Barbell Back Squat", "tiers": [...]}'),
  ('Endurance', 'endurance', 'Cardio workouts: running, cycling, rowing', '#F97316', 'cardio', 2, TRUE,
   '{"type": "xp", "scale_factor": 2.0, "tiers": [...]}'),
  ('Hit Points', 'hit-points', 'HIIT sessions and high-intensity training', '#9333EA', 'hiit', 2, TRUE,
   '{"type": "xp", "scale_factor": 2.0, "tiers": [...]}'),
  ('Defense', 'defense', 'Mobility work: yoga, stretching, rehab', '#0D9488', 'mobility', 2, TRUE,
   '{"type": "xp", "scale_factor": 2.0, "tiers": [...]}');
```

**Tier Names (OSRS convention, 12 tiers — shared across all skills):**

`Bronze → Iron → Steel → Mithril → Adamantite → Rune → Dragon → Obsidian → Barrows → Bandos → Torva → Greek God`

Strength skills gate tiers by a `1RM / bodyweight` multiplier. Cardio skills gate tiers by cumulative XP.

**Tier Thresholds JSON (Strength Skills — multiplier-gated, Push example):**

```json
{
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
}
```

Pull and Legs use the same tier names but with different multiplier cut-points (deadlift/squat demand higher multipliers than bench — see migration 015).

**Tier Thresholds JSON (Cardio Skills — XP-milestone-gated, shared across Endurance/HP/Defense):**

```json
{
  "type": "xp",
  "scale_factor": 2.0,
  "tiers": [
    {"name": "Bronze",     "min_xp": 0,     "max_xp": 250},
    {"name": "Iron",       "min_xp": 250,   "max_xp": 600},
    {"name": "Steel",      "min_xp": 600,   "max_xp": 1200},
    {"name": "Mithril",    "min_xp": 1200,  "max_xp": 2100},
    {"name": "Adamantite", "min_xp": 2100,  "max_xp": 3300},
    {"name": "Rune",       "min_xp": 3300,  "max_xp": 4800},
    {"name": "Dragon",     "min_xp": 4800,  "max_xp": 6800},
    {"name": "Obsidian",   "min_xp": 6800,  "max_xp": 9300},
    {"name": "Barrows",    "min_xp": 9300,  "max_xp": 12500},
    {"name": "Bandos",     "min_xp": 12500, "max_xp": 16500},
    {"name": "Torva",      "min_xp": 16500, "max_xp": 21500},
    {"name": "Greek God",  "min_xp": 21500, "max_xp": null}
  ]
}
```

- `scale_factor` is read by `log_cardio_workout` when computing per-exercise XP.
- `type: "xp"` flags the alternate tier algorithm (cumulative XP vs. strength's bodyweight multiplier).
- A 30-minute medium-intensity session earns ~60 XP (`30 × 1.0 × 2.0`), so Bronze → Iron takes roughly 4 sessions.

**Design Notes:**
- `skill_type` allows different progression logic per type
- `tier_thresholds` as JSONB allows flexible tier definitions without schema changes
- `is_active` = FALSE for Phase 2 skills (shows "Coming Soon" in UI)
- `phase` field explicitly marks MVP vs future features

**Total Strength Tier System:**

In addition to individual skill tiers, Total Strength (Bench + Squat + Deadlift) has its own tier progression:

```sql
CREATE TABLE total_strength_tiers (
  id SERIAL PRIMARY KEY,
  tier_name VARCHAR(20) NOT NULL,
  min_multiplier DECIMAL(4,2) NOT NULL,
  max_multiplier DECIMAL(4,2),
  display_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Total Strength Tiers (bodyweight multipliers) - 12 Tier System (OSRS names)
INSERT INTO total_strength_tiers (tier_name, min_multiplier, max_multiplier, display_order) VALUES
  ('Bronze',     0.0,  1.5,  1),
  ('Iron',       1.5,  2.25, 2),
  ('Steel',      2.25, 3.0,  3),
  ('Mithril',    3.0,  3.75, 4),
  ('Adamantite', 3.75, 4.5,  5),
  ('Rune',       4.5,  5.25, 6),
  ('Dragon',     5.25, 6.0,  7),
  ('Obsidian',   6.0,  6.75, 8),
  ('Barrows',    6.75, 7.5,  9),
  ('Bandos',     7.5,  8.25, 10),
  ('Torva',      8.25, 9.0,  11),
  ('Greek God',  9.0,  NULL, 12); -- NULL = no upper limit
```

> RLS is enabled on `total_strength_tiers` (migration 016) with a SELECT-only policy for authenticated users.

**Total Strength Calculation:**
- Total Strength = Push 1RM + Pull 1RM + Legs 1RM
- Automatically updated via trigger when any PR changes
- Stored in `characters.total_strength_1rm`
- Tier calculated as: `(total_strength_1rm / bodyweight_lbs)`

**Example (Year 2-3 Serious Lifter - 200 lbs):**
- Bench: 245 lbs (1.225×) → Gold
- Squat: 365 lbs (1.825×) → Platinum
- Deadlift: 435 lbs (2.175×) → Platinum
- **Total: 1045 lbs (5.225×) → Platinum tier**

---

### 4. `user_skills`

Tracks each user's progression in each skill (XP, level, tier).

```sql
CREATE TABLE user_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  skill_id INTEGER NOT NULL REFERENCES skills(id),

  -- Progression Metrics
  current_xp INTEGER NOT NULL DEFAULT 0 CHECK (current_xp >= 0),
  current_level INTEGER NOT NULL DEFAULT 1 CHECK (current_level >= 1 AND current_level <= 10),

  -- Tier Metrics (Strength Skills)
  current_pr_weight DECIMAL(6,2), -- Current PR weight (lbs) — weight from the best estimated-1RM set
  current_pr_reps INTEGER,         -- Current PR reps — reps from the best estimated-1RM set
  current_pr_calculated_1rm DECIMAL(7,2), -- Calculated 1RM from best set (Epley, capped at 10 reps)
  max_weight_lifted DECIMAL(6,2),  -- Real PR: heaviest single weight ever lifted on primary (migration 012)
  max_weight_lifted_at TIMESTAMPTZ, -- When that real PR was set
  current_tier VARCHAR(20),        -- Current tier name (Bronze, Iron, Steel, Mithril, Adamantite, Rune, Dragon, Obsidian, Barrows, Bandos, Torva, Greek God)
  tier_multiplier DECIMAL(4,2),    -- Current bodyweight multiplier (strength skills only)

  -- Timestamps
  last_workout_at TIMESTAMPTZ,
  pr_achieved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(character_id, skill_id)
);

-- Indexes
CREATE INDEX idx_user_skills_character_id ON user_skills(character_id);
CREATE INDEX idx_user_skills_skill_id ON user_skills(skill_id);
CREATE INDEX idx_user_skills_level ON user_skills(current_level);

-- Trigger: Update updated_at on modification
CREATE TRIGGER update_user_skills_updated_at
  BEFORE UPDATE ON user_skills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Design Notes:**
- One record per character per skill (6 records total per user)
- Strength skills populate `current_pr_*`, `max_weight_lifted`, and multiplier-based `current_tier` / `tier_multiplier`
- Cardio skills leave PR/multiplier columns NULL and use `current_xp` alone to resolve tier (XP-milestone lookup against `skills.tier_thresholds.tiers[].min_xp`)
- **Dual PR system** (strength only): `current_pr_calculated_1rm` tracks the best *estimated* 1RM (any rep count, Epley); `max_weight_lifted` tracks the heaviest single weight ever moved. Both can fire in the same workout for +100 XP total.
- `UNIQUE(character_id, skill_id)` ensures one record per skill per character

**Sample Data (User with 3 strength skills):**

```sql
-- Character ID: abc-123, all 6 skills initialized at creation
INSERT INTO user_skills (character_id, skill_id, current_xp, current_level) VALUES
  ('abc-123', 1, 0, 1), -- Push
  ('abc-123', 2, 0, 1), -- Pull
  ('abc-123', 3, 0, 1), -- Legs
  ('abc-123', 4, 0, 1), -- Endurance (locked, Phase 2)
  ('abc-123', 5, 0, 1), -- Hit Points (locked, Phase 2)
  ('abc-123', 6, 0, 1); -- Defense (locked, Phase 2)
```

---

### 5. `exercises`

Reference table for all exercises across all skills.

```sql
CREATE TABLE exercises (
  id SERIAL PRIMARY KEY,
  skill_id INTEGER NOT NULL REFERENCES skills(id),

  -- Exercise Details
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,

  -- Exercise Type
  is_primary BOOLEAN NOT NULL DEFAULT FALSE, -- True = affects tier (Bench/Deadlift/Squat for MVP)
  exercise_category VARCHAR(20) CHECK (exercise_category IN ('strength', 'cardio', 'hiit', 'mobility')),

  -- Strength Exercise Config
  allows_weight BOOLEAN NOT NULL DEFAULT TRUE,  -- False for bodyweight-only exercises
  allows_reps BOOLEAN NOT NULL DEFAULT TRUE,

  -- Cardio Exercise Config (Phase 2)
  tracks_distance BOOLEAN NOT NULL DEFAULT FALSE,
  tracks_duration BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_exercises_skill_id ON exercises(skill_id);
CREATE INDEX idx_exercises_is_primary ON exercises(is_primary);

-- Seed Data: Push Skill Exercises (MVP)
INSERT INTO exercises (skill_id, name, slug, is_primary, exercise_category) VALUES
  (1, 'Barbell Bench Press', 'barbell-bench-press', TRUE, 'strength'),
  (1, 'Incline Barbell Bench Press', 'incline-barbell-bench-press', FALSE, 'strength'),
  (1, 'Decline Barbell Bench Press', 'decline-barbell-bench-press', FALSE, 'strength'),
  (1, 'Dumbbell Bench Press', 'dumbbell-bench-press', FALSE, 'strength'),
  (1, 'Incline Dumbbell Bench Press', 'incline-dumbbell-bench-press', FALSE, 'strength'),
  (1, 'Barbell Overhead Press', 'barbell-overhead-press', FALSE, 'strength'),
  (1, 'Dumbbell Overhead Press', 'dumbbell-overhead-press', FALSE, 'strength'),
  (1, 'Dips', 'dips', FALSE, 'strength'),
  (1, 'Push-ups', 'push-ups', FALSE, 'strength');

-- Pull Skill Exercises (MVP)
INSERT INTO exercises (skill_id, name, slug, is_primary, exercise_category) VALUES
  (2, 'Conventional Deadlift', 'conventional-deadlift', TRUE, 'strength'),
  (2, 'Romanian Deadlift', 'romanian-deadlift', FALSE, 'strength'),
  (2, 'Sumo Deadlift', 'sumo-deadlift', FALSE, 'strength'),
  (2, 'Trap Bar Deadlift', 'trap-bar-deadlift', FALSE, 'strength'),
  (2, 'Barbell Row', 'barbell-row', FALSE, 'strength'),
  (2, 'Pendlay Row', 'pendlay-row', FALSE, 'strength'),
  (2, 'Pull-ups', 'pull-ups', FALSE, 'strength'),
  (2, 'Chin-ups', 'chin-ups', FALSE, 'strength'),
  (2, 'Lat Pulldown', 'lat-pulldown', FALSE, 'strength'),
  (2, 'Cable Row', 'cable-row', FALSE, 'strength');

-- Legs Skill Exercises (MVP)
INSERT INTO exercises (skill_id, name, slug, is_primary, exercise_category) VALUES
  (3, 'Barbell Back Squat', 'barbell-back-squat', TRUE, 'strength'),
  (3, 'Front Squat', 'front-squat', FALSE, 'strength'),
  (3, 'Goblet Squat', 'goblet-squat', FALSE, 'strength'),
  (3, 'Bulgarian Split Squat', 'bulgarian-split-squat', FALSE, 'strength'),
  (3, 'Leg Press', 'leg-press', FALSE, 'strength'),
  (3, 'Hack Squat', 'hack-squat', FALSE, 'strength'),
  (3, 'Barbell Lunges', 'barbell-lunges', FALSE, 'strength'),
  (3, 'Dumbbell Lunges', 'dumbbell-lunges', FALSE, 'strength'),
  (3, 'Step-ups', 'step-ups', FALSE, 'strength');

-- Endurance Exercises (Phase 2 - seed but mark skill as inactive)
INSERT INTO exercises (skill_id, name, slug, is_primary, exercise_category, allows_weight, tracks_distance, tracks_duration) VALUES
  (4, '5K Run', '5k-run', TRUE, 'cardio', FALSE, TRUE, TRUE),
  (4, 'Long Run', 'long-run', FALSE, 'cardio', FALSE, TRUE, TRUE),
  (4, 'Cycling', 'cycling', FALSE, 'cardio', FALSE, TRUE, TRUE),
  (4, 'Rowing', 'rowing', FALSE, 'cardio', FALSE, TRUE, TRUE),
  (4, 'Swimming', 'swimming', FALSE, 'cardio', FALSE, TRUE, TRUE);

-- Hit Points (HIIT) Exercises (Phase 2)
INSERT INTO exercises (skill_id, name, slug, is_primary, exercise_category, allows_weight, tracks_duration) VALUES
  (5, 'Tabata Intervals', 'tabata-intervals', TRUE, 'hiit', FALSE, TRUE),
  (5, 'Sprint Intervals', 'sprint-intervals', FALSE, 'hiit', FALSE, TRUE),
  (5, 'Assault Bike HIIT', 'assault-bike-hiit', FALSE, 'hiit', FALSE, TRUE),
  (5, 'Burpees', 'burpees', FALSE, 'hiit', FALSE, TRUE);

-- Defense (Mobility) Exercises (Phase 2)
INSERT INTO exercises (skill_id, name, slug, is_primary, exercise_category, allows_weight, allows_reps, tracks_duration) VALUES
  (6, 'Deep Squat Hold', 'deep-squat-hold', TRUE, 'mobility', FALSE, FALSE, TRUE),
  (6, 'Yoga Session', 'yoga-session', FALSE, 'mobility', FALSE, FALSE, TRUE),
  (6, 'Foam Rolling', 'foam-rolling', FALSE, 'mobility', FALSE, FALSE, TRUE),
  (6, 'Stretching Routine', 'stretching-routine', FALSE, 'mobility', FALSE, FALSE, TRUE),
  (6, 'Sit and Reach', 'sit-and-reach', FALSE, 'mobility', FALSE, FALSE, FALSE);
```

**Design Notes:**
- `is_primary` = TRUE for exercises that affect tier (Bench/Deadlift/Squat for strength, 5K for endurance, etc.)
- Boolean flags (`allows_weight`, `tracks_distance`, etc.) define what metrics to track per exercise
- Phase 2 exercises seeded but linked to inactive skills

---

### 6. `workouts`

Tracks individual workout sessions.

```sql
CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  skill_id INTEGER NOT NULL REFERENCES skills(id),

  -- Workout Metadata
  workout_date DATE NOT NULL,
  intensity INTEGER NOT NULL CHECK (intensity >= 1 AND intensity <= 10),
  length_minutes INTEGER NOT NULL CHECK (length_minutes >= 5 AND length_minutes <= 120),

  -- XP Calculation
  base_xp INTEGER NOT NULL, -- (Intensity × 5) + (Length ÷ 5)
  pr_bonus_xp INTEGER NOT NULL DEFAULT 0, -- +50 if PR achieved
  total_xp INTEGER NOT NULL, -- base_xp + pr_bonus_xp

  -- Status Flags
  achieved_pr BOOLEAN NOT NULL DEFAULT FALSE,
  achieved_level_up BOOLEAN NOT NULL DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_workouts_character_id ON workouts(character_id);
CREATE INDEX idx_workouts_skill_id ON workouts(skill_id);
CREATE INDEX idx_workouts_date ON workouts(workout_date DESC);
CREATE INDEX idx_workouts_character_date ON workouts(character_id, workout_date DESC);

-- Trigger: Update updated_at on modification
CREATE TRIGGER update_workouts_updated_at
  BEFORE UPDATE ON workouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Design Notes:**
- `skill_id` allows filtering workouts by skill for Skills view
- `workout_date` allows past-dating workouts (not locked to current date)
- `base_xp` calculated via formula: `(intensity × 5) + (length_minutes ÷ 5)`
- `pr_bonus_xp` = 50 if PR achieved in this workout, 0 otherwise
- Indexes optimized for dashboard queries (recent workouts per character)

---

### 7. `workout_exercises`

Links exercises to workouts (many-to-many).

```sql
CREATE TABLE workout_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id),

  -- Exercise Order (for display)
  exercise_order INTEGER NOT NULL DEFAULT 1,

  -- Strength: Top Set Tracking
  top_set_id UUID REFERENCES workout_sets(id), -- Highest calculated 1RM set for this exercise

  -- Cardio: Duration + intensity live here (no workout_sets for cardio)
  duration_minutes INTEGER,                                           -- Cardio only
  intensity VARCHAR(10) CHECK (intensity IN ('low', 'med', 'high')),  -- Cardio only

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_workout_exercises_workout_id ON workout_exercises(workout_id);
CREATE INDEX idx_workout_exercises_exercise_id ON workout_exercises(exercise_id);

-- Unique: Prevent duplicate exercises in same workout
CREATE UNIQUE INDEX idx_workout_exercises_unique
  ON workout_exercises(workout_id, exercise_id);
```

**Design Notes:**
- `exercise_order` allows user to log exercises in specific order (displayed in workout summary)
- `top_set_id` points to the "winning" set (highest 1RM) for strength exercises
- `duration_minutes` + `intensity` (migration 013) are populated instead of `workout_sets` rows for cardio exercises. XP is computed directly from these two fields in `log_cardio_workout`.

---

### 8. `workout_sets`

Individual sets within an exercise.

```sql
CREATE TABLE workout_sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_exercise_id UUID NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,

  -- Set Details
  set_number INTEGER NOT NULL,

  -- Strength Metrics
  weight_lbs DECIMAL(6,2), -- Null = bodyweight exercise
  reps INTEGER,
  rpe DECIMAL(3,1) CHECK (rpe >= 6.0 AND rpe <= 10.0), -- Optional: Rate of Perceived Exertion
  calculated_1rm DECIMAL(7,2), -- Weight × (1 + (Reps / 30))

  -- Cardio Metrics (Phase 2)
  distance DECIMAL(10,2),
  distance_unit VARCHAR(10),
  duration_seconds INTEGER,

  -- HIIT Metrics (Phase 2)
  intervals_completed INTEGER,
  avg_heart_rate INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_workout_sets_exercise_id ON workout_sets(workout_exercise_id);
CREATE INDEX idx_workout_sets_1rm ON workout_sets(calculated_1rm DESC); -- For PR queries
```

**Design Notes:**
- `set_number` allows ordering (Set 1, Set 2, etc.)
- `weight_lbs` can be NULL for bodyweight exercises (pull-ups, dips)
- `calculated_1rm` computed on insert/update: `weight_lbs × (1 + (reps / 30))`
- `rpe` is optional (6.0 - 10.0 scale) for lifters who track perceived exertion
- Cardio/HIIT metrics added for Phase 2 but nullable for MVP

---

## Skill System Architecture

### How Skills Work Across Different Types

The `skills` table is flexible enough to handle two progression systems side-by-side:

**Strength Skills (Push, Pull, Legs):**
- Primary metric: 1RM (Epley: `weight × (1 + reps/30)`, reps capped at 10; reps=1 returns weight directly)
- Tier gate: `1RM / bodyweight_lbs` multiplier vs. `skills.tier_thresholds.tiers[].min_multiplier`
- XP: `(intensity × 5) + (length / 5)`, split proportionally by set count across skills in a multi-skill workout, + up to 2× 50-XP PR bonuses per skill (estimated PR and real PR can both fire)
- Progression: Log workouts → Set PRs → Advance multiplier tier

**Cardio Skills (Endurance, Hit Points, Defense):**
- Primary metric: Cumulative XP (no PRs, no hero lift)
- Tier gate: `current_xp` vs. `skills.tier_thresholds.tiers[].min_xp`
- XP: `ROUND(duration_minutes × intensity_multiplier × scale_factor)` per exercise (`low=0.75`, `med=1.0`, `high=1.5`; `scale_factor=2.0` for all three skills). Calculated independently per exercise, not split proportionally.
- Progression: Log duration + intensity → Accumulate XP → Cross XP milestones to advance tiers
- No `workout_sets` rows are created; duration/intensity live on `workout_exercises`.

**Future (not implemented):** A dedicated Running skill may use pace-based XP (pace vs. PR pace) instead of duration-based. Endurance stays time-based for now to keep multi-activity (cycling, rowing, etc.) consistent.

### Character Level Calculation

Character level = `FLOOR(AVG(current_level))` across all **active** skills (`skills.is_active = TRUE`). With cardio skills now active, this averages all 6.

**Implementation:**
- Computed via PostgreSQL trigger on `user_skills` updates
- Updates `characters.character_level` automatically
- Inactive skills (if any are ever deactivated) are excluded from the average

---

## Implementation Phases

### Phase 1: Strength Skills ✅ Shipped

Migrations 001–012.

- All core tables + reference data (character_classes, skills, exercises)
- `create_character_with_skills` RPC initializes all 6 `user_skills` rows at signup
- `log_multi_skill_workout` RPC handles atomic strength workout logging, PR detection, tier updates
- Dual PR system (estimated 1RM + real max weight lifted) — migration 012
- PRs fire on any rep count (migration 010), not just singles

### Phase 2: Cardio / Holistic Fitness ✅ Shipped

Migrations 013–016.

- Cardio skills activated (`is_active = TRUE` for Endurance/HP/Defense) — migration 013
- `workout_exercises.duration_minutes` and `intensity` columns added for cardio logging
- Cardio `tier_thresholds` rewritten as XP-milestone structure (`type: "xp"`, `scale_factor: 2.0`)
- `log_cardio_workout` RPC (migration 014): computes per-exercise XP via `duration × intensity_multiplier × scale_factor`, advances XP-milestone tiers, supports multi-skill sessions (e.g. run + yoga) without proportional splitting
- Tier names standardized to OSRS convention across all skills — migration 015
- Security hardening — migration 016: RLS on `total_strength_tiers`, ownership checks on `create_character_with_skills` and `log_multi_skill_workout`

**Not yet implemented (future work):**
- Stats row on dashboard (Total XP, Sessions, Day Streak)
- Workout history calendar / list view
- Dedicated pace-based Running skill

---

## Sample Queries

### 1. Get Character Dashboard Data

```sql
-- Fetch character with all skill progression
SELECT
  c.name AS character_name,
  c.character_level,
  c.bodyweight_lbs,
  c.total_strength_1rm,
  cc.name AS class_name,

  -- Aggregate skill data
  json_agg(
    json_build_object(
      'skill_name', s.name,
      'skill_slug', s.slug,
      'skill_color', s.color_hex,
      'current_level', us.current_level,
      'current_xp', us.current_xp,
      'current_tier', us.current_tier,
      'tier_multiplier', us.tier_multiplier,
      'last_workout', us.last_workout_at
    )
  ) AS skills

FROM characters c
JOIN character_classes cc ON c.class_id = cc.id
JOIN user_skills us ON us.character_id = c.id
JOIN skills s ON us.skill_id = s.id

WHERE c.user_id = $1 -- Current user's ID
GROUP BY c.id, cc.name;
```

---

### 2. Get Recent Workouts (History Calendar)

```sql
-- Fetch last 90 days of workouts for calendar heatmap
SELECT
  w.workout_date,
  s.name AS skill_name,
  s.color_hex AS skill_color,
  w.total_xp,
  w.achieved_pr

FROM workouts w
JOIN skills s ON w.skill_id = s.id

WHERE w.character_id = $1
  AND w.workout_date >= CURRENT_DATE - INTERVAL '90 days'

ORDER BY w.workout_date DESC;
```

---

### 3. Get Detailed Workout (Click on Calendar Date)

```sql
-- Fetch workout details with all exercises and sets
SELECT
  w.id AS workout_id,
  w.workout_date,
  w.intensity,
  w.length_minutes,
  w.total_xp,
  w.achieved_pr,
  s.name AS skill_name,

  -- Exercises in workout
  json_agg(
    json_build_object(
      'exercise_name', e.name,
      'sets', (
        SELECT json_agg(
          json_build_object(
            'set_number', ws.set_number,
            'weight_lbs', ws.weight_lbs,
            'reps', ws.reps,
            'rpe', ws.rpe,
            'calculated_1rm', ws.calculated_1rm
          )
        )
        FROM workout_sets ws
        WHERE ws.workout_exercise_id = we.id
        ORDER BY ws.set_number
      )
    )
  ) AS exercises

FROM workouts w
JOIN skills s ON w.skill_id = s.id
JOIN workout_exercises we ON we.workout_id = w.id
JOIN exercises e ON we.exercise_id = e.id

WHERE w.id = $1

GROUP BY w.id, s.name;
```

---

### 4. Calculate Top Set (Highest 1RM) for Exercise

```sql
-- Find top set for a given workout_exercise
SELECT
  id AS set_id,
  set_number,
  weight_lbs,
  reps,
  calculated_1rm

FROM workout_sets

WHERE workout_exercise_id = $1

ORDER BY calculated_1rm DESC NULLS LAST

LIMIT 1;
```

---

### 5. Detect PR (Compare to Historical Best)

```sql
-- Check if new set beats current PR for a skill
WITH current_pr AS (
  SELECT
    current_pr_calculated_1rm
  FROM user_skills
  WHERE character_id = $1 AND skill_id = $2
),
new_top_set AS (
  SELECT
    MAX(ws.calculated_1rm) AS best_1rm
  FROM workout_sets ws
  JOIN workout_exercises we ON ws.workout_exercise_id = we.id
  WHERE we.workout_id = $3 -- Current workout
)
SELECT
  CASE
    WHEN new_top_set.best_1rm > current_pr.current_pr_calculated_1rm THEN TRUE
    ELSE FALSE
  END AS is_new_pr,
  current_pr.current_pr_calculated_1rm AS old_pr,
  new_top_set.best_1rm AS new_pr
FROM current_pr, new_top_set;
```

---

### 6. Update Character Level (Trigger Function)

```sql
-- Trigger function to update character level when user_skills change
CREATE OR REPLACE FUNCTION update_character_level()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE characters
  SET character_level = (
    SELECT FLOOR(AVG(current_level))
    FROM user_skills
    WHERE character_id = NEW.character_id
  )
  WHERE id = NEW.character_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to user_skills
CREATE TRIGGER trigger_update_character_level
AFTER INSERT OR UPDATE OF current_level ON user_skills
FOR EACH ROW
EXECUTE FUNCTION update_character_level();
```

---

### 7. Calculate Tier from 1RM and Bodyweight

```sql
-- Calculate current tier for a strength skill
WITH user_data AS (
  SELECT
    c.bodyweight_lbs,
    us.current_pr_calculated_1rm,
    s.tier_thresholds
  FROM characters c
  JOIN user_skills us ON us.character_id = c.id
  JOIN skills s ON us.skill_id = s.id
  WHERE c.user_id = $1 AND s.slug = $2 -- e.g., 'push'
),
multiplier AS (
  SELECT
    (current_pr_calculated_1rm / bodyweight_lbs) AS tier_multiplier,
    tier_thresholds
  FROM user_data
)
SELECT
  tier_multiplier,
  -- Parse tier thresholds from JSONB and find matching tier
  (
    SELECT tier->>'name'
    FROM jsonb_array_elements(tier_thresholds->'tiers') AS tier
    WHERE
      (tier->>'min_multiplier')::DECIMAL <= tier_multiplier
      AND (tier->>'max_multiplier' IS NULL OR (tier->>'max_multiplier')::DECIMAL > tier_multiplier)
    LIMIT 1
  ) AS current_tier
FROM multiplier;
```

---

## RPC Functions

All write-path operations go through `SECURITY DEFINER` RPC functions so client code never touches raw tables:

| RPC | Purpose | Ownership check |
|-----|---------|-----------------|
| `create_character_with_skills(p_user_id, p_name, p_class_id, p_bodyweight_lbs)` | Creates character and seeds 6 `user_skills` rows | `p_user_id = auth.uid()` (migration 016) |
| `log_multi_skill_workout(p_character_id, p_workout_date, p_intensity, p_length_minutes, p_exercises JSONB)` | Atomic strength workout: inserts exercises/sets, splits XP by set count, detects PRs, updates tiers/levels | Character must belong to `auth.uid()` (migration 016) |
| `log_cardio_workout(p_character_id, p_workout_date, p_exercises JSONB)` | Atomic cardio workout: inserts `workout_exercises` with duration + intensity, awards XP per exercise, advances XP-milestone tiers. No PR detection. | Character must belong to `auth.uid()` (migration 014) |
| `get_exercise_prs(p_character_id)` | Returns best `calculated_1rm` and `max_weight_lifted` per exercise for dashboard display | Relies on RLS |

**Cardio `p_exercises` payload shape:**

```json
[
  { "exerciseId": 12, "durationMinutes": 30, "intensity": "med" },
  { "exerciseId": 18, "durationMinutes": 15, "intensity": "low" }
]
```

Validation inside `log_cardio_workout`: `durationMinutes` must be 1–300, `intensity` must be `low`/`med`/`high`, and each `exerciseId` must belong to a skill with `skill_type` in `('cardio','hiit','mobility')`.

---

## Migration Strategy

### Initial Setup (Phase 1 MVP)

**Step 1: Create Tables**
1. Run table creation scripts in order:
   - `character_classes`
   - `skills`
   - `exercises`
   - `characters`
   - `user_skills`
   - `workouts`
   - `workout_exercises`
   - `workout_sets`

**Step 2: Seed Reference Data**
1. Insert 6 character classes
2. Insert 6 skills (3 active, 3 inactive)
3. Insert exercises for all skills

**Step 3: Set Up Triggers**
1. `update_updated_at_column()` function
2. `update_character_level()` function
3. Attach triggers to relevant tables

**Step 4: Row-Level Security (Supabase)**
1. Enable RLS on all user-data tables
2. Create policies:
   - Users can only read/write their own character data
   - Reference tables (skills, exercises, classes) are read-only for all authenticated users

**Example RLS Policy:**

```sql
-- Characters: Users can only access their own character
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own character"
  ON characters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own character"
  ON characters FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own character"
  ON characters FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

---

### Phase 2 Migration (Cardio/HIIT/Mobility) — Shipped

Delivered via migrations 013–016. Highlights:

- `013_activate_cardio_skills.sql`: flipped `is_active = TRUE` for skills 4/5/6, cleared `is_primary` on their exercises, added `workout_exercises.duration_minutes` + `intensity` columns, rewrote cardio `tier_thresholds` to XP-milestone structure with `scale_factor = 2.0`.
- `014_log_cardio_workout.sql`: `log_cardio_workout` RPC.
- `015_standardize_tier_names.sql`: renamed strength tier thresholds to OSRS convention (Bronze → Iron → Steel → Mithril → Adamantite → Rune → Dragon → Obsidian → Barrows → Bandos → Torva → Greek God) and remapped existing `user_skills.current_tier` values through a two-pass rename to avoid collisions.
- `016_security_hardening.sql`: RLS on `total_strength_tiers`, ownership checks on `create_character_with_skills` and `log_multi_skill_workout`.

No further schema changes required — all tables already supported cardio via the XP system.

### Full Migration List

| # | File | Purpose |
|---|------|---------|
| 001 | `001_initial_schema.sql` | Core tables |
| 002 | `002_seed_reference_data.sql` | Classes, skills, exercises |
| 003 | `003_create_triggers.sql` | 1RM calc, character level, total strength |
| 004 | `004_row_level_security.sql` | RLS policies |
| 005 | `005_character_creation_function.sql` | `create_character_with_skills` |
| 006 | `006_log_workout_function.sql` | Legacy single-skill logger (superseded) |
| 007 | `007_multi_skill_workout.sql` | `log_multi_skill_workout` + nullable `workouts.skill_id` |
| 008 | `008_get_exercise_prs.sql` | `get_exercise_prs` RPC |
| 009 | `009_fix_1rm_and_pr_logic.sql` | reps=1 returns weight directly |
| 010 | `010_pr_any_rep_count.sql` | PRs fire on any rep count; surfaces `max_weight_lifted` in `get_exercise_prs` |
| 011 | `011_recalculate_prs.sql` | Backfill `user_skills` PRs from workout history |
| 012 | `012_real_pr_tracking.sql` | Add `max_weight_lifted` columns + dual PR bonus |
| 013 | `013_activate_cardio_skills.sql` | Activate cardio skills, add duration/intensity columns, XP-milestone tiers |
| 014 | `014_log_cardio_workout.sql` | `log_cardio_workout` RPC |
| 015 | `015_standardize_tier_names.sql` | OSRS tier names across all skills |
| 016 | `016_security_hardening.sql` | RLS on `total_strength_tiers`, RPC ownership checks |

---

## Database Functions & Triggers

### 1. `update_updated_at_column()`

Automatically updates `updated_at` timestamp on row modification.

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

### 2. `calculate_1rm()`

Calculates 1RM for a workout set (triggered on insert/update).

```sql
CREATE OR REPLACE FUNCTION calculate_1rm()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.weight_lbs IS NOT NULL AND NEW.reps IS NOT NULL THEN
    -- Cap reps at 10 for calculation
    NEW.calculated_1rm = NEW.weight_lbs * (1 + (LEAST(NEW.reps, 10)::DECIMAL / 30));
  ELSE
    NEW.calculated_1rm = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach to workout_sets
CREATE TRIGGER trigger_calculate_1rm
BEFORE INSERT OR UPDATE OF weight_lbs, reps ON workout_sets
FOR EACH ROW
EXECUTE FUNCTION calculate_1rm();
```

---

### 3. `update_character_level()`

Recalculates character level when any skill level changes.

```sql
CREATE OR REPLACE FUNCTION update_character_level()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE characters
  SET character_level = (
    SELECT FLOOR(AVG(current_level))
    FROM user_skills
    WHERE character_id = NEW.character_id
      AND skill_id IN (SELECT id FROM skills WHERE is_active = TRUE)
  )
  WHERE id = NEW.character_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach to user_skills
CREATE TRIGGER trigger_update_character_level
AFTER INSERT OR UPDATE OF current_level ON user_skills
FOR EACH ROW
EXECUTE FUNCTION update_character_level();
```

---

### 4. `update_total_strength()`

Recalculates Total Strength (sum of Push/Pull/Legs 1RMs) when any strength skill PR changes.

```sql
CREATE OR REPLACE FUNCTION update_total_strength()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE characters
  SET total_strength_1rm = (
    SELECT COALESCE(SUM(current_pr_calculated_1rm), 0)
    FROM user_skills
    WHERE character_id = NEW.character_id
      AND skill_id IN (1, 2, 3) -- Push, Pull, Legs
  )
  WHERE id = NEW.character_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach to user_skills
CREATE TRIGGER trigger_update_total_strength
AFTER INSERT OR UPDATE OF current_pr_calculated_1rm ON user_skills
FOR EACH ROW
EXECUTE FUNCTION update_total_strength();
```

---

## Design Trade-offs & Decisions

### Why PostgreSQL (Supabase) over NoSQL?

**Pros:**
- Relational data model fits naturally (workouts → exercises → sets)
- Strong referential integrity prevents orphaned data
- Powerful joins for complex queries (dashboard aggregations)
- JSONB support for flexible tier thresholds without schema changes
- Mature ecosystem and tooling

**Cons:**
- Slightly more complex schema design upfront
- Requires understanding of SQL and relationships

**Decision:** PostgreSQL is the right choice for this use case. The data is inherently relational, and we need strong consistency guarantees.

---

### Why JSONB for Tier Thresholds?

**Pros:**
- Allows different tier structures per skill type (strength = multipliers, cardio = times)
- No schema migration needed to adjust tier thresholds
- Easy to query and update via Supabase dashboard
- Can add new tiers (e.g., "Platinum") without code changes

**Cons:**
- Slightly less type-safe than separate columns
- Requires JSONB query syntax for tier lookups

**Decision:** JSONB provides the flexibility needed for 6 different skill types while maintaining simplicity. PostgreSQL's JSONB support is excellent and performant.

---

### Why Separate `workout_exercises` and `workout_sets` Tables?

**Pros:**
- Normalized design prevents data duplication
- Easy to query "all sets for this exercise"
- Supports multiple exercises per workout cleanly
- Allows proper top set tracking via foreign key

**Cons:**
- Requires joins to fetch full workout data

**Decision:** Normalized design is correct here. The join cost is minimal, and data integrity is more important than minor performance gains.

---

### Why `is_active` Flag on Skills?

**Pros:**
- Allows seeding Phase 2 skills without exposing them in UI
- Clean migration path (just flip flag to `TRUE`)
- Enables "Coming Soon" teasers in UI

**Cons:**
- Could alternatively use `phase` field alone

**Decision:** Explicit `is_active` flag is clearer and more maintainable than implicit phase-based logic.

---

## Security Considerations

### Row-Level Security (RLS)

**Critical:** Enable RLS on all user-data tables to prevent unauthorized access.

**Tables Requiring RLS:**
- `characters`
- `user_skills`
- `workouts`
- `workout_exercises`
- `workout_sets`

**Public Read-Only Tables:**
- `skills`
- `exercises`
- `character_classes`

**Policy Template:**

```sql
-- Allow users to access only their own data
CREATE POLICY "policy_name"
  ON table_name
  FOR ALL
  USING (
    character_id IN (
      SELECT id FROM characters WHERE user_id = auth.uid()
    )
  );
```

---

### Data Validation

**Application-Level Validation:**
- Workout intensity: 1-10
- Length: 5-120 minutes
- Bodyweight: 50-500 lbs
- Character name: 3-30 chars
- RPE: 6.0-10.0

**Database-Level Constraints:**
- All validation rules enforced via `CHECK` constraints
- Foreign key constraints prevent orphaned records
- `NOT NULL` constraints on critical fields

**Both layers provide defense in depth.**

---

## Performance Optimization

### Indexes

**Primary Indexes (Already Defined):**
- `characters(user_id)` - Fast character lookup by auth user
- `user_skills(character_id)` - Fast skill queries for character
- `workouts(character_id, workout_date DESC)` - Fast recent workout queries
- `workout_sets(calculated_1rm DESC)` - Fast PR detection

**Future Indexes (Add if needed):**
- `workouts(skill_id, workout_date DESC)` - If skill-specific history queries are slow
- `workout_sets(workout_exercise_id, calculated_1rm DESC)` - If top set queries are slow

**Monitoring:**
- Use Supabase query analyzer to identify slow queries
- Add indexes only when proven necessary (avoid premature optimization)

---

### Query Optimization

**Dashboard Query:**
- Current design: 1 query fetches character + all skills via JSON aggregation
- Alternative: Separate queries per skill (6 queries total)
- **Decision:** Single aggregated query is faster (1 round-trip)

**Calendar Heatmap Query:**
- Current design: Fetch last 90 days in single query
- Pagination not needed (90 days = ~90 rows max)

**Workout Detail Query:**
- Nested JSON aggregation for exercises + sets
- Alternative: 3 separate queries (workout, exercises, sets)
- **Decision:** Single query is cleaner and performant enough for typical workout size

---

## Next Steps: Implementation Checklist

### Phase 1 MVP Implementation

- [ ] **Database Setup**
  - [ ] Create Supabase project
  - [ ] Run table creation scripts
  - [ ] Seed reference data (skills, exercises, classes)
  - [ ] Set up triggers and functions
  - [ ] Configure Row-Level Security policies
  - [ ] Test database locally

- [ ] **Character Creation Flow**
  - [ ] Build character creation form (name, class, bodyweight)
  - [ ] Insert into `characters` table on signup
  - [ ] Initialize 6 `user_skills` records (3 active, 3 locked)
  - [ ] Redirect to dashboard after creation

- [ ] **Workout Logging**
  - [ ] Build workout form (date, intensity, length)
  - [ ] Exercise selection (dropdown filtered by skill)
  - [ ] Set logging (weight, reps, optional RPE)
  - [ ] Calculate XP and insert workout
  - [ ] Detect PR and update `user_skills` if applicable
  - [ ] Award level-up if XP threshold crossed

- [ ] **Dashboard View**
  - [ ] Fetch character + skills data
  - [ ] Display character card
  - [ ] Display 3 skill progress bars
  - [ ] Show quick-start workout buttons
  - [ ] Display last workout timestamp
  - [ ] Show "3 more skills coming soon" teaser

- [ ] **Skills View**
  - [ ] Fetch detailed skill stats
  - [ ] Display 3 skill cards with:
    - Current PR (weight × reps)
    - Calculated 1RM
    - Current tier + badge
    - Progress to next tier
    - XP progress to next level
    - Recent workout history

- [ ] **Workout History**
  - [ ] Build calendar heatmap (GitHub-style)
  - [ ] Color-code by skill
  - [ ] Click date to view workout details
  - [ ] Show streak counter (if applicable)

- [ ] **Testing**
  - [ ] Create test account
  - [ ] Log 5-10 workouts across all 3 skills
  - [ ] Verify XP calculations
  - [ ] Verify PR detection
  - [ ] Verify tier calculations
  - [ ] Test edge cases (bodyweight exercises, high reps, etc.)

### Phase 2: Cardio / HIIT / Mobility ✅ Shipped

- [x] **Activate Phase 2 Skills** — migration 013
- [x] **Cardio workout logging** — duration + intensity on `workout_exercises`, `log_cardio_workout` RPC (migration 014)
- [x] **XP-milestone tier calculation** for cardio skills — `skills.tier_thresholds.type = "xp"` with `scale_factor = 2.0`
- [x] **Dashboard + log-workout UI** for all 6 skills, character level averages all active skills

---

## Conclusion

This data model is designed to support StrengthQuest's full vision while allowing rapid MVP deployment. Key strengths:

1. **Flexible:** Handles 6 different skill types with one schema
2. **Future-Proof:** Phase 2 skills designed in from day one, no refactoring needed
3. **Performant:** Indexed for common queries, optimized for dashboard loads
4. **Secure:** Row-level security prevents unauthorized data access
5. **Maintainable:** Clear relationships, enforced constraints, self-documenting structure

**Ready to implement!** 🎮💪

---

**Next Document:** `ImplementationPlan.md` - Step-by-step guide to building the MVP
