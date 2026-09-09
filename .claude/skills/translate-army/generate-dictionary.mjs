// Run from the repo root: node .claude/skills/translate-army/generate-dictionary.mjs
// (reads armies/*.json, src/data/detachments/*.ts, src/data/core-stratagems.ts and
// src/data/keyword-glossary.ts; writes src/i18n/uk.ts relative to the CWD).
//
//   --report <file>   also write every MISSING item as JSON ({kind, key,
//                     name, text}) so the gaps can be worked through in bulk
import { parseRoster } from "../../../parseRoster.mjs";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const files = fs.readdirSync("armies").filter((f) => f.endsWith(".json"));
const abilityTexts = new Map(); // name -> Set<text>
const ruleTexts = new Map();

for (const f of files) {
  const data = JSON.parse(fs.readFileSync("armies/" + f, "utf8"));
  const army = parseRoster(data);
  for (const u of army.units) {
    for (const a of u.abilities) {
      if (!a.text) continue;
      if (!abilityTexts.has(a.name)) abilityTexts.set(a.name, new Set());
      abilityTexts.get(a.name).add(a.text);
    }
    for (const r of u.rules) {
      if (!r.text) continue;
      if (!ruleTexts.has(r.name)) ruleTexts.set(r.name, new Set());
      ruleTexts.get(r.name).add(r.text);
    }
    for (const w of u.weapons)
      for (const r of w.rules) {
        if (!r.text) continue;
        if (!ruleTexts.has(r.name)) ruleTexts.set(r.name, new Set());
        ruleTexts.get(r.name).add(r.text);
      }
  }
}

// ---- Detachment rules + stratagems (src/data/detachments/*.ts and
// src/data/core-stratagems.ts). These are hand-authored TS modules, not
// part of the roster JSON, so they're loaded by stripping the (trivial,
// known-shape) type annotations and dynamically importing the result —
// this keeps the dictionary keyed by the exact runtime string, same
// zero-transcription-drift guarantee as the armies/*.json extraction
// above, without needing a full TS toolchain in this script. ----
async function loadDataModule(tsPath) {
  const src = fs.readFileSync(tsPath, "utf8");
  const stripped = src
    .replace(/^import type .*;\n/gm, "")
    .replace(/:\s*DetachmentData/g, "")
    .replace(/:\s*Stratagem\[\]/g, "")
    // src/data/keyword-glossary.ts
    .replace(/\(keyword: string\): string \| null/g, "(keyword)");
  const tmpPath = path.join(
    os.tmpdir(),
    `waha-dict-${path.basename(tsPath, ".ts")}-${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`,
  );
  fs.writeFileSync(tmpPath, stripped, "utf8");
  try {
    return await import(pathToFileURL(tmpPath).href);
  } finally {
    fs.unlinkSync(tmpPath);
  }
}

const detachmentRuleTexts = new Map(); // name -> Set<text>
const stratagemTexts = new Map(); // name -> Set<text>
const stratagemPhases = new Map(); // name -> Set<phase text>
// Per-detachment entries, keyed "<file stem>/<name>" ("core/<name>" for the
// core stratagems). The same stratagem name can carry different text in
// different detachments, so translations in uk-detachments/ are keyed this
// way, and a name-keyed table below is only trusted for a name with one text.
const detachmentRuleByKey = new Map(); // key -> { name, text }
const stratagemByKey = new Map(); // key -> { name, text, phase }

function collectStratagems(stratagems, stem) {
  for (const strat of stratagems) {
    stratagemByKey.set(`${stem}/${strat.name}`, {
      name: strat.name,
      text: strat.text ?? null,
      phase: strat.phase ?? null,
    });
    if (strat.text) {
      if (!stratagemTexts.has(strat.name)) stratagemTexts.set(strat.name, new Set());
      stratagemTexts.get(strat.name).add(strat.text);
    }
    if (strat.phase) {
      if (!stratagemPhases.has(strat.name)) stratagemPhases.set(strat.name, new Set());
      stratagemPhases.get(strat.name).add(strat.phase);
    }
  }
}

const detachmentsDir = "src/data/detachments";
const detachmentFiles = fs
  .readdirSync(detachmentsDir)
  .filter((f) => f.endsWith(".ts") && f !== "index.ts" && f !== "types.ts");
for (const f of detachmentFiles) {
  const mod = await loadDataModule(path.join(detachmentsDir, f));
  const data = Object.values(mod)[0];
  const stem = path.basename(f, ".ts");
  for (const rule of data.rules) {
    if (!rule.text) continue;
    detachmentRuleByKey.set(`${stem}/${rule.name}`, { name: rule.name, text: rule.text });
    if (!detachmentRuleTexts.has(rule.name)) detachmentRuleTexts.set(rule.name, new Set());
    detachmentRuleTexts.get(rule.name).add(rule.text);
  }
  collectStratagems(data.stratagems, stem);
}

const coreMod = await loadDataModule("src/data/core-stratagems.ts");
collectStratagems(Object.values(coreMod)[0], "core");

// ---- Per-detachment translations (uk-detachments/*.mjs next to this
// script). Each module exports any of RULES / STRATAGEMS (keyed
// "<file stem>/<name>") and PHASES (keyed by the exact English timing line).
// They are looked up before the name-keyed tables below. ----
const RULE_KEY_UK = {};
const STRATAGEM_KEY_UK = {};
const PHASE_TEXT_UK = {};
const ukDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "uk-detachments");
if (fs.existsSync(ukDir)) {
  for (const f of fs.readdirSync(ukDir).filter((x) => x.endsWith(".mjs")).sort()) {
    const mod = await import(pathToFileURL(path.join(ukDir, f)).href);
    Object.assign(RULE_KEY_UK, mod.RULES ?? {});
    Object.assign(STRATAGEM_KEY_UK, mod.STRATAGEMS ?? {});
    Object.assign(PHASE_TEXT_UK, mod.PHASES ?? {});
  }
}

// ---- Unit keyword glossary (src/data/keyword-glossary.ts): the text a
// unit keyword ("Infantry", "Battleline") expands to on the unit card. ----
const glossaryMod = await loadDataModule("src/data/keyword-glossary.ts");
const keywordGlossary = glossaryMod.KEYWORD_GLOSSARY; // keyword -> English text

