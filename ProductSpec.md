# StrengthQuest - Product Specification

**Document Version:** 2.0
**Last Updated:** February 3, 2026
**Status:** Draft - Requirements Definition
**Purpose:** Solo development implementation guide

---

## Section 1: Product Overview

### Executive Summary

StrengthQuest is a gamified strength training tracker that uses RPG/MMO leveling mechanics to motivate weightlifters. The product targets the overlap between MMO grinders (particularly old-school Runescape players) and serious weightlifters - both demographics appreciate granular progression systems, "number go up" satisfaction, and the meditative nature of consistent grinding toward long-term goals.

### Core Thesis

There is significant overlap between MMO grinders and serious weightlifters. Both groups:
- Appreciate granular, measurable progression systems
- Derive satisfaction from "number go up" feedback loops
- Enjoy the meditative nature of consistent grinding toward long-term goals
- Track metrics obsessively
- Value long-term commitment over quick wins

### Target Audience

**Primary:** Gamers (especially MMO players) who are already lifting weights, NOT aspirational fitness beginners.

**User Persona: "The MMO Grinder Lifter"**
- Age: 22-35
- Currently lifts weights 3-4x per week
- Has played or currently plays MMOs (especially old-school Runescape)
- Tracks their lifts (spreadsheet, notes app, or existing fitness app)
- Appreciates granular progression and optimization
- Motivated by long-term goals and visible progress
- Values efficiency and measurable results

### Key Differentiator

This is NOT a general fitness app. StrengthQuest specifically focuses on strength training with the big 3 lifts (Bench Press, Squat, Deadlift) using RPG-style progression systems that mirror old-school MMO mechanics.

**Positioning:** "StrengthQuest - RPG progression for lifters" = clear, differentiated, memeable

### Success Criteria Overview

**Validation Phase (Month 1):**
- 100+ signups
- 50+ active users logging workouts weekly
- 30-day retention >30%

**Growth Phase (Month 3):**
- 500+ active users
- 30-day retention >40%

---

## Section 2: User Requirements & Flows

### Critical User Flows

#### Flow 1: New User Onboarding
**Target Duration:** <30 seconds
**Success Metric:** 60%+ signup-to-first-workout conversion

**Steps:**
1. User lands on homepage
2. User clicks "Sign Up" or "Get Started"
3. User creates account (email/password)
4. User creates character:
   - Enter character name
   - Select character class (Deadlift Knight, Bench Berserker, Bicep Bandit, Quad King, Grip Gladiator, Iron Titan)
   - Enter current bodyweight (lbs)
5. User sees dashboard with "Start Your First Workout" prompt

**Acceptance Criteria:**
- Entire flow completes in <30 seconds
- No unnecessary friction or complex decisions
- User understands their character identity
- Clear call-to-action to log first workout

#### Flow 2: First Workout Logging
**Target Duration:** <2 minutes
**Success Metric:** 80%+ completion rate

**Steps:**
1. User clicks "Start Workout" (or skill-specific button: Push/Pull/Legs)
2. User selects workout metadata:
   - Date (defaults to today)
   - Intensity (slider 1-10, defaults to 5)
   - Length (input 5-120 minutes, defaults to 60)
3. User adds first exercise (e.g., "Bench Press")
4. User logs sets:
   - Weight (lbs)
   - Reps
   - Optional: RPE (6-10 scale) [TBD if in MVP]
5. User can add more sets or exercises
6. User clicks "Complete Workout"
7. System displays:
   - XP gained
   - Current level for the skill
   - Estimated 1RM for primary lift
   - Current tier
   - Encouraging message

**Acceptance Criteria:**
- Logging a basic workout (1 exercise, 3 sets) takes <2 minutes
- Interface is intuitive without tutorial
- User feels accomplishment upon completion
- Clear feedback on progress made

#### Flow 3: Return User Experience
**Target:** User returns within 7 days

**Steps:**
1. User logs in
2. User sees dashboard displaying:
   - Character card (level, Total Strength, tier)
   - Last workout timestamp
   - Progress bars for each skill
   - Weekly summary
   - Quick-start workout buttons
3. User clicks quick-start button for desired skill
4. User logs workout (see Flow 2)
5. User sees progress update and XP gain
6. User feels motivated to continue

