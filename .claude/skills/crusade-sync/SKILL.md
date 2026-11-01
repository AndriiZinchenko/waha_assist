---
name: crusade-sync
description: Sync a co-op Crusade campaign book (Claude Docs «книга кампанії») into Waha Assist — the campaign page, the per-mission battles and the honours in the calculator. Covers reading the book, comparing it with the stored campaign, updating the app's campaign data in code (src/data/crusade-seed.ts) and the stored state on the dev server, and checking the result in the app. Use it whenever the user says «зроби сінк з книгою/документом кампанії», «онови кампанію в застосунку», «синхронізуй ростер загонів», or after a battle has been recorded in the book — and also when the app's campaign page disagrees with the book.
---

# Syncing the campaign book into Waha Assist

The book is the source of truth for the story, the roster of campaign units
and each mission's enemy. The app holds the same campaign in two places:

| Where | What | Changed by |
|---|---|---|
| `src/data/crusade-seed.ts` — `ASHES_OF_ARMAGEDDON` | the campaign a fresh install starts from | code edit + tests |
| `src/data/crusade-seed.ts` — `BOOK_ENEMIES` | each mission's enemy as the book lists it (used while a mission has no enemy of its own) | code edit + tests |
| server state `data.crusade` (`data/state.json`, via `/api/state`) | the live campaign the players use, with their own edits | `scripts/state.mjs` |

Sync both: code so a new install and the tests match the book, the stored
state so the players see it now. The players' own choices in the stored
state (which roster unit a campaign unit is, a weapon profile picked on a
card, an enemy edited on a mission) win over the seed: merge, never
overwrite the stored campaign wholesale.

Read `crusade-book` first: it defines the notation this skill reads.

## Steps

### 1. Read the book completely

Read the doc with the Claude Docs connector (`read` the project, then its
tab node). It is too big for one tool result: the result is saved to a
file; convert it and read all of it:

```bash
python .claude/skills/crusade-sync/scripts/book2md.py <saved-read.txt> <scratch>/book.md --ids
```

Keep the previous conversion and `diff` against it when you synced before:
the diff is the change list. Note the doc `rev` you read.

### 2. Make the change list

From `Стан кампанії` and the missions, list what differs from the app:

- **Players**: their rosters per edition (`armyId` = 10th, `armyIds["11"]`).
- **Units**: name, XP, honours (`→ profile`), scars, status (`пропускає`,
  `веде:`), new or removed units. Datasheet names map a unit to roster
  units; for 11th edition the app matches by datasheet name itself
  (`crusadeForEdition`), so only set `rosterUnitIdsByEdition` when the
  automatic match picks the wrong copy.
- **Missions**: name, edition, limit, result, notes (journal row).
- **Enemies**: per mission, the `Датащити` column → roster unit ids in the
  `Ростер` files. `A → B` becomes `leaders: { A: B }`, `A, B` two units.
  Find ids with the roster parser:

  ```bash
  node -e "import('./parseRoster.mjs').then(({parseRoster})=>{const p=parseRoster(require('./armies/Orks 11.json'));for(const u of p.units)console.log(u.id,u.name,u.totalPoints)})"
  ```

  Two units with one datasheet name (two Nobz) are told apart by model
  count or points.

Stop and ask when the book contradicts itself or a name does not resolve
(a datasheet missing from the roster, a leader the datasheet does not
allow). Do not pick silently; leave a doc comment as `crusade-book` says.

### 3. Check the rosters first

The book names roster files (`Orks 11`, `Chaos knights 11`). Make sure they
exist in `armies/` and are current; if the book mentions a roster the app
lacks, run `npm run sync:armies` (New Recruit) and re-check ids. Points the
app shows come from the rosters; a book total that differs only by roster
wargear costs is expected, note it.

### 4. Update the code

- `ASHES_OF_ARMAGEDDON` (or the campaign's seed object): players, units,
  missions as the book has them now. Unit ids (`u1`…) are stable keys —
  keep existing ones, add new ids for new units.
- `BOOK_ENEMIES`: one `CrusadeEnemy` per mission with `units`, `leaders`
  and `detachment` (`null` when the side has none, omitted to use the
  roster's).
- Update `src/data/crusade-seed.test.ts` to the new book (XP and honours
  table, enemy lists, leader legality, points). Run:

  ```bash
  npx vitest run && npx tsc -p tsconfig.app.json --noEmit
  ```

### 5. Update the stored campaign

```bash
node .claude/skills/crusade-sync/scripts/state.mjs pull <scratch>/state.json
```

Edit `data.crusade` in that file: merge the change list unit by unit
(match by `id`; a split unit keeps its id for one half and gets a new id
for the other; copy `rosterUnitIds` from the stored unit, not the seed).
Leave `mission.enemy` absent for missions that should follow the book.
Then:

```bash
node .claude/skills/crusade-sync/scripts/state.mjs push <scratch>/state.json
node .claude/skills/crusade-sync/scripts/state.mjs show
```

A 409 means someone saved meanwhile: pull again and redo the merge.

### 6. Verify in the app

Start the dev server (`.claude/launch.json`, `waha-dev`) if needed, open
`#/crusade`: player points against the next limit, no «Немає в ростері»
tags, every mission's enemy and total. Open the next mission's battle
(«ДО БОЮ»): leaders attached as the book says, honours shown on weapons
(▲ pills). Report what changed, what the book and the app still disagree
on, and anything left for the players (a profile not chosen).

## Where the code lives

- Model and rules: `src/lib/crusade.ts` (editions: `crusadeForEdition`,
  `missionEdition`, `playerArmyId`; honours: `honourCoversWeapon`).
- Battle sides: `src/lib/crusadeBattle.ts` (`crusadeBattleArmies`,
  `crusadeLeaderAssignments`, `withCrusadeMods`).
- Page: `src/components/CrusadeScreen.tsx`. Server normalization (what
  survives a save): `server/stateStore.mjs` `normalizeCrusade`. A new field
  must be added there, or the server drops it.