// name -> ukrainian text (single-text names)
const RULE_UK = {
  "Anti-":
    "Зброя, що має **[ANTI-KEYWORD X+]** у своєму профілі, називається зброєю Anti. Щоразу, коли атака такою зброєю здійснюється проти цілі з keyword після «Anti-», немодифікований Wound roll «x+» вважається Critical Wound.",
  Assault:
    "Зброя, що має **[ASSAULT]** у своєму профілі, називається зброєю Assault. Якщо підрозділ, який здійснив Advance цього ходу, має моделі, озброєні зброєю Assault, він все одно має право стріляти у Shooting phase цього ходу. Коли такий підрозділ обирається для стрільби, можна розв'язувати атаки лише зброєю Assault, якою озброєні його моделі.",
  Blast:
    "Зброя, що має **[BLAST]** у своєму профілі, називається зброєю Blast, і вона здійснює випадкову кількість атак. Щоразу, коли ви визначаєте кількість атак зброєю Blast, додайте 1 до результату за кожні п'ять моделей, що були в цільовому підрозділі на момент його вибору як цілі (округлюючи вниз). Зброю Blast ніколи не можна використовувати для атак проти підрозділу, що перебуває в межах Engagement Range одного або більше підрозділів армії атакуючої моделі (включно з її власним підрозділом).",
  "Dark Pacts":
    "Якщо ваша Army Faction — ^^**Heretic Astartes**^^, щоразу, коли підрозділ із цією здатністю обирається для стрільби чи бою, він може укласти Dark Pact. Якщо так, він спочатку повинен пройти Leadership test, перш ніж будуть розв'язані будь-які ефекти Dark Pact; якщо цей тест провалено, підрозділ отримує D3 mortal wounds. Потім оберіть одну з наведених нижче здатностей, яку зброя цього підрозділу отримає до кінця фази:\n■ [LETHAL HITS]\n■ [SUSTAINED HITS 1]",
  "Deadly Demise 1": "__DEADLY_DEMISE__",
  "Deadly Demise D3": "__DEADLY_DEMISE__",
  "Deep Strike":
    "Під час Declare Battle Formations step, якщо кожна модель підрозділу має цю здатність, ви можете розмістити його в Reserves замість того, щоб розставляти на полі бою. Якщо так, на етапі Reinforcements однієї з ваших Movement phase ви можете розмістити цей підрозділ будь-де на полі бою на відстані понад 9\" по горизонталі від усіх ворожих моделей.\n\nЯкщо підрозділ зі здатністю Deep Strike прибуває зі Strategic Reserves, контролюючий гравець може обрати, розміщувати цей підрозділ за правилами Strategic Reserves чи за допомогою здатності Deep Strike.",
  "Devastating Wounds":
    "Зброя, що має **[DEVASTATING WOUNDS]** у своєму профілі, називається зброєю Devastating Wounds. Щоразу, коли атака такою зброєю завдається і ця атака отримує Critical Wound, проти неї не можна здійснювати жодного saving throw (включно з invulnerable saving throw). Такі атаки розподіляються на моделі лише після того, як усі інші атаки атакуючого підрозділу вже розподілені та розв'язані. Після розподілу цієї атаки та застосування будь-яких модифікаторів вона завдає цілі кількість mortal wounds, що дорівнює характеристиці Damage цієї атаки, замість звичайного завдання шкоди.",
  "Extra Attacks":
    "Зброя, що має **[EXTRA ATTACKS]** у своєму профілі, називається зброєю Extra Attacks. Щоразу, коли носій однієї або кількох одиниць зброї Extra Attacks вступає в бій, він здійснює атаки кожною одиницею зброї ближнього бою Extra Attacks, якою озброєний, а також атаки однією зі своєї зброї ближнього бою, що не має здатності [EXTRA ATTACKS] (якщо така є). Кількість атак зброєю Extra Attacks не може бути змінена іншими правилами, якщо назва цієї зброї прямо не вказана в такому правилі.",
  "Feel No Pain": "__FEEL_NO_PAIN__",
  "Feel No Pain 5+": "__FEEL_NO_PAIN__",
  "Firing Deck 2":
    "Деякі моделі **^^Transport^^** мають «Firing Deck x» у переліку своїх здатностей. Щоразу, коли така модель обирається для стрільби у Shooting phase, ви можете обрати до «x» моделей, embarked у ній, чиї підрозділи ще не стріляли цієї фази. Потім для кожної з цих embarked моделей ви можете обрати одну одиницю дальньої зброї, якою вона озброєна (за винятком зброї зі здатністю **[ONE SHOT]**). Доки ця модель **^^Transport^^** не розв'яже всі свої атаки, вона вважається озброєною всією зброєю, обраною цим способом, на додачу до своєї іншої зброї. До кінця фази підрозділи цих обраних моделей не мають права стріляти.",
  "Gate of Infinity":
    "Якщо ваша Army Faction — **^^Grey Knights^^**, наприкінці Fight phase вашого опонента ви можете обрати кілька підрозділів своєї армії, що перебувають на полі бою (за винятком підрозділів, які перебувають у межах Engagement Range одного або більше ворожих підрозділів), за умови що кожна модель цих підрозділів має цю здатність. Максимальна кількість підрозділів, які можна обрати, залежить від розміру бою:\n\nIncursion — до 2 підрозділів\nStrike Force — до 3 підрозділів\nOnslaught — до 4 підрозділів\n\nЗробивши вибір, приберіть ці підрозділи з поля бою та розмістіть їх у Strategic Reserves.",
  Hazardous:
    "Зброя, що має **[HAZARDOUS]** у своєму профілі, називається зброєю Hazardous. Щоразу, коли підрозділ обирається для стрільби чи бою, після того як цей підрозділ розв'яже всі свої атаки, за кожну зброю Hazardous, для якої були обрані цілі при розв'язанні цих атак, цей підрозділ повинен пройти один Hazardous test. Для цього киньте один D6: на результат 1 тест провалено. За кожен провалений тест ви повинні розв'язати таку послідовність (розв'язуйте кожен провалений тест по черзі):\n\n■ Якщо можливо, оберіть одну модель у цьому підрозділі, що втратила один або більше wounds і озброєна однією або більше одиницями зброї Hazardous.\n■ Інакше, якщо можливо, оберіть одну модель у цьому підрозділі (за винятком моделей **^^Character^^**), озброєну однією або більше одиницями зброї Hazardous.\n■ Інакше оберіть одну модель **^^Character^^** у цьому підрозділі, озброєну однією або більше одиницями зброї Hazardous.\n\nЯкщо модель обрано, цей підрозділ отримує 3 mortal wounds, і при розподілі цих mortal wounds вони повинні бути розподілені на обрану модель.\n\nЯкщо підрозділ гравця обрано ціллю Fire Overwatch Stratagem у Charge phase опонента, будь-які mortal wounds, завдані Hazardous tests, розподіляються після того, як атакуючий підрозділ завершив свій Charge move.",
  "Ignores Cover":
    "Зброя, що має **[IGNORES COVER]** у своєму профілі, називається зброєю Ignores Cover. Щоразу, коли атака здійснюється такою зброєю, ціль не може мати Benefit of Cover проти цієї атаки.",
  "Indirect Fire":
    "Зброя, що має **[INDIRECT FIRE]** у своєму профілі, називається зброєю Indirect Fire, і атаки нею можна здійснювати, навіть якщо ціль не видима атакуючій моделі. Такі атаки можуть знищувати ворожі моделі в цільовому підрозділі, навіть якщо жодна з них не була видима атакуючому підрозділу на момент вибору цієї цілі.\n\n\nЯкщо жодна модель цільового підрозділу не видима атакуючому підрозділу на момент вибору цілі, то щоразу, коли модель атакуючого підрозділу здійснює атаку по цій цілі зброєю Indirect Fire, відніміть 1 від Hit roll цієї атаки, немодифікований Hit roll 1-3 завжди провалюється, і ціль має Benefit of Cover проти цієї атаки. Зброю зі здатністю **[TORRENT]** не можна застосовувати за допомогою здатності **[INDIRECT FIRE]**.",
  Lance:
    "Зброя, що має **[LANCE]** у своєму профілі, називається зброєю Lance. Щоразу, коли атака здійснюється такою зброєю, якщо носій здійснив Charge move цього ходу, додайте 1 до Wound roll цієї атаки.",
  Leader:
    "Поки Bodyguard підрозділ містить Leader, він вважається Attached unit і, за винятком правил, що спрацьовують при знищенні підрозділів (стор. 12), розглядається як єдиний підрозділ для всіх ігрових цілей. Щоразу, коли атака спрямована на Attached unit, доки атакуючий підрозділ не розв'яже всі свої атаки, ви повинні використовувати характеристику Toughness моделей Bodyguard цього підрозділу, навіть якщо Leader у цьому підрозділі має іншу характеристику Toughness. Щоразу, коли атака успішно ранить Attached unit, цю атаку не можна розподілити на модель Character цього підрозділу, навіть якщо ця модель Character вже втратила один або більше wounds або на неї вже розподілено атаки цієї фази. Щойно остання модель Bodyguard Attached unit знищена, будь-які атаки проти цього підрозділу, що ще не розподілені, можна розподіляти на моделі Character цього підрозділу.\n\nЩоразу, коли остання модель Bodyguard підрозділу знищена, кожен підрозділ CHARACTER, що входить до складу цього Attached unit, стає окремим підрозділом зі своєю початковою Starting Strength. Якщо це відбувається внаслідок атаки, вони стають окремими підрозділами після того, як атакуючий підрозділ розв'яже всі свої атаки.\n\nЩоразу, коли остання модель підрозділу CHARACTER, attached до Bodyguard підрозділу, знищена, і немає іншого attached підрозділу CHARACTER, Bodyguard підрозділ цього Attached unit стає окремим підрозділом зі своєю початковою Starting Strength. Якщо це відбувається внаслідок атаки, вони стають окремими підрозділами після того, як атакуючий підрозділ розв'яже всі свої атаки.\n\nЩоразу, коли підрозділ, що входить до складу Attached unit, знищується, він не має keywords жодних інших підрозділів, що складають цей Attached unit (якщо тільки він не має цих keywords на власній картці підрозділу), для цілей будь-яких правил, що спрацьовують при знищенні цього підрозділу.",
  "Martial Ka'tah":
    "Щоразу, коли підрозділ із цією здатністю обирається для бою, оберіть одну зі стійок Ka'tah нижче. Доки цей підрозділ не завершить здійснення своїх атак, обрана Stance активна для нього, і він отримує відповідну здатність.\n\n■ DACATARAI STANCE\nЗброя ближнього бою, якою озброєні моделі цього підрозділу, отримує здатність [SUSTAINED HITS 1].\n■ RENDAX STANCE\nЗброя ближнього бою, якою озброєні моделі цього підрозділу, отримує здатність [LETHAL HITS].",
  Melta:
    "Зброя, що має **[MELTA X]** у своєму профілі, називається зброєю Melta. Щоразу, коли атака такою зброєю спрямована на підрозділ у межах половини дальності цієї зброї, характеристика Damage цієї атаки збільшується на значення, позначене як «x».",
  Pistol:
    "Зброя, що має **[PISTOL]** у своєму профілі, називається Pistols. Якщо підрозділ містить моделі, озброєні Pistols, цей підрозділ має право стріляти у Shooting phase контролюючого гравця, навіть перебуваючи в межах Engagement Range одного або більше ворожих підрозділів. Коли такий підрозділ обирається для стрільби, він може розв'язувати атаки лише своїми Pistols і може обрати ціллю лише один із ворожих підрозділів, у межах Engagement Range якого перебуває. За таких обставин Pistol може обрати ціллю ворожий підрозділ, навіть якщо інші дружні підрозділи перебувають у межах Engagement Range того самого ворожого підрозділу.\n\nЯкщо модель озброєна одним або більше Pistols, якщо тільки вона не є моделлю **^^Monster^^** чи **^^Vehicle^^**, вона може стріляти або своїми Pistols, або всією іншою дальньою зброєю. Оголосіть, чи буде така модель стріляти своїми Pistols, чи іншою дальньою зброєю, перед вибором цілей.",
  Precision:
    "Зброя, що має **[PRECISION]** у своєму профілі, називається зброєю Precision. Щоразу, коли атака такою зброєю успішно ранить Attached unit, якщо модель Character цього підрозділу видима атакуючій моделі, гравець атакуючої моделі може обрати розподілити цю атаку на цю модель Character замість звичайної послідовності атаки.",
  Psychic:
    "Деяку зброю та здатності можуть використовувати лише **^^Psykers^^**. Така зброя та здатності позначені словом «Psychic». Якщо зброя чи здатність Psychic змушує будь-який підрозділ отримати один або більше wounds, кожен із цих wounds вважається завданим Psychic Attack.",
  "Rapid Fire":
    "Зброя, що має **[RAPID FIRE X]** у своєму профілі, називається зброєю Rapid Fire. Щоразу, коли така зброя атакує підрозділ, що перебуває в межах половини дальності цієї зброї, характеристика Attacks цієї зброї збільшується на значення, позначене як «x».",
  'Scouts 6"':
    "Деякі підрозділи мають «Scouts x\"» у переліку своїх здатностей. Якщо кожна модель підрозділу має цю здатність, то на початку першого battle round, перед початком першого ходу, він може здійснити Normal move до x\", з тим винятком, що під час цього руху відстань, пройдена кожною моделлю цього підрозділу, може перевищувати характеристику Move цієї моделі, доки вона не перевищує x\".\n\nМоделі DEDICATED TRANSPORT можуть використовувати будь-яку здатність Scouts x\" зі свого переліку здатностей, або здатність Scouts x\", яку має підрозділ, що починає бій embarked у цій моделі DEDICATED TRANSPORT (за умови, що в цьому Dedicated Transport embarked лише моделі з цією здатністю), незалежно від того, як цей embarked підрозділ отримав цю здатність (наприклад, зі свого переліку здатностей, надану Enhancement чи attached Character тощо).\n\nПідрозділ, що рухається за допомогою цієї здатності, повинен завершити цей рух на відстані понад 9\" по горизонталі від усіх ворожих моделей. Якщо обидва гравці мають підрозділи, здатні на це, гравець, що здійснює перший хід, рухає свої підрозділи першим.",
  "Sustained Hits":
    "Зброя, що має **[SUSTAINED HITS X]** у своєму профілі, називається зброєю Sustained Hits. Щоразу, коли атака здійснюється такою зброєю, якщо випадає Critical Hit, ця атака завдає цілі додаткову кількість hits, позначену як «x».",
  Torrent:
    "Зброя, що має **[TORRENT]** у своєму профілі, називається зброєю Torrent. Щоразу, коли атака здійснюється такою зброєю, ця атака автоматично влучає в ціль.",
  "Twin-linked":
    "Зброя, що має **[TWIN-LINKED]** у своєму профілі, називається зброєю Twin-linked. Щоразу, коли атака здійснюється такою зброєю, ви можете перекинути Wound roll цієї атаки.",
  "Deadly Demise D6": "__DEADLY_DEMISE__",
  Heavy:
    "Зброя, що має **[HEAVY]** у своєму профілі, називається зброєю Heavy. Щоразу, коли атака здійснюється такою зброєю, якщо підрозділ атакуючої моделі Remained Stationary цього ходу, додайте 1 до Hit roll цієї атаки.",
  Infiltrators:
    "Під час розстановки, якщо кожна модель підрозділу має цю здатність, то, розставляючи його, ви можете розмістити його будь-де на полі бою на відстані понад 9\" по горизонталі від ворожої deployment zone та всіх ворожих моделей.",
  "Lethal Hits":
    "Зброя, що має **[LETHAL HITS]** у своєму профілі, називається зброєю Lethal Hits. Щоразу, коли атака здійснюється такою зброєю, Critical Hit автоматично ранить ціль.",
  "Lone Operative":
    "Якщо цей підрозділ не входить до складу Attached unit, його можна обрати ціллю дальньої атаки, лише якщо атакуюча модель перебуває в межах 12\".",
  "Oath of Moment":
    "Якщо ваша Army Faction — **^^Adeptus Astartes^^**, на початку вашої Command phase оберіть один підрозділ з армії вашого опонента. До початку вашої наступної Command phase цей ворожий підрозділ є вашою ціллю Oath of Moment. Щоразу, коли модель із цією здатністю здійснює атаку по вашій цілі Oath of Moment:\n■ Ви можете перекинути Hit roll\n■ Якщо ви використовуєте Detachment із Codex: Space Marines і у вашій армії немає жодного підрозділу з keywords **^^Blood Angels^^**, **^^Dark Angels^^**, **^^Deathwatch^^** або **^^Space Wolves^^**, також додайте 1 до Wound roll.",
  Stealth:
    "Якщо кожна модель підрозділу має цю здатність, то щоразу, коли по ньому здійснюється дальня атака, відніміть 1 від Hit roll цієї атаки.",
  "Waaagh!":
    "Якщо ваша Army Faction — **^^Orks^^**, один раз за бій, на початку вашої Command phase, ви можете оголосити Waaagh! Якщо так, до початку вашої наступної Command phase Waaagh! активний для вашої армії, і:\n- Підрозділи вашої армії з цією здатністю мають право оголошувати Charge в хід, коли вони здійснили Advance.\n- Додайте 1 до характеристик Strength та Attacks зброї ближнього бою, якою озброєні моделі вашої армії з цією здатністю.\n- Моделі вашої армії з цією здатністю мають 5+ invulnerable save.",
};
// Some exports name the weapon rule after the badge ("Rapid Fire 1") rather
// than the generic rule ("Rapid Fire"); the text is identical.
RULE_UK["Rapid Fire 1"] = RULE_UK["Rapid Fire"];

