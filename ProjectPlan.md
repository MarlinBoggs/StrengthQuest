# StrengthQuest - 2-Month Launch Plan

**Created:** February 3, 2026
**Launch Deadline:** April 4, 2026 (61 days)
**Public Beta:** March 21, 2026 (46 days)

---

## Philosophy: Ship > Perfect

This plan is designed with one goal: **get you to launch**.

**Key Principles:**
1. **Time-boxed phases** - When time runs out, you ship what you have
2. **Ship triggers** - Pre-defined points where you MUST launch or pivot
3. **Scope protection** - Aggressive "no" to feature creep
4. **Public commitment** - Accountability through public deadlines
5. **Minimum viable increments** - Every week ends with something working

**Your pattern:** Strong start, weak finish
**Our counter:** Make finishing the default path by making it the next immediate step, always.

---

## The Non-Negotiable Launch Date

**April 4, 2026 (Friday) - Public Reddit Launch**

This date is sacred. No matter what state the app is in, you will:
1. Post to r/weightroom with what you have
2. Share the live URL
3. Collect feedback from real users

**What if it's not done?** Ship it anyway. Beta users are forgiving. A working-but-ugly app beats a perfect plan.

**Pre-commit now:** Tweet/post today: "Launching my Runescape-style strength tracker on April 4. Holding myself accountable."

---

## 8-Week Breakdown

### Week 1: Feb 3-9 - Foundation (Setup Week)
**Goal:** Get development environment working, make first tech decision

**Must Complete:**
- [ ] Choose tech stack (Supabase vs Convex vs Firebase) - **Monday EOD**
- [ ] Set up database project
- [ ] Set up Next.js project locally (port from V0 or start fresh)
- [ ] Deploy "Hello World" to Vercel - **prove deployment works**
- [ ] Set up basic auth (email/password login/signup working)
- [ ] Database schema v1 designed on paper

