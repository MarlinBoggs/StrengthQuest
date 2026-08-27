# Combat Frame (v1 — no sprites, no rest timer)

**Status:** Design, refined against a working prototype — ready to implement
**Depends on:** Adventure Log (migration 021 — `get_workout_history`)
**Migrations required:** none
**Art required:** none
**Filename note:** kept as `RestCombatSpec.md` for continuity with the original draft. The rest timer itself is deferred — see [Deferred: Rest Timer](#deferred-rest-timer) at the bottom, where the original design is preserved unimplemented.

---

## Why this exists

"Session = boss kill" was already locked as the drop system's roll source. This feature makes that metaphor literal and visible: session XP stops being just a number and becomes damage against a monster's health bar. That's what turns the drop system's rules from something that needs a FAQ into something nobody has to explain — the effort floor *is* the boss having HP, a junk session visibly fails to kill anything.

**Change from the original draft:** the first version of this spec bundled a rest timer into the same surface as the combat log — one panel that expanded during rest to show a countdown *and* the boss fight. A quick interactive prototype surfaced that these are two different concepts wearing one outfit: the rest timer is a utility clock, the combat frame is a game layer, and cramming them into one lifecycle (visible only while resting) made both worse — the boss fight disappeared the moment you weren't resting, which is backwards. This revision **splits them**. Combat Frame ships alone, always present once engaged, independent of any timer. The rest timer's design is preserved below but not part of this pass.

This version still ships **zero sprites**. Bars, MUD-style text, and (new, validated in the prototype) a handful of synthesized sound cues — nothing else. If it lands, the animation commission is a safe investment; if it doesn't, we found out for free.

---

## Design principles

1. **Additive, never substitutive.** The combat layer must not replace the numbers. A serious lifter needs to see `185 × 5`. Damage is a second reading of the same data, not a replacement for it. The XP float stays `+18 XP` — the boss HP bar is what drains by 18.
2. **Never blocks input.** No animation or modal may delay logging the next set. Combat is glanceable, always ignorable.
3. **Failure is never punished.** Not killing the boss costs nothing — no XP loss, no streak break. "The Forge Wretch escaped" is a missed opportunity, not a penalty. Fitness apps that punish create guilt spirals and churn.
4. **Muteable, on two independent switches.** *Combat Mode* controls whether the boss frame exists at all (off = a tracker-first user sees nothing extra). *Sound* controls whether any of it makes noise. They're separate toggles on purpose — someone training in a quiet gym might want the visual HP bar but no audio; someone who finds the whole framing distracting wants Combat Mode off entirely but might still like the confirmation tick when a set logs. See the truth table under [Part 2 — Sound](#part-2--sound).
5. **Novelty decay is the known risk.** The combat frame gets seen ~30×/session, 4×/week. Variety in the combat log text (and now the sound cue selection) is the primary mitigation; keep phrase tables generous.

---

## Part 1 — Combat Frame

### The boss

One boss per session, assigned on the **first completed set**, flavored by that set's skill. Mixed sessions fight whatever the session opened with — no extra UI, and a Push day gets a Push-flavored enemy. (See [Open questions](#open-questions) for the manual-targeting idea this rules out for now.)

Starter table (flavor is yours to own — these are placeholders):

| Skill | Enemy |
|---|---|
| Push | Forge Wretch |
| Pull | Chain Warden |
| Legs | Goblin Warband |
| Endurance | The Long Road |
| Hit Points | Bloodhound Pack |
| Defense | Stone Sentinel |

### Boss HP — how it's actually calculated

```
bossHp = round(0.8 × median(total_xp of last 5 sessions))
bossHp = max(bossHp, 150)   // floor
```

Walking through it:

1. **Data source:** `get_workout_history(character_id, 5)` (migration 021, already deployed) returns the character's 5 most recent *completed* sessions, each with a `total_xp`. The **in-progress session is never included** — you're never fighting a boss sized by damage you're currently dealing.
2. **Take the median of those 5 `total_xp` values, not the mean.** One monster session (a PR day, a stress-test) shouldn't inflate the bar for weeks afterward the way an outlier would drag a mean up. The median is boringly resistant to exactly that.
3. **Multiply by 0.8.** Killing the boss should be the *normal* outcome of a real session, not a stretch goal. At a 1.0 multiplier you'd fail roughly half your sessions by definition (you're being compared to your own median), which is demotivating. At 0.8, a typical session kills it with room to spare, and a genuinely light or junk session doesn't. **The boss is a floor check, not a challenge.**
4. **Round, then apply a 150-HP floor.** The floor is what a brand-new character fights on session 1, and what protects anyone coming off a lighter stretch from an unwinnable bar.

**Worked examples:**