const DEADLY_DEMISE =
  "Деякі моделі мають «Deadly Demise x» у переліку своїх здатностей. Коли така модель знищується, киньте один D6 перед тим, як прибрати її з гри (якщо ця модель — TRANSPORT, киньте кубик до того, як embarked моделі висадяться). На результат 6 кожен підрозділ у межах 6\" від цієї моделі отримує кількість mortal wounds, позначену як «x» (якщо це випадкове число, киньте окремо для кожного підрозділу в межах 6\").";
const FEEL_NO_PAIN =
  "Деякі моделі мають «Feel No Pain x+» у переліку своїх здатностей. Щоразу, коли модель із цією здатністю отримує damage і, відповідно, має втратити wound (включно з wounds, втраченими через mortal wounds), киньте один D6: якщо результат більший або дорівнює числу, позначеному як «x», це wound ігнорується і не втрачається. Якщо модель має більше однієї здатності Feel No Pain, ви можете використати лише одну з цих здатностей щоразу, коли ця модель отримує damage і мала б втратити wound.";

// Leader ability text keyed by a snippet unique to each variant
// NOTE: the script picks the FIRST variant whose snippet appears in the text,
// so every snippet must be unique to its variant (e.g. a bare "CHOSEN" would
// also match the Master of Executions / Master of Possession lists).
const LEADER_VARIANTS = [
  [
    "■ CHAOS TERMINATOR SQUAD\n■ CHOSEN",
    "Цю модель можна приєднати до таких підрозділів:\n■ CHAOS TERMINATOR SQUAD\n■ CHOSEN",
  ],
  [
    "MASTERS OF EXECUTIONS",
    "Цю модель можна приєднати до таких підрозділів:\n■ CHOSEN\n■ LEGIONARIES\n\nВи можете приєднати цю модель до одного з наведених вище підрозділів, навіть якщо до нього вже приєднано одну іншу модель CHARACTER (до підрозділу не можна приєднати двох MASTERS OF EXECUTIONS). Якщо так, і цей Bodyguard підрозділ знищено, підрозділи Leader, приєднані до нього, стають окремими підрозділами зі своїми початковими Starting Strengths.",
  ],
  [
    "■ CHOSEN\n■ LEGIONARIES\n■ POSSESSED",
    "Цю модель можна приєднати до таких підрозділів:\n■ CHOSEN\n■ LEGIONARIES\n■ POSSESSED",
  ],
  [
    "^^**Chosen, Havocs, Legionaries**^^",
    "Цю модель можна приєднати до таких підрозділів: ^^**Chosen, Havocs, Legionaries**^^",
  ],
  [
    "Custodian Wardens",
    "Цю модель можна приєднати до таких підрозділів:\n■ Custodian Guard\n■ Custodian Wardens",
  ],
  [
    "Allarus Custodians",
    "Цю модель можна приєднати до таких підрозділів:\n■ Allarus Custodians",
  ],
  [
    "following unit:\n■ Purifier Squad",
    "Цю модель можна приєднати до такого підрозділу:\n■ Purifier Squad",
  ],
  [
    "■ Brotherhood Terminator Squad\n■ Paladin Squad",
    "Цю модель можна приєднати до таких підрозділів:\n■ Brotherhood Terminator Squad\n■ Paladin Squad",
  ],
  [
    "**^^Brotherhood Terminator Squad^^**",
    "Цю модель можна приєднати до таких підрозділів:\n- **^^Brotherhood Terminator Squad^^**\n- **^^Paladin Squad^^**",
  ],
  // Orks
  [
    "following unit:\n- KOMMANDOS",
    "Цю модель можна приєднати до такого підрозділу:\n- KOMMANDOS",
  ],
  [
    "- **^^Boyz^^**\n- **^^Meganobz^^**\n- **^^Nobz^^**",
    "Цей підрозділ можна приєднати до таких підрозділів:\n- **^^Boyz^^**\n- **^^Meganobz^^**\n- **^^Nobz^^**",
  ],
  [
    "- BOYZ\n- LOOTAS\n- MEK GUNZ\n- NOBZ\n- TANKBUSTAS",
    "Цю модель можна приєднати до таких підрозділів:\n- BOYZ\n- LOOTAS\n- MEK GUNZ\n- NOBZ\n- TANKBUSTAS",
  ],
  [
    "following units:\n- BOYZ\n- NOBZ",
    "Цю модель можна приєднати до таких підрозділів:\n- BOYZ\n- NOBZ",
  ],
  [
    "following unit:\n- MEGANOBZ",
    "Цю модель можна приєднати до такого підрозділу:\n- MEGANOBZ",
  ],
  // Ultramarines
  [
    "Victrix Honour Guard",
    "Цю модель можна приєднати до таких підрозділів: **^^Aggressor Squad, Assault Intercessor Squad, Bladeguard Veteran Squad, Company Heroes, Eradicator Squad, Heavy Intercessor Squad, Infernus Squad, Intercessor Squad, Sternguard Veteran Squad, Tactical Squad, Terminator Assault Squad, Terminator Squad, Victrix Honour Guard**^^",
  ],
  [
    "Captain, Chapter Master or Lieutenant",
    "Цю модель можна приєднати до таких підрозділів:\n\n■ Assault Intercessor Squad\n■ Desolation Squad\n■ Devastator Squad\n■ Hellblaster Squad\n■ Infernus Squad\n■ Intercessor Squad\n■ Sternguard Veteran Squad\n■ Tactical Squad\n\nВи можете приєднати цю модель до одного з наведених вище підрозділів, навіть якщо до нього вже приєднано одну модель Captain, Chapter Master або Lieutenant. Якщо так, і цей Bodyguard підрозділ знищено, підрозділи Leader, приєднані до нього, стають окремими підрозділами зі своїми початковими Starting Strengths.",
  ],
];

// Invulnerable Save text keyed by a snippet unique to each variant
const INVULN_VARIANTS = [
  ["Models in this unit have a 4+", "Моделі цього підрозділу мають 4+ invulnerable save."],
  ["Models in this unit have a 5+", "Моделі цього підрозділу мають 5+ invulnerable save."],
  [
    "This model has a 5+ invulnerable save against ranged attacks",
    "Ця модель має 5+ invulnerable save проти дальніх атак.",
  ],
  ["This model has a 4+", "Ця модель має 4+ invulnerable save."],
  ["This model has a 5+ invulnerable save.", "Ця модель має 5+ invulnerable save."],
  ["This model has a 5+ invulnerable save", "Ця модель має 5+ invulnerable save"],
  ["Models in this unit have a 6+", "Моделі цього підрозділу мають 6+ invulnerable save."],
  [
    "This model has a 2+ invulnerable save. You cannot re-roll",
    "Ця модель має 2+ invulnerable save. Ви не можете перекидати invulnerable saving throws для цієї моделі.",
  ],
];

