import type { BookEnemies, CrusadeEnemy, CrusadeState } from "../lib/crusade";

/**
 * «Попіл Армагеддону» as it stood after mission 2 (both won, no losses),
 * checked against the campaign book. Offered once, when no campaign is
 * stored yet; after that the synced copy is the only one that counts.
 * Roster unit ids are from armies/Grey.json and armies/Ultramar.json.
 */
export const ASHES_OF_ARMAGEDDON: CrusadeState = {
  name: "Попіл Армагеддону",
  players: [
    { id: "andrii", name: "Андрій", armyId: "Grey" },
    { id: "sashko", name: "Сашко", armyId: "Ultramar" },
  ],
  units: [
    {
      id: "u1",
      playerId: "andrii",
      name: "Бібліотекар + Страйк-сквад",
      rosterUnitIds: ["8ki8zfu", "35p7rad"],
      xp: 10,
      honours: [
        { id: "ruthlessBlades", weapon: null },
        { id: "hardened", weapon: null },
        { id: "furiousCharge", weapon: null },
        { id: "steadfast", weapon: null },
      ],
      scars: [],
      skipsMission: false,
    },
    {
      id: "u2",
      playerId: "andrii",
      name: "Інтерсептори",
      rosterUnitIds: ["mdo41w"],
      xp: 6,
      honours: [
        { id: "furiousCharge", weapon: null },
        { id: "ruthlessBlades", weapon: null },
      ],
      scars: [],
      skipsMission: false,
    },
    {
      id: "u3",
      playerId: "andrii",
      name: "Страйк-сквад (другий)",
      rosterUnitIds: ["6a5fe1ce6e3b9858f2d3c614"],
      xp: 4,
      honours: [
        { id: "ruthlessBlades", weapon: null },
        { id: "holdTheLine", weapon: null },
      ],
      scars: [],
      skipsMission: false,
    },
    {
      id: "u4",
      playerId: "sashko",
      name: "Хеллбластери «золоті наплічники»",
      rosterUnitIds: ["a26qs7d"],
      xp: 8,
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
      xp: 4,
      honours: [
        { id: "marksmen", weapon: "Plasma Incinerator - Standard" },
        { id: "steadfast", weapon: null },
      ],
      scars: [],
      skipsMission: false,
    },
    {
      id: "u6",
      playerId: "sashko",
      name: "Інтерсесори",
      rosterUnitIds: ["oc9gmod"],
      xp: 4,
      honours: [
        { id: "marksmen", weapon: "Bolt Rifle" },
        { id: "holdTheLine", weapon: null },
      ],
      scars: [],
      skipsMission: false,
    },
    {
      id: "u7",
      playerId: "sashko",
      name: "Техмарин",
      rosterUnitIds: ["gznfiwm"],
      xp: 3,
      honours: [{ id: "holdTheLine", weapon: null }],
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
    {
      id: "u9",
      playerId: "sashko",
      name: "Апотекарій",
      rosterUnitIds: ["e9k1cls"],
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
    { number: 3, name: "WAAAGH!", result: null, pointsLimit: 650, notes: "" },
    { number: 4, name: "Справжній ворог", result: null, pointsLimit: 650, notes: "" },
    { number: 5, name: "Брама Тартаруса", result: null, pointsLimit: 800, notes: "" },
  ],
};

const orks = (...ids: string[]) => ids.map((unitId) => ({ armyId: "Orks", unitId }));
const chaos = (...ids: string[]) => ids.map((unitId) => ({ armyId: "Chaos", unitId }));

/**
 * Each mission's enemy as the campaign book lists it (book rev 15), out of
 * the 10th edition rosters armies/Orks.json and armies/Chaos.json. Leaders
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
  // «Діти Горуса» with enthralled Orks: army rule only, base stratagems.
  4: {
    units: [
      ...chaos(
        "dz6oufs",
        "6a5fd9816e3b9858f2d3c611",
        "j24j3p5",
        "qad6moh",
        "04w4r2",
        "pb6ek4",
        "16bmj1",
        "ul7ttvm",
        "uodfb6l",
        "h0b1vou",
        "9jdxxt",
      ),
      ...orks("17fyghe", "exsxqb", "410rll", "e65dz8e"),
    ],
    leaders: { dz6oufs: "6a5fd9816e3b9858f2d3c611", "17fyghe": "exsxqb" },
    detachment: null,
  },
  // The Black Crusade: the whole Chaos roster, 2000 points.
  5: {
    units: [
      ...chaos(
        "tnrntf",
        "2bhtdil",
        "qad6moh",
        "dz6oufs",
        "6a5fd9816e3b9858f2d3c611",
        "j24j3p5",
        "ul7ttvm",
        "04w4r2",
        "pb6ek4",
        "16bmj1",
        "ivlh8f",
        "9nq8kix",
        "46lwtbe",
        "h0b1vou",
        "uodfb6l",
        "9jdxxt",
      ),
    ],
    leaders: { tnrntf: "2bhtdil", dz6oufs: "6a5fd9816e3b9858f2d3c611" },
    detachment: null,
  },
};

export const BOOK_ENEMIES: BookEnemies = { [ASHES_OF_ARMAGEDDON.name]: MISSION_ENEMIES };