**Acceptance Criteria:**
- Dashboard immediately shows progress since last session
- Quick-start reduces friction to begin workout
- User can see streak/consistency visually
- Progress feels meaningful and satisfying

#### Flow 4: PR Achievement Experience
**Target:** Celebration and sharing

**Steps:**
1. User logs workout with improved performance
2. System calculates 1RM for each set
3. System compares to historical PR
4. System detects new PR (higher calculated 1RM)
5. System displays celebration:
   - "New PR!" message
   - Old PR vs New PR comparison
   - +50 XP bonus notification
   - Check if tier advanced
6. If tier advanced: additional celebration and tier badge update
7. User feels accomplished

**Acceptance Criteria:**
- PR detection is accurate and immediate
- Celebration is satisfying and visually distinct
- User understands what improved (weight, reps, or both)
- Achievement feels worthy of sharing

#### Flow 5: Progression Tracking
**Target:** User can always see path forward

**Steps:**
1. User navigates to Skills tab
2. User views detailed skill cards for Push/Pull/Legs
3. For each skill, user sees:
   - Current PR and estimated 1RM
   - Current tier and badge
   - Progress bar showing gap to next tier
   - XP progress to next level
   - Recent workout history for that skill
4. User identifies which tier is closest to advancing
5. User sets goal for next workout

**Acceptance Criteria:**
- Clear visualization of progress
- Gap to next tier is immediately obvious
- User can identify actionable goals (e.g., "need 15 more lbs to hit Gold")
- Historical context shows improvement trend

---

## Section 3: Detailed Feature Requirements

### Feature: Character System
**Priority:** P0 (MVP blocker)

**Requirements:**
- User can create character with:
  - Name (text input, 3-30 characters)
  - Class selection (6 options: Deadlift Knight, Bench Berserker, Bicep Bandit, Quad King, Grip Gladiator, Iron Titan)
  - Bodyweight in lbs (numeric input, 50-500 lbs)
- Character displays overall level = Average of three skill levels (Push, Pull, Legs), rounded down
- User can update bodyweight (unlimited frequency, user-managed; future: can add enforced check-in every 1-4 weeks)
- Character class is cosmetic (no gameplay perks in MVP)
- **Gender removed from MVP:** All users use male tier standards. Target audience is 80-90% male. Can add gender-specific tiers post-launch if needed.

**Acceptance Criteria:**
- Character creation completes in <30 seconds
- Name validation prevents empty or excessively long names
- Class selection is clear and thematic
- Bodyweight updates recalculate tier positions immediately

**Resolved Decisions:**
- Bodyweight updates: Unlimited frequency for MVP, user-managed. Future enhancement can add enforced check-in every 1-4 weeks.
- Character class: Remains purely cosmetic for foreseeable future.

---

### Feature: Three-Skill System (Push/Pull/Legs)
**Priority:** P0 (MVP blocker)

**Requirements:**
- Three skills: Push (Red), Pull (Blue), Legs (Green)
- Each skill tracks independent XP and level (1-10 in MVP, potentially higher in future)
- Each skill has one primary exercise and multiple supporting exercises
- Primary exercises:
  - Push: Barbell Bench Press
  - Pull: Conventional Deadlift
  - Legs: Barbell Back Squat
- Only primary exercises contribute to tier calculations and Total Strength
- Supporting exercises can be logged but don't affect tiers in MVP
- Each skill has a color identity for visual consistency

**Primary Exercise Requirements:**
- 1RM tracking and historical PR storage
- Tier calculation based on bodyweight multiplier
- Contributes to Total Strength metric

**Supporting Exercise Requirements (MVP):**
- Can be logged in workouts
- Contribute to skill XP based on workout intensity/length
- Do not affect tier calculations
- [Future: May award achievement badges or provide XP bonuses]

**Acceptance Criteria:**
- User understands which exercises affect their tier progression
- Skill colors (Red/Blue/Green) are consistent throughout UI
- Each skill can progress independently
- User can view detailed breakdown per skill

**Resolved Decisions:**
- Supporting exercises included in MVP (not just big 3)
- Supporting exercises contribute to workout XP (via intensity/length formula) but don't affect tier calculations
- Complete exercise lists to be finalized (see Section 4)

---

### Feature: XP and Leveling System
**Priority:** P0 (MVP blocker)

**Requirements:**