const ABILITY_UK = {
  "Ancient's Banner":
    "Додайте 1 до характеристики Objective Control моделей підрозділу носія.",
  Vexilla: "Додайте 1 до характеристики Objective Control моделей підрозділу носія.",
  "Apothecary's narthecium":
    "У вашій Command phase, якщо носій не знищений, ви можете повернути 1 знищену модель (за винятком ^^**Characters**^^) у підрозділ носія.",
  "Attuned Onslaught (Psychic)":
    "Щоразу, коли цей підрозділ здійснює Charge move, до кінця ходу додайте 1 до характеристики Damage зброї ближнього бою, якою озброєні моделі ^^**Paladin Squad**^^ у цьому підрозділі.",
  "Auramite and Adamantite":
    "Один раз за бій, на початку будь-якої фази, ця модель може використати цю здатність. Якщо так, до кінця фази, щоразу, коли атака розподіляється на цю модель, змініть характеристику Damage цієї атаки на 1.",
  Brigand:
    "Дальня зброя, якою озброєна ця модель, має здатність [Ignores Cover], коли ціль атаки — ворожий підрозділ у радіусі дії одного або більше objective markers.",
  "Captain-General":
    "Поки ця модель веде підрозділ, щоразу, коли модель цього підрозділу здійснює атаку, ви можете ігнорувати будь-які або всі модифікатори характеристик Ballistic Skill чи Weapon Skill цієї атаки та/або будь-які модифікатори Hit roll.",
  "Champion of the Order of Purifiers (Psychic)":
    "Поки ця модель веде підрозділ, додайте 1 до характеристики Attacks зброї Purifying Flame, якою озброєний цей підрозділ.",
  "Chaos icon":
    "Щоразу, коли підрозділ носія проходить Leadership test для здатності Dark Pacts, ви можете перекинути цей тест.",
  "Warp-sighted Butcher":
    "Поки ця модель веде підрозділ, щоразу, коли модель цього підрозділу здійснює атаку ближнього бою по підрозділу, що перебуває нижче своєї Starting Strength, ви можете перекинути Hit roll. Якщо цей підрозділ Below Half-strength, ви також можете перекинути Wound roll.",
  "Trophy Taker":
    "Щоразу, коли ця модель знищує ворожу модель CHARACTER, ви отримуєте 1CP.",
  "Daemonkin (Psychic)":
    "Поки ця модель веде підрозділ, додайте 1 до Advance та Charge rolls для цього підрозділу.",
  "Sacrificial Dagger":
    "Один раз за фазу, коли цю модель обрано для стрільби чи бою, вона може використати цю здатність. Якщо так, підрозділ цієї моделі отримує 1 mortal wound і, до кінця фази, щоразу, коли ця модель здійснює Psychic Attack, додайте 1 до Hit roll та додайте 1 до Wound roll.",
  Warpsmith:
    "Поки ця модель перебуває в межах 3\" від одного або більше дружніх підрозділів ^^**Heretic Astartes Vehicle**^^, ця модель має здатність Lone Operative.",
  "Master of Mechanisms":
    "У вашій Command phase оберіть одну дружню модель ^^**Heretic Astartes Vehicle**^^ у межах 3\" від цієї моделі. Ця модель **^^Vehicle**^^ відновлює до D3 втрачених wounds і, до початку вашої наступної Command phase, щоразу, коли ця **^^Vehicle**^^ здійснює атаку, додайте 1 до Hit roll. Кожну модель можна обрати для цієї здатності лише один раз за Command phase.",
  "Enrage Machine Spirits":
    "Наприкінці вашої Movement phase оберіть один ворожий підрозділ ^^**Vehicle**^^ у межах 12\" від цієї моделі. Цей підрозділ повинен пройти Battle-shock test.",
  "Galatus Shield":
    "Щоразу, коли атака ближнього бою спрямована на цю модель, віднімайте 1 від Wound roll.",
  "This model has a transport capacity of 12 ^^**Heretic Astartes Infantry**^^ models. It cannot transport ^^**Terminator, Jump Pack, Mutilators, Obliterator**^^ or ^^**Possessed**^^ models.":
    "Ця модель має transport capacity 12 моделей ^^**Heretic Astartes Infantry**^^. Вона не може перевозити моделі ^^**Terminator, Jump Pack, Mutilators, Obliterator**^^ або ^^**Possessed**^^.",
  "CHAOS UNDIVIDED":
    "[LETHAL HITS]: Щоразу, коли модель цього підрозділу здійснює атаку, перекиньте Hit roll 1.\n[SUSTAINED HITS 1]: Щоразу, коли модель цього підрозділу здійснює атаку, перекиньте Hit roll 1.",
  "Corrupt Machine Spirits":
    "На початку вашої Shooting phase оберіть один видимий ворожий підрозділ ^^**Vehicle**^^ у межах 12\" від цієї моделі та киньте один D6: на результат 2-3 цей ворожий підрозділ отримує D3 mortal wounds; на результат 4-5 цей ворожий підрозділ отримує 3 mortal wounds; на результат 6 цей ворожий підрозділ отримує D3+3 mortal wounds.",
  "Daemonic Ordnance":
    "Щоразу, коли цю модель обрано для стрільби, вона може використати цю здатність. Якщо так, до кінця фази її дальня зброя отримує здатності [DEVASTATING WOUNDS] та [HAZARDOUS].",
  "While this model has 1-4 wounds remaining, each time this model makes an attack, subtract 1 from the Hit roll.":
    "Поки в цієї моделі залишилося 1-4 wounds, щоразу, коли ця модель здійснює атаку, віднімайте 1 від Hit roll.",
  "While this model has 1-5 wounds remaining, subtract 3 from this model's Objective Control characteristic and each time this model makes an attack, subtract 1 from the Hit roll.":
    "Поки в цієї моделі залишилося 1-5 wounds, віднімайте 3 від характеристики Objective Control цієї моделі, і щоразу, коли ця модель здійснює атаку, віднімайте 1 від Hit roll.",
  "Dark Destiny":
    "Щоразу, коли ця модель укладає Dark Pact і не провалює відповідний Leadership test, якщо результат цього тесту становив 7+, ви отримуєте 1CP.",
  "Daughter of the Abyss":
    "Ця модель має здатність Feel No Pain 3+ проти Psychic Attacks та mortal wounds.",
  Despoilers:
    "Щоразу, коли цей підрозділ укладає Dark Pact, до кінця фази, щоразу, коли модель цього підрозділу здійснює атаку, ви можете перекинути Hit roll.",
  "Foesight (Psychic)":
    "Щоразу, коли ця модель здійснює атаку по підрозділу ^^**Character**^^, ви можете перекинути Hit roll.",
  "Force Edge (Psychic)":
    "Щоразу, коли модель цього підрозділу здійснює атаку ближнього бою по підрозділу (за винятком ^^**Vehicles**^^ або ^^**Monsters**^^), покращуйте характеристику Armour Penetration цієї атаки на 1.",
  "From Golden Light":
    "Один раз за бій, наприкінці ходу вашого опонента, якщо цей підрозділ не перебуває в межах Engagement Range одного або більше ворожих підрозділів, ви можете прибрати його з поля бою та розмістити в Strategic Reserves.",
  "Guidance of the Ancients (Psychic)":
    "У вашій Shooting phase, після того як цей підрозділ вистрілив, оберіть один ворожий підрозділ, уражений однією або більше з цих атак. До кінця фази, щоразу, коли модель ^^**Grey Knights**^^ вашої армії здійснює атаку по цьому підрозділу, додайте 1 до Hit roll.",
  "Haloed in Soulfire (Psychic)":
    "Поки ця модель веде підрозділ, цей підрозділ можна обрати ціллю дальньої атаки, лише якщо атакуюча модель перебуває в межах 18\".",
  "Hammer Aflame (Psychic)":
    "Щоразу, коли підрозділ цієї моделі обрано для бою, ви можете обрати один ворожий підрозділ у межах Engagement Range підрозділу цієї моделі та кинути один D6: на результат 2-3 цей ворожий підрозділ отримує 1 mortal wound; на результат 4-5 цей ворожий підрозділ отримує D3 mortal wounds; на результат 6+ цей ворожий підрозділ отримує D3+3 mortal wounds.",
  "Impetuous Glory":
    "Щоразу, коли ця модель здійснює charge move, до кінця ходу додайте 1 до характеристики Attacks профілю «strike» reaper chain-cleaver цієї моделі та додайте 2 до характеристики Attacks профілю «sweep» reaper chain-cleaver цієї моделі.",
  Karnivore: "Ви можете перекидати Advance та Charge rolls для цієї моделі.",
  KHORNE:
    "[LETHAL HITS]: Щоразу, коли модель цього підрозділу здійснює атаку ближнього бою, немодифікований Hit roll 5+ вважається Critical Hit.",
  "Living Fortress":
    "Один раз за бій, на початку будь-якої фази, цей підрозділ може використати цю здатність. Якщо так, до кінця фази моделі цього підрозділу мають здатність Feel No Pain 4+.",
  "Lord of the Traitor Legions (Aura)":
    "Поки дружній підрозділ HERETIC ASTARTES (за винятком підрозділів DAMNED) перебуває в межах 6\" від цієї моделі, ви можете перекидати Leadership та Battle-shock tests для цього підрозділу.",
  "Mandulian Reliquary":
    "Лише модель **^^Grey Knights^^**. Поки підрозділ носія не Battle-shocked, додайте 3 до характеристики Objective Control носія.",
  "Mark of Chaos Ascendant (Aura)":
    "Поки дружній підрозділ HERETIC ASTARTES INFANTRY чи HERETIC ASTARTES MOUNTED (за винятком підрозділів DAMNED) перебуває в межах 6\" від цієї моделі, моделі цього підрозділу мають 4+ invulnerable save.",
  "Martial Inspiration":
    "Один раз за бій, у вашій Charge phase, підрозділ цієї моделі має право оголосити Charge в хід, коли він здійснив Advance.",
  "Moment Shackle":
    "Один раз за бій, на початку Fight phase, ви можете обрати одне з наведеного нижче, що діятиме до кінця фази:\n■ Зброя ближнього бою Watcher's Axe цієї моделі отримує характеристику Attacks 12.\n■ Ця модель отримує 2+ invulnerable save.",
  NURGLE:
    "[SUSTAINED HITS 1]: Щоразу, коли модель цього підрозділу здійснює дальню атаку, немодифікований Hit roll 5+ вважається Critical Hit.",
  "Paragon of Hatred (Aura)":
    "Поки дружній підрозділ HERETIC ASTARTES (за винятком підрозділів DAMNED) перебуває в межах 6\" від цієї моделі, щоразу, коли модель цього підрозділу здійснює атаку, ви можете перекинути Hit roll.",
  "Paragon of Sanctity":
    "Лише модель **^^Grey Knights^^**. Один раз за бій, на початку будь-якої фази, носій може обрати один дружній підрозділ **^^Grey Knights^^** у межах 18\" від себе та видимий йому. Якщо так, до кінця фази цей підрозділ перебуває в межах Hallowed Ground вашої армії.",
  "Personal Teleporters":
    "У вашій Shooting phase, після того як цей підрозділ вистрілив, якщо він не перебуває в межах Engagement Range одного або більше ворожих підрозділів, він може здійснити Normal move до 6\", наче це ваша Movement phase. Якщо так, до кінця ходу цей підрозділ не має права оголошувати Charge.",
  "Phial of the Abyss":
    "Лише модель **^^Grey Knights Infantry^^**. Моделі підрозділу носія мають здатність Stealth.",
  "Praesidium Shield": "Додайте 1 до характеристики Wounds носія.",
  "Purity of Execution":
    "Щоразу, коли модель цього підрозділу здійснює дальню атаку по підрозділу Psyker, ця атака отримує здатності [PRECISION] та [DEVASTATING WOUNDS].",
  "Resolute Will":
    "Поки CHARACTER веде цей підрозділ, щоразу, коли атака спрямована на цей підрозділ, якщо характеристика Strength цієї атаки більша за характеристику Toughness цього підрозділу, віднімайте 1 від Wound roll.",
  "Sanctic Hood":
    "Поки ця модель веде підрозділ, моделі цього підрозділу мають здатність Feel No Pain 4+ проти Psychic Attacks.",
  "Sanctifying Ritual (Psychic)":
    "Наприкінці вашої Command phase, якщо цей підрозділ перебуває в радіусі дії objective marker, яку ви контролюєте, ця objective marker залишається під вашим контролем, доки Level of Control опонента над цією objective marker не стане більшим за ваш наприкінці фази.",
  "Sanctity of Purpose":
    "Щоразу, коли модель цього підрозділу здійснює атаку, перекидайте Wound roll 1. Якщо ціль перебуває в радіусі дії objective marker, ви натомість можете перекинути весь Wound roll.",
  "Sanctuary (Psychic)":
    "Поки ця модель веде підрозділ, щоразу, коли атака спрямована на цей підрозділ, віднімайте 1 від Hit roll.",
  "Self-repair": "На початку вашої Command phase ця модель відновлює 1 втрачений wound.",
  "Sentinel Storm":
    "Один раз за бій, у вашій Shooting phase, після того як підрозділ вистрілив, він може вистрілити знову.",
  SLAANESH:
    "[SUSTAINED HITS 1]: Щоразу, коли модель цього підрозділу здійснює атаку ближнього бою, немодифікований Hit roll 5+ вважається Critical Hit.",
  "Slayers of Tyrants":
    "Щоразу, коли модель цього підрозділу здійснює атаку по підрозділу ^^Character, Monster^^ чи ^^Vehicle^^, ви можете перекинути Wound roll.",
  "Soul Eater":
    "Наприкінці Fight phase, якщо одна або більше атак цієї моделі цієї фази знищили один або більше ворожих підрозділів, до кінця бою додайте 1 до характеристики Attacks зброї цієї моделі.",
  "Spirit Thief":
    "На початку вашої Shooting phase оберіть один видимий ворожий підрозділ ^^**Vehicle**^^. До кінця фази, щоразу, коли дружня модель ^^**Heretic Astartes**^^ здійснює атаку по цьому підрозділу, перекидайте Wound roll 1.",
  "Stabilisation Talons":
    "Щоразу, коли модель цього підрозділу здійснює атаку дальньою зброєю, ви можете ігнорувати будь-які або всі модифікатори Hit roll та будь-які або всі модифікатори характеристики Ballistic Skill цієї зброї.",
  "Stand Vigil":
    "Щоразу, коли модель цього підрозділу здійснює атаку, перекидайте Wound roll 1. Поки цей підрозділ перебуває в радіусі дії objective marker, яку ви контролюєте, ви натомість можете перекинути весь Wound roll.",
  "Strategic Mastery": "__STRATAGEM_CP__",
  "Strike from the Skies":
    "Цей підрозділ має право стріляти та оголошувати Charge в хід, коли він здійснив Fell Back.",
  "Suppression Protocols":
    "У вашій Shooting phase, після того як ця модель вистрілила, оберіть один ворожий підрозділ (за винятком **^^Monsters^^** та **^^Vehicles^^**), уражений однією або більше з цих атак, здійснених Armiger autocannon. До початку вашого наступного ходу цей ворожий підрозділ вважається suppressed. Поки підрозділ suppressed, щоразу, коли модель цього підрозділу здійснює атаку, віднімайте 1 від Hit roll.",
  "Surge of Wrath (Psychic)":
    "Щоразу, коли ця модель здійснює атаку ближнього бою по підрозділу **^^Monster^^** чи **^^Vehicle^^**, ви можете перекинути Hit roll, ви можете перекинути Wound roll і ви можете перекинути Damage roll.",
  "Swift Onslaught":
    "Поки ця модель веде підрозділ, ви можете перекидати Charge rolls для цього підрозділу.",
  "Swooping Dive":
    "Один раз за бій ви можете обрати цей підрозділ ціллю Rapid Ingress Stratagem за 0 CP, і можете зробити це, навіть якщо вже обрали інший підрозділ ціллю цієї Stratagem цієї фази.",
  "The Warmaster":
    "У вашій Command phase оберіть одну здатність Warmaster. До початку вашої наступної Command phase ця модель має цю здатність.",
  "Twisted Defence Force":
    "Поки цей підрозділ перебуває в радіусі дії objective marker, щоразу, коли дальня атака спрямована на цей підрозділ, моделі цього підрозділу мають Benefit of Cover проти цієї атаки.",
  "Veterans of the Long War":
    "Щоразу, коли модель цього підрозділу атакує ворожий підрозділ атакою ближнього бою, перекидайте Wound roll 1. Якщо цей ворожий підрозділ перебуває в радіусі дії objective marker, ви натомість можете перекинути весь Wound roll.",
  "Warp Rift Firepower":
    "Один раз за бій, під час Shooting phase, цей підрозділ може використати цю здатність. Якщо так, до кінця фази дальня зброя, якою озброєні моделі цього підрозділу, отримує здатність [INDIRECT FIRE].",
  "Warrior Strategist": "__STRATAGEM_CP__",

  // ---- Orks ----
  "Red Skull Kommandos":
    "Поки ця модель веде підрозділ, моделі цього підрозділу мають Benefit of Cover.",
  "Kunnin’ Infiltrator":
    "Один раз за бій, у вашій Movement phase, замість того щоб здійснювати Normal move підрозділом цієї моделі, ви можете прибрати його з поля бою та знову розставити будь-де на полі бою на відстані понад 9\" по горизонталі від усіх ворожих моделей.",
  "Supreme Commander":
    "Якщо цей підрозділ є у вашій армії, його модель Ghazghkull Thraka повинна бути вашим **^^Warlord^^**.",
  "Prophet of Da Great Waaagh!":
    "Поки цей підрозділ веде підрозділ, щоразу, коли модель цього підрозділу здійснює атаку ближнього бою, додайте 1 до Hit roll і додайте 1 до Wound roll, а якщо Waaagh! активний для вашої армії, Critical Hit зараховується на успішний немодифікований Hit roll 5+.",
  "Ghazghkull’s Waaagh! Banner (Aura)":
    "Поки дружній підрозділ **^^Orks^^** перебуває в межах 12\" від Makari, якщо Waaagh! активний для вашої армії, зброя ближнього бою, якою озброєні моделі цього підрозділу, має здатність **[LETHAL HITS]**.",
  "Know-wotz":
    "Поки ця модель перебуває в межах 3\" від одного або більше дружніх підрозділів ORKS VEHICLE, ця модель має здатність Lone Operative.",
  Mekaniak:
    "Наприкінці вашої Movement phase ви можете обрати одну дружню модель ORKS VEHICLE у межах 3\" від цієї моделі. Ця модель VEHICLE відновлює до D3 втрачених wounds, і до початку вашої наступної Movement phase, щоразу, коли ця модель VEHICLE здійснює атаку, додайте 1 до Hit roll. Кожну модель можна обрати для цієї здатності лише один раз за хід.",
  "Supercharged Squig Oil":
    "Лише модель **^^Mek^^**. Щоразу, коли носій використовує свою здатність Mekaniak, до кінця ходу ви можете перекидати Charge rolls для підрозділу обраної моделі **^^Vehicle^^**.",
  "Might is Right":
    "Поки ця модель веде підрозділ, щоразу, коли модель цього підрозділу здійснює атаку ближнього бою, додайте 1 до Hit roll.",
  "Da Biggest and da Best":
    "Поки Waaagh! активний для вашої армії, додайте 4 до характеристики Attacks зброї ближнього бою цієї моделі.",
  Blitzkaptin:
    "Лише модель **^^Orks Character^^**. Після того як обидва гравці розставили свої армії, якщо підрозділ носія (або будь-який **^^Transport^^**, у якому він embarked) перебуває на полі бою, оберіть до трьох підрозділів **^^Orks Vehicle^^** з вашої армії та переставте їх. При цьому ви можете розмістити ці підрозділи в Strategic Reserves незалежно від того, скільки підрозділів уже перебуває в Strategic Reserves.",
  "Dead Brutal":
    "Поки Waaagh! активний для вашої армії, 'uge choppa цієї моделі має характеристику Damage 3.",
  "Tuff Git":
    "Лише модель **^^Orks Infantry Character^^**. Наприкінці фази, у якій підрозділ носія висадився з **^^Transport^^**, якщо цей підрозділ Battle-shocked, він більше не Battle-shocked.",
  Runtherd:
    "Щоразу, коли атака спрямована на цей підрозділ, якщо він містить одну або більше моделей Gretchin, доки цю атаку не розв'язано, моделі Runtherd цього підрозділу мають характеристику Toughness 2.",
  "Thievin’ Scavengers":
    "На початку вашої Movement phase киньте один D6 за кожну objective marker, яку ви контролюєте і в радіусі дії якої перебуває один або більше підрозділів вашої армії з цією здатністю (за винятком Battle-shocked підрозділів). Якщо один або більше з цих кидків дають 4+, ви отримуєте 1CP.",
  "Sneaky Surprise":
    "Ворожі підрозділи не можуть використовувати Fire Overwatch Stratagem, щоб стріляти по цьому підрозділу.",
  "Patrol Squad":
    "На початку Declare Battle Formations step цей підрозділ можна розділити на два підрозділи по п'ять моделей у кожному.\n(розділяючи підрозділ таким чином, зазначте, які моделі формують кожен із двох нових підрозділів. Якщо ви розділяєте підрозділ, оснащений 1 bomb squig та/або 1 distraction grot, лише один із нових підрозділів може використовувати цю здатність під час бою — зазначте, який саме).",
  "Krumpin’ Time":
    "Поки Waaagh! активний для вашої армії, моделі цього підрозділу мають здатність Feel No Pain 5+.",
  "Da Boss’ Ladz":
    "Поки модель WARBOSS веде цей підрозділ, щоразу, коли атака спрямована на цей підрозділ, якщо характеристика Strength цієї атаки більша за характеристику Toughness цього підрозділу, віднімайте 1 від Wound roll.",
  "Drive-by Dakka":
    "Щоразу, коли модель цього підрозділу здійснює дальню атаку по підрозділу в межах 9\", покращуйте характеристику Armour Penetration цієї атаки на 1.",
  "Shooty Power Trip":
    "Щоразу, коли цей підрозділ обрано для стрільби, ви можете кинути один D6:\n- На результат 1-2 цей підрозділ отримує D3 mortal wounds.\n- На результат 3-4, до кінця фази, додайте 1 до характеристики Strength дальньої зброї, якою озброєні моделі цього підрозділу.\n- На результат 5-6, до кінця фази, додайте 1 до характеристики Attacks дальньої зброї, якою озброєні моделі цього підрозділу.",
  "Clankin’ Forward":
    "Щоразу, коли ця модель здійснює Normal move, Advance move чи Fall Back move, вона може рухатися через ворожі моделі (за винятком моделей MONSTER та VEHICLE) та елементи місцевості заввишки 4\" або менше, наче їх немає.",
  "Big an’ Shooty":
    "Щоразу, коли ця модель здійснює дальню атаку, якщо Waaagh! активний для вашої армії, додайте 1 до Hit roll.",
  Morkanaut:
    "Ця модель має transport capacity 12 моделей ORKS INFANTRY (за винятком GHAZGHKULL THRAKA). Кожна модель MEGA ARMOUR або JUMP PACK займає місце 2 моделей.",
  "Damaged: 1-7 Wounds Remaining":
    "Поки в цієї моделі залишилося 1-7 wounds, віднімайте 4 від характеристики Objective Control цієї моделі, і щоразу, коли ця модель здійснює атаку, віднімайте 1 від Hit roll.",

  // ---- Ultramarines / Adeptus Astartes ----
  "Inspiring Leader":
    "Цей підрозділ має право стріляти та оголошувати Charge в хід, коли він здійснив Advance або Fell Back.",
  "Master Tactician":
    "На початку вашої Command phase, якщо модель Marneus Calgar цього підрозділу є вашим ^^**Warlord**^^ і перебуває на полі бою, ви отримуєте 1CP.",
  Narthecium:
    "Поки ця модель веде підрозділ, у вашій Command phase ви можете повернути 1 знищену модель (за винятком моделей Character) до цього підрозділу.",
  "Gene Seed Recovery":
    "Коли Bodyguard підрозділ цієї моделі знищено, киньте один D6: на результат 2+ ви отримуєте 1CP.",
  "Objective Secured":
    "Якщо наприкінці вашої Command phase ви контролюєте objective marker і цей підрозділ перебуває в радіусі її дії, ця objective marker залишається під вашим контролем, навіть якщо у вас немає моделей у її радіусі дії, доки ваш опонент не контролюватиме її на початку або в кінці будь-якого ходу.",
  "Target Elimination":
    "Щоразу, коли цей підрозділ обрано для стрільби, він може використати цю здатність. Якщо так, до кінця фази додайте 2 до характеристики Attacks bolt rifles, якими озброєні моделі цього підрозділу, і ви можете обрати лише один ворожий підрозділ ціллю всіх атак цього підрозділу",
  "Close-quarters Firepower":
    "Щоразу, коли модель цього підрозділу здійснює дальню атаку по найближчій прийнятній цілі, покращуйте характеристику Armour Penetration цієї атаки на 1.",
  "Reposition Under Covering Fire":
    "У вашій Shooting phase, після того як цей підрозділ вистрілив, якщо він містить Eliminator Sergeant, озброєного instigator bolt carbine, цей підрозділ може здійснити Normal move. Якщо так, до кінця ходу цей підрозділ не має права оголошувати Charge.",
  "Mark the Target":
    "Щоразу, коли цей підрозділ Remains Stationary, до початку вашої наступної Movement phase дальня зброя, якою озброєні моделі цього підрозділу, має здатність [DEVASTATING WOUNDS].",
  "For the Chapter!":
    "Щоразу, коли модель цього підрозділу знищується, киньте один D6: на результат 3+ не прибирайте її з гри. Знищена модель може вистрілити після того, як підрозділ атакуючої моделі завершить здійснення своїх атак, а потім прибирається з гри. При розв'язанні цих атак будь-які Hazardous tests для цієї атаки автоматично пройдено.",
  "Ballistus Strike":
    "Щоразу, коли ця модель здійснює дальню атаку по підрозділу, що не є Below Half-strength, ви можете перекинути Hit roll.",
  "Wisdom of the Ancients [Aura]":
    "Поки дружній підрозділ Adeptus Astartes Infantry перебуває в межах 6\" від цієї моделі, щоразу, коли модель цього підрозділу здійснює атаку, перекиньте Hit roll 1.",
  "Self Repair":
    "Наприкінці вашої Command phase ця модель відновлює 1 втрачений wound.",
  Transport:
    "Ця модель має transport capacity 6 моделей Adeptus Astartes Infantry. Вона не може перевозити моделі Jump Pack, Wulfen, Phobos, Gravis, Centurion, Terminator або Tacticus (за винятком моделей Tacticus Character, які починають бій attached до підрозділу, що не є Tacticus).",
  "Orbital Comms Array [Aura]":
    "Поки дружній підрозділ Adeptus Astartes перебуває в межах 6\" від носія, щоразу, коли ви обираєте цей підрозділ ціллю Stratagem, киньте один D6: на результат 5+ ви отримуєте 1CP",
};

