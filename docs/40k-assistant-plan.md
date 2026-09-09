# Warhammer 40k Combat Assistant — Project Plan

*Working draft. Scope: a fast lookup tool for resolving attacks at the table.*

---

## 1. What this is

A two-army reference tool. You import both rosters, tap an attacking unit and a
target unit, and immediately see every weapon profile with its hit / wound / save
target numbers already worked out.

**Core problem being solved:** at the table, one person ends up being the human
rules database — looking up weapon profiles, counting attacks, comparing S vs T,
applying AP to the save. That lookup is the bottleneck, not the dice.

## 2. What this is NOT

Deliberate non-goals, at least for v1:

- **Not a game state tracker.** It does not know who is wounded, who has moved,
  what CP you have left. State tracking requires the app to be the source of
  truth for the entire game; players forget to update it, state drifts, and then
  every answer is silently wrong. Model counts are a manual stepper instead.
- **Not a dice roller.** Players roll their own.
- **Not an LLM doing math.** All numbers come from a deterministic function. One
  wrong answer in front of an opponent kills trust in the tool permanently.
- **Not a rules referee.** Ambiguous or exotic rules are shown as reference text;
  the human decides.

---

## 3. Key architectural insight

**The roster export is self-contained.** No external data source is needed.

New Recruit exports both a JSON tree and `.rosz` / `.ros` files, all in
BattleScribe format. These embed the full profiles of every selected unit and
weapon inline. There is no need for BSData, a scraper, a catalog sync, or a
backend database.

Example of what a `.ros` actually contains:

```xml
<selection name="Intercessor Squad" type="unit">
  <profile name="Intercessor Squad" typeName="Unit">
    <characteristic name="M">6"</characteristic>
    <characteristic name="T">4</characteristic>
    <characteristic name="SV">3+</characteristic>
    <characteristic name="W">2</characteristic>
    <characteristic name="LD">6+</characteristic>
    <characteristic name="OC">2</characteristic>
  </profile>

  <selection name="Bolt rifle" number="4">
    <profile name="Bolt rifle" typeName="Ranged Weapons">
      <characteristic name="Range">24"</characteristic>
      <characteristic name="A">2</characteristic>
      <characteristic name="BS">3+</characteristic>
      <characteristic name="S">4</characteristic>
      <characteristic name="AP">-1</characteristic>
      <characteristic name="D">1</characteristic>
      <characteristic name="Keywords">Assault</characteristic>
    </profile>
  </selection>
</selection>
```

`number="4"` × `A=2` = 8 attacks. Attacker BS, target T and SV — all present.
**Two roster files in, and you have everything needed for the core output.**

Note: `.rosz` is just a zipped `.ros`. Unzip, then parse XML.

---

## 4. Data model

Normalize both formats (XML and New Recruit JSON) into one internal shape:

```
Army
  name, faction, detachment
  units: [Unit]

Unit
  id, name
  modelCount            // from roster, user-adjustable at runtime
  profile: { M, T, SV, W, LD, OC, Invuln? }
  weapons: [WeaponEntry]
  keywords: [String]    // INFANTRY, VEHICLE, MONSTER, etc.
  abilitiesText: String // prose, display-only, never parsed

WeaponEntry
  name
  count                 // how many models carry it
  type                  // ranged | melee
  A, skill, S, AP, D    // A and D may be dice expressions: "D6", "2D3", "D6+2"
  keywords: [WeaponKeyword]
```

**Gotchas:**

- `A` and `D` are often dice expressions, not integers. Parse into a small
  expression type (`{ dice: n, sides: m, flat: k }`) so you can show both the
  raw value and an average.
- Invulnerable saves usually live in a separate ability profile, not the unit
  statline. Needs its own extraction path.
- Some weapons have multiple firing modes (plasma standard / supercharge) and
  appear as sibling profiles. Treat as separate rows.
- Unit keywords matter for `Anti-X` weapon keywords.

---

## 5. The compute core

Small and deterministic. This is the whole engine.

```
hitTarget   = weapon.skill, modified, total modifier capped at ±1

woundTarget:
    S >= 2*T   ->  2+
    S >  T     ->  3+
    S == T     ->  4+
    2*S <= T   ->  6+
    else       ->  5+
  ...then modified, capped at ±1

saveTarget  = min( target.SV - AP , target.Invuln )   // best available save
                                                      // cover applies to armour only
```

**Rules to get right:**

- Hit and wound modifiers are capped at ±1 total. Three stacking debuffs is still
  only -1. AP modifiers are *not* capped.
- Always fall back to the invulnerable save when the modified armour save is
  worse. This is the single most commonly missed thing at the table and should be
  visibly flagged in the output.
- Unmodified 1 always fails; unmodified 6 always hits/wounds.

**Test strategy:** a dozen hand-verified matchups as unit tests before building
any UI. Get this right first and everything downstream is presentation.

---

## 6. Modifier layer

Do **not** model stratagems as named objects — there are hundreds and they change
quarterly. Build a small set of composable primitives instead. Six or seven
toggles covers the overwhelming majority of real table situations.

| Toggle | Effect |
|---|---|
| In cover | +1 to armour save |
| Half range / melta | extra damage |
| ±1 to hit | most common strat/ability effect |
| ±1 to wound | ditto |
| Reroll 1s / reroll all (hit or wound) | affects expected damage, not target number |
| AP worsened by 1 | e.g. Armour of Contempt–style effects |
| Invuln override | one-off abilities |

