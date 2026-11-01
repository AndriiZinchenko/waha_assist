---
name: crusade-book
description: How to keep a co-op Crusade campaign book (the Claude Docs «книга кампанії», e.g. «Попіл Армагеддону») so it stays readable at the table and can be synced into Waha Assist: the fixed section order, the mission skeleton, the enemy and roster tables, the notation for leaders and honour profiles, and how to record a battle's results. Use it whenever you add or edit a mission, record a result («запиши підсумки», «онови ростер», «нарахуй досвід»), review or normalize a book, or answer «де в книзі…» — even when the user only says «книга», «журнал» or «ростер».
---

# Crusade campaign book: how to keep it

Related skills: `crusade-new` (start a campaign), `crusade-gm` (run it as
the host), `crusade-sync` (bring the book into the app).

A campaign book is a Claude Docs document the players read at the table and
the app's campaign page is synced from (see the `crusade-sync` skill). It is
written in Ukrainian. Keep every book in this exact shape: the players find
things in the same place every mission, and the sync can read it without
guessing.

**Facts never change silently.** Normalizing a book changes wording, order
and notation only. When two places disagree (a total that does not add up,
a limit given twice), keep both readings visible, pick the one the mission
section itself states, and leave a doc comment on the other. Never edit a
played mission's numbers to match a roster: they record what was played.

## Section order

```
# Кампанія «<назва>»
<дата> · <автор>
## Пролог
## Як грати в кооперативі
## Досвід, ранги, нагороди та шрами
## Шпаргалка поведінки ворога
## Стан кампанії
### Журнал місій
### Ростер загонів
### Перед місією N
## Місія 1. <Назва>
…
## Місія N. <Назва>
## Після бою
```

`Стан кампанії` sits before the missions and is the only section that
changes after every battle. Missions are appended in order; a mission's name
is the same everywhere (heading, limits table, journal, «Хід кампанії»).

## Пролог

The premise in a few paragraphs, then **Хід кампанії:** as an ordered list,
one line per mission: `<Назва> — <суть одним реченням>.`

## Як грати в кооперативі

House rules for the co-op game, as bold-lead paragraphs (`**Сторони.** …`).
It always holds the table **Ліміти й редакції**:

| Місія | Редакція | Ваш ліміт (кожному) | Ворог |
|---|---|---|---|
| 1. Засідка в руїнах | 10 | 500 | 625 |

`Ворог` is the mission's `Разом` total (a number, never `~` once the mission
table exists). Edition-specific house rules go under a bold lead
`**З <N>-ї редакції:**` as a list.

## Досвід, ранги, нагороди та шрами

The XP table, the ranks table, the honours d6 table, the out-of-action
table, the scars d6 table, the healing rule and **Домовленості** (who counts
as elite, how XP is shared when a character leads a unit). The full text is
in `references/standard-tables.md`: a new book copies it as it stands. These
names are fixed; the app keys on them:

- Ranks: Новачок 0–2, Загартований 3–5, Ветеран 6–9, Герой 10+.
- Honours: Влучні стрільці, Безжальні клинки, Шалений натиск, Загартовані,
  Непохитні, Тримають рубіж.
- Scars: Важке поранення, Пошкоджене спорядження, Кульгавість, Струс,
  Спрага помсти, Паніка.

## Шпаргалка поведінки ворога

One bold-lead block per enemy faction (`**Орки — «Біжи і рубай»**`) with
the list `**Рух:** / **Стрільба:** / **Чардж:** / **Винятки:**`, then
**Для всіх ворогів:**. Mission-specific behaviour belongs in that mission's
`Особливі правила`, not here.

## Стан кампанії

A summary line: `Після <N> місій: <W> перемог, <L> поразок; <втрати>.`

### Журнал місій

| Місія | Редакція | Результат | Сюжетні наслідки |
|---|---|---|---|
| 1. Засідка в руїнах | 10 | Перемога: ретранслятор ваш, Варбос і Снікрот мертві | … |

`Результат` starts with `Перемога:` or `Поразка:`. One row per played
mission; unplayed missions have no row.

### Ростер загонів

| Гравець | Загін | Датащит | Досвід | Ранг | Нагороди | Шрами | Статус |
|---|---|---|---|---|---|---|---|
| Сашко | Хеллбластери «золоті наплічники» | Hellblaster Squad | 9 | Ветеран | Влучні стрільці → Plasma Incinerator - Standard; Загартовані | — | у строю |