const STRATAGEM_CP =
  "Один раз за battle round один підрозділ вашої армії з цією здатністю може використати її, коли його підрозділ обрано ціллю Stratagem. Якщо так, зменшіть CP cost цього використання цієї Stratagem на 1CP.";

// ---- Detachment rules (name -> Ukrainian body text) ----
const DETACHMENT_RULE_UK = {
  "Martial Mastery":
    "На початку battle round ви можете обрати один із пунктів нижче. Якщо ви це зробите, до початку наступного battle round діє ефект цього пункту.\n\n- Щоразу, коли модель ^^**Adeptus Custodes**^^ з вашої армії, що має здатність Martial Ka'tah, здійснює атаку ближнього бою, успішний немодифікований attack roll 5+ вважається Critical Hit.\n- Покращуйте характеристику Armour Penetration зброї ближнього бою, якою озброєні моделі ^^**Adeptus Custodes**^^ з вашої армії, що мають здатність Martial Ka'tah, на 1.",
  // Blitz Brigade lists the core Assault weapon rule as a detachment rule;
  // the text is identical to the weapon rule.
  Assault: RULE_UK.Assault,
  "Eager For The Fight":
    "Щоразу, коли підрозділ **^^Orks^^** з вашої армії висаджується з **^^Transport^^**, до кінця ходу ви можете перекидати Advance та Charge rolls для цього підрозділу **^^Orks^^**.",
  "Mastered Doctrines":
    "На початку до трьох ваших Command phases ви можете обрати одну з Combat Doctrines, наведених нижче. До початку вашої наступної Command phase ця Combat Doctrine активна, і її ефекти застосовуються до всіх підрозділів ^^**Adeptus Astartes**^^ з вашої армії. Ви не можете обрати Combat Doctrine, яку вже обирали цього бою, якщо тільки дружня модель **^^Marneus Calgar^^** не перебуває на полі бою.\n\n**DEVASTATOR DOCTRINE**\nЦей підрозділ має право стріляти в хід, коли він здійснив Advance.\n\n**TACTICAL DOCTRINE**\nЦей підрозділ має право стріляти та оголошувати Charge в хід, коли він здійснив Fell Back.\n\n**ASSAULT DOCTRINE**\nЦей підрозділ має право оголошувати Charge в хід, коли він здійснив Advance.",
  "Marks of Chaos":
    "Під час формування армії, коли ви обираєте підрозділ ^^Heretic Astartes^^ для включення до армії, якщо цей підрозділ не є ^^Epic Hero^^ і ще не має одного з наведених нижче keywords, ви повинні обрати для нього один keyword, який він отримає, і зазначити це в Army Roster: ^^Khorne, Tzeentch, Nurgle, Slaanesh, Chaos Undivided^^.\n\n\nЩоразу, коли підрозділ з одним із цих keywords отримує здатність зброї в результаті Dark Pact і не провалює відповідний Leadership test, до кінця фази цей підрозділ отримує пов'язану здатність нижче.\n\n\nОБМЕЖЕННЯ\n- Ви не можете обрати keyword ^^Khorne^^ для підрозділу ^^Psyker^^.\n- Підрозділ ^^Character^^ може бути attached до підрозділу, лише якщо обидва підрозділи мають спільний keyword зі списку нижче.\n- Підрозділ може embark у ^^Transport^^ (або починати бій embarked у ньому) лише якщо обидва ці підрозділи мають спільний keyword зі списку вище.",
  "Hallowed Ground":
    "Певні ділянки поля бою перебувають у межах Hallowed Ground вашої армії, а саме:\n\n- Ваша deployment zone завжди перебуває в межах Hallowed Ground вашої армії.\n\n- Ділянка поля бою в межах 6\" від одного або більше підрозділів **^^Purifier Squad^^** вашої армії перебуває в межах Hallowed Ground вашої армії.\n\n- На початку будь-якої фази, якщо ви контролюєте щонайменше половину objective markers у межах No Man’s Land, до кінця цієї фази No Man’s Land перебуває в межах Hallowed Ground вашої армії.\n\n- На початку будь-якої фази, якщо ви контролюєте щонайменше половину objective markers у межах deployment zone вашого опонента, до кінця цієї фази deployment zone вашого опонента перебуває в межах Hallowed Ground вашої армії.\n\nЩоразу, коли модель підрозділу **^^Grey Knights^^** з вашої армії здійснює дальню атаку по видимій цілі або здійснює атаку ближнього бою, перекиньте Hit roll 1. Якщо цей підрозділ — **^^Purifier Squad^^** та/або повністю перебуває в межах Hallowed Ground вашої армії, ви натомість можете перекинути весь Hit roll.",
};

