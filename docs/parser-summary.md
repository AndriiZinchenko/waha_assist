# Roster Parser — Summary

Reference for `parseRoster.mjs`. Companion to the project plan.

**Input:** a New Recruit JSON export (BattleScribe roster tree), WH40k 10th ed.
**Output:** a normalized army object ready for a combat calculator.
**Verified against:** a 2000pt Grey Knights list (13 units, Warpbane Task Force),
including two allied Imperial Knights Armigers.

---

## 1. Headline finding

**The export is fully self-contained.** No BSData, no scraper, no catalog sync,
no backend. Two roster files give you both armies' complete statlines, weapon
profiles, model counts, invulnerable saves, keywords, and points.

---

## 2. Correction to earlier assumption

> ~~Counts multiply down the selection tree.~~ **Wrong.**

In New Recruit's export, `number` on a weapon selection is an **absolute count**,
not per-model.

```
selection "Terminator"     number=3
  └─ selection "Storm bolter"  number=3     ← already 3, do NOT multiply
```

Confirmed independently by the Armiger Helverin — a **single** model carrying
`Armiger autocannon number=2`. Weapon counts can legitimately exceed model
counts.

**Rule:** read `number` off the weapon's own selection. Never accumulate a
multiplier through ancestors.

---

## 3. The critical gotcha: names are not unique

The same weapon name maps to **different profiles** depending on the wielder.
This army contains four distinct "Nemesis force weapon" profiles:

| Wielder | profileId prefix | A | WS | S | AP | D |
|---|---|---|---|---|---|---|
| Brotherhood Librarian | `8404` | 4 | 2+ | 6 | -1 | 2 |
| Brotherhood Terminator Squad | `e61d` | 4 | 3+ | 6 | -2 | 2 |
| Strike / Interceptor / Purifier | `6d43` | 3 | 3+ | 6 | -2 | 2 |
| Paladin Squad | `3c70` | 4 | 2+ | 6 | -2 | 2 |

Same pattern elsewhere:

- **Storm bolter** — `d032` is BS2+ (characters, Paladins); `9756` is BS3+ (everyone else)
- **Purifying Flame** — `73f3` is A3 (Castellan Crowe); `8208` is A1 (Purifiers)

> **Key every weapon on `profiles[].id`. Never on `name`.**
> A name-keyed table silently gives Paladins the wrong Attacks and the
> Librarian the wrong AP — wrong answers that look plausible.

**The mirror-image gotcha: the same id-keying can also under-merge.** New
Recruit doesn't always reuse one profile id for a weapon that's genuinely
identical across model selections in the same unit. The Custodes Prosecutors
squad's Sister Superior carries a `Boltgun` and `Close combat weapon` with
*different* profile ids than the four rank-and-file `Prosecutor` models —
same name, same every stat, different id. Naive id-keying treats these as
two different weapons: `WeaponTable` shows two unmerged rows instead of one
`5×`, and anything that groups by weapon (like `collectLoadouts`, §6 below)
produces two loadouts whose name-based labels come out as identical text —
confusing in a different way than the mis-merge above, but still wrong.

`parseRoster()` handles this with a **per-unit, stats-based canonicalization
pass** (`buildCanonicalWeaponIdMap` in `parseRoster.mjs`): the first
profile id seen for a given (name + every stat) signature becomes canonical,
and every later occurrence of that same signature — regardless of its own
id — gets remapped to it, before anything groups or merges by id. Scoped to
one unit's own weapon list only, so it can never reach across units and
merge the *genuinely* different Nemesis force weapon variants from §3 above.
The rule this leaves intact: **key on id — but let stats decide what counts
as "the same id."**

---

## 4. Output shape

```js
{
  name, system, catalogue, catalogueRevision, generatedBy,
  pointsLimit, pointsTotal,
  battleSize,                    // "Strike Force (2000 Point limit)"
  detachment,                    // "Warpbane Task Force"
  detachmentRules,               // ["Hallowed Ground"]
  units: [{
    id, name,
    kind,                        // "unit" | "model"
    basePoints, totalPoints,     // totalPoints includes enhancements
    modelCount,
    models: [{ name, count, group }],
    profile: { M, T, SV, W, LD, OC },
    invuln: { value, conditional } | null,
    keywords: [...],             // Infantry, Vehicle, Character, Psyker...
    faction,                     // "Grey Knights"
    isWarlord,
    enhancements: [{ name, points }],
    weapons: [{
      profileId,                 // ← the real key
      name, subProfile,          // subProfile: true for "➤ ... - strike/sweep"
      type,                      // "ranged" | "melee"
      count,                     // absolute
      range,
      attacks: { dice, sides, flat, raw, avg },
      skill,                     // 3 for "3+", null for "N/A" (auto-hit)
      skillRaw,
      strength, ap,
      damage: { dice, sides, flat, raw, avg },
      keywords: [...]
    }],
    abilities: [{ name, text }]  // prose — display only
  }]
}
```

---

## 5. Field mapping

| What you want | Where it lives |
|---|---|
| Unit statline | `profiles[]` where `typeName === "Unit"` → M/T/SV/W/LD/OC |
| Weapon profile | `profiles[]` where `typeName` is `"Ranged Weapons"` / `"Melee Weapons"` |
| Weapon count | `number` on the **owning selection** (absolute) |
| Model breakdown | child selections with `type === "model"`, their `number` |
| Invuln save | `typeName === "Abilities"`, name matches `Invulnerable Save (N+)` |
| Enhancements | selections whose `group` starts with `"Enhancements"` |
| Warlord | a child selection literally named `"Warlord"` |
| Unit keywords | `categories[].name` |
| Faction | `categories[]` entry prefixed `"Faction: "` |
| Detachment | top-level `"Detachment"` selection → first child |
| Battle size | top-level `"Battle Size"` selection → first child |