**Ship Trigger:** By Sunday, you must have a live URL (even if it's just a login page)

**Success Metric:** Can create account and log in on live site

**Scope Protection:** DO NOT start on UI redesign yet. DO NOT add features beyond auth.

---

### Week 2: Feb 10-16 - Core Data Model
**Goal:** Database schema implemented, can create character

**Must Complete:**
- [ ] Implement full database schema (users, characters, skills, workouts, exercises, sets, PRs)
- [ ] Character creation flow working (name, class, bodyweight)
- [ ] Dashboard displays created character
- [ ] Can update bodyweight

**Ship Trigger:** By Sunday, you must be able to create a character on the live site

**Success Metric:** 5 test characters created on production

**Scope Protection:** DO NOT add workout logging yet. DO NOT redesign UI. Just data + basic forms.

---

### Week 3: Feb 17-23 - Workout Logging (Critical Week)
**Goal:** Can log a workout end-to-end

**Must Complete:**
- [ ] Workout logging interface (date, intensity, length)
- [ ] Exercise selection (dropdown from ~25 exercises)
- [ ] Set logging (weight, reps, optional RPE)
- [ ] XP calculation working
- [ ] Display XP gained after workout
- [ ] Basic tier calculation (can see your tier for big 3)

**Ship Trigger:** By Sunday, you must log a real workout on production and see XP + tier

**Success Metric:** You personally log 3 real workouts during the week

**Scope Protection:** DO NOT add PR detection yet. DO NOT add animations. DO NOT redesign. Just make logging work.

**⚠️ WARNING:** This is where solo projects often stall. If you're stuck by Thursday, CUT SCOPE. Remove RPE, remove tier calculation, just get weight/reps logging working.

---

### Week 4: Feb 24-Mar 2 - Leveling & PRs
**Goal:** Core game loop complete (XP → Levels, PR detection)

**Must Complete:**
- [ ] Skill leveling working (XP accumulates, levels up at thresholds)
- [ ] Level-up notification/message
- [ ] 1RM calculation per set
- [ ] PR detection (compare to historical best)
- [ ] PR celebration/notification
- [ ] Skills view showing current level, XP progress, tier, PR

**Ship Trigger:** By Sunday, hit a PR on production and see the celebration

**Success Metric:** All 3 skills have logged workouts, at least 1 level-up achieved

**Scope Protection:** DO NOT add calendar view yet. DO NOT add streak tracking. Just core progression.

---

### Week 5: Mar 3-9 - Dashboard & History
**Goal:** User can see their progress at a glance

**Must Complete:**
- [ ] Dashboard with character card, XP progress bars, quick-start buttons
- [ ] Weekly summary on dashboard
- [ ] Workout history view (list of past workouts)
- [ ] Can click workout to see details
- [ ] Basic calendar heatmap (even if ugly)

**Ship Trigger:** By Sunday, dashboard shows real data from your workouts

**Success Metric:** Dashboard feels motivating, not just informational

**Scope Protection:** DO NOT add social features. DO NOT add analytics beyond what's specified.

---

### Week 6: Mar 10-16 - Polish & Soft Launch
**Goal:** Make it look game-like, test with friends

**Must Complete:**
- [ ] UI redesign - make it look RPG-like (skill cards, tier badges, colors)
- [ ] Level-up animation (can be simple)
- [ ] PR celebration animation (can be simple)
- [ ] Tier badges/icons
- [ ] Mobile responsive (doesn't have to be perfect)
- [ ] Fix critical bugs from your own usage

**Ship Trigger:** By Wednesday, invite 5 friends to create accounts

**Success Metric:** 3 friends log at least one workout

**Feedback Collection:** DM each friend: "What's confusing? What feels broken? What would make you come back?"

**Scope Protection:** DO NOT add features friends request unless they block them from logging workouts.

---

### Week 7: Mar 17-23 - Bug Fixes & Beta Launch Prep
**Goal:** Fix issues from soft launch, prepare Reddit post

**Must Complete:**
- [ ] Fix top 3 bugs reported by friends
- [ ] Write Reddit launch post (draft by Monday, finalize by Wednesday)
- [ ] Create screenshots/demo for Reddit post
- [ ] Add basic onboarding hints if users are confused
- [ ] Performance check (is it fast enough?)
- [ ] Set up basic analytics (track signups, workouts logged)

**Ship Trigger:** By Friday Mar 21, post to r/weightroom for beta feedback

**Beta Launch Post Template:**
- "I built a Runescape-style strength tracker for the big 3 lifts"
- Lead with screenshot of YOUR character hitting a tier
- Be transparent it's beta, ask for feedback
- Include live URL
- Monitor and respond to EVERY comment

**Success Metric:** 20+ signups from Reddit beta launch

**Scope Protection:** DO NOT add features during this week. Only fix bugs.

---

### Week 8: Mar 24-30 - Iterate & Prep Final Launch
**Goal:** Address critical feedback, prepare for public launch

**Must Complete:**
- [ ] Fix critical bugs from beta users (focus on onboarding and workout logging)
- [ ] Improve most confusing part of UX based on feedback
- [ ] Add 1-2 most-requested features ONLY if they're <4 hours each
- [ ] Write final launch post (less "beta", more confident)
- [ ] Create shareable achievement graphics (if users asked for it)

**Ship Trigger:** N/A - final launch is April 4

**Success Metric:** 30-day retention >30% from beta users (at least 6 of 20 return)

**Scope Protection:** Only fix showstoppers. Feature requests go in "post-launch" list.

---

### Week 9: Mar 31-Apr 4 - LAUNCH WEEK
**Goal:** Public launch, collect users, monitor everything

**Launch Day: Friday April 4**

**Monday-Thursday:**
- [ ] Final bug sweep
- [ ] Test complete user flow (signup → character → workout → see progress)
- [ ] Finalize launch post
- [ ] Prepare to respond to comments quickly

**Friday April 4 - LAUNCH:**
- [ ] 8am: Post to r/weightroom
- [ ] 9am: Post to r/powerlifting (if allowed, check rules)
- [ ] 10am: Post to r/bodybuilding (if allowed)
- [ ] Throughout day: Respond to EVERY comment
- [ ] Evening: DM power users (anyone who logs 2+ workouts) asking for feedback

**Success Metric:** 100+ signups, 50+ log at least one workout

**Celebration:** No matter what happens, you shipped. That breaks your pattern.

---

## Weekly Rhythm (Every Week)

### Monday
- Review what got done last week
- Commit to this week's "must complete" items
- Identify biggest risk to shipping this week

### Wednesday
- Midweek check: On track? Behind?
- If behind: CUT SCOPE immediately, don't wait

### Friday
- Deploy latest to production
- Test on production
- Demo to someone (friend, partner, stranger on Discord)

### Sunday
- Ship trigger check: Did you hit it?
- If no: What breaks if you launch anyway? (Usually nothing)
- Plan Monday's first task

---

## Scope Creep Defense System

**The "Not Now" List**

When you get an idea for a feature (or a user requests one), it goes here instead of into the build:

### Post-Launch Features (After April 4)
- Social features (leaderboards, friends)
- Advanced analytics
- Shareable achievements
- Streak tracking (if not built in Week 5)
- Exercise video tutorials
- Workout program templates
- Mobile app
- Custom character avatars
- [Your ideas here]

**Rule:** Nothing on this list gets built until 30 days post-launch AND you have 50 active users.

---

## Forcing Functions

### Public Accountability
- [ ] Tweet/post today: "Launching StrengthQuest (Runescape for lifters) on April 4, 2026"
- [ ] Share progress screenshots every Friday
- [ ] Tell 3 people the launch date

### Financial Commitment
- [ ] Buy domain (strengthquest.app or similar) - non-refundable
- [ ] Pay for Supabase/hosting (forces you to use it)

### Social Pressure
- [ ] Tell your gym buddies you're building this
- [ ] Promise to demo it to them by Week 6

---

## What If You Get Stuck?

### Stuck on Tech Decision (Week 1)
**Default:** Supabase + Next.js + Vercel. Don't overthink it.

### Stuck on Schema Design (Week 2)
**Default:** Start simple, can always add tables later. Ship with imperfect schema.

### Stuck on Workout Logging (Week 3) ⚠️ HIGH RISK
**Minimal version:** Just log exercise name + weight + reps. No intensity, no length, no RPE. Get SOMETHING working.

### Stuck on UI/Design (Week 6)
**Default:** Use Tailwind components. Copy Habitica's visual style. Don't design from scratch.

### Stuck on Motivation (Any Week)
**Emergency reset:**
1. Look at the launch date (April 4)
2. Look at what works right now
3. Ship that on Reddit TODAY as "ultra early beta"
4. Use the feedback to re-energize

---

## Daily Habits for Solo Builders

### Start of Day (5 min)
- [ ] What's the ONE thing that must work by end of day?
- [ ] Write it down

### End of Day (5 min)
- [ ] Did that one thing work?
- [ ] If yes: Commit and deploy
- [ ] If no: Why? Do I need to cut scope?

### Avoid These Traps
- ❌ "I'll just refactor this first" (No. Ship ugly code.)
- ❌ "I should add X before launch" (No. Post-launch list.)
- ❌ "Let me research the best way to..." (No. Pick one, move on.)
- ❌ "I'll start fresh next week" (No. Ship what you have NOW.)

---

## Success Metrics (Real Validation)

### Week 2: Foundation Validated
- ✅ Live URL exists
- ✅ Auth works
- ✅ Character created

### Week 4: Core Loop Validated
- ✅ You logged 10 real workouts
- ✅ You hit a level-up
- ✅ You hit a PR and saw celebration

### Week 6: Product-Market Fit Signal
- ✅ 3 of 5 friends logged 2+ workouts
- ✅ At least one friend asks "when can I share this?"

### Week 8: Beta Validated
- ✅ 20+ signups from Reddit
- ✅ 30% log a workout
- ✅ 30-day retention >30%

### Week 9: Launch Validated
- ✅ 100+ signups
- ✅ 50+ active users
- ✅ YOU SHIPPED A SOLO PROJECT

---

## Escape Hatches (If You're Way Behind)

### By Week 4 (Mar 2)
If core loop isn't working yet:
- **Option A:** Push launch to April 18 (2 more weeks)
- **Option B:** Cut tiers entirely, just do XP/levels
- **Option C:** Ship "workout logger with XP" (no tiers, no PRs)

### By Week 6 (Mar 16)
If soft launch didn't happen:
- **Option A:** Skip soft launch, go straight to beta on Mar 21
- **Option B:** Ship to just 1 friend for feedback

### By Week 8 (Mar 30)
If beta was a disaster:
- **Still launch April 4.** Worst case: 5 people use it and you get feedback. That's still shipping.

---

## The Finish Line Mindset

**From now until April 4:**
- You are in SPRINT MODE
- Every decision is "does this get me closer to April 4?"
- Features that don't ship by April 4 don't exist
- Perfect is the enemy of shipped

**Your job isn't to build the best strength tracker.**
**Your job is to ship StrengthQuest by April 4.**

After you ship, THEN you can make it better.

---

## Week-by-Week Checklist (High Level)

- [ ] **Week 1 (Feb 3-9):** Auth + deployment working
- [ ] **Week 2 (Feb 10-16):** Character creation working
- [ ] **Week 3 (Feb 17-23):** Workout logging working
- [ ] **Week 4 (Feb 24-Mar 2):** Leveling + PRs working
- [ ] **Week 5 (Mar 3-9):** Dashboard + history working
- [ ] **Week 6 (Mar 10-16):** UI polished + soft launch
- [ ] **Week 7 (Mar 17-23):** Beta launch (Mar 21)
- [ ] **Week 8 (Mar 24-30):** Iterate on beta feedback
- [ ] **Week 9 (Mar 31-Apr 4):** PUBLIC LAUNCH (Apr 4)

---

## Emergency Contact

**When you want to quit:**
1. Re-read this section
2. Look at the launch date
3. What's the absolute minimum you could ship?
4. Ship that

**The only failure is not shipping.**

You've started projects before. This time, you're going to finish.

April 4, 2026. Mark your calendar. Tell someone. Ship it.

---

**Next Step:** Choose your tech stack TODAY. Supabase? Convex? Firebase?
**Then:** Set up the project and deploy "Hello World" by end of Week 1.

Let's go. 🚀