**XP Award Formula:**
```
Base XP = (Intensity × 5) + (Length in minutes ÷ 5)
PR Bonus = +50 XP (awarded when new PR is achieved in primary exercise)
```

**Components:**
- Intensity: User-selected slider (1-10 scale)
- Length: User-entered minutes (5-120 minutes)
- PR Bonus: Automatic detection, added to base XP

**Level Progression:**

Current thresholds (Level 1-10):

| Level | XP Required | Total XP |
|-------|-------------|----------|
| 1 | 0 | 0 |
| 2 | 50 | 50 |
| 3 | 75 | 125 |
| 4 | 100 | 225 |
| 5 | 125 | 350 |
| 6 | 150 | 500 |
| 7 | 175 | 675 |
| 8 | 200 | 875 |
| 9 | 225 | 1100 |
| 10 | 250 | 1350 |

**Note:** Level cap set at 10 for MVP/beta. Can extend to higher levels post-launch based on user engagement and feedback.

**Level-Up Behavior:**
- Visual celebration when level threshold crossed
- Notification displays new level
- Progress bar resets for next level
- Character level updates (average of three skills, rounded down)

**Acceptance Criteria:**
- XP calculation is accurate and transparent
- Level-ups feel meaningful and satisfying
- PR bonus is clearly attributed
- User can see XP progress at all times

**Resolved Decisions:**
1. **Level cap:** 10 for MVP/beta. This is simpler, achievable, and can be extended post-launch based on user feedback and engagement metrics.
2. **XP curve:** Linear progression for MVP (+25 XP per level increment). Can adjust to exponential curve later if needed for long-term engagement.

---

### Feature: PR Tracking and 1RM Calculation
**Priority:** P0 (MVP blocker)

**Requirements:**

**1RM Estimation Formula:**
```
Estimated 1RM = Weight × (1 + (Reps / 30))
```

**Calculation Rules:**
- Rep cap at 10 for calculation purposes (if user logs >10 reps, use 10 in formula)
- If reps >10, display notification: "High-rep sets capped at 10 reps for 1RM calculation"
- Bodyweight exercises supported (Weight = 0 is valid for pull-ups, dips, etc.)

**PR Detection Logic:**
1. Calculate 1RM for each set in current workout
2. Identify "top set" = set with highest calculated 1RM
3. Compare top set 1RM to historical PR for that exercise
4. If top set 1RM > historical PR:
   - Mark as new PR
   - Update stored PR (weight, reps, calculated 1RM, date)
   - Award +50 XP bonus
   - Display PR celebration

**PR Celebration Requirements:**
- Visual distinction (animation, color, confetti, etc.)
- Display: "New PR! [Exercise Name]"
- Show comparison: "Previous: [X lbs × Y reps = Z calculated 1RM] → New: [A lbs × B reps = C calculated 1RM]"
- Difference highlighted: "+N lbs on calculated 1RM"

**Non-PR Workout Feedback:**
- If no PR achieved, display motivational message
- Show comparison to current PR: "Great work! You're N lbs away from your PR of X lbs"
- Encourage consistency

**Acceptance Criteria:**
- 1RM calculations are mathematically accurate
- PR detection works reliably (no false positives/negatives)
- Top set identification is clear and correct
- Historical PRs are stored permanently
- User receives clear feedback regardless of PR status

**Open Questions:**
- Should we validate the 1RM formula against real-world data or accept it as reasonable approximation?

---

### Feature: Tier System
**Priority:** P0 (MVP blocker)

**Requirements:**

**Tier Calculation:**
- Tier determined by bodyweight multiplier: `Tier = 1RM / Bodyweight`
- Separate tiers for each primary lift (Bench/Squat/Deadlift)
- Total Strength has its own tier (sum of all three 1RMs / Bodyweight)
- All users use male standards (gender removed from MVP scope)

**Tier Names (in ascending order):**
1. Bronze
2. Iron
3. Silver
4. Gold
5. Mithril (Runescape reference - signals target audience)
6. Dragon (Runescape reference)
7. Diamond
8. Greek God (ultimate tier)

**Tier Thresholds (All Users):**