**Cover is the trap.** It is not a flat +1. There is a carve-out where a target
with a good save gets no benefit against AP0 attacks, and it never applies to
invulnerable saves. Verify the exact current wording before implementing — this
is the one toggle where the naive version produces wrong answers.

Weapon keywords (`Sustained Hits N`, `Lethal Hits`, `Devastating Wounds`,
`Anti-X N+`, `Torrent`, `Blast`, `Twin-linked`) are a short regular vocabulary
and can be auto-read from the profile into a lookup table.

---

## 7. Output format

Show the reasoning, not just the numbers — the opponent has to be able to verify
it, otherwise the tool is an argument generator rather than a referee.

```
Intercessors  →  Rubric Marines

Bolt rifle ×4        8 attacks   Hit 3+   Wound 5+   Save 4+ (3+ / AP-1)   D1
Plasma (std) ×1      2 attacks   Hit 3+   Wound 3+   Save 5+ (invuln)      D2
Power fist (melee)   3 attacks   Hit 3+   Wound 3+   Save 5+ (invuln)      D2
```

The plasma row falls back to the 5++ because 3+ with AP-2 is worse. Flag that
fallback explicitly in the UI.

Optionally show expected unsaved wounds / expected damage per row, but keep the
target numbers as the primary information.

---

## 8. What is NOT usable from the roster file

- **Unit abilities and detachment rules** are present, but as free prose in a
  description field. Do not attempt to parse them into effects. Display them as
  reference text beside the unit and let the human flip a toggle.
- **Stratagems** are not in the roster at all.
- **Anything requiring board state** (range, line of sight, cover terrain).

---

## 9. Legal note

Several existing open-source projects that parse these files deliberately read
only names, counts, points, and keywords — and never touch the description or
rules-text fields — specifically to avoid reproducing copyrighted prose.

Statlines are arguably facts; ability *text* clearly is not. Irrelevant if this
stays a personal tool. If it is ever published, that distinction is the line to
stay on.

---

## 10. Build order

1. **Parser** — one roster file → normalized JSON. Handle `.rosz` unzip, `.ros`
   XML, and New Recruit JSON. Test against your own list first.
2. **Compute function** + unit tests against hand-verified matchups — done:
   `src/lib/combat.ts` (hit/wound/save target numbers, Anti-X, Torrent; see
   `combat-calculator-design.md`). Cover, ±1 toggles, and the other weapon
   keywords are deliberately deferred to step 5.
3. **Two-pane UI** — tap attacker, tap target, see the table — done:
   `ui-guide.md`'s full build order, plus the result drawer this step adds.
4. **Model-count steppers** per weapon. This is the "dead models" feature: a
   manual stepper, not state tracking — done: `ModelCounter` (see
   `ui-guide.md` §6).
5. **Modifier toggles** — partially done: ±1 hit, ±1 wound, invuln override,
   AP worsened by 1 (Armour of Contempt), and Melta/half-range (see
   `modifier-layer-design.md`). Cover is deliberately still deferred — the
   plan itself flags it as the one toggle where a naive implementation
   produces a wrong answer, and the exact current wording hasn't been
   confirmed yet. Reroll toggles are dropped entirely: they don't change a
   target number, only expected damage, which nothing in this app computes.
6. **Voice input** — only after 1–5 are proven useful at a real table.

**Steps 1–3 are the entire value proposition.** Ship those, use the tool in a
real game, and see whether the friction is actually where it's expected to be
before building anything else.

---

## 11. Voice input (deferred — notes for later)

Voice was the original framing but should be the *last* layer, treated as a
shortcut over the tapping UI rather than a separate system.

Architecture when the time comes:

```
speech → text (ASR)
text   → structured intent { action, attacker_id, target_id, weapon? }
intent → the same deterministic compute core
```

Practical notes:

- **Push-to-talk, not always-on.** A wake word in a game store is misery.
- **40k vocabulary will wreck generic ASR.** "Kataphron Breachers", "Skitarii
  Vanguard" get mangled. Mitigation: both army lists are already loaded, so
  fuzzy-match the transcript against the ~20 unit names actually in play rather
  than the whole language. That constraint does most of the work.
- **"Unit A attacks Unit B" is usually under-specified** — a squad may have three
  different weapon profiles. Voice should select the *pairing*; the UI shows all
  profiles. Don't try to disambiguate weapons by voice.
- A separate LLM + RAG path could answer "can I charge after falling back?" style
  rules questions, but that is a different product from the calculator and should
  stay separate.

---

## 12. Open questions

- **Platform:** web vs native mobile? Affects where `.rosz` unzipping and parsing
  live, and offline behaviour (a game store may have bad signal — offline-first
  is probably mandatory).
- **Audience:** casual games where speed is the goal, or teaching/learning where
  explaining *why* matters more? Pulls the UI in different directions.
- **Edition churn:** rules and points update quarterly, editions turn over every
  few years. Keep the ruleset as versioned data, not hardcoded logic.
- **Prior art:** UnitCrunch already does probability math well. The
  differentiator here is zero-friction lookup during a live game — worth checking
  what else exists before building.