| Scenario | Last 5 session `total_xp` | Median | 0.8 × median | Boss HP |
|---|---|---|---|---|
| Established lifter, normal week | `[220, 260, 190, 305, 240]` | 240 | 192 | **192** |
| Same lifter, coming off a deload | `[80, 95, 70, 110, 90]` | 90 | 72 | **150** (floor) |
| Brand-new character, first-ever session | *(no history — array is empty)* | — | — | **150** (floor, no median attempted) |

That third row is a real edge case the original draft glossed over: `median([])` is undefined, not 0. The implementation must check `recent.length === 0` and go straight to the floor rather than computing a median of nothing. The same applies loosely for 1–4 sessions of history — `median()` still works arithmetically on a short array, it's just a noisier estimate early on, which is fine; it self-corrects as history accumulates.

### Damage

`damage = the set's xpAwarded`. Direct mapping, no second formula, no duplicated math — same principle that already governs the rest of the app's XP pipeline (`calculate-xp.ts` is the one source of truth; the RPC just sums).

The existing `sq-xp-rise` float keeps reading `+18 XP` (principle 1). The boss HP bar drains by 18 simultaneously. Two readings, one number.

**HP remaining is derived, not tracked** — this matters and the original draft didn't spell it out. Mirroring the existing `sessionSkillXp` pattern in `WorkoutForm.tsx` (a `useMemo` over `exercises`, never a separately-tracked counter), the real implementation should compute:

```ts
const damageDealt = sum(xpAwarded of every completed set since the boss was assigned)
const bossHpRemaining = Math.max(0, bossHpMax - damageDealt)
const overkill = Math.max(0, damageDealt - bossHpMax)
```

as a `useMemo`, every render — never as state that gets decremented imperatively. The upside is free correctness: if a user un-checks a set they marked done by mistake (the existing `markSetEditable` flow already resets `xpAwarded` to 0), the boss bar heals automatically, because it's recomputed from scratch rather than having drifted from an incremental subtraction.

The one thing that is *not* derivable this way is the **combat log's text** — each line's randomly-chosen phrasing has to be picked once, at the moment a set is newly marked done, and must not re-roll on every re-render. So the log array is genuinely tracked, append-only state — the same category as `activeDrops` (the XP-float animations already in `WorkoutForm.tsx`), which is event-driven for the identical reason. One consequence worth accepting rather than solving: un-checking a set heals the HP bar (derived) but leaves its log line in place (tracked, append-only). The log is a journal of what happened, not a live mirror of current state — a minor quirk, not a bug worth chasing in v1.

**Boss identity is also tracked, not derived**, and this one has no derived alternative: "the skill of the *first* completed set" is a fact about event order, and nothing in `SetEntry`/`ExerciseEntry` currently records *when* a set was completed relative to others — only whether it currently is. So the assignment has to happen once, imperatively, the first time any set transitions to completed in a session, and then stay pinned regardless of what gets logged afterward.

### Overkill

When cumulative damage exceeds `bossHpMax`, the bar caps at 0 (empty) and further damage accrues to a separate **`OVERKILL +N`** counter — same derivation as HP remaining, just the other side of the clamp.

**Overkill is purely cosmetic bragging rights.** It must never buy extra drop rolls — that would reintroduce exactly the junk-volume incentive the effort floor exists to prevent.

### Why this makes the drop system self-explaining

| Drop rule (already locked) | Now reads as |
|---|---|
| Session = one roll | You killed it, it dropped loot |
| Effort floor, or no roll | The boss has HP — junk sets visibly fail to kill anything |
| Bonus roll on PR / tier-up | Critical hit |
| Session XP | Damage dealt |

---

## Part 2 — Sound

Not in the original draft — this came out of prototyping the combat log and turned out to matter more than expected. Everything is a **synthesized Web Audio cue**, not an audio file: a handful of scheduled oscillators through one `AudioContext`. Zero asset weight, zero licensing, and it's genuinely more in-theme than a stock "ding" would be.

### Architecture

One `AudioContext`, created lazily on the **first real user gesture of the session** (not on page load — browsers block autoplay, and iOS in particular requires the unlock to happen inside a gesture handler). One master `GainNode` between every oscillator and the destination, so the Sound toggle is a single gain ramp rather than a conditional guarding every call site.

```ts
// app/log-workout/sound.ts (new)
function unlockAudio(): void        // idempotent, call on first Done tap
function setMasterGain(on: boolean) // Sound toggle handler
function tone(freq, offsetSec, durationSec, oscType, peakGain): void  // primitive
```

Six cues, all built from `tone()`:

