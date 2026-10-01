# Weapon overrides — design

*1 October 2026. Approved in conversation; this is the written form.*

## 1. What this solves

A roster comes from New Recruit with fixed wargear. Changing a squad's weapons
today means editing the list in New Recruit and re-running the army sync on the
PC. This adds an in-app editor: on the configuration screen you change which
weapons a unit's models carry and how many models carry each set, e.g. two of
five Custodian Guard take Guardian Spears while three keep Sentinel Blades.

**Intent and constraints, as agreed:**

- The app does **not** validate the result against the datasheet and does
  **not** recalculate points. The editor says so, permanently.
- An edit must **survive an army sync**. The roster files are never modified.
- Edited units and weapons are **highlighted** wherever they appear.
- Replacement weapons and their stats come from the **New Recruit catalogue**,
  downloaded by a script through the same library calls the stratagem sync
  uses. Not from New Recruit's in-browser engine (rejected as too fragile).
- Editing is **per model group**: model count per group, weapons per model.

**Out of scope:** validation, points, non-weapon wargear (shields, vexillas,
icons) and its stat effects, units not present in any roster, editing on the
battle screen.

## 2. Weapon option data

### Source

`get_library` and `books_get_book_row`, already used by
`scripts/sync-stratagems.mjs`. Each roster unit's selection carries
`entryId: "<catalogueId>::<entryId>"`; the last segment is the unit's entry in
the catalogue (or in a linked catalogue, for allied units such as Armigers).

Verified on the Custodes and Orks rosters: every unit resolves, and walking the
entry's `selectionEntries`, `selectionEntryGroups` and `entryLinks` (following
`targetId`) yields every weapon entry with its `Ranged Weapons` /
`Melee Weapons` profiles and its rule `infoLinks`. Rule text resolves by name
from the core book's shared rules.

### Extraction rules (pure, in `scripts/lib/unitOptions.mjs`)

- Index every node of the catalogue, its linked catalogues and the core book
  by `id`.
- From the unit's entry, walk children depth-first, following links, to a
  depth limit, never revisiting a node on the current path.
- Skip any subtree whose name matches Crusade content (`Crusade`,
  `Battle Honours`, `Battle Traits`, `Battle Scars`, `Weapon Modifications`,
  tallies).
- A node with at least one weapon profile is one **weapon option**, named by
  the entry. Options are de-duplicated by name; first one wins.
- Each profile keeps its raw characteristics. Parsing into numbers and dice
  happens in the app with the existing `parseDice`, `parseSkill` and
  `parseKeywords`, so there is one parser for roster and catalogue weapons.

### Output

`src/data/unit-options/<faction-slug>.ts`, one per roster faction, plus
`index.ts` and `types.ts`. Generated; not edited by hand.

```ts
export interface WeaponOptionProfile {
  id: string;            // catalogue profile id
  name: string;
  type: "ranged" | "melee";
  range: string | null;
  attacks: string;       // raw: "2", "D6+3"
  skill: string | null;  // raw: "3+", "N/A"
  strength: number;
  ap: number;
  damage: string;        // raw
  keywords: string;      // raw: "Assault, Rapid Fire 1" or "-"
}

export interface WeaponOption {
  name: string;
  profiles: WeaponOptionProfile[];
  /** Names of the weapon rules it references; text is in `rules`. */
  rules: string[];
}

export interface FactionUnitOptions {
  catalogue: string;
  /** rule name -> text, shared by every unit in the file */
  rules: Record<string, string>;
  /** catalogue entry id -> that unit's options */
  units: Record<string, { name: string; weapons: WeaponOption[] }>;
}
```

`index.ts` exports `unitOptions(catalogue, entryId): { weapons, rules } | null`.

### Script

`scripts/sync-unit-options.mjs`, run as `npm run sync:options`
(`--dry-run`, `--headed` as the other sync scripts). It reads the rosters in
`armies/` to learn which factions and unit entries are needed, downloads those
catalogues with their links and the core book, and writes the files. It
handles no credentials; it uses the saved session.

The three sync scripts would otherwise each carry their own copy of the
in-page `rpc` helper and session opening. Those move to
`scripts/lib/nrSession.mjs` (`openSession`, `rpc`, `fetchSystem`,
`catalogueWithLinks`), and the two existing scripts import them.

## 3. Roster change

`parseRoster` adds `entryId: string | null` to each unit: the last `::`
segment of the selection's `entryId`. `parseRoster.d.mts` gains the field.
Nothing else in the parser changes.

## 4. Override state

Stored in the synced config next to leaders, hidden units and detachment
picks, so it follows the user between PC and tablet and is untouched by any
roster sync.

```ts
export interface WeaponOverrideGroup {
  /** Stable within the override; used for casualty counts. "g1", "g2", ... */
  key: string;
  modelCount: number;
  weapons: Array<{ name: string; perModel: number }>;
}

export interface UnitWeaponOverride {
  groups: WeaponOverrideGroup[];
  /** Fingerprint of the roster unit's own loadouts when the edit was made. */
  rosterSignature: string;
}

// SyncedState
weaponOverrides: Record<string /* unitId */, UnitWeaponOverride>;
```

