// Ukrainian for the Necrons roster's unit ability and rule texts (New Recruit's
// 11th edition Timing/Result format), keyed by the exact English text.
export const TEXTS = {
  // rule: Anti
  "- **Restriction:** always expressed as **[ANTI-X Y+]**, X being a keyword\n- **Result:** unmodified **wound roll** of **Y+** gives a **critical wound** when an **[ANTI]** weapon attacks a unit carrying keyword **X**":
    "- **Обмеження:** завжди записується як **[ANTI-X Y+]**, де X — keyword\n- **Результат:** немодифікований **wound roll** **Y+** дає **critical wound**, коли зброя **[ANTI]** атакує підрозділ із keyword **X**",
  // rule: Support
  "- **Timing:** Muster Armies step, pre-battle\n- **Select:** per **leader** and **support** unit of your army, 1× friendly **bodyguard** unit it can lead (optional)\n- **Result:** the pair forms an **attached** unit for the whole battle\n  - unless stated otherwise, a **bodyguard** unit accepts ≤1 **leader** and ≤1 **support**":
    "- **Коли:** крок Muster Armies, перед битвою\n- **Вибір:** для кожного підрозділу **leader** і **support** вашої армії — 1 дружній підрозділ **bodyguard**, який він може очолити (необов'язково)\n- **Результат:** пара утворює **attached** підрозділ на всю битву\n  - якщо не зазначено інше, підрозділ **bodyguard** приймає ≤1 **leader** і ≤1 **support**",
  // rule: Command Protocols
  "- **Restriction:** unit led by a NECRONS CHARACTER model\n- **Result:** Hit rolls for attacks by this unit's models: +1":
    "- **Обмеження:** підрозділ, який очолює модель NECRONS CHARACTER\n- **Результат:** Hit rolls для атак моделей цього підрозділу: +1",
  // rule: Reanimation Protocols
  "- **Restriction:** NECRONS as your Army Faction\n- **Timing:** last moment of your Command phase\n- **Select:** each of your battlefield units holding this ability\n- **Result:** each selected unit activates its Reanimation Protocols\n  - whenever a unit's Reanimation Protocols activate, that unit heals D3 wounds":
    "- **Обмеження:** NECRONS як ваша Army Faction\n- **Коли:** в останній момент вашої Command phase\n- **Вибір:** кожен ваш підрозділ на полі бою з цією здатністю\n- **Результат:** у кожного обраного підрозділу активуються його Reanimation Protocols\n  - щоразу, коли активуються Reanimation Protocols підрозділу, цей підрозділ відновлює D3 wounds",
  // ability: Leader
  "- **Restriction:** Leader\n- **Select:** an IMMORTALS, LYCHGUARD or NECRON WARRIORS unit to join":
    "- **Обмеження:** Leader\n- **Вибір:** підрозділ IMMORTALS, LYCHGUARD або NECRON WARRIORS, до якого приєднатися",
  // ability: Support
  "Leader of CANOPTEK WRAITHS, IMMORTALS or NECRON WARRIORS units only.":
    "Leader лише для підрозділів CANOPTEK WRAITHS, IMMORTALS або NECRON WARRIORS.",
  // ability: Damaged: 1-4 wounds remaining
  "- **Condition:** wounds left: 1 to 4\n- **Result:** attacks by this model: Hit roll −1":
    "- **Умова:** залишилося від 1 до 4 wounds\n- **Результат:** атаки цієї моделі: Hit roll −1",
  // ability: Drain Life
  "- **Timing:** Fight phase, closing step\n- **Select:** all enemy units ≤6\" from this model\n- **Result:** D3 mortal wounds to each one whose own 1D6 comes up 4+":
    "- **Коли:** Fight phase, завершальний крок\n- **Вибір:** усі ворожі підрозділи в межах ≤6\" від цієї моделі\n- **Результат:** D3 mortal wounds кожному з них, для якого власний 1D6 дав 4+",
  // ability: Necrodermis
  "- **Timing:** this model is allocated an attack\n- **Result:** reduce Damage characteristic of the attack by 1":
    "- **Коли:** цій моделі розподіляється атака\n- **Результат:** зменште характеристику Damage цієї атаки на 1",
  // ability: Enslaved Star God
  "- **Restriction:** not the WARLORD\n- **Result:** this model is barred from being your WARLORD":
    "- **Обмеження:** не WARLORD\n- **Результат:** ця модель не може бути вашим WARLORD",
  // ability: Matter Absorption
  "- **Timing:** start of your Shooting phase\n- **Select:** 1 enemy ^^**VEHICLE^^** unit ≤12\" from this model\n- **Result:** one 1D6; on 2+ the roll is a pass, and a pass means:\n  - this model heals as many lost wounds as the D3 below\n  - D3 mortal wounds for the selected unit":
    "- **Коли:** на початку вашої Shooting phase\n- **Вибір:** 1 ворожий підрозділ ^^**VEHICLE^^** в межах ≤12\" від цієї моделі\n- **Результат:** киньте 1D6; на 2+ кидок успішний, і тоді:\n  - ця модель відновлює стільки втрачених wounds, скільки випало на D3 нижче\n  - D3 mortal wounds обраному підрозділу",
  // ability: Grand Strategist
  "- **Restriction:** model alive on the battlefield\n- **Timing:** opening of your Command phase\n- **Result:** gain 1CP":
    "- **Обмеження:** модель жива на полі бою\n- **Коли:** на початку вашої Command phase\n- **Результат:** отримайте 1CP",
  // ability: Lord of the Storm
  "- **Limits:** 1× per battle\n- **Timing:** your Command phase ends\n- **Select:** each enemy unit ≤12\" from this model\n- **Result:** (optional) roll 1D6 per unit: on 2-5, it suffers D3 mortal wounds; on 6, it suffers D3+3 mortal wounds":
    "- **Ліміт:** 1× за битву\n- **Коли:** наприкінці вашої Command phase\n- **Вибір:** кожен ворожий підрозділ в межах ≤12\" від цієї моделі\n- **Результат:** (необов'язково) киньте 1D6 за кожен підрозділ: на 2-5 він отримує D3 mortal wounds; на 6 — D3+3 mortal wounds",
  // ability: Protective Disciples
  "- **Result:** this model counts as having the Lone Operative ability\n  - Applies only when ≥1 other friendly ^^**Destroyer Cult^^** unit stands ≤3\" from it":
    "- **Результат:** ця модель вважається такою, що має здатність Lone Operative\n  - Лише поки ≥1 інший дружній підрозділ ^^**Destroyer Cult^^** перебуває в межах ≤3\" від неї",
  // ability: Infectious Murder‑madness (Aura)
  "- **Restriction:** Aura, radius 6\" around this model\n- **Select:** every attack made by a model of a friendly ^^**Necrons^^** unit inside the aura; ^^**Monster**^^ and ^^**Titanic^^** units are left out\n- **Result:** the attack gains [SUSTAINED HITS 1]\n  - Attacker has the ^^**Destroyer Cult^^** keyword: always\n  - Otherwise: only when the defender is the nearest eligible choice":
    "- **Обмеження:** Aura, радіус 6\" навколо цієї моделі\n- **Вибір:** кожна атака моделі дружнього підрозділу ^^**Necrons^^** в межах аури; підрозділи ^^**Monster**^^ і ^^**Titanic^^** не враховуються\n- **Результат:** атака отримує [SUSTAINED HITS 1]\n  - Атакуючий має keyword ^^**Destroyer Cult^^**: завжди\n  - Інакше: лише коли ціль — найближча доступна",
  // ability: Prophet of Destruction
  "- **Timing:** this model wipes out an enemy unit\n- **Select:** 1 other friendly ^^**Destroyer Cult^^** unit ≤9\" from this model\n- **Result:** in that unit, every attacking model may re-roll Wound rolls of 1\n- **Duration:** to end of phase":
    "- **Коли:** ця модель знищує ворожий підрозділ\n- **Вибір:** 1 інший дружній підрозділ ^^**Destroyer Cult^^** в межах ≤9\" від цієї моделі\n- **Результат:** кожна атакуюча модель цього підрозділу може перекидати Wound rolls 1\n- **Тривалість:** до кінця фази",
  // ability: Nullstone Field Generator (Aura)
  "- **Restriction:** Aura, radius 6\" around the bearer\n- **Select:** every model that belongs to a friendly ^^**Necrons^^** unit inside the aura\n- **Result:** gains Feel No Pain 5+ against\n  - Psychic Attacks\n  - mortal wounds":
    "- **Обмеження:** Aura, радіус 6\" навколо носія\n- **Вибір:** кожна модель дружнього підрозділу ^^**Necrons^^** в межах аури\n- **Результат:** отримує Feel No Pain 5+ проти\n  - Psychic Attacks\n  - mortal wounds",
  // ability: Inescapable Death
  "- **Limits:** the 0CP use only: 1× per turn\n- **Result:**\n  - A single unit in your army that has this ability becomes a legal Fire Overwatch Stratagem target at 0CP, whether or not the Stratagem was already spent earlier in the phase on a different unit\n  - Every time Fire Overwatch targets this unit (no per-turn limit): an unmodified Hit roll of 2+ counts as a hit while that Stratagem resolves":
    "- **Ліміт:** лише використання за 0CP: 1× за хід\n- **Результат:**\n  - Один підрозділ вашої армії з цією здатністю може бути ціллю Stratagem Fire Overwatch за 0CP, навіть якщо цей Stratagem уже використано раніше в цій фазі на інший підрозділ\n  - Щоразу, коли Fire Overwatch застосовується до цього підрозділу (без обмеження на хід): немодифікований Hit roll 2+ вважається влучанням, поки розв'язується цей Stratagem",
  // ability: Multi-threat Eliminator
  "- **Limits:** 1× per turn\n- **Timing:** your opponent's Shooting phase; an enemy unit has made a ranged attack against a friendly NECRONS unit ≤3\" from a model carrying this ability, and has finished shooting\n- **Condition:** the shooter must be a valid target for this model\n- **Select:** 1 model with this ability, ≤3\" from the attacked unit\n- **Result:** you may have it shoot as if in your Shooting phase; its sole target is the unit that just shot":
    "- **Ліміт:** 1× за хід\n- **Коли:** Shooting phase вашого опонента; ворожий підрозділ здійснив атаку дальнього бою по дружньому підрозділу NECRONS в межах ≤3\" від моделі з цією здатністю і завершив стрільбу\n- **Умова:** стрілець має бути допустимою ціллю для цієї моделі\n- **Вибір:** 1 модель із цією здатністю в межах ≤3\" від атакованого підрозділу\n- **Результат:** ви можете змусити її стріляти так, ніби це ваша Shooting phase; її єдина ціль — підрозділ, який щойно стріляв",
  // ability: Implacable Resilience
  "- **Timing:** any attack allocated to this model\n- **Result:** the Damage characteristic of that attack drops by 1":
    "- **Коли:** будь-яка атака, розподілена цій моделі\n- **Результат:** характеристика Damage цієї атаки зменшується на 1",
  // ability: My Will Be Done
  "- **Restriction:** units of yours that hold this ability\n- **Limits:** 1× per battle round across your whole army, by one of those units only\n- **Timing:** a Stratagem is aimed at that unit\n- **Result:** (optional) CP cost of that Stratagem use: −1CP":
    "- **Обмеження:** ваші підрозділи з цією здатністю\n- **Ліміт:** 1× за battle round на всю вашу армію, лише одним із цих підрозділів\n- **Коли:** на цей підрозділ спрямовано Stratagem\n- **Результат:** (необов'язково) вартість CP цього використання Stratagem: −1CP",
  // ability: Rites of Reanimation
  "- **Restriction:** Leader model; works only when attached\n- **Result:** led unit's models gain the Feel No Pain 5+ ability":
    "- **Обмеження:** модель Leader; діє лише коли приєднана\n- **Результат:** моделі очолюваного підрозділу отримують здатність Feel No Pain 5+",
  // ability: Technomancer
  "- **Limits:** a given model can be chosen only once per turn\n- **Timing:** end of your Movement phase\n- **Select:** 1 friendly NECRONS model, ≤6\" from the bearer\n- **Result:** that model heals up to D3 lost wounds":
    "- **Ліміт:** кожну модель можна обрати лише раз за хід\n- **Коли:** наприкінці вашої Movement phase\n- **Вибір:** 1 дружня модель NECRONS в межах ≤6\" від носія\n- **Результат:** ця модель відновлює до D3 втрачених wounds",
  // ability: Nether-realm Casket
  "- **Restriction:** NECRONS model only\n- **Result:** the unit led by the bearer gains Stealth for all its models\n  - Applies only while the bearer leads a unit":
    "- **Обмеження:** лише модель NECRONS\n- **Результат:** підрозділ, який очолює носій, отримує Stealth для всіх своїх моделей\n  - Лише поки носій очолює підрозділ",
  // ability: Implacable Eradication
  "- **Timing:** attack by any model of this unit\n- **Result:** Wound roll of 1 is re-rolled\n  - Target is an enemy unit on an objective marker's range: any Wound roll can be re-rolled (optional)":
    "- **Коли:** атака будь-якої моделі цього підрозділу\n- **Результат:** Wound roll 1 перекидається\n  - Ціль — ворожий підрозділ у межах objective marker: можна перекинути будь-який Wound roll (необов'язково)",
  // ability: Their Number is Legion
  "- **Timing:** Reanimation Protocols of this unit activate\n- **Result:** you may re-roll the dice that fix the regenerated wounds (optional)":
    "- **Коли:** активуються Reanimation Protocols цього підрозділу\n- **Результат:** ви можете перекинути кубики, що визначають кількість відновлених wounds (необов'язково)",
  // ability: Flesh Hunger
  "- **Timing:** melee attack by any model of this unit against a Below Half-strength target\n- **Result:** any successful Hit roll is a Critical Hit":
    "- **Коли:** атака ближнього бою будь-якої моделі цього підрозділу по цілі Below Half-strength\n- **Результат:** кожен успішний Hit roll є Critical Hit",
  // ability: Tunnelling Horrors
  "- **Timing:** closing moment of your opponent's turn\n- **Condition:** unengaged state for this unit; you opt in (optional)\n- **Result:**\n  - Place the unit into strategic reserves\n  - Next Movement phase of yours (turn 1 too), it is compelled to make an ingress move":
    "- **Коли:** в останній момент ходу вашого опонента\n- **Умова:** цей підрозділ unengaged; ви вирішуєте скористатися (необов'язково)\n- **Результат:**\n  - Помістіть підрозділ у strategic reserves\n  - У вашу наступну Movement phase (зокрема в першому ході) він зобов'язаний здійснити ingress move",
  // ability: Plasmacyte
  "- **Limits:** one use per battle for every Plasmacyte owned by this unit\n- **Timing:** Fight phase; this unit gets selected to fight\n- **Result:** its models' melee weapons gain [DEVASTATING WOUNDS] (optional)\n- **Duration:** until phase ends":
    "- **Ліміт:** одне використання за битву на кожен Plasmacyte цього підрозділу\n- **Коли:** Fight phase; цей підрозділ обрано для бою\n- **Результат:** зброя ближнього бою його моделей отримує [DEVASTATING WOUNDS] (необов'язково)\n- **Тривалість:** до кінця фази",
  // ability: Self-destruction
  "- **Timing:** Fight phase opening\n- **Condition:** ≥1 enemy unit in Engagement Range of this unit (checked once)\n- **Select:** destroy 1 model from this unit (optional); then pick 1 enemy unit in Engagement Range of the destroyed model\n- **Result:** roll D6, adding 1 when it is a VEHICLE\n  - 2-5: D3 mortal wounds on it\n  - 6+: 3 mortal wounds on it":
    "- **Коли:** на початку Fight phase\n- **Умова:** ≥1 ворожий підрозділ в Engagement Range цього підрозділу (перевіряється один раз)\n- **Вибір:** знищте 1 модель цього підрозділу (необов'язково); потім оберіть 1 ворожий підрозділ в Engagement Range знищеної моделі\n- **Результат:** киньте D6, додавши 1, якщо це VEHICLE\n  - 2-5: D3 mortal wounds йому\n  - 6+: 3 mortal wounds йому",
  // ability: Chittering Swarm
  "- **Restriction:** two independent effects\n- **Result:**\n  - Enemy unit in Engagement Range of this unit: Objective Control characteristic −1 per model (min 1)\n  - This unit ≤6\" from 1+ friendly CRYPTEK models: this unit's own models have an Objective Control characteristic of 1":
    "- **Обмеження:** два незалежні ефекти\n- **Результат:**\n  - Ворожий підрозділ в Engagement Range цього підрозділу: характеристика Objective Control −1 на модель (мінімум 1)\n  - Цей підрозділ в межах ≤6\" від 1+ дружніх моделей CRYPTEK: власні моделі цього підрозділу мають характеристику Objective Control 1",
  // ability: Wraith Form
  "- **Timing:** this unit completes a Normal move\n- **Select:** 1 enemy unit crossed during it (optional)\n- **Result:** 1D6 per model of this unit; every 4+ = 1 mortal wound on the selected unit":
    "- **Коли:** цей підрозділ завершує Normal move\n- **Вибір:** 1 ворожий підрозділ, через який він пройшов (необов'язково)\n- **Результат:** 1D6 за кожну модель цього підрозділу; кожне 4+ = 1 mortal wound обраному підрозділу",
  // ability: Sentinel Construct
  "- **Timing:** you use the Fire Overwatch Stratagem on this unit\n- **Result:** a Hit is scored by unmodified Hit rolls of 5+\n- **Duration:** through to the end of that Stratagem's resolution":
    "- **Коли:** ви використовуєте Stratagem Fire Overwatch на цей підрозділ\n- **Результат:** влучання зараховується на немодифікований Hit roll 5+\n- **Тривалість:** до кінця розв'язання цього Stratagem",
};