// ---- Stratagems (name -> Ukrainian body text / phase text) ----
const STRATAGEM_TEXT_UK = {
  // Shield Host
  Multipotentiality:
    "ЦІЛЬ: Один підрозділ Adeptus Custodes з вашої армії, що здійснив Fell Back цієї фази.\n\nЕФЕКТ: До кінця вашого ходу цей підрозділ має право стріляти та оголошувати Charge в хід, коли він здійснив Fell Back.",
  "Vigilance Eternal":
    "ЦІЛЬ: Один підрозділ Adeptus Custodes Battleline з вашої армії (за винятком підрозділів Anathema Psykana) у радіусі дії objective marker, яку ви контролюєте.\n\nЕФЕКТ: Ця objective marker залишається під вашим контролем, навіть якщо у вас немає моделей у її радіусі дії, доки ваш опонент не контролюватиме її на початку або в кінці будь-якого ходу.",
  "Archeotech Munitions":
    "ЦІЛЬ: Один підрозділ ADEPTUS CUSTODES з вашої армії (за винятком підрозділів Anathema Psykana), що не був обраний для стрільби цієї фази.\n\nЕФЕКТ: Оберіть здатність [LETHAL HITS] або [SUSTAINED HITS 1]. До кінця фази дальня зброя, якою озброєні моделі вашого підрозділу, отримує обрану здатність.",
  "Arcane Genetic Alchemy":
    "ЦІЛЬ: Підрозділ цієї моделі ADEPTUS CUSTODES.\n\nЕФЕКТ: До кінця фази моделі вашого підрозділу мають здатність Feel No Pain 4+ проти mortal wounds.",
  "Unwavering Sentinels":
    "ЦІЛЬ: Один підрозділ Adeptus Custodes Infantry з вашої армії (за винятком підрозділів Anathema Psykana), що перебуває в радіусі дії objective marker, яку ви контролюєте, і що був обраний ціллю однієї або більше атак атакуючого підрозділу.\n\nЕФЕКТ: До кінця фази щоразу, коли атака ближнього бою спрямована на ваш підрозділ, віднімайте 1 від Hit roll.",
  "Avenge the Fallen":
    "ЦІЛЬ: Один підрозділ ADEPTUS CUSTODES з вашої армії (за винятком підрозділів Anathema Psykana), що перебуває нижче своєї Starting Strength.\n\nЕФЕКТ: До кінця фази додайте 1 до характеристики Attacks зброї ближнього бою, якою озброєні моделі цього підрозділу. Якщо ваш підрозділ Below Half-strength, до кінця фази натомість додайте 2 до характеристики Attacks цієї зброї ближнього бою.",
  // Warpbane Task Force
  "Hallowed Beacon":
    "ЦІЛЬ: Один підрозділ Grey Knights Infantry (за винятком підрозділів Terminator), що прибуває за допомогою здатності Deep Strike цієї фази.\n\nЕФЕКТ: Розставте свій підрозділ повністю в межах Hallowed Ground вашої армії та на відстані понад 6\" по горизонталі від усіх ворожих підрозділів.",
  "Repelling Sphere":
    "ЦІЛЬ: Один підрозділ Grey Knights Infantry з вашої армії.\n\nЕФЕКТ: До кінця фази щоразу, коли ворожий підрозділ оголошує charge і ваш підрозділ є однією з цілей цього charge, віднімайте 1 від Charge roll, або натомість віднімайте 2, якщо ваш підрозділ повністю перебуває в межах Hallowed Ground вашої армії.",
  "Fires of Covenant":
    "ЦІЛЬ: Один підрозділ Grey Knights Infantry з вашої армії.\n\nЕФЕКТ: До кінця фази щоразу, коли ворожий підрозділ розставляється або завершує Normal move, Advance move чи Fall Back move в межах 6\" від вашого підрозділу, киньте один D6, додаючи 2 до результату, якщо ваш підрозділ повністю перебуває в межах Hallowed Ground вашої армії: на результат 4+ цей ворожий підрозділ отримує D3 mortal wounds.",
  "Aegis Eternal":
    "ЦІЛЬ: Один підрозділ Grey Knights Infantry з вашої армії, що був обраний ціллю однієї або більше атак атакуючого підрозділу.\n\nЕФЕКТ: До кінця фази моделі вашого підрозділу, що повністю перебувають у межах вашого Hallowed Ground, мають 4+ invulnerable save.",
  "Flames of Sanctity":
    "ЦІЛЬ: Один підрозділ Purifier Squad з вашої армії, що мав право на бій цієї фази.\n\nЕФЕКТ: Киньте один D6 за кожен ворожий підрозділ у межах 6\" від вашого підрозділу, додаючи 1 до результату, якщо ваш підрозділ включає Castellan Crowe: на результат 4+ цей ворожий підрозділ отримує D3 mortal wounds.",
  "Sanctified Kill Zone":
    "ЦІЛЬ: Один підрозділ GREY KNIGHTS з вашої армії, що не був обраний для стрільби чи бою цієї фази і повністю перебуває в межах Hallowed Ground вашої армії.\n\nЕФЕКТ: До кінця фази щоразу, коли модель вашого підрозділу здійснює атаку, перекиньте Wound roll 1, або натомість перекиньте весь Wound roll, якщо ваш підрозділ — Purifier Squad.",
  // Pactbound Zealots
  Skinshift:
    "ЦІЛЬ: Один підрозділ HERETIC ASTARTES з вашої армії.\n\nЕФЕКТ: Одна модель вашого підрозділу відновлює до 3 втрачених wounds. Крім того, якщо ваш підрозділ — Tzeentch і перебуває нижче своєї Starting Strength, одна знищена модель (за винятком моделей Character) повертається до вашого підрозділу з повною кількістю wounds.",
  "Torpefying Refrain":
    "ЦІЛЬ: Один підрозділ HERETIC ASTARTES з вашої армії.\n\nЕФЕКТ: До кінця ходу ваш підрозділ має право оголошувати Charge в хід, коли він здійснив Fell Back. Якщо ваш підрозділ — Slaanesh, до кінця ходу він має право стріляти та оголошувати Charge в хід, коли він здійснив Advance або Fell Back.",
  "Festering Miasma":
    "ЦІЛЬ: Один підрозділ HERETIC ASTARTES з вашої армії, що був обраний ціллю однієї або більше атак атакуючого підрозділу.\n\nЕФЕКТ: До кінця фази ваш підрозділ має здатність Stealth. Крім того, якщо ваш підрозділ — Nurgle, його можна обрати ціллю дальньої атаки лише якщо атакуюча модель перебуває в межах 18\".",
  "Eye of the Gods":
    "ЦІЛЬ: Одна модель HERETIC ASTARTES CHARACTER у цьому підрозділі.\n\nЕФЕКТ: До кінця бою додайте 1 до характеристик Move, Toughness і Wounds цієї моделі CHARACTER, а також додайте 1 до характеристик Attacks, Strength і Damage зброї ближнього бою цієї моделі CHARACTER.",
  "Eternal Hate":
    "ЦІЛЬ: Один підрозділ HERETIC ASTARTES з вашої армії, що був обраний ціллю однієї або більше атак атакуючого підрозділу.\n\nЕФЕКТ: До кінця фази щоразу, коли модель вашого підрозділу знищується, якщо ця модель ще не билася цієї фази, киньте один D6, додаючи 1 до результату, якщо це підрозділ Khorne: на результат 4+ не прибирайте її з гри. Ця знищена модель може вступити в бій після того, як підрозділ атакуючої моделі завершить розв'язання своїх атак, а потім прибирається з гри.",
  "Profane Zeal":
    "ЦІЛЬ: Один підрозділ Heretic Astartes Chaos Undivided з вашої армії, що не був обраний для стрільби чи бою цієї фази.\n\nЕФЕКТ: До кінця фази щоразу, коли модель вашого підрозділу здійснює атаку, ви можете перекинути Wound roll.",
  // Blade of Ultramar
  "Courage And Honour!":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES з вашої армії.\n\nЕФЕКТ: До кінця фази зброя ближнього бою, якою озброєні моделі вашого підрозділу, має здатність [LANCE]. Якщо ваш підрозділ перебуває під дією Assault Doctrine, до кінця фази також покращуйте характеристику Armour Penetration такої зброї на 1.",
  "Exemplary Vigilance":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES з вашої армії, що не був обраний для стрільби цієї фази.\n\nЕФЕКТ: До кінця фази дальня зброя, якою озброєні моделі вашого підрозділу, має здатність [IGNORES COVER]. Якщо ваш підрозділ перебуває під дією Devastator Doctrine, до кінця фази також покращуйте характеристику Armour Penetration такої зброї на 1.",
  "Armour Of Contempt":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES з вашої армії, що був обраний ціллю однієї або більше атак атакуючого підрозділу.\n\nЕФЕКТ: Доки атакуючий підрозділ не завершить здійснення своїх атак, щоразу, коли атака спрямована на ваш підрозділ, погіршуйте характеристику Armour Penetration цієї атаки на 1.",
  "Tactical Foresight":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES з вашої армії, що був обраний ціллю однієї або більше атак атакуючого підрозділу.\n\nЕФЕКТ: До кінця фази щоразу, коли атака спрямована на ваш підрозділ, якщо характеристика Strength цієї атаки більша або дорівнює характеристиці Toughness цього підрозділу, віднімайте 1 від Wound roll.",
  "Practical Tactics":
    "ЦІЛЬ: Один підрозділ Adeptus Astartes Infantry або Adeptus Astartes Mounted з вашої армії, що не перебуває в межах Engagement Range одного або більше ворожих підрозділів і перебуває в межах 9\" від ворожого підрозділу, який щойно завершив цей рух.\n\nЕФЕКТ: Ваш підрозділ може здійснити Normal move до D6\", або натомість Normal move до 6\", якщо він перебуває під дією Tactical Doctrine.",
  "Ultramarian Adaptivity":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES з вашої армії.\n\nЕФЕКТ: Оберіть Devastator Doctrine, Tactical Doctrine або Assault Doctrine. До початку вашої наступної Command phase ця Combat Doctrine активна для вашого підрозділу замість будь-якої іншої Combat Doctrine, активної для вашої армії, навіть якщо ви вже обирали цю Combat Doctrine цього бою.",
  // Blitz Brigade
  "Armoured Duellists":
    "ЦІЛЬ: Один підрозділ Orks Vehicle з вашої армії, що не був обраний для стрільби цієї фази.\n\nЕФЕКТ: До кінця фази щоразу, коли ваш підрозділ здійснює атаку по підрозділу MONSTER або VEHICLE, додайте 1 до Hit roll і додайте 1 до Wound roll.",
  "Mount Up, Ladz":
    "ЦІЛЬ: Один підрозділ Orks Infantry з вашої армії, що не перебуває в межах Engagement Range одного або більше ворожих підрозділів, і один дружній Transport, у який він може embark.\n\nЕФЕКТ: Якщо ваш підрозділ ORKS INFANTRY повністю перебуває в межах 6\" від цього TRANSPORT, він може embark у нього.",
  "Yooz In Trouble Now":
    "ЦІЛЬ: Одна модель Battlewagon, Hunta Rig або Kill Rig з вашої армії, уражена однією або більше атак атакуючого підрозділу.\n\nЕФЕКТ: Один підрозділ Orks Infantry, embarked у вашій моделі, може висадитися та здійснити Surge move. Для цього киньте один D6: моделі цього підрозділу рухаються на відстань у дюймах, що не перевищує цей результат, але цей підрозділ повинен завершити рух якомога ближче до найближчого ворожого підрозділу (за винятком AIRCRAFT). При цьому ці моделі можна переміщати в межі Engagement Range цього ворожого підрозділу.",
  "Run 'em Down":
    "ЦІЛЬ: Один підрозділ Battlewagon, Kill Rig або Hunta Rig з вашої армії, що не був обраний для руху цієї фази.\n\nЕФЕКТ: Оберіть до двох інших дружніх підрозділів Orks Vehicle або Orks Monster у межах 6\" від вашого підрозділу. До кінця ходу ваш підрозділ і кожен обраний підрозділ мають право оголошувати Charge в хід, коли вони здійснили Advance.",
  "Mekanised Brutality":
    "ЦІЛЬ: Один підрозділ Battlewagon, Kill Rig або Hunta Rig з вашої армії, що не був обраний для руху цієї фази.\n\nЕФЕКТ: До кінця ходу щоразу, коли підрозділ висаджується з вашого підрозділу після того, як ваш підрозділ здійснив Normal move, цей підрозділ, що висадився, все одно має право оголосити Charge цього ходу.",
  Impervious:
    "ЦІЛЬ: Один підрозділ Battlewagon, Kill Rig або Hunta Rig з вашої армії, що був обраний ціллю однієї або більше атак атакуючого підрозділу.\n\nЕФЕКТ: До кінця фази щоразу, коли атака спрямована на ваш підрозділ, якщо характеристика Strength цієї атаки більша за характеристику Toughness вашого підрозділу, віднімайте 1 від Wound roll.",
  // Core stratagems
  "Insane Bravery":
    "ЦІЛЬ: Цей підрозділ з вашої армії.\n\nЕФЕКТ: Ваш підрозділ автоматично проходить цей Battle-shock test.\n\nОБМЕЖЕННЯ: Ви не можете використати цю Stratagem більше одного разу за бій.",
  "Heroic Intervention":
    "ЦІЛЬ: Один підрозділ з вашої армії, що перебуває в межах 6\" від цього ворожого підрозділу і мав би право оголосити charge проти цього ворожого підрозділу, якби це була ваша Charge phase.\n\nЕФЕКТ: Ваш підрозділ негайно оголошує charge, ціллю якого є лише цей ворожий підрозділ, і ви розв'язуєте цей charge, наче це ваша Charge phase.\n\nОБМЕЖЕННЯ: Ви можете обрати підрозділ VEHICLE з вашої армії, лише якщо це WALKER. Зверніть увагу, що навіть якщо цей charge успішний, ваш підрозділ не отримує жодного Charge bonus цього ходу.",
  "Fire Overwatch":
    "ЦІЛЬ: Один підрозділ з вашої армії, що перебуває в межах 24\" від цього ворожого підрозділу і мав би право стріляти, якби це була ваша Shooting phase.\n\nЕФЕКТ: Якщо цей ворожий підрозділ видимий вашому підрозділу, ваш підрозділ може вистрілити по ньому, наче це ваша Shooting phase.\n\nОБМЕЖЕННЯ: Ви не можете обрати ціллю цієї Stratagem підрозділ TITANIC. До кінця фази щоразу, коли модель вашого підрозділу здійснює дальню атаку, для влучання потрібен немодифікований Hit roll 6, незалежно від Ballistic Skill атакуючої зброї чи будь-яких модифікаторів. Ви можете використати цю Stratagem лише один раз за хід.",
  "Rapid Ingress":
    "ЦІЛЬ: Один підрозділ з вашої армії, що перебуває в Reserves.\n\nЕФЕКТ: Ваш підрозділ може прибути на поле бою, наче це Reinforcements step вашої Movement phase, і якщо кожна модель цього підрозділу має здатність Deep Strike, ви можете розставити цей підрозділ, як описано в здатності Deep Strike (навіть якщо це не ваша Movement phase).\n\nОБМЕЖЕННЯ: Ви не можете використати цю Stratagem, щоб дозволити підрозділу прибути на поле бою в battle round, у якому він зазвичай не мав би права це зробити.",
  "Go to Ground":
    "ЦІЛЬ: Один підрозділ INFANTRY з вашої армії, що був обраний ціллю однієї або більше атак атакуючого підрозділу.\n\nЕФЕКТ: До кінця фази всі моделі вашого підрозділу мають 6+ invulnerable save та Benefit of Cover.",
  "Command Re-roll":
    "ЦІЛЬ: Цей підрозділ або модель з вашої армії.\n\nЕФЕКТ: Ви перекидаєте цей roll, test чи saving throw. Якщо ви використовуєте fast dice rolling, оберіть один із цих rolls чи saving throws для перекидання.",
  "Counter-offensive":
    "ЦІЛЬ: Один підрозділ з вашої армії, що перебуває в межах Engagement Range одного або більше ворожих підрозділів і ще не був обраний для бою цієї фази.\n\nЕФЕКТ: Ваш підрозділ вступає в бій наступним.",
};