- Keyed by unit id. New Recruit keeps a selection's id across exports, so the
  key survives a sync. An override whose unit no longer exists is ignored.
- Overrides store weapon **names**, not stats. Stats resolve at render time,
  so a later `sync:options` updates edited units too.
- `persistence.ts` adds the field to `pickSynced`, `withSynced`,
  `isEmptySynced` and `emptyState`, tolerating older documents without it.
  `server/stateStore.mjs` `normalizeSyncedData` validates its shape.
- The conflict dialog's summary gains an "Edited units" count.

## 5. Applying an override (`src/lib/weaponOverrides.ts`)

Pure functions, tested without React.

- `rosterGroups(unit, options)` — the unit's own loadouts as editor groups,
  one weapon entry per distinct weapon. A roster profile whose name matches a
  profile of a catalogue option is listed under that option's name, so
  multi-profile weapons ("Plasma pistol - standard" / "- supercharge")
  collapse to one entry; a profile with no matching option keeps its own
  name. The starting point when a unit has no override.
- `rosterSignature(unit)` — a stable string of its loadouts (model counts and
  weapon names, sorted).
- `resolveWeapon(name, options, unit)` — the catalogue option of that name
  (case-insensitive); failing that, the roster unit's own weapon profiles of
  that name; failing that, `null` (missing).
- `applyWeaponOverride(unit, override, options)` — a copy of the unit with:
  - `loadouts` rebuilt from the groups (key `ovr:<group.key>`, so stale
    casualty counts from the roster loadouts never apply),
  - `weapons` rebuilt from the resolved profiles, `count` = sum of
    `perModel × modelCount`, rules attached from the option's rule names,
  - `modelCount` = sum of group model counts,
  - `weaponsEdited: true`, `rosterChanged` (signature differs),
    `missingWeapons: string[]`,
  - each weapon flagged `edited: true` when the roster unit had no weapon of
    that name, or carried a different total of it.
- `applyWeaponOverrides(units, overrides, catalogue)` — maps the above over a
  list; units without an override pass through unchanged.

It runs **before** `applyLeaderWeaponBonuses` at each of the three places
that call it (`App.tsx` twice, `ArmyConfigScreen.tsx`, `ArmyPanel.tsx`), so
leader bonuses, the datasheet and the calculator all see the edited unit.

`ParsedUnit` gains optional `weaponsEdited`, `rosterChanged`,
`missingWeapons`; `WeaponEntry` gains optional `edited`.

## 6. Editor UI

Configuration screen, Units tab. An expanded unit shows an **Edit weapons**
button above its weapon table. It opens `WeaponEditor` in place of the table.

- **Warning**, always visible, amber: "Not validated. The app does not check
  what this unit may take and does not change its points. Check the datasheet
  or New Recruit."
- **Roster changed** notice when `rosterChanged`: "The roster for this unit
  changed in New Recruit after this edit." with Reset.
- **Groups.** Each group is a card: a model-count stepper (0 and up), then
  its weapons. Each weapon row: name (tap to swap via the picker), a
  per-model stepper (1 and up), remove. "Add weapon" opens the picker. A
  group can be removed when more than one exists. "Add group" appends a group
  with one model and no weapons.
- **Picker.** The unit's weapon options: name, and for each profile a
  one-line stat summary. Weapons already in the group are marked.
- **Missing weapons** render with a "not in catalogue" note and can only be
  removed.
- **Footer.** "Reset to roster" deletes the override. "Done" closes the
  editor. Edits save as they are made, like every other config change.
- A unit with no options in the data (sync not run for that faction) shows
  "No weapon options. Run `npm run sync:options`." and no editor.

The first edit of a unit creates its override from `rosterGroups(unit, options)` with the
current `rosterSignature`. Reset removes the key.

## 7. Highlighting

- Unit rows, config and battle: an amber outlined "EDITED" tag after the
  name, the same shape as the allied-faction tag.
- Datasheet: a line above the weapons, "Weapons edited in app — not
  validated." Each weapon with `edited` gets an amber "EDITED" chip beside
  its name.
- Calculator: weapon blocks from an edited unit carry the same chip.
- Amber is the app's warning colour and never a side colour.

## 8. Testing

- `scripts/lib/unitOptions.test.mjs`: extraction on small hand-built
  catalogues — direct entries, groups, links, multi-profile weapons, Crusade
  subtrees skipped, de-duplication, allied entries in a linked catalogue.
- `src/lib/weaponOverrides.test.ts`: `rosterGroups`, `rosterSignature`,
  resolution order, rebuilt counts for mixed groups, `edited` flags,
  `rosterChanged`, missing weapons, pass-through without an override.
- `src/lib/persistence.test.ts` and `server/stateStore.test.mjs`: the new
  field round-trips, old documents load, malformed overrides are dropped.
- `parseRoster` test: `entryId` extracted.
- Browser check on Custodian Guard: move two models to Guardian Spear;
  datasheet, tags and calculator all show it; run `sync:armies`; the edit is
  still there.
