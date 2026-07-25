# StrengthQuest

RPG-style fitness tracker — gamified strength training with Push/Pull/Legs skill trees, XP, tiers, and PRs.

## Tech Stack

- **Framework**: Next.js 16.1.6, React 19, TypeScript 5
- **Styling**: Tailwind CSS v4 (inline theme config in globals.css)
- **Backend**: Supabase (PostgreSQL + Auth + RLS + RPC functions)
- **Fonts**: Barlow (body) + Cinzel (display/headers via `font-display` class)
- **Deployment**: Vercel

## Project Structure

```
app/
  page.tsx                    # Landing page
  layout.tsx                  # Root layout (fonts, metadata)
  globals.css                 # Dark RPG theme (CSS variables, utility classes)
  login/page.tsx              # Auth (sign in / sign up)
  dashboard/
    page.tsx                  # Main dashboard (server component; builds skill view models)
    theme.ts                  # Tier display colors (muted metallics) + view-model types
    SkillsPanel.tsx           # Client grid of skill tiles + detail-sheet open state
    SkillTile.tsx             # One skill tile (icon, level, XP bar, milestone line)
    SkillIcon.tsx             # Pixel-style placeholder SVG icons (replace with custom art)
    SkillDetailSheet.tsx      # Bottom sheet (mobile) / side panel (desktop): hero lift, tier ladder, accessories
    equipment.ts              # Equipment module: slot config, ladders, buildEquipment() derivation (no DB state)
    EquipmentPanel.tsx        # OSRS-style paper-doll grid (9 slots) + detail sheet open state
    EquipmentSlot.tsx         # One 64px bevel-inset slot cell (tinted icon, ghost when empty)
    EquipmentIcon.tsx         # Pixel-style placeholder slot glyphs (16x16, tinted by tier color)
    EquipmentDetailSheet.tsx  # Sheet: item name, source, 12-rung armory ladder, next-unlock line
  character-creation/         # New user onboarding
    page.tsx                  # Server component (auth guard)
    CharacterCreationForm.tsx # Client form
    actions.ts                # Server action
  log-workout/
    page.tsx                  # Server component (fetches exercises/skills)
    WorkoutForm.tsx           # Client form orchestrator: state, handlers, draft, presets, submit
    form-types.ts             # Shared types (SetEntry, ExerciseEntry, …) + empty-entry helpers
    SessionXpHeader.tsx       # Sticky session card: per-skill XP bars (derived, always mounted once an exercise is selected)
    ExerciseCard.tsx          # One exercise entry: picker + set rows + Add Set
    SetRow.tsx                # Compact one-line strength set row (lbs × reps · RPE · ✓)
    CardioSetRow.tsx          # Compact one-line cardio row (min · low/med/high · ✓)
    ExercisePickerButton.tsx  # Trigger replacing the old native <select>
    ExercisePickerSheet.tsx   # Bottom-sheet exercise picker with search, grouped by skill
    PostWorkoutSummary.tsx    # Results modal (XP, PRs, level-ups)
    actions.ts                # Server action → supabase.rpc('log_multi_skill_workout') and/or 'log_cardio_workout'
  auth/signout/route.ts       # Sign out API route
lib/
  supabase/client.ts          # Browser Supabase client
  supabase/server.ts          # Server Supabase client (cookies)
  utils/xp-thresholds.ts      # XP_THRESHOLDS array [0, 100, 250, 500, 850, 1350, 2000, 2850, 3900, 5200]
  utils/calculate-1rm.ts      # Epley formula: weight × (1 + reps/30), reps=1 returns weight directly
  utils/calculate-xp.ts       # Per-set XP formula (strength + cardio). Shared source of truth — imported by client for live feedback and by server action for RPC payloads. Placeholder formulas until the XP Formula Design exercise (Backlog.md) lands.
supabase/migrations/          # Sequential SQL migrations (001-018)
DataModel.md                  # Full data model documentation
```

## Database Schema (Key Tables)

| Table | Purpose |
|-------|---------|
| `characters` | One per user. Name, class, bodyweight, character_level, total_strength_1rm |
| `user_skills` | Per-skill progression: XP, level, tier, PR (weight/reps/1RM) |
| `skills` | Reference: Push/Pull/Legs (active), END/HP/DEF (Phase 2). Has color_hex, tier_thresholds JSONB |
| `exercises` | Per-skill exercises. `is_primary` = tier-determining (Bench/Deadlift/Squat) |
| `workouts` | Session log: date, XP earned. `intensity` and `length_minutes` are nullable (kept for historical rows; new rows store NULL) |
| `workout_exercises` | Exercises within a workout, links to top_set_id |
| `workout_sets` | Individual sets: weight, reps, RPE, calculated_1rm (auto via trigger) |

