# StrengthQuest Backlog

Parking lot for ideas and deferred work. Move items to a plan file when ready to implement.

---

## High Priority

### Phase 2 Skills: Endurance, Hit Points, Defense
Activate the 3 inactive skills already in the DB. Combined log-workout flow (same page, skill selection filters fields).

**XP model:**
- Endurance: `distance × pace_quality` (pace vs. your best pace)
- Hit Points & Defense: `duration × intensity_multiplier` (Low/Med/High picker)
- No hero lift required — these are time-investment grinds (OSRS Agility model)

**Exercises already seeded in DB:**

| Skill | Primary | Supporting |
|-------|---------|-----------|
| Endurance (orange) | 5K Run | Long Run, Tempo Run, Cycling, Rowing, Swimming, Elliptical |
| Hit Points (purple) | Tabata Intervals | Sprint Intervals, Assault Bike HIIT, Burpees, Mountain Climbers, Battle Ropes |
| Defense (teal) | Deep Squat Hold | Yoga Session, Foam Rolling, Stretching Routine, Mobility Flow, Dead Hang, Plank |

**What needs building:**
- Migration to set `is_active = true` for skills 4/5/6 + update tier thresholds to XP-based (not benchmark-based)
- Update `log_multi_skill_workout` RPC (or new RPC) to handle cardio entries (duration, distance, no weight/reps)
- WorkoutForm: show duration/distance fields when cardio skill is selected; hide sets/reps/weight
- Dashboard: skill cards for Endurance/HP/Defense (no tier multiplier display — just XP progress)

**Deferred UX optimization:** Workout type filter at top of log-workout page (Strength / Cardio / Mobility) to pre-filter skill list. Keep simple for now.

---

## Medium Priority

### XP Formula Design (Difficulty-Based)
Replaces the placeholder XP math in `lib/utils/calculate-xp.ts` with a difficulty-weighted formula that rewards harder work.

**Target formula (strength):**
```
setXp = round((baseXp + loadBonus + repBonus) × effortMultiplier)
```

| Factor | Proposed values |
|--------|-----------------|
| `baseXp` | Primary: 15, Accessory: 10 |
| `loadBonus` | `weight / bodyweight` tiered: <0.5x→0, 0.5x→2, 0.75x→4, 1.0x→6, 1.25x→8, 1.5x→10, 2.0x+→12 |
| `repBonus` | `min(6, floor(reps / 2))` |
| `effortMultiplier` | RPE 6→0.8, 7→0.9, 8→1.0, 9→1.1, 10→1.25. No RPE→1.0 |

**Cardio** stays as `round(durationMinutes × intensityMultiplier × scaleFactor)` — intensity multipliers already defined (low=0.75, med=1.0, high=1.5), scale factor from `skills.tier_thresholds->scale_factor`.

**Open questions for the formula exercise:**
- Sanity-check example workouts — does a heavy 5x5 feel appropriately rewarded vs a light 3x12?
- Does `loadBonus` tiering feel right at both ends (beginner ~0.5x BW, advanced ~2x+)?
- Should accessories get a smaller `baseXp` gap (e.g. 12 vs 15) to avoid under-rewarding them?

**Scope:**
- Replace placeholder bodies in `lib/utils/calculate-xp.ts`
- Mirror the exact formula in the RPC (`log_multi_skill_workout`) so server-side re-derivation agrees with the client
- Sanity-compare expected XP for representative workouts before vs after

### Critical Hits
Adds an RPG-style random reward: some sets crit for 1.5x XP with a distinct visual treatment.

- **Chance**: ~10% per set (`Math.random() < 0.10`)
- **Multiplier**: 1.5x final XP
- **Visual**: distinct from normal XP float — larger text, gold glow, "CRIT!" prefix (e.g. `⚔ CRIT! +38 XP`)
- **Rolled client-side**: stored as `isCrit: boolean` on each set; sent with workout payload on submit
- **Server trust**: server does NOT re-roll. If the client says a set crit, the server trusts it (user already saw the bar move — overriding post-hoc would feel bad).

**Required changes:**
- Migration: `ALTER TABLE workout_sets ADD COLUMN is_crit BOOLEAN DEFAULT false`
- `lib/utils/calculate-xp.ts`: add `rollCrit()` + `CRIT_MULTIPLIER = 1.5`; accept `isCrit` param in the xp functions
- `app/log-workout/WorkoutForm.tsx`: add `isCrit` to `SetEntry` / `CardioSetEntry`; call `rollCrit()` in `markSetCompleted` / `markCardioSetCompleted`; render crit-style XP drop when `isCrit`
- `app/globals.css`: add `@keyframes sq-xp-crit` — larger scale, gold glow, longer duration than `sq-xp-rise`
- `app/log-workout/actions.ts`: include `isCrit` per set in RPC payload
- RPCs: accept `is_crit` per set in JSONB, persist to `workout_sets.is_crit`, factor into server-side XP re-derivation

### Volume-Based XP Rebalance (Strength Skills)
Replace current `(intensity × 5) + (length / 5)` formula with per-set volume XP weighted by relative intensity:
```
relative_intensity = set_1rm / pr_1rm
set_xp = weight × reps × relative_intensity × scale_factor
```
- Rewards sets near your max; penalizes junk volume
- First session defaults to `relative_intensity = 1.0` (no PR yet)
- Remove intensity slider from workout form (derived from data)
- Duration flat bonus TBD (or drop entirely)

### Expand Strength Skill Tree
Add Arms, Core, Shoulders as separate skills with their own hero lifts:
- Shoulders → Overhead Press
- Arms → Barbell Curl
- Core → harder to define (weighted carry? plank duration?)

### Remove Repeat Button
Remove the existing repeat button with the dropdown, that functionality isn't needed as it causes bloat and is a little confusing

---

## Low Priority / Someday

### Workout Type Pre-filter
At top of log-workout page: select Strength / Cardio / Mobility → filters skill dropdown. Reduces cognitive load as skill count grows.

### Migration 013: Rebalance Tier Thresholds
Greek God tier is currently world-record territory for all 3 strength skills. Compress upper tiers so elite competitive lifters can realistically reach it.

### Post-Workout Avatar Reactions
CSS animations showing avatar reacting to workout outcome (normal / PR / tier-up). Requires avatar images first.

### Thematic Skill Backgrounds
Log-workout page shows a thematic background based on skill being trained (forge for Push, cavern for Pull, mountain for Legs).

### Workout History
Past workout list or calendar view. Currently no history UI.

### Hiscores-Style Leaderboard
Rank users by total XP or tier across skills.