| Cue | Fires on | Character |
|---|---|---|
| **Tick** | Every completed set, *regardless of Combat Mode* | Short, high, quiet — the audio twin of the `+XP` float |
| **Engage** | Boss assigned (first completed set of the session) | Low, two-note, a little ominous |
| **Hit** | Normal damage | Short triangle-wave thud |
| **Heavy hit** | Damage > ~12% of `bossHpMax` in one set | Deeper — an added low sub-thump layered under the same thud |
| **Kill** | The set that drops HP to 0 | Ascending major triad — the one moment allowed to sound triumphant |
| **Overkill** | Any damage landed after the boss is already dead | Quiet, muted single tone — deliberately unsatisfying so it never competes with the kill sound |
| **Escape** | Session ended with the boss still alive | Soft descending interval, kept gentle on purpose (principle 3 — an escape must not sound like a penalty) |

### Two independent toggles

| Combat Mode | Sound | Behavior |
|---|---|---|
| On | On | Full experience — boss bar, log, tick, hit/kill/escape cues |
| On | Off | Boss bar + log fully visible, silent |
| Off | On | Plain XP tracking, tick plays on every Done |
| Off | Off | Plain XP tracking, fully silent |

Vibration (`navigator.vibrate`) rides alongside the kill cue as a third, independent signal — works on Android Chrome, silently no-ops on iOS Safari, so it's a bonus layer and never the only feedback for anything.

---

## Part 3 — Surfaces

### A. The HUD (always visible, unchanged in spirit)

Stays the **existing** `SessionXpHeader`, and stays purely a session-utility readout now that boss state has its own home: `N sets · X,XXX lbs · +Y XP`. No boss content lives here anymore — that's the whole point of decoupling.

> ⚠️ **Preserve the existing sticky constraint.** Per CLAUDE.md, `SessionXpHeader` must mount once when an exercise is selected and stay mounted — iOS Safari can fail to paint a freshly inserted `position: sticky` element until the next scroll. This constraint is specific to `SessionXpHeader` because it's the element that's `position: sticky`; it doesn't automatically apply to Combat Frame below (see next section).

### B. Combat Frame (new — replaces the old "Rest Panel" surface)

A standalone panel, **not** `position: sticky`, that sits directly below the HUD. It is not gated by resting, not gated by anything except Combat Mode:

