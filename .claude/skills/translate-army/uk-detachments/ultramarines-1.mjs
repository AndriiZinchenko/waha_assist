// Ukrainian for Space Marine / Ultramarines detachments (part 1). Keys are "<detachment file stem>/<name>".
export const RULES = {
  "1st-company-task-force/Extremis-level Threat":
    "Один раз за бій, у вашу Command phase, ви можете використати цю здатність. Якщо ви це зробите, до початку вашої наступної Command phase щоразу, коли модель з вашої армії зі здатністю Oath of Moment здійснює атаку по вашій цілі Oath of Moment, ви також можете перекинути Wound roll.",
  "anvil-siege-force/Shield of the Imperium":
    "Дальня зброя, якою озброєні моделі **^^Adeptus Astartes^^** з вашої армії, має здатність **[HEAVY]**. Якщо така зброя вже має цю здатність, щоразу, коли цією зброєю здійснюється атака, якщо підрозділ атакуючої моделі здійснив Remained Stationary цього ходу, додайте 1 до Wound roll.",
  "bastion-task-force/Interlocking Tactics":
    "Підрозділи ^^**Adeptus Astartes Battleline^^** з вашої армії:\n\n- Мають право стріляти та оголошувати Charge в хід, коли вони здійснили Advance або Fell Back.\n\n- Мають право розпочати виконання Action в хід, коли вони здійснили Advance або Fell Back.\n\nЩоразу, коли підрозділ ^^**Adeptus Astartes Battleline^^** з вашої армії обирається для атаки, після розв'язання цих атак оберіть один ворожий підрозділ, уражений однією або більше з цих атак. До кінця ходу цей ворожий підрозділ є auspex scanned. Щоразу, коли модель ^^**Adeptus Astartes^^** з вашої армії здійснює атаку по auspex scanned підрозділу, перекиньте Hit roll 1.",
  "ceramite-sentinels/Adaptive Defence":
    "Щоразу, коли модель ^^**Adeptus Astartes**^^ з вашої армії здійснює атаку, якщо підрозділ цієї моделі перебуває в межах terrain feature, перекиньте Hit roll 1 та перекиньте Wound roll 1. \n\n\nПідрозділи ^^**Adeptus Astartes**^^ з вашої армії отримують keyword ^^**Entrenched**^^, поки виконуються всі наведені нижче умови: \n- Цей підрозділ перебуває в межах terrain feature.\n- Цей підрозділ не був розставлений на полі бою цього ходу.\n- Жодна модель цього підрозділу не перемістилася більш ніж на 3” цього ходу.",
  "firestorm-assault-force/Close-Range Eradication":
    "Дальня зброя, якою озброєні моделі Adeptus Astartes з вашої армії, має здатність [ASSAULT], і щоразу, коли атака, здійснена такою зброєю, спрямована на підрозділ у межах 12\", додайте 1 до характеристики Strength цієї атаки.",
  "gladius-task-force/Combat Doctrines":
    "На початку вашої Command phase ви можете обрати одну з Combat Doctrines, наведених нижче. До початку вашої наступної Command phase ця Combat Doctrine активна, і її ефекти застосовуються до всіх підрозділів ^^**Adeptus Astartes**^^ з вашої армії. Ви можете обрати кожну Combat Doctrine лише один раз за бій.\n\n\nDEVASTATOR DOCTRINE \nЦей підрозділ має право стріляти в хід, коли він здійснив Advance.\n\n\nTACTICAL DOCTRINE\nЦей підрозділ має право стріляти та оголошувати Charge в хід, коли він здійснив Fell Back.\n\n\nASSAULT DOCTRINE\nЦей підрозділ має право оголошувати Charge в хід, коли він здійснив Advance.",
  "headhunter-task-force/Target Sighted":
    "Щоразу, коли підрозділ Tank Ace з вашої армії (див. нижче) здійснює Advance, не робіть для нього Advance roll. Натомість до кінця фази додайте 6\" до характеристики Move моделей цього підрозділу. Щоразу, коли підрозділ Tank Ace з вашої\nармії стріляє у вашу Shooting phase, якщо цей підрозділ не здійснював Advance цього ходу, ви можете перекинути Damage roll.\n\n\nПідрозділи Adeptus Astartes Vehicle з вашої армії (за винятком Fortifications, Drop Pods, Walkers та підрозділів, що можуть Fly)\nмають keyword Tank Ace. На кроці Muster Armies ви можете обрати до трьох підрозділів Tank Ace з вашої\nармії, які отримують keyword Character. \n\n\nПримітка розробників: Це означає, що обраним підрозділам можна дати enhancements, і один із них можна обрати вашим Warlord.",
};
export const STRATAGEMS = {
  "bastion-task-force/Angels Defiant":
    "ЦІЛЬ: Один підрозділ Adeptus Astartes Battleline з вашої армії, який було обрано ціллю однієї або більше атак атакуючого підрозділу.\n\nЕФЕКТ: До кінця фази щоразу, коли атака націлена на ваш підрозділ, якщо характеристика Strength цієї атаки більша за характеристику Toughness вашого підрозділу, відніміть 1 від Wound roll.",
  // 1st Company Task Force
  "1st-company-task-force/Legendary Fortitude":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES TERMINATOR, BLADEGUARD VETERAN SQUAD, STERNGUARD VETERAN SQUAD або VANGUARD VETERAN SQUAD з вашої армії в межах Engagement Range цього ворожого підрозділу.\n\nЕФЕКТ: До кінця ходу щоразу, коли атака спрямована на модель вашого підрозділу, віднімайте 1 від характеристики Damage цієї атаки.",
  "1st-company-task-force/Heroes Of The Chapter":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES TERMINATOR, BLADEGUARD VETERAN SQUAD, STERNGUARD VETERAN SQUAD або VANGUARD VETERAN SQUAD з вашої армії, що не був обраний для стрільби чи бою цієї фази.\n\nЕФЕКТ: До кінця фази щоразу, коли модель вашого підрозділу здійснює атаку, додайте 1 до Hit roll. Якщо ваш підрозділ Below Half-strength, також додайте 1 до Wound roll.",
  "1st-company-task-force/Terrifying Proficiency":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES TERMINATOR, BLADEGUARD VETERAN SQUAD, STERNGUARD VETERAN SQUAD або VANGUARD VETERAN SQUAD з вашої армії, що здійснив Charge move цього ходу та знищив один або більше ворожих підрозділів цієї фази.\n\nЕФЕКТ: У наступну Command phase вашого опонента кожен ворожий підрозділ у межах 6\" від вашого підрозділу повинен пройти Battle-shock test. Якщо підрозділ, що проходить цей test, Below Half-strength, віднімайте 1 від цього test. Ворожі підрозділи, на які вплинула ця Stratagem, не повинні проходити жодних інших Battle-shock tests у цю саму фазу.",
  "1st-company-task-force/Duty And Honour":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES TERMINATOR, BLADEGUARD VETERAN SQUAD, STERNGUARD VETERAN SQUAD або VANGUARD VETERAN SQUAD з вашої армії в радіусі дії objective marker, яку ви контролюєте.\n\nЕФЕКТ: Ця objective marker залишається під вашим контролем, навіть якщо у вас немає моделей у її радіусі дії, доки ваш опонент не контролюватиме її на початку або в кінці будь-якого ходу.",
  "1st-company-task-force/Orbital Teleportarium":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES TERMINATOR з вашої армії.\n\nЕФЕКТ: Приберіть ваш підрозділ з поля бою та помістіть його до Strategic Reserves. Він повернеться на поле бою на Reinforcements step вашої наступної Movement phase за допомогою здатності Deep Strike.\n\nОБМЕЖЕННЯ: Ви не можете обрати підрозділ, що перебуває в межах Engagement Range одного або більше ворожих підрозділів.",
  // Anvil Siege Force
  "anvil-siege-force/No Threat Too Great":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES з вашої армії, що не був обраний для стрільби цієї фази.\n\nЕФЕКТ: До кінця фази щоразу, коли модель вашого підрозділу здійснює дальню атаку по підрозділу MONSTER або VEHICLE, ви можете перекинути Wound roll.",
  "anvil-siege-force/Battle Drill Recall":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES з вашої армії, що не був обраний для стрільби цієї фази.\n\nЕФЕКТ: До кінця фази дальня зброя, якою озброєні моделі вашого підрозділу, має здатність [SUSTAINED HITS 1]. Якщо ваш підрозділ здійснив Remained Stationary цього ходу, то до кінця фази щоразу, коли модель вашого підрозділу здійснює дальню атаку, успішний немодифікований Hit roll 5+ вважається Critical Hit.",
  "anvil-siege-force/Hail Of Vengeance":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES з вашої армії, одна або більше моделей якого були знищені в результаті атак атакуючого підрозділу.\n\nЕФЕКТ: Ваш підрозділ може стріляти, наче це ваша Shooting phase, але при цьому повинен обирати ціллю лише цей ворожий підрозділ і може це зробити, лише якщо цей ворожий підрозділ є eligible target.",
  "anvil-siege-force/Not One Backwards Step":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES INFANTRY з вашої армії в радіусі дії objective marker.\n\nЕФЕКТ: До кінця ходу подвойте характеристику Objective Control моделей вашого підрозділу, але він повинен здійснити Remain Stationary цього ходу.",
  "anvil-siege-force/Rigid Discipline":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES з вашої армії, що перебуває в межах Engagement Range одного або більше ворожих підрозділів.\n\nЕФЕКТ: Ваш підрозділ може негайно здійснити Fall Back move до 6\".\n\nОБМЕЖЕННЯ: Здійснюючи цей рух, ваш підрозділ повинен завершити його або повністю в межах вашої deployment zone, або в радіусі дії objective marker.",
  // Bastion Task Force
  "bastion-task-force/Light Of Vengeance":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES з вашої армії, що не був обраний для стрільби чи бою цієї фази.\n\nЕФЕКТ: Оберіть здатність [LETHAL HITS] або [SUSTAINED HITS 1]. До кінця фази зброя, якою озброєні моделі вашого підрозділу, має цю здатність, поки атакує auspex scanned підрозділ або якщо носій має keyword Battleline.",
  "bastion-task-force/Codex Discipline":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES з вашої армії, що не був обраний для стрільби чи бою цієї фази.\n\nЕФЕКТ: До кінця фази щоразу, коли модель вашого підрозділу здійснює атаку по ворожому підрозділу, перекиньте Hit roll 1. Якщо ця ціль є auspex scanned, також перекиньте Wound roll 1.",
  "bastion-task-force/Heresy Undone":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES (за винятком підрозділів Battleline) з вашої армії.\n\nЕФЕКТ: До кінця фази ваш підрозділ має право стріляти та оголошувати Charge в хід, коли він здійснив Advance або Fell Back. Якщо він це робить, кожна ціль цього charge і кожна ціль цих атак повинна бути auspex scanned підрозділом.",
  "bastion-task-force/Guided Disruption":
    "ЦІЛЬ: Цей підрозділ ADEPTUS ASTARTES BATTLELINE.\n\nЕФЕКТ: Коли ворожий підрозділ стає auspex scanned у результаті цих атак цього ходу, якщо цей ворожий підрозділ не має keywords MONSTER або VEHICLE, до початку вашого наступного ходу він є pinned. Поки підрозділ є pinned, віднімайте 2 від характеристики Move цього підрозділу та віднімайте 2 від Charge rolls, зроблених для цього підрозділу.",
  "bastion-task-force/Shock Bombardment":
    "ЦІЛЬ: Цей підрозділ ADEPTUS ASTARTES BATTLELINE.\n\nЕФЕКТ: Коли ворожий підрозділ стає auspex scanned у результаті цих атак цього ходу, до початку вашого наступного ходу він є suppressed. Поки підрозділ є suppressed, щоразу, коли модель цього підрозділу здійснює атаку, віднімайте 1 від Hit roll.",
  // Ceramite Sentinels
  "ceramite-sentinels/Priority Strike":
    "ЦІЛЬ: Один підрозділ Adeptus Astartes Infantry або Adeptus Astartes Mounted з вашої армії, що не був обраний для стрільби чи бою цієї фази.\n\nЕФЕКТ: До кінця фази щоразу, коли модель вашого підрозділу здійснює атаку по підрозділу CHARACTER, MONSTER або VEHICLE, ви можете перекинути Wound roll.",
  "ceramite-sentinels/Augmented Targeting":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES з вашої армії, що не був обраний для стрільби цієї фази.\n\nЕФЕКТ: Оберіть здатність [SUSTAINED HITS 1] або [LETHAL HITS]. До кінця фази дальня зброя, якою озброєні моделі вашого підрозділу, має обрану здатність. Якщо ваш підрозділ є ENTRENCHED, до кінця фази дальня зброя, якою озброєні моделі вашого підрозділу, натомість має здатності [SUSTAINED HITS 1] та [LETHAL HITS].",
  "ceramite-sentinels/Unyielding Might":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES з вашої армії, що перебуває в межах Engagement Range одного або більше ворожих підрозділів.\n\nЕФЕКТ: До початку вашої наступної Command phase додайте 1 до характеристики Objective Control моделей вашого підрозділу.",
  "ceramite-sentinels/Stand To The End":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES з вашої армії, що був обраний ціллю однієї або більше атак атакуючого підрозділу.\n\nЕФЕКТ: До кінця фази щоразу, коли модель вашого підрозділу знищується, якщо ця модель ще не билася цієї фази, киньте один D6, додаючи 1 до результату, якщо це підрозділ ENTRENCHED: на результат 4+ не прибирайте її з гри. Ця знищена модель може вступити в бій після того, як атакуючий підрозділ завершить здійснення своїх атак, а потім прибирається з гри.",
  "ceramite-sentinels/Evasive Repositioning":
    "ЦІЛЬ: Один підрозділ Adeptus Astartes Infantry або Adeptus Astartes Mounted з вашої армії, що був обраний ціллю однієї або більше атак атакуючого підрозділу.\n\nЕФЕКТ: Ваш підрозділ може здійснити Normal move до D6\". Якщо ваш підрозділ є ENTRENCHED, ви можете перекинути D6, що визначає, на яку відстань може переміститися ваш підрозділ.",
  // Firestorm Assault Force
  "firestorm-assault-force/Crucible Of Battle":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES INFANTRY з вашої армії, що не був обраний для стрільби чи бою цієї фази.\n\nЕФЕКТ: До кінця фази щоразу, коли модель вашого підрозділу здійснює атаку по найближчій eligible target у межах 6\", додайте 1 до Wound roll.",
  "firestorm-assault-force/Immolation Protocols":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES з вашої армії, що не був обраний для стрільби цієї фази.\n\nЕФЕКТ: До кінця фази зброя Torrent, якою озброєні моделі цього підрозділу, має здатність [DEVASTATING WOUNDS].",
  "firestorm-assault-force/Onslaught Of Fire":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES з вашої армії, що висадився з TRANSPORT цього ходу та не був обраний для стрільби цієї фази.\n\nЕФЕКТ: До кінця фази щоразу, коли модель вашого підрозділу здійснює дальню атаку по найближчій eligible target у межах 12\", додайте 1 до Hit roll. Якщо в результаті будь-якої з цих атак знищено одну або більше ворожих моделей, оберіть одну з цих знищених моделей; підрозділ цієї знищеної моделі повинен пройти Battle-shock test.",
  "firestorm-assault-force/Burning Vengeance":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES TRANSPORT з вашої армії, що був обраний ціллю однієї або більше атак атакуючого підрозділу.\n\nЕФЕКТ: Один підрозділ, embarked у цьому TRANSPORT, може висадитися, наче це ваша Movement phase, а потім може стріляти, наче це ваша Shooting phase, але при цьому повинен обирати ціллю лише цей ворожий підрозділ і може це зробити, лише якщо цей ворожий підрозділ є eligible target.",
  "firestorm-assault-force/Rapid Embarkation":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES TRANSPORT з вашої армії, у якому немає embarked моделей, та один підрозділ ADEPTUS ASTARTES INFANTRY з вашої армії, що повністю перебуває в межах 6\" від цього TRANSPORT.\n\nЕФЕКТ: Ваш підрозділ INFANTRY може embark у цей TRANSPORT.\n\nОБМЕЖЕННЯ: Ви не можете обрати ціллю підрозділ INFANTRY, що перебуває в межах Engagement Range одного або більше ворожих підрозділів, що зазвичай не може embark у цей TRANSPORT або що висадився з TRANSPORT цього ходу.",
  // Gladius Task Force
  "gladius-task-force/Honour The Chapter":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES з вашої армії.\n\nЕФЕКТ: До кінця фази зброя ближнього бою, якою озброєні моделі вашого підрозділу, має здатність [LANCE]. Якщо ваш підрозділ перебуває під дією Assault Doctrine, до кінця фази також покращуйте характеристику Armour Penetration такої зброї на 1.",
  "gladius-task-force/Storm Of Fire":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES з вашої армії, що не був обраний для стрільби цієї фази.\n\nЕФЕКТ: До кінця фази дальня зброя, якою озброєні моделі вашого підрозділу, має здатність [IGNORES COVER]. Якщо ваш підрозділ перебуває під дією Devastator Doctrine, до кінця фази також покращуйте характеристику Armour Penetration такої зброї на 1.",
  "gladius-task-force/Only In Death Does Duty End":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES з вашої армії, що був обраний ціллю однієї або більше атак атакуючого підрозділу.\n\nЕФЕКТ: До кінця фази щоразу, коли модель вашого підрозділу знищується, якщо ця модель ще не билася цієї фази, не прибирайте її з гри. Ця знищена модель може вступити в бій після того, як підрозділ атакуючої моделі завершить здійснення своїх атак, а потім прибирається з гри.",
  "gladius-task-force/Adaptive Strategy":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES з вашої армії.\n\nЕФЕКТ: Оберіть Devastator Doctrine, Tactical Doctrine або Assault Doctrine. До початку вашої наступної Command phase ця Combat Doctrine активна для цього підрозділу замість будь-якої іншої Combat Doctrine, активної для вашої армії, навіть якщо ви вже обирали цю doctrine цього бою.",
  "gladius-task-force/Squad Tactics":
    "ЦІЛЬ: Один підрозділ Adeptus Astartes Infantry або Adeptus Astartes Mounted з вашої армії, що перебуває в межах 9\" від ворожого підрозділу, який щойно завершив цей рух.\n\nЕФЕКТ: Ваш підрозділ може здійснити Normal move до D6\", або натомість Normal move до 6\", якщо він перебуває під дією Tactical Doctrine.\n\nОБМЕЖЕННЯ: Ви не можете обрати підрозділ, що перебуває в межах Engagement Range одного або більше ворожих підрозділів.",
  // Headhunter Task Force
  "headhunter-task-force/Target Weak Point":
    "ЦІЛЬ: Один підрозділ Tank Ace з вашої армії, що не був обраний для стрільби цієї фази.\n\nЕФЕКТ: До кінця фази щоразу, коли модель вашого підрозділу здійснює дальню атаку по підрозділу MONSTER або VEHICLE, покращуйте характеристику Armour Penetration цієї атаки на 1.\n\nОБМЕЖЕННЯ: Підрозділ не може бути ціллю цієї Stratagem та Stratagem Kill Shot в одну й ту саму фазу.",
  "headhunter-task-force/Kill Shot":
    "ЦІЛЬ: Один підрозділ Tank Ace з вашої армії, що не був обраний для стрільби цієї фази.\n\nЕФЕКТ: До кінця фази щоразу, коли модель вашого підрозділу здійснює атаку по підрозділу MONSTER або VEHICLE, перекиньте Wound roll 1. Якщо підрозділ-ціль перебуває нижче своєї Starting Strength, ви натомість можете перекинути Wound roll.\n\nОБМЕЖЕННЯ: Підрозділ не може бути ціллю цієї Stratagem та Stratagem Target Weak Point в одну й ту саму фазу.",
  "headhunter-task-force/Machine Vengeance":
    "ЦІЛЬ: Один підрозділ Tank Ace з вашої армії (за винятком підрозділів, що містять одну або більше моделей з характеристикою Wounds 16+), що був обраний ціллю однієї або більше атак атакуючого підрозділу.\n\nЕФЕКТ: Ваш підрозділ може стріляти, наче це ваша Shooting phase, але при цьому повинен обирати ціллю лише цей ворожий підрозділ і може це зробити, лише якщо цей ворожий підрозділ видимий та є eligible target.",
  "headhunter-task-force/Rapid Gunnery":
    "ЦІЛЬ: Один підрозділ ADEPTUS ASTARTES з вашої армії, що не був обраний для стрільби цієї фази.\n\nЕФЕКТ: До кінця фази ваш підрозділ має право стріляти в хід, коли він здійснив Fell Back.",
  "headhunter-task-force/Reactive Repositioning":
    "ЦІЛЬ: Один підрозділ Tank Ace з вашої армії (за винятком підрозділів, що містять одну або більше моделей з характеристикою Wounds 16+), що перебуває в межах 9\" від цього ворожого підрозділу.\n\nЕФЕКТ: Ваш підрозділ може здійснити Normal move до D6\".",
};