### Key RPC Functions

- **`log_multi_skill_workout`** — Atomic strength workout logging. Signature `(p_character_id, p_workout_date, p_exercises)` — **no intensity/length params**. Each set in `p_exercises` carries its own `xpAwarded` (pre-computed server-side via `lib/utils/calculate-xp.ts`). Workout base XP is the sum of per-set XP; +50 PR bonus applies per skill whose primary-exercise estimated 1RM beat its prior best. Updates tiers/levels. Verifies character ownership via `auth.uid()`. Stores `workouts.intensity` and `workouts.length_minutes` as NULL.
- **`log_cardio_workout`** — Atomic cardio/mobility workout logging. Each entry in `p_exercises` carries its own `xpAwarded` (pre-computed server-side). Sums per-entry XP by skill, updates XP-milestone tiers. No PR detection. Stores `workouts.intensity` and `workouts.length_minutes` as NULL.
- **`create_character_with_skills`** — Creates character + initializes all 6 user_skills rows. Verifies `p_user_id = auth.uid()`.
- **`get_exercise_prs`** — Returns best calculated_1rm and max weight lifted per exercise for dashboard display

### Workout Logging Flow

- **Mixed sessions are supported** — the workout form can include both strength and cardio/HIIT/mobility exercises in one submit
- **Per-set XP flow**: the client calls `calculateStrengthSetXp` / `calculateCardioSetXp` (from `lib/utils/calculate-xp.ts`) on each set completion to show the XP float + session bars. The server action re-runs the same formula (fetches bodyweight + `is_primary` flag) and attaches `xpAwarded` to each set/entry before calling the RPC. The RPC trusts those values and just sums them — no duplicate formula in SQL.
- **Strength entries** are sent to `log_multi_skill_workout`
- **Cardio entries** are sent to `log_cardio_workout`
- **Results are merged in the server action** so the UI shows one combined post-workout summary
- **No intensity slider / workout length input in the UI** — per-set difficulty IS the effort signal
- **Cardio uses per-exercise `durationMinutes`**
- **Strength sets are added individually in the form**; there is no bulk repeat-set shortcut
- **localStorage draft autosave**: on every change, `WorkoutForm` writes `{exercises, date, savedAt}` to `sq:workout-draft:{characterId}`. On mount it reads that key and, if the draft is <24h old, shows a Resume/Discard banner. The key is deleted on successful submit, on Discard, or if the draft is stale/malformed. (Older drafts carried a `sessionSkillXp` key — it's ignored on read; session XP is now derived from `exercises`.)
- **Session XP is derived, never tracked**: per-skill session XP in the sticky header is a `useMemo` over `exercises` (sum of `xpAwarded` on completed sets, keyed by skill). There is no separate session-XP state to keep in sync — do not reintroduce one.

### Active Skills

All 6 skills are active as of migration 013.

| Skill | Type | Color | Primary Exercise | Skill ID |
|-------|------|-------|-----------------|----------|
| Push | strength | `#DC2626` (red) | Barbell Bench Press | 1 |
| Pull | strength | `#2563EB` (blue) | Conventional Deadlift | 2 |
| Legs | strength | `#16A34A` (green) | Barbell Back Squat | 3 |
| Endurance | cardio | `#F97316` (orange) | — (no hero lift) | 4 |
| Hit Points | hiit | `#9333EA` (purple) | — (no hero lift) | 5 |
| Defense | mobility | `#0D9488` (teal) | — (no hero lift) | 6 |

## XP & Leveling

### Strength Skills (Push, Pull, Legs)
- **Base XP** = sum of per-set XP. Each set's XP is computed by `calculateStrengthSetXp(weight, reps, rpe, bodyweightLbs, isPrimary)` from `lib/utils/calculate-xp.ts`. Placeholder formula (replaced by the XP Formula Design exercise — see `Backlog.md`): `baseXp (14 primary / 8 accessory) + repBonus (min(6, floor(reps/3))) + weightBonus (225+→4, 135+→2, >0→1)`.
- **Estimated PR bonus** = +50 XP per skill (when estimated 1RM on primary exercise beats old record, any rep count)
- **Multi-skill**: no proportional split — each set contributes its own XP to its skill directly
- **1RM formula**: Epley `weight × (1 + reps/30)`, reps capped at 10. For reps=1, 1RM = weight directly
- **Tiers**: Based on `1RM / bodyweight` multiplier (Bronze → Greek God)

### Cardio Skills (Endurance, Hit Points, Defense)
- **XP formula**: `calculateCardioSetXp(durationMinutes, intensity)` from `lib/utils/calculate-xp.ts` = `round(duration × intensity_multiplier × scale_factor)` per entry
- **Intensity multipliers**: Low = 0.75, Med = 1.0, High = 1.5 (self-reported)
- **Scale factor**: `2.0` for all three cardio skills (stored in `skills.tier_thresholds->>'scale_factor'`). Same time invested = same tier progress across Endurance/HP/Defense; intensity multiplier still rewards harder effort.
- **No hero lift / primary exercise** — all exercises are equal, tiers based on cumulative XP milestones (see `tier_thresholds.tiers[].min_xp`/`max_xp`)
- **No PRs** — cardio workouts never award PR bonus XP
- **No sets/reps/weight** — log duration + intensity only. Duration + intensity are stored on `workout_exercises` (not `workout_sets`)
- **Multi-exercise sessions**: XP is calculated independently per exercise (not split proportionally like strength). A run + yoga session awards XP to both Endurance and Defense
- **Future exception**: if a dedicated Running skill is added, it will use pace-based XP (pace vs. PR pace). Endurance stays time-based for now to keep multi-activity (cycling, rowing, etc.) consistent.

### Shared
- **Levels**: 1-10, thresholds: `[0, 100, 250, 500, 850, 1350, 2000, 2850, 3900, 5200]`
- **Tier names** (OSRS-inspired, 12 tiers): Bronze → Iron → Steel → Mithril → Adamantite → Rune → Dragon → Obsidian → Barrows → Bandos → Torva → Greek God. Applies to strength skills (multiplier-gated) and cardio skills (XP-gated).

## Equipment Module (Phase 1 — presentation only, no DB state)

OSRS-style paper doll on the dashboard (`app/dashboard/equipment.ts` + `Equipment*.tsx`). Your tier IS your armor grade: reaching Mithril in Push = Mithril Platebody in the chest slot.

- **Slot mapping**: Helm=Hit Points, Cape=Pull, Chest=Push, Shield=Defense, Legs=Legs, Boots=Endurance, Amulet=total level, Weapon=total strength, Gloves=reserved placeholder (`???` — future grip skill or grind rewards)
- **Unlocks are ever-reached, never revoked** (OSRS rule: gear earned is never taken away). Currently *derived* from `user_skills.current_tier`, which cannot regress today (strength tiers ← PR 1RM, cardio tiers ← cumulative XP, both monotonic; bodyweight is set once at creation). **If bodyweight editing ever ships, add a `user_skills.max_tier_reached` column and derive from that instead.**
- **Equipped item = highest unlocked tier** (auto). Manual equipping / fashionscape is Phase 3 (needs a `character_equipment` table — only build if requested).
- **Amulet** ladder (total level 6–60 → 12 tiers): `[10, 15, 20, 25, 30, 35, 40, 45, 50, 54, 57, 60]` in `equipment.ts`. Greek God Amulet = maxed account.
- **Weapon** grade: total strength multiplier (S/B/D max lifted ÷ bodyweight) against `total_strength_tiers` ranges `[0, 1.5, 2.25, … 9.0]`, mapped **positionally** onto OSRS tier names in code (the DB table still has old names — Silver/Gold/Platinum/Diamond/Titanium — pending a rename migration). Weapon *type* comes from character class (`CLASS_WEAPONS` map: Deadlift Knight→Longsword, etc.)
- **Art**: 9 slot glyphs in `EquipmentIcon.tsx` (16×16 pixel SVGs), tinted by `tierColor()` — one glyph per slot × 12 tier colors, not 108 assets. Empty slot = ghost silhouette.
- **Unlock ceremony**: `PostWorkoutSummary`'s tier-up card lists newly unlocked items (icon + "Unlocked: Rune Platebody") via `newlyUnlockedEquipment(skillName, oldTier, newTier)` from `equipment.ts`. Handles multi-tier jumps (None → Steel unlocks Bronze/Iron/Steel). Skill slots only — amulet/weapon tier-ups aren't reported by the RPCs, so they have no ceremony yet.

## UI Theme

Two theme systems coexist in `globals.css`:

### 1. Legacy OSRS-inspired theme (landing, login, character creation)

- Backgrounds: `--bg-abyss` → `--bg-base` → `--bg-card` → `--bg-elevated`
- Text: `--text-primary`, `--text-secondary`, `--text-muted`; Gold: `--gold`, `--gold-bright`, `--gold-dim`
- Utility classes: `.btn-gold`, `.card-dark`, `.input-dark`, `.xp-bar-track`/`.xp-bar-fill`, `.skill-card`, `.font-display`

### 2. `sq-*` fantasy skill panel theme (dashboard + log-workout, July 2026 redesign)

Mobile-first, dense, MMO-progression-UI inspired. Scoped under the `.sq-dash` wrapper class, which defines: `--dbg` (#171008 page), `--dpanel` (#241A10), `--dpanel-raised` (#322516), `--dink` (#E4D5A8 text), `--dink-muted` (#9A8A68), `--dgold` (#C9A227), `--dbevel-light` (#5C4A33), `--dbevel-dark` (#0D0906).

- **Surfaces**: 2px bevel borders (light top/left, dark bottom/right), radius ≤4px, no soft shadows. `.sq-panel`, `.sq-panel-raised`, `.sq-bevel-in` (sunken), `.sq-input`.
- **Type scale — exactly 4 sizes**: 13px letter-spaced uppercase labels (`.sq-label`), 15px body, 22px Cinzel headings (`.sq-heading`), 40px+ hero numbers (`.sq-hero-num`, `.sq-tile-level`). `.sq-num` = tabular nums.
- **XP bars**: `.sq-xp-track`/`.sq-xp-fill` (thin, inset, gold fill; session bars override fill background with the skill's DB color).
- **CTA**: `.sq-btn-gold`. **Sheets**: `.sq-sheet`/`.sq-sheet-overlay` — bottom sheet <768px, 400px right panel ≥768px (used by dashboard skill detail + exercise picker).
- **Tier display colors** live in `app/dashboard/theme.ts` (`TIER_COLORS`, `tierColor()`): muted metallics (Bronze #A8763E, Mithril #7B6FA8, Adamantite #7EA379, Rune #5F8FA8, Obsidian #8A8178, Dragon #B05648, plus extrapolated values for Iron/Steel/Barrows/Bandos/Torva/Greek God). **Tier NAMES are never changed — display colors only.**
- Tap targets ≥44px; `prefers-reduced-motion` respected; visible gold focus states.

### Logo (both themes)

Two-tone: `<span style="color: var(--gold-bright)">Strength</span><span style="color: var(--text-primary)">Quest</span>`

## Conventions

- **Server components** for pages (auth guards, data fetching). Client components for forms/interactivity
- **Server actions** in `actions.ts` files for mutations
- **Supabase RPC** for complex atomic operations (not raw SQL from the client)
- **No hardcoded skill IDs** in frontend — query `skills` table with `is_active = true`
- **Skill colors** come from DB (`skills.color_hex`) — used for borders, glows, XP bars
- **Inline styles** for dynamic values (skill colors, CSS variables). Tailwind for static layout
- **Avoid mixing CSS shorthand** with non-shorthand in React style objects (causes React warnings)

## Migrations

Sequential SQL files in `supabase/migrations/`. User runs them manually in Supabase SQL editor.

| Migration | Purpose |
|-----------|---------|
| 001 | Initial schema (all tables) |
| 002 | Seed data (classes, skills, exercises) |
| 003 | Triggers (1RM calc, character level, total strength) |
| 004 | Row Level Security |
| 005 | create_character RPC |
| 006 | log_workout RPC (single-skill, superseded by 007) |
| 007 | log_multi_skill_workout RPC + nullable skill_id |
| 008 | get_exercise_prs RPC |
| 009 | Fix 1RM for reps=1 (returns weight directly, not Epley) |
| 010 | PRs from any rep count + return weight x reps in results + max_weight_lifted in get_exercise_prs |
| 011 | Recalculate user_skills PRs from actual workout data |
| 012 | Real PR tracking (max weight lifted) + dual PR system |
| 013 | Activate cardio skills (Endurance/HP/Defense) + add `duration_minutes`/`intensity` to workout_exercises + XP-milestone tier_thresholds |
| 014 | `log_cardio_workout` RPC (duration × intensity × scale_factor XP, no PRs) |
| 015 | Standardize tier names to OSRS convention across all skills + migrate existing `user_skills.current_tier` values |
| 016 | Security hardening: RLS on `total_strength_tiers`, ownership checks on `create_character_with_skills` and `log_multi_skill_workout` |
| 017 | Fix cardio workout length constraint: relax `workouts.length_minutes` to `1..300` and recreate `log_cardio_workout` to pre-compute total duration before insert |
| 018 | Real-time XP infrastructure: drop intensity/length params from both RPCs, sum per-set/per-entry `xpAwarded` (computed in `calculate-xp.ts`), store `workouts.intensity`/`length_minutes` as NULL |
| 019 | Defense rep-based exercises (`tracks_duration=FALSE`) + XP-milestone tier updates in `log_multi_skill_workout` for cardio/hiit/mobility skills |
| 020 | `waitlist` table for the landing page (INSERT-only RLS, unique lower(email)) |

## Real-Time XP (Core Design Philosophy)

Most workout apps make you wait until the workout is over to see what you earned. StrengthQuest is designed for gamers — XP drops **at the moment of set completion**, not at the end. Every rep has an instant dopaminic payoff, just like combat XP in an RPG.

### How it works

- **Per-set "Done" button** — every set (strength and cardio) has a Done button. Hitting it triggers:
  1. A **floating `+XP` text** that rises and fades (skill-colored, 0.9s `sq-xp-rise` animation)
  2. The set row highlights gold (completed state)
  3. The **sticky session XP card** updates immediately — per-skill XP bars animate forward, total XP and weight lifted increment
- **No "Set banked" receipts** — the float IS the feedback. Once it fades, the only evidence is that your bar moved. Fleeting, not accounting.
- **Per-skill XP bars** — each skill that receives XP gets its own bar in the session header, showing real DB XP + session gains. Bars use `getLevelForXp()` to recalculate effective level in real-time — if session XP crosses a threshold, the level number updates and the bar resets to the new level's range. Session XP is **derived** from the `exercises` state (see `SessionXpHeader.tsx` + the `useMemo` in `WorkoutForm.tsx`) — there is no separate tracked map.
- **Sticky session card** — the XP bars + summary (`N sets · X,XXX lbs · +Y XP`) stick to the top of the viewport as the workout grows long, so the dopamine feedback is always visible. It mounts as soon as any exercise is selected (dimmed/zero state before the first Done) — it must never be conditionally inserted mid-session (iOS Safari can fail to paint a freshly inserted `position: sticky` element until the next scroll).
- **Architecture**: pure client-side math on Done tap (0 API calls, 0 DB queries, 0ms latency). The client imports `calculateStrengthSetXp` / `calculateCardioSetXp` from `lib/utils/calculate-xp.ts`. On submit, the server action imports the same functions, re-derives XP per set/entry, and attaches `xpAwarded` to the RPC payload. Client and server agree by construction because they share the same module.
- **Abandoned workout recovery**: in-progress state is persisted to `localStorage` (`sq:workout-draft:{characterId}`) on every change. On mount, a draft <24h old offers a Resume/Discard banner. The key is cleared on successful submit.
- **XP formula**: the bodies in `calculate-xp.ts` are placeholders until the XP Formula Design exercise (see `Backlog.md`) lands. The *infrastructure* is done; swapping the formula is a drop-in change to that one file.

## Dev Testing Shortcuts

Keyboard shortcuts to prefill the workout form with preset data. **Dev-only** (gated behind `NODE_ENV !== 'production'`). Requires hard refresh (Ctrl+Shift+R) after code changes to rebind.

| Shortcut | Preset | Description |
|----------|--------|-------------|
| Ctrl+1 | Push Day | Bench Press (3 sets), Incline DB Bench (3 sets), Tricep Extensions (2 sets) |
| Ctrl+2 | Pull Day | Deadlift (3 sets), Barbell Row (3 sets), Lat Pulldown (2 sets) |
| Ctrl+3 | Legs Day | Back Squat (3 sets), Leg Press (3 sets), Calf Raises (2 sets) |
| Ctrl+4 | Cardio Mix | 5K Run (1 set), Sprint Intervals (5 sets), Yoga Session (1 set) |
| Ctrl+5 | Full Mixed | Bench (2) + Squat (2) + 5K Run + Yoga — tests strength + cardio in one session |
| Ctrl+6 | Stress Test | 6 exercises (one per skill), 10 sets each, **all pre-completed** — tests sticky header, all 6 XP bars, 60 total entries |

Exercises are looked up by name from the `allExercises` prop, so presets work regardless of DB IDs.

## Future Work

- **Stats row**: Total XP, Sessions count, Day Streak on dashboard hero card
- **Workout history**: Past workout list/calendar view
- **Dedicated Running skill**: Would use pace-based XP instead of duration-based