const STRATAGEM_PHASE_UK = {
  // Shield Host
  "Your Movement phase": "Ваша Movement phase",
  "Your Shooting phase": "Ваша Shooting phase",
  "Fight phase, just after an enemy unit has selected its targets":
    "Fight phase, одразу після того, як ворожий підрозділ обрав свої цілі",
  "Start of the Fight phase": "Початок Fight phase",
  // Pactbound Zealots / shared "Any phase..." variants are unique enough per name below.
  // Warpbane Task Force
  "Reinforcements step of your Movement phase": "Reinforcements step вашої Movement phase",
  "Start of your opponent's Charge phase": "Початок Charge phase вашого опонента",
  "Start of your opponent's Movement phase": "Початок Movement phase вашого опонента",
  "Your opponent's Shooting phase, just after an enemy unit has selected its targets":
    "Shooting phase вашого опонента, одразу після того, як ворожий підрозділ обрав свої цілі",
  "End of the Fight phase": "Кінець Fight phase",
  "Your Shooting phase or the Fight phase": "Ваша Shooting phase або Fight phase",
  // Pactbound Zealots
  "Your Command phase": "Ваша Command phase",
  "Any phase, just after a mortal wound has been allocated to an Adeptus Custodes model from your army (excluding Anathema Psykana models)":
    "Будь-яка фаза, одразу після того, як mortal wound було розподілено на модель Adeptus Custodes з вашої армії (за винятком моделей Anathema Psykana)",
  "Fight phase, just after a HERETIC ASTARTES CHARACTER unit from your army (excluding DAMNED, DAEMON and EPIC HERO units) destroys an enemy unit":
    "Fight phase, одразу після того, як підрозділ HERETIC ASTARTES CHARACTER з вашої армії (за винятком підрозділів DAMNED, DAEMON та EPIC HERO) знищує ворожий підрозділ",
  // Core stratagems
  "Battle-shock step of your Command phase, just before you take a Battle-shock test for a unit from your army":
    "Battle-shock step вашої Command phase, безпосередньо перед тим, як ви проходите Battle-shock test для підрозділу з вашої армії",
  "Your opponent's Charge phase, just after an enemy unit ends a Charge move":
    "Charge phase вашого опонента, одразу після того, як ворожий підрозділ завершує Charge move",
  "Your opponent's Movement or Charge phase, just after an enemy unit is set up or when an enemy unit starts or ends a Normal, Advance or Fall Back move, or declares a charge":
    "Movement phase чи Charge phase вашого опонента, одразу після того, як ворожий підрозділ розставлено, або коли ворожий підрозділ починає чи завершує Normal move, Advance move чи Fall Back move, або оголошує charge",
  "End of your opponent's Movement phase": "Кінець Movement phase вашого опонента",
  "Your opponent's Shooting phase, just after an enemy unit has selected its targets ":
    "Shooting phase вашого опонента, одразу після того, як ворожий підрозділ обрав свої цілі",
  "Any phase, just after you make an Advance roll, a Charge roll, a Desperate Escape test or a Hazardous test for a unit from your army, or a Hit roll, a Wound roll, a Damage roll or a saving throw for a model in that unit, or a roll to determine the number of attacks made with a weapon equipped by a model in that unit":
    "Будь-яка фаза, одразу після того, як ви здійснили Advance roll, Charge roll, Desperate Escape test чи Hazardous test для підрозділу з вашої армії, або Hit roll, Wound roll, Damage roll чи saving throw для моделі цього підрозділу, або roll для визначення кількості атак зброєю, якою озброєна модель цього підрозділу",
  "Fight phase, just after an enemy unit has fought": "Fight phase, одразу після того, як ворожий підрозділ завершив бій",
  // Blade of Ultramar / Blitz Brigade
  "Fight phase": "Fight phase",
  "Your opponent's Shooting phase or the Fight phase, just after an enemy unit has selected its targets":
    "Shooting phase вашого опонента або Fight phase, одразу після того, як ворожий підрозділ обрав свої цілі",
  "Your opponent's Movement phase, just after an enemy unit ends a Normal, Advance or Fall Back move":
    "Movement phase вашого опонента, одразу після того, як ворожий підрозділ завершує Normal move, Advance move чи Fall Back move",
  "Your opponent's Shooting phase, just after an enemy unit has shot":
    "Shooting phase вашого опонента, одразу після того, як ворожий підрозділ вистрілив",
};

