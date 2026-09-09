// Ukrainian for Space Marine / Ultramarines detachments (part 2). Keys are "<detachment file stem>/<name>".
export const RULES = {
  "ironstorm-spearhead/Armoured Wrath":
    "Раз за фазу для кожного підрозділу ^^**Adeptus Astartes^^** з вашої армії ви можете перекинути один Hit roll, один Wound roll або один Damage roll, зроблений для моделі цього підрозділу.",
  "librarius-conclave/Psychic Disciplines":
    "На початку battle round оберіть одну з наведених нижче Psychic Disciplines. До кінця battle round ця Psychic Discipline активна, і її ефекти застосовуються до всіх підрозділів ^^**Adeptus Astartes Psyker**^^ з вашої армії. \n\n\nBiomancy Discipline\nДодайте 2\" до характеристики Move моделей цього підрозділу. \n\n\nDivination Discipline\nЩоразу, коли модель цього підрозділу здійснює атаку, перекиньте Hit roll 1 та перекиньте Wound roll 1.\n\n\nPyromancy Discipline\nЩоразу, коли дальня атака, здійснена моделлю цього підрозділу, спрямована на ворожий підрозділ у межах 12\", покращуйте характеристику Armour Penetration цієї атаки на 1.\n\n\nTelekinesis Discipline\nЩоразу, коли дальня атака спрямована на цей підрозділ, віднімайте 1 від характеристики Strength цієї атаки.\n\n\nTelepathy Discipline\n\nЩоразу, коли модель цього підрозділу здійснює атаку, ви можете ігнорувати будь-які або всі модифікатори характеристик Weapon Skill чи Ballistic Skill цієї атаки та/або будь-які або всі модифікатори Hit roll.",
  "orbital-assault-force/Rapid-drop Deployment":
    "На початку Declare Battle Formations step оберіть кількість підрозділів ^^**Adeptus Astartes^^** (за винятком підрозділів ^^**Titanic^^**) з вашої армії залежно від розміру бою, як показано нижче. Моделі цих підрозділів мають здатність Deep Strike.\n\nIncursion - 2 підрозділи\nStrike Force - 3 підрозділи\nOnslaught - 4 підрозділи\n\nЩоразу, коли модель ^^**Adeptus Astartes^^** з вашої армії здійснює атаку, якщо її було розставлено на полі бою цього ходу, перекиньте Wound roll 1. Якщо вона висадилася з Drop Pod цього ходу, також перекиньте Hit roll 1.",
  "reclamation-force/Oath of Reclamation":
    "- Щоразу, коли модель ^^**Adeptus Astartes^^** з вашої армії здійснює атаку ближнього бою, спрямовану на підрозділ у радіусі дії\nobjective marker, покращуйте характеристику Armour Penetration цієї атаки на 1.\n\n- Щоразу, коли атака спрямована на підрозділ ^^**Adeptus Astartes^^** з вашої армії, якщо ваш підрозділ перебуває в радіусі дії objective\nmarker, яку ви контролювали на початку фази, і якщо характеристика Strength цієї атаки більша\nза характеристику Toughness вашого підрозділу або ваш підрозділ має keyword ^^**Titus^^**, віднімайте 1 від Wound roll.",
  "stormlance-task-force/Lightning Assault":
    "Підрозділи ^^**Adeptus Astartes**^^ з вашої армії мають право оголошувати Charge в хід, коли вони здійснили Advance або Fell Back.",
  "vanguard-spearhead/Shadow Masters":
    "Щоразу, коли дальня атака спрямована на підрозділ ^^**Adeptus Astartes**^^ з вашої армії, якщо атакуюча модель не перебуває в межах 12\", віднімайте 1 від Hit roll, а ціль має Benefit of Cover проти цієї атаки.",
};
export const STRATAGEMS = {
  // Ironstorm Spearhead
  "ironstorm-spearhead/Mercy Is Weakness":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES з вашої армії, що не був обраний для стрільби чи бою цієї фази.\n\nЕФЕКТ: До кінця фази щоразу, коли модель вашого підрозділу здійснює атаку, спрямовану на підрозділ, що перебуває нижче своєї Starting Strength, ця атака має здатність [SUSTAINED HITS 1], а під час здійснення такої атаки, якщо атакуюча модель — VEHICLE, успішний немодифікований Hit roll 5+ вважається Critical Hit.",
  "ironstorm-spearhead/Unbowed Conviction":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES з вашої армії, що перебуває нижче своєї Starting Strength.\n\nЕФЕКТ: До кінця ходу ваш підрозділ може ігнорувати будь-які або всі модифікатори своїх характеристик та/або будь-яких rolls чи tests, зроблених для нього (за винятком модифікаторів saving throws).",
  "ironstorm-spearhead/Power Of The Machine Spirit":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES VEHICLE з вашої армії, що став Below Half-strength у результаті атак атакуючого підрозділу.\n\nЕФЕКТ: Ваш підрозділ може стріляти, наче це ваша Shooting phase, але при цьому має обирати ціллю лише цей ворожий підрозділ і може зробити це, лише якщо цей ворожий підрозділ є прийнятною ціллю.",
  "ironstorm-spearhead/Ancient Fury":
    "ЦІЛЬ: Одна модель ADEPTUS ASTARTES WALKER з вашої армії.\n\nЕФЕКТ: До початку вашої наступної Command phase покращуйте характеристики Move, Toughness, Leadership та Objective Control вашої моделі на 1, і щоразу, коли ваша модель здійснює атаку, додавайте 1 до Hit roll.",
  "ironstorm-spearhead/Vengeful Animus":
    "ЦІЛЬ: Ця модель ADEPTUS ASTARTES VEHICLE. Ви можете використати цю Stratagem на цій моделі, навіть якщо її щойно знищено.\n\nЕФЕКТ: Не кидайте один D6, щоб визначити, чи завдає mortal wounds здатність Deadly Demise вашої моделі. Натомість mortal wounds завдаються автоматично.",
  // Librarius Conclave
  "librarius-conclave/Sensory Assault":
    "ЦІЛЬ: Один підрозділ Adeptus Astartes Psyker з вашої армії.\n\nЕФЕКТ: Оберіть один ворожий підрозділ, що перебуває в межах 18\" від однієї моделі PSYKER вашого підрозділу та видимий їй. До початку вашого наступного ходу цей ворожий підрозділ є pinned. Поки підрозділ є pinned, віднімайте 2 від характеристики Move цього підрозділу та віднімайте 2 від Charge rolls, зроблених для нього. Крім того, якщо Telepathy Discipline активна для вашої армії, цей ворожий підрозділ повинен пройти Battle-shock test, віднімаючи 1 від результату.",
  "librarius-conclave/Fiery Shield":
    "ЦІЛЬ: Один підрозділ Adeptus Astartes Infantry або Adeptus Astartes Mounted з вашої армії, що перебуває в межах 18\" від однієї або більше дружніх моделей Adeptus Astartes Psyker і був обраний ціллю однієї або більше атак атакуючого підрозділу.\n\nЕФЕКТ: До кінця фази щоразу, коли атака спрямована на ваш підрозділ, віднімайте 1 від Hit roll, а якщо Pyromancy Discipline активна для вашої армії, зброя, що обирає ціллю ваш підрозділ, має здатність [HAZARDOUS].",
  "librarius-conclave/Iron Arm":
    "ЦІЛЬ: Один підрозділ Adeptus Astartes Infantry з вашої армії, що перебуває в межах 18\" від однієї або більше моделей Adeptus Astartes Psyker з вашої армії і не був обраний для бою цієї фази.\n\nЕФЕКТ: До кінця фази додайте 1 до характеристики Strength зброї ближнього бою, якою озброєні моделі вашого підрозділу, або додайте 2, якщо Biomancy Discipline активна для вашої армії.",
  "librarius-conclave/Assail":
    "ЦІЛЬ: Один підрозділ Adeptus Astartes Psyker з вашої армії, що має право стріляти.\n\nЕФЕКТ: Оберіть один ворожий підрозділ у межах 18\" від однієї або більше моделей PSYKER вашого підрозділу та видимий їм (за винятком підрозділів зі здатністю Lone Operative) і киньте шість D6, додаючи 1 до кожного результату, якщо Telekinesis Discipline активна для вашої армії: за кожен результат 4+ цей ворожий підрозділ отримує 1 mortal wound.",
  "librarius-conclave/Prescient Precision":
    "ЦІЛЬ: Один підрозділ Adeptus Astartes Psyker з вашої армії, що не був обраний для стрільби цієї фази.\n\nЕФЕКТ: До кінця фази щоразу, коли модель вашого підрозділу здійснює атаку, ця атака має здатність [LETHAL HITS], а також здатність [IGNORES COVER], якщо Divination Discipline активна для вашої армії.",
  // Orbital Assault Force
  "orbital-assault-force/Auto‑sense Coordination":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES з вашої армії, що не був обраний для стрільби чи бою цієї фази.\n\nЕФЕКТ: Оберіть здатність [LETHAL HITS] або [SUSTAINED HITS 1]. До кінця фази зброя, якою озброєні моделі вашого підрозділу, має цю здатність у хід, коли вони висадилися з Drop Pod, або поки вона обирає ціллю ворожий підрозділ у межах 12\".",
  "orbital-assault-force/Tactical Decapitation":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES з вашої армії, що не був обраний для стрільби чи бою цієї фази.\n\nЕФЕКТ: До кінця фази зброя, якою озброєні моделі вашого підрозділу, має здатність [PRECISION], і щоразу, коли модель вашого підрозділу здійснює атаку, спрямовану на підрозділ CHARACTER, додавайте 1 до Hit roll.",
  "orbital-assault-force/Blind Screen":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES (за винятком підрозділів Titanic) з вашої армії, що був обраний ціллю однієї або більше атак атакуючого підрозділу, і один дружній підрозділ Adeptus Astartes Smoke Vehicle або Drop Pod у межах 9\" від нього.\n\nЕФЕКТ: До кінця фази моделі ваших підрозділів мають здатність Stealth, і щоразу, коли дальня атака спрямована на один із ваших підрозділів, моделі цього підрозділу мають Benefit of Cover проти цієї атаки.",
  "orbital-assault-force/Suppression Strafing":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES з вашої армії.\n\nЕФЕКТ: Оберіть один ворожий підрозділ, видимий вашому підрозділу та в межах 18\" від нього. Цей ворожий підрозділ проходить Battle-shock test. При цьому віднімайте 1 від цього test, і якщо цей test провалено, до початку вашого наступного ходу цей ворожий підрозділ є suppressed. Поки підрозділ є suppressed, щоразу, коли модель цього підрозділу здійснює атаку, віднімайте 1 від Hit roll.\n\nОБМЕЖЕННЯ: Ви не можете використати цю Stratagem більше одного разу за battle round.",
  "orbital-assault-force/Shock Onslaught":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES з вашої армії, що не був обраний для бою цієї фази.\n\nЕФЕКТ: До кінця фази щоразу, коли модель вашого підрозділу здійснює Pile-in або Consolidation move, вона може рухатися до 6\" замість до 3\".",
  "orbital-assault-force/Onward For The Emperor":
    "ЦІЛЬ: Один підрозділ Adeptus Astartes Infantry з вашої армії, що не був розставлений на полі бою цього ходу, і один дружній Transport, у який він може embark.\n\nЕФЕКТ: Якщо ваш підрозділ ADEPTUS ASTARTES повністю перебуває в межах 6\" від цього TRANSPORT, він може embark у нього.",
  // Reclamation Force
  "reclamation-force/Furious Dedication":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES з вашої армії, що не оголошував charge і не був обраний для бою цієї фази.\n\nЕФЕКТ: До кінця ходу додайте 2 до Charge rolls, зроблених для вашого підрозділу, і додайте 1 до характеристики Attacks зброї ближнього бою, якою озброєні моделі вашого підрозділу.\n\nОБМЕЖЕННЯ: Ви не можете використати цю Stratagem більше одного разу за хід.",
  "reclamation-force/Fight To The End":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES з вашої армії, що був обраний ціллю однієї або більше атак атакуючого підрозділу.\n\nЕФЕКТ: До кінця фази щоразу, коли модель вашого підрозділу знищується, якщо ця модель ще не билася цієї фази, киньте один D6: на результат 4+ не прибирайте знищену модель з гри; вона може вступити в бій після того, як атакуючий підрозділ завершить здійснення своїх атак, а потім прибирається з гри.",
  "reclamation-force/Ultramarian Destiny":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES з вашої армії.\n\nЕФЕКТ: Оберіть одну objective marker, яку ви контролюєте і в радіусі дії якої перебуває ваш підрозділ. Ця objective marker залишається під вашим контролем, доки Level of Control вашого опонента над цією objective marker не стане більшим за ваш у кінці фази.",
  "reclamation-force/Scions Of Guilliman":
    "ЦІЛЬ: Цей підрозділ ADEPTUS ASTARTES.\n\nЕФЕКТ: До кінця ходу ваш підрозділ має право стріляти та оголошувати Charge в хід, коли він здійснив Fell Back.",
  "reclamation-force/Crusading Conquerors":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES з вашої армії.\n\nЕФЕКТ: До початку наступної Command phase додайте 1 до характеристики Objective Control моделей вашого підрозділу.",
  "reclamation-force/Marching Ever On":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES з вашої армії, що перебував у межах Engagement Range цього ворожого підрозділу на початку фази.\n\nЕФЕКТ: Ваш підрозділ може здійснити Normal move до D6\"+1.",
  // Stormlance Task Force
  "stormlance-task-force/Ride Hard, Ride Fast":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES MOUNTED або ADEPTUS ASTARTES FLY VEHICLE з вашої армії, що був обраний ціллю однієї або більше атак атакуючого підрозділу.\n\nЕФЕКТ: До кінця фази щоразу, коли атака спрямована на ваш підрозділ, віднімайте 1 від Hit roll і віднімайте 1 від Wound roll.",
  "stormlance-task-force/Shock Assault":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES MOUNTED з вашої армії, що не оголошував charge цієї фази.\n\nЕФЕКТ: До кінця ходу ви можете перекидати Charge rolls, зроблені для вашого підрозділу, а зброя ближнього бою, якою озброєні моделі цього підрозділу, має здатність [LANCE].",
  "stormlance-task-force/Blitzing Fusillade":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES з вашої армії, що не був обраний для стрільби цієї фази.\n\nЕФЕКТ: До кінця фази дальня зброя, якою озброєні моделі вашого підрозділу, має здатність [ASSAULT]. Якщо така зброя вже має цю здатність, до кінця фази ця зброя також має здатність [SUSTAINED HITS 1].",
  "stormlance-task-force/Wind-Swift Evasion":
    "ЦІЛЬ: Один підрозділ Adeptus Astartes Infantry або Adeptus Astartes Mounted з вашої армії, що перебуває в межах 9\" від цього ворожого підрозділу.\n\nЕФЕКТ: Ваш підрозділ може здійснити Normal move до 6\".\n\nОБМЕЖЕННЯ: Ви не можете обрати підрозділ, що перебуває в межах Engagement Range одного або більше ворожих підрозділів.",
  "stormlance-task-force/Full Throttle":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES MOUNTED або ADEPTUS ASTARTES VEHICLE (за винятком WALKERS) з вашої армії.\n\nЕФЕКТ: До кінця фази, якщо ваш підрозділ здійснює Advance, не робіть для нього Advance roll. Натомість до кінця фази додайте 6\" до характеристики Move моделей вашого підрозділу, або натомість 9\", якщо ваш підрозділ — MOUNTED.",
  // Vanguard Spearhead
  "vanguard-spearhead/Strike From The Shadows":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES INFANTRY з вашої армії, що не був обраний для стрільби цієї фази.\n\nЕФЕКТ: До кінця фази щоразу, коли модель вашого підрозділу здійснює дальню атаку, спрямовану на ворожий підрозділ на відстані понад 12\", покращуйте характеристики Ballistic Skill та Armour Penetration цієї атаки на 1. Якщо в результаті цих атак знищено одну або більше ворожих моделей, оберіть одну з цих знищених моделей; підрозділ цієї знищеної моделі повинен пройти Battle-shock test.",
  "vanguard-spearhead/Surgical Strikes":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES INFANTRY з вашої армії, що не був обраний для бою цієї фази.\n\nЕФЕКТ: До кінця фази зброя ближнього бою, якою озброєні моделі вашого підрозділу, має здатність [PRECISION].",
  "vanguard-spearhead/Guerrilla Tactics":
    "ЦІЛЬ: До двох підрозділів PHOBOS та/або SCOUT SQUAD з вашої армії, або один інший підрозділ ADEPTUS ASTARTES INFANTRY з вашої армії.\n\nЕФЕКТ: Приберіть ці підрозділи з поля бою та помістіть їх у Strategic Reserves.\n\nОБМЕЖЕННЯ: Кожен підрозділ, обраний для цієї Stratagem, повинен перебувати на відстані понад 3\" від усіх ворожих моделей.",
  "vanguard-spearhead/Calculated Feint":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES INFANTRY з вашої армії, що був обраний ціллю цього charge.\n\nЕФЕКТ: Ваш підрозділ може здійснити Normal move до D6\", або натомість до 6\", якщо це підрозділ PHOBOS або ScouT SQUAD.\n\nОБМЕЖЕННЯ: Ви не можете обрати підрозділ, що перебуває в межах Engagement Range одного або більше ворожих підрозділів.",
  "vanguard-spearhead/A Deadly Prize":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES INFANTRY або ADEPTUS ASTARTES MOUNTED з вашої армії в радіусі дії objective marker, яку ви контролюєте.\n\nЕФЕКТ: Ця objective marker вважається Sabotaged і залишається під вашим контролем, навіть якщо у вас немає моделей у її радіусі дії, доки ваш опонент не контролюватиме її на початку або в кінці будь-якого ходу. Поки objective marker є Sabotaged і під вашим контролем, щоразу, коли ворожий підрозділ завершує Normal, Advance, Fall Back або Charge move у радіусі дії цієї objective marker, киньте один D6: на результат 2+ цей ворожий підрозділ отримує D3 mortal wounds.",
};