- **Загін**: the campaign name. A mark that tells two copies apart goes in
  «лапках» («золоті наплічники»), never in brackets.
- **Датащит**: the English datasheet name exactly as in the player's
  roster (`Brotherhood Librarian`, `Strike Squad`). Two datasheets that form
  one campaign unit: `Brotherhood Librarian + Strike Squad`.
- **Нагороди**: `; `-separated honour names from the table above. An
  honour that applies to one weapon profile names it after `→`, in English
  exactly as in the roster: `Влучні стрільці → Plasma Incinerator - Standard`.
  A profile with several modes may be named without the mode
  (`→ Bolt Rifle` covers Focused Fire and Saturation). Not chosen yet:
  `→ профіль не вказано`.
- **Шрами**: `; `-separated scar names, or `—`.
- **Статус**: `у строю`, `пропускає місію N`, `списано`, `втрачено`, and
  `веде: <Загін>` for a character leading another campaign unit (several
  separated by `; `, e.g. `у строю; веде: Термінатори Братства`). Nothing
  else, and no notes in brackets: history («пропустили місію 3») belongs in
  the journal, and the sync reads only these values.
- **Ранг** always matches **Досвід** (0–2 Новачок, 3–5 Загартований, 6–9
  Ветеран, 10+ Герой).

### Перед місією N

