-- StrengthQuest - Character Creation Function
-- Migration 005: Atomic character + skills creation
-- Created: 2026-02-21

-- ============================================================================
-- FUNCTION: create_character_with_skills
-- ============================================================================
-- Creates a character and initializes all 6 skill progression records atomically.
-- This ensures either both operations succeed or both fail (no orphaned data).
--
-- Parameters:
--   p_user_id: UUID of the authenticated user (from auth.users)
--   p_name: Character name (3-30 characters)
--   p_class_id: Character class ID (1-6, references character_classes)
--   p_bodyweight_lbs: Bodyweight in pounds (50-500)
--
-- Returns: UUID of the created character
-- ============================================================================

CREATE OR REPLACE FUNCTION create_character_with_skills(
  p_user_id UUID,
  p_name VARCHAR(30),
  p_class_id INTEGER,
  p_bodyweight_lbs DECIMAL(5,1)
)
RETURNS UUID AS $$
DECLARE
  v_character_id UUID;
BEGIN
  -- Insert character
  INSERT INTO characters (user_id, name, class_id, bodyweight_lbs)
  VALUES (p_user_id, p_name, p_class_id, p_bodyweight_lbs)
  RETURNING id INTO v_character_id;

  -- Initialize all 6 skills at level 1, 0 XP
  -- Includes all Phase 1 and Phase 2 skills (Push/Pull/Legs/Endurance/HP/Defense)
  INSERT INTO user_skills (character_id, skill_id, current_xp, current_level)
  SELECT v_character_id, id, 0, 1
  FROM skills;

  RETURN v_character_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION create_character_with_skills TO authenticated;

-- Add function comment for documentation
COMMENT ON FUNCTION create_character_with_skills IS 'Atomically creates a character and initializes all 6 skill progression records (Push, Pull, Legs, Endurance, HP, Defense). All skills start at level 1 with 0 XP.';

-- ============================================================================
-- VERIFICATION QUERY (optional - comment out after verification)
-- ============================================================================

-- Test the function (replace with actual user_id):
-- SELECT create_character_with_skills(
--   'YOUR_USER_ID',
--   'TestWarrior',
--   1,  -- Deadlift Knight
--   200.0
-- );

-- Verify character and skills created:
-- SELECT c.*, cc.name as class_name
-- FROM characters c
-- JOIN character_classes cc ON c.class_id = cc.id
-- WHERE c.user_id = 'YOUR_USER_ID';

-- SELECT us.*, s.name as skill_name
-- FROM user_skills us
-- JOIN skills s ON us.skill_id = s.id
-- WHERE us.character_id = (SELECT id FROM characters WHERE user_id = 'YOUR_USER_ID');