| Tier | Squat | Bench | Deadlift |
|------|-------|-------|----------|
| Bronze | < 1.0× | < 0.75× | < 1.0× |
| Iron | 1.0 - 1.25× | 0.75 - 1.0× | 1.0 - 1.5× |
| Silver | 1.25 - 1.5× | 1.0 - 1.25× | 1.5 - 1.75× |
| Gold | 1.5 - 1.75× | 1.25 - 1.5× | 1.75 - 2.25× |
| Mithril | 1.75 - 2.5× | 1.5 - 2.0× | 2.25 - 3.0× |
| Dragon | 2.5 - 2.75× | 2.0 - 2.25× | 3.0 - 3.25× |
| Diamond | 2.75 - 3.0× | 2.25 - 2.5× | 3.25 - 3.5× |
| Greek God | > 3.0× | > 2.5× | > 3.5× |

**Note:** Gender-specific tier thresholds removed from MVP. All users (regardless of gender) use these standards. Target audience is 80-90% male. Can add female-specific tiers post-launch if user demand justifies it.

**Total Strength Tier:**
- Calculated as: `(Bench 1RM + Squat 1RM + Deadlift 1RM) / Bodyweight`
- Uses same tier names but different thresholds [TBD: define Total Strength thresholds]

**Tier Display Requirements:**
- Visual tier badge/icon for each lift
- Color-coding or visual hierarchy showing tier progression
- Progress bar showing percentage to next tier
- Numeric display: "Current: X.XX× BW | Next tier at: Y.YY× BW | Gap: Z.ZZ× BW (NN lbs)"

**Tier Advancement Celebration:**
- First time advancing to a new tier triggers full-screen celebration
- "Achievement Unlocked" style notification
- Display new tier badge prominently
- [Future: Shareable graphics for social media]

**Acceptance Criteria:**
- Tier calculations are accurate based on bodyweight
- Tiers update immediately when bodyweight or 1RM changes
- Progress to next tier is clearly visualized
- Tier names resonate with target audience (Runescape references)
- User can easily identify which lift is closest to next tier

**Resolved Decisions:**
- Gender removed from scope: All users use male standards
- Total Strength tier thresholds: Can be defined during implementation (same logic, different multiplier ranges)

**Open Questions:**
- Should tier thresholds be validated against strengthlevel.com or similar sources?

---

### Feature: Workout Logging Interface
**Priority:** P0 (MVP blocker)

**Requirements:**

**Single-Page Workout Experience:**

**Top Section - Workout Metadata:**
- Date picker (defaults to current date, can select past dates)
- Skill selection (Push/Pull/Legs) or general workout
- Intensity slider (1-10 scale, visual feedback on slider)
- Length input (5-120 minutes, numeric input with validation)

**Exercise Logging Section:**
- "Add Exercise" button
- Exercise selection (dropdown or search from predefined list)
- Per exercise:
  - Exercise name displayed
  - "Add Set" button
  - Set counter (Set 1, Set 2, etc.)

**Per Set Input Fields:**
- Weight (lbs) - numeric input, allows 0 for bodyweight exercises
- Reps - numeric input (1-50)
- RPE (6-10 scale) - optional input, lifters commonly use this metric

**Set Display:**
- Each set shows: "Set N: X lbs × Y reps"
- Visual indicator for "top set" (highest calculated 1RM) - highlighted or badged
- Calculated 1RM displayed per set (inline or on hover)
- Delete set option

**Post-Workout Summary (after clicking "Complete Workout"):**
- XP gained: "+XX XP" prominently displayed
- Skill level progress: "Push Level X - YY/ZZ XP to Level N+1"
- If level-up occurred: Level-up celebration animation
- If PR achieved: PR celebration with details
- If no PR: Motivational message with comparison to PR
- "Done" button returns to dashboard

**Validation:**
- Cannot complete workout with 0 exercises
- Cannot complete workout with 0 sets
- All fields required (weight, reps) before completing workout

**Acceptance Criteria:**
- Logging a 3-set workout takes <2 minutes for experienced user
- Interface is intuitive without instructions
- Top set identification is automatic and visible
- Post-workout feedback is satisfying and informative
- User can log past workouts (not locked to today)

**Resolved Decisions:**
- RPE included as optional field (6-10 scale) - lifters commonly use this metric
- RPE is for tracking only in MVP, does not affect XP/progression calculations

---

### Feature: Dashboard
**Priority:** P0 (MVP blocker)

**Requirements:**