// ---- Unit keyword glossary (keyword -> Ukrainian text). Keyword names
// themselves are never translated; only this definition text is. ----
const KEYWORD_GLOSSARY_UK = {
  Infantry:
    "Піші війська. Моделі Infantry можуть рухатися крізь стіни Ruins і належать до небагатьох типів підрозділів, які можуть займати їхні верхні поверхи. Більшість transport capacities, а також багато stratagems і здатностей застосовуються лише до підрозділів Infantry.",
  Character:
    "Герой, який може вести інші підрозділи. Character зі здатністю Leader може бути attached до Bodyguard підрозділу; поки він attached, атаки не можуть його виокремити, якщо тільки атакуючий не має Precision або всі моделі Bodyguard не знищені. Зазвичай лише моделі Character можуть отримувати Enhancements або бути вашим Warlord.",
  "Epic Hero":
    "Іменний унікальний персонаж. До армії можна включити лише одного кожного Epic Hero, і Epic Heroes не можуть отримувати Enhancements.",
  Vehicle:
    "Танк, крокуюча машина чи інша бойова машина. Vehicles можуть стріляти, перебуваючи в межах Engagement Range ворожих підрозділів (Big Guns Never Tire), з -1 до влучання зброєю, окрім Pistols, і не можуть завершувати рух на верхніх поверхах Ruins. Багато stratagems і здатностей або виокремлюють, або виключають Vehicles.",
  Walker:
    "Vehicle, що пересувається на ногах. Walkers можуть рухатися крізь стіни Ruins, як Infantry, і це єдині Vehicles, які можуть використовувати stratagem Heroic Intervention.",
  Monster:
    "Велике створіння. Як і Vehicles, Monsters можуть стріляти, перебуваючи в межах Engagement Range ворожих підрозділів (Big Guns Never Tire), і не можуть завершувати рух на верхніх поверхах Ruins. Багато stratagems і здатностей або виокремлюють, або виключають Monsters.",
  Mounted:
    "Кавалерія та байкери. Підрозділи Mounted не можуть завершувати рух на верхніх поверхах Ruins, а transport capacities зазвичай їх виключають.",
  Battleline:
    "Основний бойовий вибір. Підрозділи Battleline можна брати до шести разів в армії розміру Strike Force замість трьох, і багато місій, detachment rules і stratagems виокремлюють їх, зазвичай при утриманні objectives.",
  Transport:
    "Підрозділ, що може перевозити інші підрозділи. Його transport capacity вказує, які моделі можуть embark. Embarked підрозділи не можуть бути ціллю, а також не можуть рухатися чи стріляти, якщо правила Transport цього не дозволяють (наприклад, Firing Deck). Якщо Transport знищено, його пасажири висаджуються, і за кожну модель потрібно кинути D6: на результат 1 її знищено.",
  "Dedicated Transport":
    "Transport, який береться разом із підрозділами, що він перевозить: за кожен підрозділ Infantry у вашій армії ви можете включити один Dedicated Transport понад звичайні обмеження на datasheets.",
  Psyker:
    "Модель, здатна проявляти псионічні сили. Psykers можуть використовувати зброю та здатності Psychic і зазнають Perils of the Warp, якщо Hazardous псионічна зброя дає осічку. Зброя та здатності Anti-Psyker виокремлюють їх.",
  Grenades:
    "Підрозділ може використовувати stratagem Grenade: у вашій Shooting phase один підрозділ Grenades, що не перебуває в межах Engagement Range ворожих підрозділів, може кинути гранати у видимий ворожий підрозділ у межах 8\", кинувши шість D6 і завдаючи 1 mortal wound за кожен результат 4+.",
  Fly:
    "Підрозділ може літати. Під час руху він може перелітати через інші моделі та місцевість, вимірюючи відстань по полю бою, а не вгору та вниз, хоча не може завершити рух на інших моделях. Зброя Anti-Fly виокремлює підрозділи, які можуть літати.",
  Smoke:
    "Підрозділ може використовувати stratagem Smokescreen: у Shooting phase вашого опонента, коли його обрано ціллю, він отримує Benefit of Cover і здатність Stealth до кінця фази.",
  Titanic:
    "Найбільші бойові машини. Підрозділи Titanic не можна обрати для Fire Overwatch, і їх виключено з багатьох stratagems і здатностей, що впливають на звичайні Vehicles і Monsters.",
  Towering:
    "Модель настільки висока, що Ruins не блокують лінію видимості до неї та від неї: модель Towering може стріляти понад Ruins, і по ній можна стріляти понад ними.",
  Terminator:
    "У броні Tactical Dreadnought. Підрозділи Terminator зазвичай мають Deep Strike, а transport capacities, а також кілька stratagems і здатностей розглядають їх окремо від іншої Infantry.",
  "Jump Pack":
    "Оснащений реактивним ранцем. Підрозділи Jump Pack зазвичай мають Fly і Deep Strike та займають більше місця в Transports або виключені з них.",
  "Mega Armour":
    "Оркська mega armour. Модель Mega Armour займає місце 2 моделей у Transport.",
  Gravis:
    "Броня Gravis Space Marines. Transport capacities та деякі здатності посилаються на неї; моделі Gravis не можуть embark у Rhino.",
  Phobos:
    "Броня Phobos Space Marines, яку носять розвідувальні підрозділи. Transport capacities та деякі здатності посилаються на неї; моделі Phobos не можуть embark у Rhino.",
  Tacticus:
    "Броня Tacticus Space Marines, яку носить більшість піхоти Primaris. Transport capacities та деякі здатності посилаються на неї.",
  Daemon:
    "Демонічний підрозділ. Кілька stratagems і здатностей виключають або виокремлюють підрозділи Daemon.",
  "Allied Units":
    "Підрозділ, узятий як союзник з іншої фракції, наприклад Armigers Imperial Knights в армії Imperium. Союзні підрозділи не отримують переваг detachment rule вашої армії, не можуть отримувати Enhancements і не можуть бути вашим Warlord.",
  Imperium:
    "Faction keyword, спільний для всіх армій Імперіуму Людства (Space Marines, Adeptus Custodes, Grey Knights та інших). Правила, що посилаються на підрозділ Imperium, застосовуються до всіх них, і він визначає, які союзні підрозділи можна включати.",
  Chaos:
    "Faction keyword, спільний для всіх армій Хаосу (Heretic Astartes, Chaos Daemons, Chaos Knights та інших). Правила, що посилаються на підрозділ Chaos, застосовуються до всіх них, і він визначає, які союзні підрозділи можна включати.",
};

// New Recruit title-cases stratagem names on export ("Eye of the Gods" ->
// "Eye Of The Gods"), so look names up case-insensitively rather than
// chasing the casing in every table.
function byNameCI(table) {
  const lower = new Map(Object.entries(table).map(([k, v]) => [k.toLowerCase(), v]));
  return (name) => table[name] ?? lower.get(String(name).toLowerCase());
}
const detachmentRuleUK = byNameCI(DETACHMENT_RULE_UK);
const stratagemTextUK = byNameCI(STRATAGEM_TEXT_UK);
const stratagemPhaseByNameUK = byNameCI(STRATAGEM_PHASE_UK);

// Some roster exports carry stray non-breaking spaces (U+00A0) inside
// ability/rule text — normalize before using text as a dictionary key,
// matching the same normalization applied at runtime in src/lib/i18n.tsx.
const NBSP = String.fromCharCode(160);
function normalize(s) {
  return s.split(NBSP).join(" ");
}

// ---- Build the final dictionary using EXACT text extracted from the real
// rosters as keys, so there is zero risk of hand-transcription drift. ----
const dict = {};
const missing = [];
function reportMissing(kind, key, name, text) {
  missing.push({ kind, key, name, text });
  console.error(`MISSING ${kind} TRANSLATION:`, key ?? name, "|", text.slice(0, 60));
}

for (const [name, texts] of ruleTexts) {
  for (const rawText of texts) {
    const text = normalize(rawText);
    let uk = RULE_UK[name];
    if (uk === "__DEADLY_DEMISE__") uk = DEADLY_DEMISE;
    if (uk === "__FEEL_NO_PAIN__") uk = FEEL_NO_PAIN;
    if (uk === "__LEADER__") {
      const variant = LEADER_VARIANTS.find(([snippet]) => text.includes(snippet));
      uk = variant?.[1];
    }
    if (!uk) {
      console.error("MISSING RULE TRANSLATION:", name, "|", text.slice(0, 60));
      continue;
    }
    dict[text] = uk;
  }
}

for (const [name, texts] of abilityTexts) {
  for (const rawText of texts) {
    const text = normalize(rawText);
    let uk = ABILITY_UK[name] ?? ABILITY_UK[text];
    if (uk === "__STRATAGEM_CP__") uk = STRATAGEM_CP;
    if (name.startsWith("Invulnerable Save") || name === "Leader") {
      const variants = name === "Leader" ? LEADER_VARIANTS : INVULN_VARIANTS;
      const variant = variants.find(([snippet]) => text.includes(snippet));
      uk = variant?.[1];
    }
    if (name === "Feel No Pain") continue; // "5+" only, nothing to translate
    if (!uk) {
      console.error("MISSING ABILITY TRANSLATION:", JSON.stringify(name), "|", text.slice(0, 60));
      continue;
    }
    dict[text] = uk;
  }
}

for (const [key, { name, text: rawText }] of detachmentRuleByKey) {
  const text = normalize(rawText);
  const uk =
    RULE_KEY_UK[key] ??
    (detachmentRuleTexts.get(name).size === 1 ? detachmentRuleUK(name) : undefined);
  if (!uk) {
    reportMissing("DETACHMENT RULE", key, name, text);
    continue;
  }
  dict[text] = uk;
}

for (const [key, { name, text: rawText }] of stratagemByKey) {
  if (!rawText) continue;
  const text = normalize(rawText);
  const uk =
    STRATAGEM_KEY_UK[key] ??
    (stratagemTexts.get(name).size === 1 ? stratagemTextUK(name) : undefined);
  if (!uk) {
    reportMissing("STRATAGEM TEXT", key, name, text);
    continue;
  }
  dict[text] = uk;
}

for (const [key, { name, phase: rawPhase }] of stratagemByKey) {
  if (!rawPhase) continue;
  const phase = normalize(rawPhase);
  if (dict[phase]) continue;
  const uk =
    STRATAGEM_PHASE_UK[phase] ??
    PHASE_TEXT_UK[phase] ??
    (stratagemPhases.get(name).size === 1 ? stratagemPhaseByNameUK(name) : undefined);
  if (!uk) {
    reportMissing("STRATAGEM PHASE", key, name, phase);
    continue;
  }
  dict[phase] = uk;
}

for (const [keyword, rawText] of Object.entries(keywordGlossary)) {
  const text = normalize(rawText);
  const uk = KEYWORD_GLOSSARY_UK[keyword];
  if (!uk) {
    console.error("MISSING KEYWORD GLOSSARY TRANSLATION:", keyword, "|", text.slice(0, 60));
    continue;
  }
  dict[text] = uk;
}

// ---- Emit the final uk.ts source ----
function tsString(s) {
  return JSON.stringify(s);
}

const lines = [];
lines.push(`/**
 * English -> Ukrainian dictionary for roster-derived ability/rule *text*,
 * plus detachment-rule and stratagem body/phase text.
 *
 * Ability, rule, detachment-rule and stratagem NAMES are never translated
 * (see .claude/skills/translate-army) — this dictionary only ever holds
 * body-text entries. Within that text, specific 40k rules terms
 * (characteristic names, roll/test names, phase names, named actions like
 * Deep Strike/Advance/Charge, unit-type keywords like
 * Character/Vehicle/Monster) are deliberately left in English too, so the
 * term stays recognizable — only the surrounding Ukrainian sentence
 * structure is translated. Bracketed ability tags (e.g. **[RAPID FIRE X]**)
 * are always left untouched.
 *
 * Keyed by the exact source string. Lookup always falls back to the
 * English original when a key is missing, so an untranslated string never
 * breaks or renders blank.
 *
 * Generated by .claude/skills/translate-army/generate-dictionary.mjs from
 * the armies/*.json rosters plus src/data/detachments/*.ts and
 * src/data/core-stratagems.ts and the unit keyword glossary in
 * src/data/keyword-glossary.ts — see .claude/skills/translate-army/SKILL.md
 * for how to regenerate/extend this file (never hand-edit it directly).
 */
export const uk: Record<string, string> = {`);

const entries = Object.entries(dict).sort(([a], [b]) => a.localeCompare(b));
for (const [en, ukText] of entries) {
  lines.push(`  ${tsString(en)}:\n    ${tsString(ukText)},`);
}
lines.push("};");
lines.push("");

fs.writeFileSync("src/i18n/uk.ts", lines.join("\n"), "utf8");
console.log(`Wrote ${entries.length} entries to src/i18n/uk.ts`);

const reportAt = process.argv.indexOf("--report");
if (reportAt !== -1 && process.argv[reportAt + 1]) {
  fs.writeFileSync(process.argv[reportAt + 1], JSON.stringify(missing, null, 1), "utf8");
  console.log(`Reported ${missing.length} missing item(s) to ${process.argv[reportAt + 1]}`);
}
