# StrengthQuest Database Migrations

This directory contains SQL migration files for setting up the StrengthQuest database in Supabase.

## Migration Files

1. **001_initial_schema.sql** - Creates all core tables (characters, skills, workouts, exercises, etc.)
2. **002_seed_reference_data.sql** - Seeds character classes, skills, and exercises
3. **003_create_triggers.sql** - Creates database triggers (1RM calculation, character level updates, etc.)
4. **004_row_level_security.sql** - Configures Row-Level Security policies

## How to Run Migrations

### Option 1: Supabase Dashboard (Recommended for First Time)

1. **Go to your Supabase project:**
   - URL: https://supabase.com/dashboard/project/psrslazqzsymzgjuwhex

2. **Navigate to SQL Editor:**
   - Click "SQL Editor" in the left sidebar

3. **Run each migration in order:**
   - Click "New Query"
   - Copy the contents of `001_initial_schema.sql`
   - Paste into the query editor
   - Click "Run" (or press Ctrl+Enter)
   - Verify no errors (check bottom panel for results)
   - Repeat for migrations 002, 003, and 004

4. **Verification:**
   - Go to "Table Editor" in left sidebar
   - You should see all tables: characters, user_skills, workouts, etc.
   - Go to "Database" → "Tables" to see table structures

### Option 2: Supabase CLI (For Future Migrations)

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref psrslazqzsymzgjuwhex

# Run migrations
supabase db push
```

## Post-Migration Verification

### 1. Check Tables Created

Run this query in SQL Editor:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Expected tables:
- character_classes
- characters
- exercises
- skills
- total_strength_tiers
- user_skills
- workout_exercises
- workout_sets
- workouts

### 2. Check Reference Data Seeded

```sql
-- Check character classes (should be 6)
SELECT COUNT(*) FROM character_classes;

-- Check Total Strength tiers (should be 12)
SELECT tier_name, min_multiplier, max_multiplier FROM total_strength_tiers ORDER BY display_order;

-- Check skills (should be 6: 3 active, 3 inactive)
SELECT id, name, slug, is_active, phase FROM skills ORDER BY phase, id;

-- Check exercises (should be ~53 total)
SELECT skill_id, COUNT(*) AS exercise_count
FROM exercises
GROUP BY skill_id
ORDER BY skill_id;
```

### 3. Verify Triggers

```sql
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
```

Expected triggers:
- `trigger_calculate_1rm` on `workout_sets`
- `trigger_update_character_level` on `user_skills`
- `trigger_update_total_strength` on `user_skills`
- `trigger_update_last_workout_timestamp` on `workouts`
- `update_*_updated_at` on various tables

### 4. Test 1RM Calculation

Create a test character and workout to verify 1RM calculation works:

```sql
-- Insert test character (replace 'YOUR_USER_ID' with actual auth.uid())
INSERT INTO characters (user_id, name, class_id, bodyweight_lbs)
VALUES ('YOUR_USER_ID', 'TestWarrior', 1, 200);

-- Get character ID
SELECT id FROM characters WHERE user_id = 'YOUR_USER_ID';

-- Initialize skills for test character (replace 'CHARACTER_ID')
INSERT INTO user_skills (character_id, skill_id)
SELECT 'CHARACTER_ID', id FROM skills;

-- Insert test workout
INSERT INTO workouts (character_id, skill_id, workout_date, intensity, length_minutes, base_xp, total_xp)
VALUES ('CHARACTER_ID', 1, CURRENT_DATE, 8, 60, 52, 52);

-- Get workout ID
SELECT id FROM workouts WHERE character_id = 'CHARACTER_ID' ORDER BY created_at DESC LIMIT 1;

-- Insert test exercise
INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
VALUES ('WORKOUT_ID', 1, 1);  -- Exercise 1 = Barbell Bench Press

-- Get workout_exercise ID
SELECT id FROM workout_exercises WHERE workout_id = 'WORKOUT_ID';

-- Insert test set (225 lbs × 5 reps)
INSERT INTO workout_sets (workout_exercise_id, set_number, weight_lbs, reps)
VALUES ('WORKOUT_EXERCISE_ID', 1, 225, 5);

-- Check calculated 1RM (should be 262.5 lbs)
SELECT weight_lbs, reps, calculated_1rm
FROM workout_sets
WHERE workout_exercise_id = 'WORKOUT_EXERCISE_ID';
```

Expected result: `calculated_1rm = 262.5` (225 × 1.167)

### 5. Verify Row-Level Security

```sql
-- Check RLS is enabled on all user data tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

All tables should show `rowsecurity = true`.

```sql
-- List all RLS policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

You should see policies for SELECT, INSERT, UPDATE, DELETE on each table.

## Troubleshooting

### Error: "relation already exists"

If you need to re-run migrations:

```sql
-- Drop all tables (WARNING: This deletes all data!)
DROP TABLE IF EXISTS workout_sets CASCADE;
DROP TABLE IF EXISTS workout_exercises CASCADE;
DROP TABLE IF EXISTS workouts CASCADE;
DROP TABLE IF EXISTS user_skills CASCADE;
DROP TABLE IF EXISTS characters CASCADE;
DROP TABLE IF EXISTS exercises CASCADE;
DROP TABLE IF EXISTS skills CASCADE;
DROP TABLE IF EXISTS character_classes CASCADE;
DROP TABLE IF EXISTS total_strength_tiers CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS calculate_1rm() CASCADE;
DROP FUNCTION IF EXISTS update_character_level() CASCADE;
DROP FUNCTION IF EXISTS update_total_strength() CASCADE;
DROP FUNCTION IF EXISTS update_last_workout_timestamp() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Then re-run migrations 001-004
```

### Error: "permission denied"

Make sure you're running queries in the Supabase SQL Editor with admin privileges, not as a regular authenticated user.

### RLS Blocking Queries

If you're testing in the SQL Editor and RLS is preventing access:

1. Go to "Table Editor"
2. Click on the table
3. Use the UI to insert/view data (it runs as service role, bypassing RLS)

Or temporarily disable RLS for testing:

```sql
ALTER TABLE characters DISABLE ROW LEVEL SECURITY;
-- ... test queries ...
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
```

## Next Steps

After migrations are complete:

1. ✅ Database schema is set up
2. ✅ Reference data is seeded
3. ✅ Triggers are working
4. ✅ RLS is configured

Next up:
- Create character creation flow (`app/character-creation/page.tsx`)
- Build workout logging interface (`app/workout/page.tsx`)
- Implement PR detection and XP award logic
- Build dashboard and skills views

---

**For more details, see:**
- [DataModel.md](../../DataModel.md) - Complete database schema documentation
- [ProductSpec.md](../../ProductSpec.md) - Product requirements and features