**Character Summary Card:**
- Character name
- Character class (with icon/image)
- Overall character level (average of three skills, rounded down)
- Current bodyweight
- Total Strength (sum of Bench + Squat + Deadlift 1RMs)
- Total Strength tier badge and multiplier

**Last Workout Info:**
- Timestamp of last workout ("Last workout: 2 days ago")
- If no workouts yet: "Start your first workout below!"

**Quick-Start Workout Buttons:**
- Three prominent buttons: "Push Workout", "Pull Workout", "Legs Workout"
- Color-coded (Red, Blue, Green)
- One-click access to workout logging flow

**Skill Progress Bars:**
- Three horizontal progress bars (one per skill)
- Show current level and XP progress to next level
- Color-coded (Push = Red, Pull = Blue, Legs = Green)
- Format: "Push: Level X - YY/ZZ XP"

**Weekly Summary:**
- Calendar view showing current week
- Each day marked if workout logged (color-coded by skill)
- Summary stats: "This week: N workouts, X total XP gained"
- Streak indicator if applicable

**Next Tier Goal Section:**
- Identify which tier is closest to advancing
- Display: "Closest to next tier: Bench (Silver → Gold)"
- Show gap: "NN lbs needed to reach Gold"
- Motivational prompt

**Acceptance Criteria:**
- Dashboard loads quickly and shows all key info at a glance
- Progress is immediately visible and satisfying
- Quick-start buttons reduce friction to begin workout
- User can see holistic view of all three skills
- Weekly summary encourages consistency

**Open Questions:**
- Should weekly summary be current week (Mon-Sun) or rolling 7 days?

---

### Feature: Skills View
**Priority:** P0 (MVP blocker)

**Requirements:**

**Three Detailed Skill Cards (Push, Pull, Legs):**

Each card displays:

**Header:**
- Skill name and icon
- Color-coded background or border (Red/Blue/Green)
- Current skill level

**Primary Exercise Stats:**
- Exercise name (Bench Press / Deadlift / Squat)
- Current PR: "XXX lbs × Y reps"
- Estimated 1RM: "ZZZ lbs (calculated)"
- Current tier badge with name
- Bodyweight multiplier: "N.NN× BW"

**Progress Indicators:**
- Progress bar to next tier
- Numeric gap: "NN lbs to [Next Tier Name]"
- XP progress to next level: "YY/ZZ XP to Level N+1"

**Recent Workout History:**
- Last 3-5 workouts for this skill
- Per workout: Date, top set (weight × reps), calculated 1RM
- PR indicator if that workout achieved a PR

**Acceptance Criteria:**
- User can quickly assess status of each skill
- Clear visual hierarchy: PR and tier are most prominent
- Progress to next goal is always visible
- Historical context shows improvement trend

---

### Feature: Workout History
**Priority:** P0 (MVP blocker)

**Requirements:**

**GitHub-Style Calendar Heatmap:**
- Grid layout showing last 12 months (or since account creation)
- Each day is a square/cell
- Color intensity based on:
  - No workout: Gray/empty
  - Workout logged: Color-coded by skill (Red/Blue/Green)
  - Multiple skills in one day: Multi-color or blended
- Hover/click shows workout summary for that day

**Streak Tracking:**
- Display current streak: "N-day workout streak"
- Visual streak counter
- Definition: Consecutive days with at least one workout [TBD: or weekly-based?]

**Workout Details (on click):**
- Date
- Skill(s) trained
- Exercises and sets logged
- XP gained
- PRs achieved (if any)
- Tier changes (if any)

**Acceptance Criteria:**
- Calendar view provides instant visual feedback on consistency
- User can identify gaps in training
- Streaks are motivating and accurate
- Historical workout details are accessible

**Open Questions:**
- Should streak be consecutive days or weekly-based (e.g., "trained 3x this week" counts as continuing streak)?

---

### Feature: Profile/Settings
**Priority:** P0 (MVP blocker)

**Requirements:**

**Character Details:**
- Display current character info:
  - Name
  - Class (with icon)
  - Current bodyweight
- Edit functionality:
  - Update character name
  - Update bodyweight (recalculates tiers immediately)
  - Class locked after creation

**Settings (Basic for MVP):**
- Logout option
- [Future: Notification preferences, unit preferences (lbs/kg), theme]

**Account Management:**
- Email displayed
- Change password option
- [Future: Delete account option with confirmation]