A list: the limit, heroes or units unlocked (with their points in the
mission's edition and whether they count against the limit), who skips the
mission, who leads whom.

## Mission skeleton

Every mission has exactly these parts, in this order:

```
## Місія N. <Назва>
**Мета.** <одне-два речення: що зробити до кінця якого раунду>
**Редакція:** <10|11> · **Ліміт:** <X> на кожного · **Раунди:** 5 · **Першими ходять:** <ви|ворог>
**Брифінг.** «<пряма мова командування>»
### Поле (44×60")
Координати: перше число — від <краю>, друге — від <краю>.
- **<Руїна чи укриття>** — <координати або опис>.
**Цілі (маркери 40 мм):** <Назва> — <x" × y">; …
**Зони розстановки:** ваша — …; <ворог> — ….
### Ворог: «<назва сили>», <Разом> очок
**Ростер:** <файл (редакція)>[, …] · **Детачмент:** <назва або «немає»> · **CP:** <старт> · **Стратагеми:** <які>
| Загін | Датащити | Коли і де | Очки |
| **Разом** | | Хвиля 1: … · Хвиля 2: … | **<сума>** |
Разом <сума> очок проти ваших <ліміт × гравці>.
### Особливі правила
- **<Назва правила>.** <текст>
### Умови перемоги
- **Перемога:** …
- **Поразка:** …
**Додаткові цілі:**
- **<Назва>.** <умова> — <нагорода>.
### Наслідки
- **Перемога:** …
- **Поразка:** …
- **В будь-якому разі:** …
```

The fixed wording in that skeleton is part of the format, so write it
literally:

- `**Першими ходять:** ви` or `**Першими ходять:** <ворог>` — always this
  form, never «Першими ходите» or «Першим ходить».
- The force name is always in «лапках»: `### Ворог: «Діти Горуса» + зачаровані орки, 2395 очок`.
- `**Ростер:**` names every file with its edition: `Chaos 11 (11-та), Orks 11 (11-та)`.
- Nothing stands between the `**Ростер:**` line and the table. A paragraph
  about the force (who is absent, what changed since last mission) goes in
  `Особливі правила`.
- `**В будь-якому разі:**` in `Наслідки` is optional; leave it out when
  nothing happens regardless of the result.

### The enemy table

- **Загін**: Ukrainian, always with model counts, in every mission
  (`Варбос + 5 Нобз`, `5 Легіонерів`, `3 Облітератори`); a single model
  needs no number. The count must match the points: if «5 Нобз» costs what
  the roster charges for 10, one of them is wrong — comment it. Bold marks
  a unit that is new compared with the previous mission, and nothing else.
- **Датащити**: English datasheet names exactly as in the roster. `A → B`
  means A is attached to B as its leader (only where A's Leader ability
  lists B); `A, B` means separate units placed together. A unit from a
  different roster than the line's `**Ростер:**` default carries it in
  brackets: `Knight Rampager (Chaos knights 11)`.
- **Коли і де**: `Хвиля 1, <місце>` for units on the table at the start,
  `Хвиля 2, <звідки>` for later arrivals (11th edition: all reserves arrive
  together in round 2); a conditional unit says its condition
  (`якщо живий`, `резерв ведучого`).
- **Очки**: one number per datasheet in the same order (`75 + 105`). For
  a mission not yet played, points are the roster's for that edition. A
  played mission keeps the numbers it was played with.
- The last row is **Разом**, with the per-wave split.
- Conditional units (`резерв ведучого`, a consequence of an earlier
  mission) are listed under `Особливі правила`, not in the table, unless the
  book counts them in `Разом`.

### Coordinates

`Координати: перше число — від <край A>, друге — від <край B>.` Name both
edges once per mission and use `x" × y"` everywhere else.

## Після бою

The players' report template, mission-independent: result, units with names
(survived / destroyed), who destroyed which enemy unit, which secondary
objectives were done, one «Відзначений» unit per player, memorable moments.

## Recording a battle

The players send a report (template in `Після бою`), often by voice, so
names come mangled («інтер сектори», «хелли білі»). Map every name to a
row of the roster table before changing anything, and ask about the ones
you cannot place instead of guessing.

1. **Journal.** Add a row: `Перемога: …` / `Поразка: …` with the
   decisive fact, and the story consequences (what was found, who died,
   what the next mission inherits).
2. **XP.** For each unit, add per the XP table: survived +1, each enemy
   unit destroyed +1, mission or secondary objective +1 (or as the
   objective says), «Відзначений» +2. Write the new total, not the delta,
   and update the rank to match. A kill or objective by a character
   leading a unit is shared as **Домовленості** says. If that line is
   still empty, ask the players before writing the XP (offer both numbers:
   «обом — 19 і 13; лише Бібліотекарю — 19 і 11»), then fill the line in.
   Don't decide it yourself: it is their campaign's rule, and it repeats
   every battle.
3. **Honours.** A unit that reached a new rank gains one honour (Hero:
   characters and the elite units **Домовленості** lists; if the list is
   empty, ask as above). Mission rewards «поза чергою» add more. No honour
   twice on one unit. A profile honour needs its profile named
   (`→ <English profile name>`): ask the player which weapon.
4. **Out of action.** Each destroyed unit rolls the table: 1 lost (a
   character instead takes a scar and skips the next mission), 2 scar
   (roll the scar table), 3–6 fine. Record scars; at 3 scars the status is
   `списано`. A unit that skipped a mission loses one scar.
5. **Статус.** `пропускає місію N` for whoever must sit out; `веде: …`
   when a character leads another campaign unit.
6. **Стан кампанії** summary line and **Перед місією N**: the next limit,
   unlocks with points in the next mission's edition, who skips, who leads
   whom.
7. Write the next mission from the skeleton (see `crusade-gm` for
   balancing), add its row to the limits table and «Хід кампанії» if new.
8. Tell the players what changed in a few lines, and suggest a
   `crusade-sync` so the app follows.

## Editing the Claude Docs book

- Read before writing; other people edit the book between turns (re-read
  with `{"kind":"view","sinceRev": <last rev>}`).
- Small changes: `replace` by text (`find`) or by cell. Rewriting a whole
  section: `replace` its blocks with markdown, guarded by `ifRev` of the
  read that showed them.
- A rewrite that removes words a comment hangs on is refused
  (`anchors_affected`). Use `allowDetach` only when the user asked for
  that rewrite, and say which threads were detached.
- Questions and conflicts you cannot settle go in as doc comments
  anchored on the exact words, short enough to read at a glance.

## Checking a book against this format

1. Every section from the order above exists, once, in that order.
2. Every mission has all skeleton parts; names match the limits table, the
   journal and «Хід кампанії».
3. Each enemy table: four columns, a `Разом` row whose sum equals the
   points column, and the `Ворог` column of the limits table equals it.
4. Every datasheet name exists in the roster file named on the `Ростер`
   line, and every `→` is a legal Leader attachment (check with the app's
   rosters: `getEligibleTargets` in `src/lib/leaders.ts`).
5. The roster table: rank matches XP, honour and scar names are from the
   fixed lists, every `→ <profile>` exists on that unit's datasheet in the
   edition of the next mission, and the number of honours matches the
   ranks reached (1 at Загартований, 2 at Ветеран, 3 at Герой for a
   character or elite unit) plus any «поза чергою» rewards.
6. The fixed wording: «Першими ходять», force names in «лапках», editions
   on the `Ростер` line, model counts in every `Загін`, statuses from the
   list only.
7. Report each mismatch as a doc comment on the spot rather than silently
   choosing.
