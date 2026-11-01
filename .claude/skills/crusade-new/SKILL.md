---
name: crusade-new
description: Start a new co-op Warhammer 40,000 Crusade campaign from scratch for Waha Assist — talk through the players, armies, length and story, then create the campaign book in Claude Docs in the standard format and the matching campaign in the app. Use it whenever the user wants a new campaign, a second season, a fresh story arc, «нова кампанія», «зроби кампанію з нуля», «другий сезон», «хочемо грати кампанію вдвох проти ворога», even if they only describe the armies and ask what to play next.
---

# Starting a co-op Crusade campaign

The campaign is co-operative: the players are one side against an enemy
run by a simple behaviour cheat sheet, with Claude as the host
(`crusade-gm`). It lives in two places: a Claude Docs book the players read
at the table, kept in the format of `crusade-book`, and the app's campaign
page (`#/crusade` in Waha Assist), filled from the book by `crusade-sync`.
Read `crusade-book` before writing anything: it is the layout you produce.

## 1. Find out what they want

Ask, a question at a time, only what changes the campaign:

- **Players and armies.** Who plays, which army each brings, and which
  roster in `armies/` it is (one per edition they may play). Check the
  roster exists; if not, they build it on New Recruit and you run
  `npm run sync:armies`.
- **Edition(s).** Which edition each mission is played in; a campaign may
  change edition between missions.
- **Length and size.** Number of missions (5 is a good arc) and the points
  each player brings per mission. A growing limit (500 → 850) gives new
  units a reason to join.
- **The enemy.** Which factions, and whether the user has rosters for them
  (the enemy is picked from rosters in `armies/`, so the calculator can
  run every fight). A twist (a second enemy revealed midway) makes a good
  arc.
- **Tone and place.** A planet, a hook, how serious.
- **Second season?** Carry units over with XP, honours and scars from the
  previous book's roster table.
- **House rules** for **Домовленості**: which units count as elite for the
  Hero honour, and whether a character's kills and objectives also count
  for the unit it leads. Every campaign hits both by the third battle.

When you cannot ask (the user wants it done in one go), take the default —
a growing limit, players' names from the current campaign, «лише
персонажі» as elite, XP to both rows for a led unit — and list each
assumption in your answer so the user can change it.

## 2. Plan the arc

One line per mission: name, what happens, how the result feeds the next.
Plan rewards (heroes unlocked, allies) and threats (an escalation on a
loss). Size each enemy force at about 1.25–1.7× the players' combined limit
(the enemy plays by a cheat sheet, so it needs the numbers; 1.7 for 11th
edition). Below 1.25× the cheat-sheet enemy is no threat, so don't go there
to make a mission fit.

Check the enemy rosters can pay for the biggest mission: sum the points of
every unit in them (`parseRoster.mjs` at the repo root; `crusade-sync`
shows a one-liner that lists units with points) against `1.7 × players × final limit`. If they fall
short, say so and offer the choices rather than quietly lowering the ratio
or the limits: the user builds a bigger roster on New Recruit (then `npm run
sync:armies`), another roster joins as a second enemy (a Chaos Knights list
beside Chaos), or the user accepts a lower ratio for the final missions.

## 3. Write the book

Create the doc with the Claude Docs connector in the `crusade-book`
layout, with exactly its section headings in its order — the sync finds
sections by heading, so a book with its own numbering or a different
structure cannot be synced: Пролог (with «Хід кампанії»), Як грати в
кооперативі (with the limits and editions table), Досвід, ранги, нагороди
та шрами (copy `crusade-book/references/standard-tables.md` word for word
and fill in its **Домовленості** from what the players told you), Шпаргалка
поведінки ворога (one block per enemy faction), Стан кампанії (empty
journal, the starting roster table, «Перед місією 1»), Місія 1 in full,
Після бою.

Write mission 1 completely; later missions can be outlines until the
previous one is played (the host writes each next mission from the
result). An outline is the mission heading, **Мета**, the edition and
limit line, and the planned enemy as a list with its total; the limits
table shows that planned total. For every full mission's enemy table use
exact datasheet names from the named roster, model counts in `Загін`, and
legal leader attachments (`A → B` only when A's Leader ability lists B —
read it in the roster, don't rely on memory). Sum the `Разом` row and check
it against the ratio above.

## 4. Create it in the app

Add the campaign to the app with `crusade-sync`: a seed object like
`ASHES_OF_ARMAGEDDON` in `src/data/crusade-seed.ts` (players with their
rosters per edition, starting units, missions with edition and limit), its
enemies in `BOOK_ENEMIES` under the campaign's exact name, tests in
`src/data/crusade-seed.test.ts`. The app stores one campaign. «ПОЧАТИ
КАМПАНІЮ» appears only when none is stored and starts the seed passed to
`CrusadeScreen`'s `onStart` in `src/App.tsx` (today `ASHES_OF_ARMAGEDDON`):
point it at the new seed. When a campaign is already stored (a previous
season), ask before replacing it — it is the players' record — and keep a
copy (`crusade-sync`'s `state.mjs pull`) first.

## 5. Hand it over

Give the players the book link, tell them how a mission flows (read the
mission, set up the field, play, send the report from «Після бою»), and
open the campaign page so they see the roster and the first battle.