**Acceptance Criteria:**
- User can update bodyweight easily
- Tier recalculations happen immediately upon bodyweight change
- Settings are minimal but functional for MVP

**Resolved Decisions:**
- Class locked after creation (preserves character identity)
- Gender removed from scope entirely
- Bodyweight updates unlimited frequency (user-managed)

---

## Section 4: Exercise Lists

### Push Skill Exercises

**Primary Exercise (affects tier):**
- Barbell Bench Press

**Supporting Exercises (tracking only in MVP):**
- Incline Barbell Bench Press
- Decline Barbell Bench Press
- Dumbbell Bench Press
- Incline Dumbbell Bench Press
- Barbell Overhead Press (OHP)
- Dumbbell Overhead Press
- Dips (weighted or bodyweight)
- Push-ups (weighted or bodyweight)

### Pull Skill Exercises

**Primary Exercise (affects tier):**
- Conventional Deadlift

**Supporting Exercises (tracking only in MVP):**
- Romanian Deadlift (RDL)
- Sumo Deadlift
- Trap Bar Deadlift
- Barbell Row (Bent-over Row)
- Pendlay Row
- Pull-ups (weighted or bodyweight)
- Chin-ups (weighted or bodyweight)
- Lat Pulldown
- Cable Row

### Legs Skill Exercises

**Primary Exercise (affects tier):**
- Barbell Back Squat

**Supporting Exercises (tracking only in MVP):**
- Front Squat
- Goblet Squat
- Bulgarian Split Squat
- Leg Press
- Hack Squat
- Lunges (Barbell or Dumbbell)
- Step-ups

**Notes:**
- Exercise lists finalized for MVP - covers core compound movements serious lifters use
- Each skill has 8-9 supporting exercises providing variety without overwhelming choice
- Can add more exercises post-launch based on user requests

---

## Section 5: Technical Architecture Options

### Database Options

Keep flexible - document options and decision criteria:

**Option 1: Supabase**
- **Pros:**
  - PostgreSQL (relational, well-suited for workout/PR data)
  - Built-in authentication (email/password, OAuth)
  - Generous free tier (50,000 monthly active users)
  - Row-level security
  - Real-time subscriptions (for future features)
  - Good documentation
- **Cons:**
  - Learning curve if new to PostgreSQL
  - Self-hosting required for full control (free tier may have limitations)
- **Best for:** Relational data model, need built-in auth, want room to scale

**Option 2: Convex**
- **Pros:**
  - TypeScript-first (great DX for solo dev)
  - Built-in real-time sync
  - Serverless functions included
  - Easy setup and deployment
  - Reactive queries
- **Cons:**
  - Newer/less mature ecosystem
  - Vendor lock-in (proprietary)
  - Free tier limits (smaller than Supabase)
- **Best for:** TypeScript-heavy stack, want fastest setup, value real-time out of box

**Option 3: Firebase**
- **Pros:**
  - Battle-tested, mature ecosystem
  - Excellent documentation and community
  - Built-in auth (including OAuth providers)
  - Real-time database
  - Free tier generous for starting out
- **Cons:**
  - NoSQL (Firestore) may be awkward for relational workout data
  - Can get expensive at scale
  - Vendor lock-in (Google)
- **Best for:** Want stability and community support, okay with NoSQL data modeling

**Decision Criteria:**
1. **Speed of implementation for solo dev** - Which can I get running fastest?
2. **Free tier limits** - Need to support 100+ users for validation phase
3. **Authentication integration** - Built-in auth is highly valuable
4. **Data model fit** - Relational (Supabase) vs Document (Convex/Firebase)
5. **Real-time capabilities** - Nice-to-have for future social features

**Recommendation:** Start with Supabase (relational model fits workout/PR tracking naturally, generous free tier, built-in auth). Can migrate later if needed.

### Deployment Options

**Option 1: Vercel**
- Fast deployment
- Excellent Next.js integration
- Generous free tier
- Automatic SSL
- Edge functions for serverless API

**Option 2: Netlify**
- Similar to Vercel
- Good CI/CD
- Serverless functions
- Free tier

**Option 3: Railway**
- Full-stack app deployment
- Good for apps with databases
- Docker support
- Simple pricing

**Recommendation:** Vercel (if using Next.js) - fast, generous free tier, great DX.

---

## Section 6: Out of Scope for MVP