Detection is by `profiles[].typeName`, **not** by `categories`. Some weapon
selections (e.g. "Close combat weapon" in Strike Squad) carry no `categories`
array at all.

---

## 6. Parsing edge cases handled

| Case | Example from the file | Handling |
|---|---|---|
| Dice in Attacks | `2D6`, `D6+3`, `D3+1` | `parseDice()` → `{dice, sides, flat, raw, avg}` |
| Dice in Damage | `D6` (Meltagun, greatsword strike) | same |
| Auto-hitting weapons | Incinerator `BS: "N/A"` | `parseSkill()` → `null`, render as "auto" |
| Multi-profile weapons | Nemesis greatsword strike/sweep; Custodes Sentinel Blade/Guardian Spear/Venatari lance | one selection → N profiles; `➤` prefix stripped when present; `subProfile: true` set structurally (selection has >1 combat profile), not by the `➤` marker — Custodes' dual-mode weapons carry the exact same bare name for both profiles and no `➤` at all |
| Conditional invuln | Armigers `Invulnerable Save (5+*)` | `{ value: 5, conditional: true }` |
| Enhancement points | Phial 25, Reliquary 20, Paragon 10 | summed recursively into `totalPoints` |
| Empty keywords | `"-"` | → `[]` |
| UI cruft | `"Show/Hide Options"` | filtered out |
| Inconsistent ids | `35p7rad` vs `6a5fe1ce6e3b9858f2d3c614` | both unique; key on `id`, assume no format |

**Enhancement points are not in the unit's own `costs`.** They sit in nested
selections. The parsed army sums to 1945 in unit costs + 55 in enhancements =
2000. Sum recursively or your totals run short.

---

## 7. Verified army output

| Unit | Pts | Models | T | Sv | W | OC | Invuln |
|---|---|---|---|---|---|---|---|
| Castellan Crowe | 90 | 1 | 4 | 2+ | 5 | 1 | 4+ |
| Grand Master Voldus *(Warlord)* | 110 | 1 | 5 | 2+ | 7 | 1 | 4+ |
| Brotherhood Librarian | 80 + 25 | 1 | 5 | 2+ | 5 | 1 | 4+ |
| GM in Nemesis Dreadknight | 225 + 20 | 1 | 8 | 2+ | 13 | 4 | 4+ |
| Venerable Dreadnought | 140 + 10 | 1 | 9 | 2+ | 8 | 3 | — |
| Brotherhood Terminator Squad | 185 | 5 | 5 | 2+ | 3 | 2 | 4+ |
| Strike Squad ×2 | 120 ea | 5 ea | 4 | 2+ | 2 | 2 | — |
| Interceptor Squad | 125 | 5 | 4 | 2+ | 2 | 1 | — |
| Paladin Squad | 225 | 5 | 5 | 2+ | 3 | 1 | 4+ |
| Purifier Squad | 250 | 10 | 4 | 2+ | 2 | 1 | — |
| Armiger Helverin | 135 | 1 | 9 | 3+ | 14 | 6 | 5+\* |
| Armiger Warglaive | 140 | 1 | 9 | 3+ | 14 | 6 | 5+\* |

\* ranged attacks only — condition exists solely in the prose description.

---

## 8. Known limitations

- **Display merge not done.** The Terminator squad emits `1x Storm bolter`
  (Justicar) and `3x Storm bolter` (Terminators) as separate entries sharing one
  profileId. Group by `profileId` in the UI layer to show `4x`.
- **Multi-force rosters ignored.** Only `forces[0]` is read. Fine for standard
  lists; revisit if you hit an export with several forces.
- **Abilities are prose, not effects.** `Damaged: N-M Wounds Remaining` on the
  Dreadknight and Armigers is a real -1 to hit sitting in free text. Surface it
  as reference; do not try to parse it into a modifier.
- **Only the New Recruit JSON adapter exists.** `.ros` / `.rosz` need a second
  adapter emitting the same shape (see plan §3).
- **Tested against one faction.** Grey Knights + allied Imperial Knights. Other
  factions bring their own weirdness (Chaos marks, Necron protocols, transports
  with embarked units).
- **Leader/bodyguard attachment is not modeled — TBD feature.** A character's
  eligible bodyguard unit(s) exist only as prose in an `Abilities` profile
  literally named `"Leader"` (e.g. Castellan Crowe's reads `"This model can be
  attached to the following unit:\n■ Purifier Squad"`). There is no structural
  link anywhere in the export (no `attachedTo` field, no nesting) recording
  which unit a leader was actually attached to in list-building — New Recruit
  doesn't track that. Parseable via regex on that one ability's text when
  unambiguous (one eligible unit, one copy of it in the roster); genuinely
  ambiguous when a character has multiple eligible units or the roster has
  more than one copy of the eligible unit. Every unit renders as an
  independent row today; nothing in the parser or `ui-guide.md` groups them.

---

## 9. Not in the export

Stratagems. Points-per-model breakdowns. Anything requiring board state (range,
line of sight, terrain).

The `rules[]` arrays *do* carry full text for Rapid Fire, Melta, Torrent,
Anti-, Devastating Wounds, Blast, Precision and Ignores Cover. Useful as
in-app reference, but it's GW's prose — keep it display-only and out of
anything published.

---

## 10. Next steps

1. Run against the real file: swap the fixture in `test.mjs` for your export.
   Eyeball the **Purifier Squad** first — 10 models across four loadout groups
   is the most complex node in the list.
2. Add display-layer merge by `profileId`.
3. Build the compute core against this shape (plan §5).
4. Test with a second faction before trusting the adapter.
