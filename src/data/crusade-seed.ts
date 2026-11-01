import type { BookEnemies, CrusadeEnemy, CrusadeState } from "../lib/crusade";

/**
 * «Попіл Армагеддону» as the campaign book has it after mission 3 (three
 * wins, no losses; book rev 36). Missions 1-3 were played in 10th edition,
 * 4-5 are played in 11th: each player has a roster for both, and units are
 * matched to the 11th edition roster by datasheet name. Offered once, when
 * no campaign is stored yet; after that the synced copy is the one that
 * counts. Roster unit ids are from armies/Grey.json and armies/Ultramar.json.
 */
export const ASHES_OF_ARMAGEDDON: CrusadeState = {
  name: "Попіл Армагеддону",
  players: [
    { id: "andrii", name: "Андрій", armyId: "Grey", armyIds: { "11": "Grey 11" } },
    { id: "sashko", name: "Сашко", armyId: "Ultramar", armyIds: { "11": "Ultramar 11" } },
  ],
  units: [
    {
      // The book (rev 36) splits him from the Strike Squad he led in
      // missions 1-3; from mission 4 he leads the Terminators.
      id: "u1",
      playerId: "andrii",
      name: "Бібліотекар",
      rosterUnitIds: ["8ki8zfu"],
      xp: 14,
      honours: [
        { id: "hardened", weapon: null },
        { id: "steadfast", weapon: null },
      ],
      scars: [],
      skipsMission: false,
      leads: "u10",
    },
    {
      id: "u12",
      playerId: "andrii",
      name: "Страйк-сквад (перший)",
      rosterUnitIds: ["35p7rad"],
      xp: 14,
      honours: [
        { id: "ruthlessBlades", weapon: null },
        { id: "furiousCharge", weapon: null },
      ],
      scars: [],
      skipsMission: false,
    },
    {
      id: "u10",
      playerId: "andrii",
      name: "Термінатори Братства",
      rosterUnitIds: ["hx1q9z"],
      xp: 10,
      honours: [
        { id: "ruthlessBlades", weapon: null },
        { id: "hardened", weapon: null },
        { id: "furiousCharge", weapon: null },
      ],
      scars: [],
      skipsMission: false,
    },
    {
      id: "u2",
      playerId: "andrii",
      name: "Інтерсептори",
      rosterUnitIds: ["mdo41w"],
      xp: 9,
      honours: [
        { id: "furiousCharge", weapon: null },
        { id: "ruthlessBlades", weapon: null },
        { id: "hardened", weapon: null },
      ],
      scars: [],
      skipsMission: false,
    },
    {
      id: "u3",
      playerId: "andrii",
      name: "Страйк-сквад (другий)",
      rosterUnitIds: ["6a5fe1ce6e3b9858f2d3c614"],
      xp: 8,
      honours: [
        { id: "ruthlessBlades", weapon: null },
        { id: "holdTheLine", weapon: null },
        { id: "steadfast", weapon: null },
      ],
      scars: [],
      skipsMission: false,
    },
    {
      id: "u4",
      playerId: "sashko",
      name: "Хеллбластери «золоті наплічники»",
      rosterUnitIds: ["a26qs7d"],
      xp: 9,
      honours: [
        { id: "marksmen", weapon: "Plasma Incinerator - Standard" },
        { id: "hardened", weapon: null },
      ],
      scars: [],
      skipsMission: false,
    },
    {
      id: "u5",
      playerId: "sashko",
      name: "Хеллбластери «білі наплічники»",
      rosterUnitIds: ["6ac407b63d9a9421ff1b5f5f"],
      xp: 6,
      honours: [
        { id: "marksmen", weapon: "Plasma Incinerator - Standard" },
        { id: "steadfast", weapon: null },
        { id: "hardened", weapon: null },
      ],
      scars: [],
      skipsMission: false,
    },
    {
      id: "u6",
      playerId: "sashko",
      name: "Інтерсесори",
      rosterUnitIds: ["oc9gmod"],
      xp: 5,
      honours: [
        // Covers both 11th edition Bolt Rifle profiles.
        { id: "marksmen", weapon: "Bolt Rifle" },
        { id: "holdTheLine", weapon: null },
        { id: "hardened", weapon: null },
      ],
      scars: [],
      skipsMission: false,
    },
    {
      id: "u7",
      playerId: "sashko",
      name: "Техмарин",
      rosterUnitIds: ["gznfiwm"],
      xp: 4,
      honours: [{ id: "holdTheLine", weapon: null }],
      scars: [],
      skipsMission: false,
    },
    {
      id: "u9",
      playerId: "sashko",
      name: "Апотекарій",
      rosterUnitIds: ["e9k1cls"],
      xp: 3,
      honours: [{ id: "steadfast", weapon: null }],
      scars: [],
      skipsMission: false,
    },
    {
      id: "u11",
      playerId: "sashko",
      name: "Редемптор",
      rosterUnitIds: ["tubl65c"],
      xp: 3,
      honours: [
        // «основна гармата»: the 11th edition roster's main gun, standard
        // profile as on the Hellblasters.
        { id: "marksmen", weapon: "Macro Plasma Incinerator - Standard" },
      ],
      scars: [],
      skipsMission: false,
    },
    {
      id: "u8",
      playerId: "sashko",
      name: "Елімінатори",
      rosterUnitIds: ["b1qmlls"],
      xp: 2,
      honours: [],
      scars: [],
      skipsMission: false,
    },
  ],
  missions: [
    {
      number: 1,
      name: "Засідка в руїнах",
      result: "win",
      pointsLimit: 500,
      notes:
        "Ретранслятор ваш, Варбос і Снікрот мертві. На стіні біля сліду патруля — восьмипроменева зірка. Ретранслятор передав план диверсії.",
    },
    {
      number: 2,
      name: "Диверсія",
      result: "win",
      pointsLimit: 500,
      notes:
        "3 з 3 зарядів знешкоджено, жодного вибуху. Завод урятовано. На сході збирається великий WAAAGH!. Слід зірки в «Цистернах» не обшукано.",
    },
    {
      number: 3,
      name: "WAAAGH!",
      result: "win",
      pointsLimit: 650,
      notes:
        "Усі 3 точки ваші щоходу, всі орки знищені, включно з Морканавтом і Газгкуллом. На тілі Варбоса — амулет із восьмипроменевою зіркою та табличка «Той, хто сяє найяскравіше, помре першим». Газгкулл мертвий — у фіналі третьої сили не буде.",
    },
    { number: 4, name: "Справжній ворог", result: null, pointsLimit: 700, notes: "", edition: 11 },
    { number: 5, name: "Брама Тартаруса", result: null, pointsLimit: 850, notes: "", edition: 11 },
  ],
};