The following features are explicitly OUT OF SCOPE for MVP (v0.1). Do not build these unless users explicitly request them post-launch:

**Social Features:**
- Leaderboards (global or by lift)
- Friend system
- Guilds/clans/teams
- In-app messaging
- Workout sharing
- Social media integrations

**Advanced Analytics:**
- Volume tracking over time
- Periodization analysis
- Predictive modeling
- Detailed charts/graphs beyond basic progress bars
- Export to CSV/Excel

**Mobile:**
- Native iOS app
- Native Android app
- (MVP will be responsive web app only)

**Other Fitness Modalities:**
- Cardio/conditioning tracking
- Nutrition tracking
- Bodyweight/calisthenics focus
- Yoga/flexibility
- HIIT workouts

**Program Features:**
- Pre-built workout programs
- AI coaching or recommendations
- Form check videos
- Exercise tutorials
- Custom program builder

**Integrations:**
- Sync with other apps (MyFitnessPal, Strava, etc.)
- Wearable device integration (Apple Watch, Fitbit, etc.)
- Smart gym equipment

**Advanced Features:**
- Marketplace or economy features
- Cosmetic purchases (skins, character customization)
- In-app currency
- Loot boxes or gacha mechanics

---

## Section 7: Success Metrics

### Activation Metrics
- **Signup to first workout logged:** Target >60%
- **Time to first workout logged:** Target <5 minutes
- **Completion rate of first workout log:** Target >80%

### Engagement Metrics
- **Workouts logged per week (active users):** Target 3-4
- **7-day retention:** Target >50%
- **30-day retention:** Target >40%
- **90-day retention:** Target >30%

### Progression Metrics
- **Average time to first level-up:** Track and optimize
- **Average time to first tier upgrade:** Track and optimize
- **Distribution of user levels/tiers:** Ensure progression feels achievable
- **PR frequency:** How often users hit PRs (should feel regular but not trivial)

### Social Proof Metrics (Post-Launch)
- Screenshots shared
- Reddit post upvotes/engagement
- Referrals from existing users
- User-generated content

### Validation Phase Success Criteria (Month 1)
- 100+ signups
- 50+ active users logging workouts weekly
- 30-day retention >30%
- Core loop validated (users return consistently)

### Growth Phase Success Criteria (Month 3)
- 500+ active users
- 30-day retention >40%
- Clear understanding of premium features users want
- Profitable unit economics (if monetized)

---

## Section 8: Open Questions to Resolve

### RESOLVED ✓

1. **Level Cap:** ✓ RESOLVED
   - **Decision:** Keep at 10 for MVP/beta
   - **Rationale:** Simpler, achievable, can extend post-launch based on feedback

2. **XP Curve:** ✓ RESOLVED
   - **Decision:** Linear progression (+25 XP per level increment)
   - **Rationale:** Predictable and fair for MVP, can adjust later if needed

3. **Gender/Tier Thresholds:** ✓ RESOLVED
   - **Decision:** Remove gender from scope entirely
   - **Rationale:** Target audience is 80-90% male, simplifies MVP significantly
   - **Implementation:** All users use male tier standards

4. **RPE (Rate of Perceived Exertion):** ✓ RESOLVED
   - **Decision:** Include as optional input field (6-10 scale)
   - **Rationale:** Lifters commonly use RPE metric
   - **Implementation:** Tracking only, does not affect XP/progression in MVP

5. **Bodyweight Update Frequency:** ✓ RESOLVED
   - **Decision:** Unlimited frequency, user-managed
   - **Rationale:** Trust users for MVP, can add enforced check-in (1-4 weeks) post-launch if needed

6. **Character Class Changes:** ✓ RESOLVED
   - **Decision:** Class locked after creation
   - **Rationale:** Preserves character identity

7. **Supporting Exercises:** ✓ RESOLVED
   - **Decision:** Keep in MVP (not just big 3)
   - **Rationale:** Makes app feel less narrow, not too much scope creep
   - **Implementation:** Supporting exercises tracked but don't affect tiers (just contribute to workout XP)

### REMAINING OPEN QUESTIONS

8. **Total Strength Tier Thresholds:**
   - Should Total Strength tier use same thresholds as individual lifts, or custom thresholds?
   - **Recommendation:** Define separate thresholds based on combined multiplier (can be done during implementation)