- Before the boss is assigned: present-but-idle, showing a placeholder ("Complete a set to engage a boss…"). Mounted from the start rather than conditionally inserted — not because of the Safari sticky bug (it isn't sticky), just for layout stability, so nothing jumps into existence mid-scroll.
- Once assigned: boss name, full-width HP bar (tinted by the boss's skill color), and the combat log beneath it.

Contents:
1. **Boss name + HP bar**, full width, tinted by `skills.color_hex` for that skill.
2. **Combat log** — see below.

*(The original draft's "Up Next" content — next exercise + its last-time line — lived here because it made sense as something to read *while resting*. Without a rest pause, there's no obvious dead moment to attach it to, so it's deferred alongside the rest timer rather than force-fit somewhere. `ExerciseCard`'s own "Last time" line, shipped with the Adventure Log, already covers the core utility.)*

### C. The Combat Log — the answer to "no sprites"

A MUD-style scrolling text log, append-only per session:

```
You strike the Forge Wretch for 18 damage.
Bench Press lands true — 185 × 5.
The Forge Wretch staggers.          142 / 300
```

Implementation: a template table keyed by event type (`hit`, `heavy_hit`, `intro`, `kill`, `overkill`, `escape`), several phrasings each, chosen at random *once* per event and stored (see the derivation note in Part 1 — this is tracked state, not recomputed). Weight phrasing by relative damage so a heavy set reads differently from a light one.

**Keep the phrase tables generous.** This is the main defense against novelty decay, and adding lines later costs nothing.

---

## Part 4 — Implementation plan

### New files

| File | Purpose |
|---|---|
| `app/log-workout/combat.ts` | Boss table, `deriveBossHp()`, phrase tables, `combatLine()` |
| `app/log-workout/sound.ts` | Synthesized cue engine — `unlockAudio()`, `setMasterGain()`, `tone()`, and the six named cues |
| `app/log-workout/CombatFrame.tsx` | The standalone panel: boss name, HP bar, combat log. Present-but-idle before engagement. |

### Modified files

| File | Change |
|---|---|
| `app/log-workout/page.tsx` | Fetch `get_workout_history(id, 5)`, pass `recentSessionXp: number[]` |
| `app/log-workout/WorkoutForm.tsx` | Wire ✓ → append combat log entry + fire the matching sound cue; derive `bossHpRemaining`/`overkill` via `useMemo`; track boss identity + log array as new state |
| `app/log-workout/SessionXpHeader.tsx` | No change beyond staying exactly what it already is — confirms boss content never leaked in |
| `app/log-workout/form-types.ts` | Add `BossState` (`{ name, skill, hpMax }`, assigned once), `CombatLogEntry` (`{ text, cls }`) |

### State

Derived (never tracked, per the pattern above):
```ts
// useMemo over exercises + bossHpMax
const damageDealt      = sum(xpAwarded of completed sets since boss assigned)
const bossHpRemaining  = Math.max(0, bossHpMax - damageDealt)
const overkill          = Math.max(0, damageDealt - bossHpMax)
const bossDefeated      = bossHpRemaining <= 0
```

Genuinely tracked (new):
- `boss: BossState | null` — set once, on the first completed set of the session
- `combatLog: CombatLogEntry[]` — append-only, one entry (or a small burst) per completed set, phrasing rolled once at append time
- `soundEnabled: boolean` — the Sound toggle, independent of `combatMode`

All three (plus `combatMode`) belong in the existing localStorage draft, same as the rest of session state, so a reload mid-session recovers the fight in progress.

**No DB state in v1.** The boss is entirely client-side and presentational. Kill/escape only needs to reach the server once drops exist.

---

## Out of scope for v1

- Sprites, animation, enemy art
- Boss state persisted to the DB
- Drop rolls on kill (arrives with Drop System v1)
- Multi-phase bosses, boss variety beyond one per skill
- Rest timer (deferred — see below)
- Manual boss/monster selection (see Open questions)

---

## Open questions

1. **Boss on mixed sessions.** First-set skill is still the cheap answer and still ships in v1. **New consideration:** a future version could let the user pick which skill's monster to engage *before* starting a session — "fight the Goblin Warband today" — rather than auto-assigning from whatever gets logged first. That's a bigger change than it looks: today's `bossHp` formula is deliberately whole-session (median of `total_xp` across all skills in each of the last 5 sessions), which lines up with "one boss per session" cleanly. Manual targeting implies the boss should probably scale to *that skill's* recent effort instead — e.g., median `total_xp` of the last 5 sessions that included Legs work, not the last 5 sessions period. That needs a different, skill-scoped query (a variant of `get_workout_history`, or a new RPC) and changes the metaphor from "one boss per session" to "one boss per skill, chosen per session." Worth prototyping separately before committing — noted here so it isn't lost, not decided.
2. **Deload weeks.** A trailing-median HP bar means a deliberate light week reliably fails to kill. Is that acceptable (it's honest) or does it need a manual "deload" flag that lowers the bar?
3. **Combat Mode default.** On or off for new users? On shows the differentiator immediately; off risks nobody finding it. The prototype defaulted to on.
4. **Sound default.** Should Sound default on alongside Combat Mode, or off until a user opts in (gyms are loud, but also often have headphones in)? Prototype defaulted both on.

---

## Deferred: Rest Timer

Preserved from the original draft, unimplemented. Nothing below has been built or prototyped — this is design, not status.

### Trigger and lifecycle

- Tapping ✓ on a **strength set** would start the rest timer. Cardio entries are duration-based and have no rest concept — they would not trigger it.
- Starting a new rest while one is running would reset it.
- The timer would be dismissable (tap to clear) and skippable.

### Duration

- Global default: **120s**.
- `−30s` / `+30s` buttons would adjust the running timer.
- **Last-used duration remembered per exercise**, reused next time that exercise is logged — stored in the localStorage draft as `restDefaults: Record<exerciseId, seconds>`.

### ⚠️ Technical gotcha — the #1 bug in every JS timer

**Never accumulate elapsed time in a `setInterval`.** Backgrounded tabs and locked phones throttle or halt timers, so an accumulating counter drifts badly or stops.

**Correct approach:** store an absolute `restEndsAt: number` (epoch ms). Compute remaining as `restEndsAt - Date.now()` on every tick *and* on `visibilitychange`. The interval is only a repaint trigger, never the source of truth. A user who locks their phone for 90s must return to a correct countdown.

Persist `restEndsAt` into the localStorage draft so a mid-rest page reload recovers.

### Completion signal

| Signal | Reality |
|---|---|
| `navigator.vibrate()` | Works on Android Chrome. **Silently no-ops on iOS Safari.** |
| Audio cue | Requires an `AudioContext` unlocked by a prior user gesture — the same engine built for Combat Frame in Part 2 could be reused directly. |

Ship a **visual** completion state as the guaranteed baseline (HUD flashes gold, timer reads `REST COMPLETE`), and treat vibration/audio as progressive enhancement.

### Why it's deferred rather than cut

The dead-time problem it solves (60–180s of standing around, 20–40 min/session) is real and unsolved by Combat Frame alone. It's deferred because bundling it with the combat surface was the actual mistake in the original draft, not because the timer itself is a bad idea. Whenever it's picked back up, it should be its own surface with its own lifecycle — visible whenever a rest is running, full stop, not visible *because* combat is happening or vice versa. The `sound.ts` engine from Part 2 and the `restDefaults` persistence idea above should both carry forward unchanged.