const orks = (...ids: string[]) => ids.map((unitId) => ({ armyId: "Orks", unitId }));
const chaos11 = (...ids: string[]) => ids.map((unitId) => ({ armyId: "Chaos 11", unitId }));
const orks11 = (...ids: string[]) => ids.map((unitId) => ({ armyId: "Orks 11", unitId }));

/**
 * Each mission's enemy as the campaign book lists it (book rev 35): 1-3
 * out of the 10th edition armies/Orks.json and armies/Chaos.json, 4-5 out
 * of the 11th edition Chaos 11, Orks 11 and Chaos knights 11. Leaders
 * are attached where the book pairs them and the datasheet allows it; units
 * that only stand next to each other (Mek by the Gretchin, Warpsmith by the
 * Forgefiend) stay apart. Only each mission's main force is listed, as the
 * book's points total counts it: Ghazghkull, who arrives only under a
 * condition (the host's reserve in mission 3, the third force in the
 * finale), is left for the players to add.
 */
const MISSION_ENEMIES: Record<number, CrusadeEnemy> = {
  // «Тіні Тартаруса»: War Horde, base stratagems only.
  1: {
    units: orks("ew82oou", "f10ofxh", "410rll", "gejool", "ed432s", "aamy0up", "f9qip2i", "isri4r"),
    leaders: { ew82oou: "f10ofxh", f9qip2i: "isri4r" },
    detachment: "War Horde",
  },
  // «Підривники Ґрязьзуба».
  2: {
    units: orks("ew82oou", "f10ofxh", "410rll", "ed432s", "gb8ilw5", "gejool", "aamy0up", "phzsrp"),
    leaders: { ew82oou: "f10ofxh" },
    detachment: "War Horde",
  },
  // WAAAGH! Ґрязьзуба in three waves, 1700 points.
  3: {
    units: orks(
      "17fyghe",
      "exsxqb",
      "ew82oou",
      "e65dz8e",
      "gb8ilw5",
      "phzsrp",
      "410rll",
      "gejool",
      "ed432s",
      "aamy0up",
      "5k0m2k4",
      "6a9f02c6e3ff0af34730aad3",
      "ijfz9q",
      "f10ofxh",
    ),
    leaders: {
      "17fyghe": "exsxqb",
      ew82oou: "e65dz8e",
      ed432s: "gejool",
      "6a9f02c6e3ff0af34730aad3": "ijfz9q",
    },
    detachment: "War Horde",
  },
  // «Діти Горуса» with enthralled Orks, 11th edition: the Chaos roster
  // («Unnamed list», now «Chaos 11») and the 11th edition Orks. Each brings
  // its own detachment (Chaos Cult, Green Tide), so the side shows none.
  4: {
    units: [
      ...chaos11(
        "t37h8k8",
        "8i5t8w",
        "o3wc4nt",
        "tkr66q",
        "2gxu8bb",
        "lf81azv",
        "q360e6f",
        "i4kos3v",
        "8k9orxf",
        "uu46y5s",
        "nko9ebx",
      ),
      ...orks11(
        "f9lv7p",
        "0c0e2mf",
        "qzhbyu",
        "i26kk3",
        "wc478zb",
        "n2g7v2",
        "t2nm5xe",
        "3s8v9qm",
        "lucak7",
        "63xo37n",
        "meac1s",
      ),
    ],
    // The book pairs the Mek with the Lootas, but in 11th edition his Support
    // ability does not list Lootas, so he stands alone.
    leaders: { t37h8k8: "8i5t8w", f9lv7p: "0c0e2mf", n2g7v2: "t2nm5xe" },
    detachment: null,
  },
  // The Black Crusade, 11th edition: the whole Chaos roster, the Knight
  // Rampager and the enthralled Orks still standing.
  5: {
    units: [
      ...chaos11(
        "ri4v62g",
        "c4vvdj",
        "tkr66q",
        "t37h8k8",
        "8i5t8w",
        "o3wc4nt",
        "i4kos3v",
        "2gxu8bb",
        "lf81azv",
        "q360e6f",
        "v9ajzui",
        "y51r71q",
        "60n9h7i",
        "uu46y5s",
        "8k9orxf",
        "nko9ebx",
      ),
      { armyId: "Chaos knights 11", unitId: "mbb9l7l" },
      ...orks11("f9lv7p", "0c0e2mf", "qzhbyu", "i26kk3"),
    ],
    leaders: { ri4v62g: "c4vvdj", t37h8k8: "8i5t8w", f9lv7p: "0c0e2mf" },
    detachment: null,
  },
};

export const BOOK_ENEMIES: BookEnemies = { [ASHES_OF_ARMAGEDDON.name]: MISSION_ENEMIES };