9. **Complete Exercise Lists:** ✓ RESOLVED
   - **Decision:** Lists finalized in Section 4
   - **Rationale:** 8-9 supporting exercises per skill covers core movements without overwhelming choice
   - Can expand post-launch based on user requests

10. **Tier Threshold Validation:**
    - Should tier thresholds be validated against strengthlevel.com or similar sources?
    - **Priority:** Low - thresholds look reasonable, can adjust post-launch if users report issues

11. **Streak Definition:**
    - Should streak be:
      - Consecutive days with at least one workout?
      - Weekly-based (e.g., "trained 3x per week maintains streak")?
    - **Trade-offs:**
      - Daily: More granular, but punishes rest days (not ideal for strength training)
      - Weekly: More forgiving, aligns with typical training splits (3-4x per week)
    - **Recommendation:** Weekly-based for MVP (more sustainable for serious lifters)

12. **Character Class Perks (Future Consideration):**
    - Keep character class purely cosmetic for foreseeable future
    - Could add gameplay bonuses later (e.g., "Deadlift Knight gets +5% XP on Pull workouts") if user interest exists
    - **Priority:** Low - cosmetic is fine for MVP

---

## Section 9: Development Phases

### Phase 1: MVP (Weeks 1-2)
**Goal:** Live URL with core functionality

**Must-Have:**
- User authentication (email/password via chosen database)
- Character creation flow
- Workout logging (big 3 + supporting exercises)
- XP/leveling system functional
- Tier calculations accurate
- PR tracking and detection working
- Basic dashboard showing character and progress
- Skills view showing detailed stats
- Deployed to production URL (Vercel or equivalent)

**Success Metric:** 10 people can create accounts, log workouts, and see progression without hand-holding

### Phase 2: Polish (Week 3)
**Goal:** Make it look game-like

**Focus:**
- Redesign UI to be more RPG-like (card aesthetics, depth, color)
- Add animations for level-ups
- Add visual feedback for PRs (celebration, confetti, etc.)
- Improve mobile responsiveness
- Add workout history calendar view
- Visual tier badges

**Success Metric:** Users say "this looks cool" not "this looks like a spreadsheet"

### Phase 3: Public Launch (Week 4)
**Goal:** Ship to Reddit and collect feedback

**Activities:**
- Launch posts on target subreddits (r/weightroom, r/powerlifting, etc.)
- Respond to every comment
- Fix critical bugs quickly
- Monitor analytics obsessively
- Interview active users

**Success Metric:** 100+ signups, 50+ active users logging workouts

### Phase 4: Iterate (Weeks 5-8)
**Goal:** Improve based on real user behavior

**Focus:**
- Build most-requested features
- Optimize retention drop-off points
- Add social features if requested
- Consider monetization if metrics hit targets
- Extend level cap if needed
- Add exercise variety based on requests

**Success Metric:** 30-day retention >40%, clear path to monetization or growth

---

## Section 10: Next Immediate Steps

1. **Resolve Open Questions (This Document)**
   - Review Section 8 with stakeholder/user
   - Make decisions on TBD items
   - Finalize exercise lists

2. **Create Data Model and Schema**
   - Design entity-relationship diagram
   - Define tables/collections for chosen database
   - Document relationships and constraints

3. **Choose Tech Stack**
   - Decide: Supabase vs Convex vs Firebase
   - Set up project and authentication
   - Deploy basic "Hello World" to confirm pipeline

4. **Build MVP (Phase 1)**
   - Implement features per Section 3
   - Focus on core loop: log workout → see XP → level up → feel good
   - Avoid feature creep

5. **Test with 10 Friends (Soft Launch)**
   - Get honest feedback on UX
   - Identify critical bugs
   - Validate core loop satisfaction

6. **Polish and Public Launch**
   - UI redesign for game-like aesthetic
   - Launch to Reddit
   - Monitor metrics obsessively

---

## Document Status

**Current Status:** Draft - Awaiting resolution of open questions

**Next Steps:**
1. User review and decisions on Section 8 (Open Questions)
2. Finalize exercise lists (Section 4)
3. Create detailed data model document
4. Begin technical implementation (Phase 1)

**Questions for User:**
- Review Section 8 and provide decisions on open questions
- Review and finalize exercise lists in Section 4
- Confirm tech stack preference (or keep flexible as planned)

---

**End of Product Specification v2.0**
