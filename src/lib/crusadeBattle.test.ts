import { describe, expect, it } from "vitest";
import { ASHES_OF_ARMAGEDDON as seed, BOOK_ENEMIES } from "../data/crusade-seed";
import { optionsLookupForArmy } from "../data/unit-options";
import { armies } from "./armies";
import { updateUnit, type CrusadeState } from "./crusade";
import {
  crusadeAlliesId,
  crusadeBattleArmies,
  crusadeEnemyId,
  crusadeLeaderAssignments,
  editionOfArmyId,
  isCrusadeArmyId,
  missionOfArmyId,
  withCrusadeMods,
} from "./crusadeBattle";
import { computeAttackTable, emptyModifiers } from "./combat";

const tenth = armies.filter((a) => a.edition === 10);

function sides(crusade: CrusadeState, mission = 3) {
  const all = crusadeBattleArmies(crusade, armies, {}, BOOK_ENEMIES);
  const edition = (crusade.missions.find((m) => m.number === mission)?.edition ?? 10) as 10 | 11;
  return {
    allies: all.find((a) => a.id === crusadeAlliesId(edition))!,
    enemy: all.find((a) => a.id === crusadeEnemyId(mission))!,
    ids: all.map((a) => a.id),
  };
}

describe("crusadeBattleArmies", () => {
  it("puts both players' campaign units on the allied side, from each edition's rosters", () => {
    const tenthSide = sides(seed, 3).allies;
    expect(tenthSide.id).toBe(crusadeAlliesId(10));
    expect(tenthSide.fromCrusade).toBe(true);
    expect(tenthSide.parsed.units.map((u) => u.name)).toEqual([
      "Бібліотекар",
      "Страйк-сквад (перший)",
      "Термінатори Братства",
      "Інтерсептори",
      "Страйк-сквад (другий)",
      "Хеллбластери «золоті наплічники»",
      "Хеллбластери «білі наплічники»",
      "Інтерсесори",
      "Техмарин",
      "Апотекарій",
      "Редемптор",
      "Елімінатори",
    ]);
    const eleventhSide = sides(seed, 4).allies;
    expect(eleventhSide.id).toBe(crusadeAlliesId(11));
    expect(eleventhSide.edition).toBe(11);
    expect(eleventhSide.parsed.units.map((u) => u.name)).toEqual(tenthSide.parsed.units.map((u) => u.name));
    // 11th edition datasheets: the Redemptor carries a Macro Plasma Incinerator.
    const redemptor = eleventhSide.parsed.units.find((u) => u.name === "Редемптор")!;
    expect(redemptor.weapons.map((w) => w.name)).toContain("Macro Plasma Incinerator - Standard");
    expect(eleventhSide.parsed.pointsLimit).toBe(700);
  });

  it("leaves out units that skip the mission or are written off", () => {
    let state = updateUnit(seed, "u8", (u) => ({ ...u, skipsMission: true }));
    state = updateUnit(state, "u9", (u) => ({ ...u, scars: ["limp", "panic", "concussion"] }));
    const names = sides(state).allies.parsed.units.map((u) => u.name);
    expect(names).not.toContain("Елімінатори");
    expect(names).not.toContain("Апотекарій");
  });

  it("builds one enemy side per mission from the campaign book", () => {
    expect(sides(seed).ids).toEqual([
      crusadeAlliesId(10),
      crusadeAlliesId(11),
      ...[1, 2, 3, 4, 5].map(crusadeEnemyId),
    ]);
    const { enemy } = sides(seed, 3);
    expect(enemy.fromCrusade).toBe(true);
    expect(enemy.parsed.units).toHaveLength(14);
    expect(enemy.parsed.detachment).toBe("War Horde");
  });

  it("totals each mission's enemy as the book does, without roster enhancements", () => {
    const points = (n: number) => sides(seed, n).enemy.parsed.pointsTotal;
    expect(points(3)).toBe(1700);
    // The book counts the Forgefiend at 155; the 11th edition roster adds 15
    // for its wargear.
    expect(points(4)).toBe(2380 + 15);
    // The book's finale total already takes the roster's own Chaos total.
    expect(points(5)).toBe(2845);
    const warbosses = sides(seed, 3).enemy.parsed.units.filter((u) => u.name === "Warboss in Mega Armour");
    expect(warbosses.map((u) => u.totalPoints)).toEqual([80, 80]);
    expect(warbosses.flatMap((u) => u.abilities.map((a) => a.name))).not.toContain("Tellyporta");
    expect(warbosses.flatMap((u) => u.abilities.map((a) => a.name))).not.toContain("Da Biggest Boss");
  });

  it("mixes rosters when a mission does, with no detachment", () => {
    const { enemy } = sides(seed, 4);
    expect(enemy.edition).toBe(11);
    expect(enemy.sourceCatalogues).toEqual(["Chaos - Chaos Space Marines", "Xenos - Orks"]);
    expect(enemy.parsed.detachment).toBeNull();
    expect(enemy.parsed.units.map((u) => u.name)).toContain("Nobz");
  });

  it("uses the roster's detachment when the mission names none", () => {
    const state = {
      ...seed,
      missions: seed.missions.map((m) =>
        m.number === 3 ? { ...m, enemy: { units: [{ armyId: "Orks", unitId: "e65dz8e" }], leaders: {} } } : m,
      ),
    };
    const orks = tenth.find((a) => a.id === "Orks")!;
    expect(sides(state, 3).enemy.parsed.detachment).toBe(orks.parsed.detachment);
  });

  it("has no enemy side for a mission set to none, and nothing without a campaign", () => {
    const state = {
      ...seed,
      missions: seed.missions.map((m) => (m.number === 2 ? { ...m, enemy: null } : m)),
    };
    expect(sides(state).ids).not.toContain(crusadeEnemyId(2));
    expect(crusadeBattleArmies(null, armies, {}, BOOK_ENEMIES)).toEqual([]);
  });

  it("looks weapon options up in both players' catalogues", () => {
    const { allies } = sides(seed);
    const lookup = optionsLookupForArmy(allies);
    const librarian = allies.parsed.units.find((u) => u.name === "Бібліотекар")!;
    const hellblasters = allies.parsed.units.find((u) => u.name.startsWith("Хеллбластери"))!;
    expect(allies.sourceCatalogues).toHaveLength(2);
    expect(lookup(librarian.entryId)).not.toBeNull();
    expect(lookup(hellblasters.entryId)).not.toBeNull();
    // Each unit is resolved from its own faction, whichever comes first.
    expect(lookup(librarian.entryId)).toEqual(optionsLookupForArmy({ parsed: { catalogue: "Imperium - Grey Knights" } })(librarian.entryId));
    expect(lookup(hellblasters.entryId)).toEqual(
      optionsLookupForArmy({ parsed: { catalogue: "Imperium - Adeptus Astartes - Ultramarines" } })(hellblasters.entryId),
    );
  });
});

describe("crusadeLeaderAssignments", () => {
  it("attaches campaign leaders and that mission's enemy leaders only", () => {
    expect(crusadeLeaderAssignments(seed, armies, 1, BOOK_ENEMIES)).toEqual({
      "8ki8zfu": "hx1q9z", // the Librarian leads the Terminators campaign unit
      ew82oou: "f10ofxh",
      f9qip2i: "isri4r",
    });
    // The Mek leads the Lootas in mission 3 but stands alone in mission 1.
    expect(crusadeLeaderAssignments(seed, armies, 3, BOOK_ENEMIES).ed432s).toBe("gejool");
    expect(crusadeLeaderAssignments(seed, armies, 1, BOOK_ENEMIES).ed432s).toBeUndefined();
  });

  it("attaches a leader inside its own campaign unit when it leads nobody else", () => {
    const state = {
      ...seed,
      units: seed.units.map((u) =>
        u.id === "u1" ? { ...u, rosterUnitIds: ["8ki8zfu", "35p7rad"], leads: undefined } : u,
      ),
    };
    expect(crusadeLeaderAssignments(state, armies, 1, BOOK_ENEMIES)["8ki8zfu"]).toBe("35p7rad");
  });

  it("uses the 11th edition roster ids in an 11th edition mission", () => {
    const leaders = crusadeLeaderAssignments(seed, armies, 4, BOOK_ENEMIES);
    expect(leaders["9ycodx"]).toBe("ubmqvr6"); // Librarian -> the 11th edition Terminators
    expect(leaders["8ki8zfu"]).toBeUndefined();
    expect(leaders.t37h8k8).toBe("8i5t8w");
  });
});

describe("isCrusadeArmyId", () => {
  it("knows the campaign sides from real armies", () => {
    expect(isCrusadeArmyId(crusadeAlliesId(11))).toBe(true);
    expect(editionOfArmyId(crusadeAlliesId(11))).toBe(11);
    expect(isCrusadeArmyId(crusadeEnemyId(4))).toBe(true);
    expect(missionOfArmyId(crusadeEnemyId(4))).toBe(4);
    expect(missionOfArmyId(crusadeAlliesId(10))).toBeNull();
    expect(isCrusadeArmyId("Grey")).toBe(false);
    expect(isCrusadeArmyId(null)).toBe(false);
  });
});

describe("honours and scars in the calculator", () => {
  const ultramar = tenth.find((a) => a.id === "Ultramar")!.parsed.units;
  const grey = tenth.find((a) => a.id === "Grey")!.parsed.units;
  const nobz = tenth.find((a) => a.id === "Orks")!.parsed.units.find((u) => u.id === "e65dz8e")!;
  const gold = seed.units.find((u) => u.id === "u4")!;
  const goldRoster = ultramar.find((u) => u.id === "a26qs7d")!;

  function row(unit: ReturnType<typeof withCrusadeMods>, weapon: string, mods = emptyModifiers()) {
    return computeAttackTable(unit, {}, nobz, mods).find((r) => r.name === weapon)!;
  }

  it("Marksmen gives +1 to hit to the chosen profile only", () => {
    const modded = withCrusadeMods(goldRoster, gold);
    const standard = row(modded, "Plasma Incinerator - Standard");
    expect(standard.hitTarget).toBe(2);
    expect(standard.crusadeMods.map((m) => m.ref.name)).toEqual(["Влучні стрільці"]);
    expect(row(modded, "Plasma Incinerator - Supercharge").hitTarget).toBe(3);
  });

  it("stays within the +1 cap with other hit modifiers", () => {
    const modded = withCrusadeMods(goldRoster, gold);
    expect(row(modded, "Plasma Incinerator - Standard", { ...emptyModifiers(), hitMod: 1 }).hitTarget).toBe(2);
    expect(row(modded, "Plasma Incinerator - Standard", { ...emptyModifiers(), hitMod: -1 }).hitTarget).toBe(3);
  });

  it("Ruthless Blades improves the chosen melee profile's AP by 1", () => {
    const strike = grey.find((u) => u.id === "6a5fe1ce6e3b9858f2d3c614")!;
    const unit = {
      ...seed.units.find((u) => u.id === "u3")!,
      honours: [{ id: "ruthlessBlades" as const, weapon: "Nemesis force weapon" }],
    };
    const before = strike.weapons.find((w) => w.name === "Nemesis force weapon")!.ap;
    const after = withCrusadeMods(strike, unit).weapons.find((w) => w.name === "Nemesis force weapon")!;
    expect(after.ap).toBe(before - 1);
    expect(withCrusadeMods(strike, unit).weapons.find((w) => w.name === "Close combat weapon")!.crusadeMods).toBeUndefined();
  });

  it("lists a profile honour without a profile, and non-number honours and scars, under Кампанія", () => {
    const strike = grey.find((u) => u.id === "6a5fe1ce6e3b9858f2d3c614")!;
    const unit = { ...seed.units.find((u) => u.id === "u3")!, scars: ["limp" as const] };
    const modded = withCrusadeMods(strike, unit);
    const section = modded.abilitySections.find((s) => s.type === "Кампанія")!;
    expect(section.items.map((a) => a.name)).toEqual([
      "Безжальні клинки",
      "Тримають рубіж",
      "Непохитні",
      "Шрам: Кульгавість",
    ]);
    expect(section.items[0].text).toContain("Профіль зброї не вибрано");
  });

  it("Marksmen on a profile named without its mode covers every mode", () => {
    const intercessors = armies.find((a) => a.id === "Ultramar 11")!.parsed.units.find((u) => u.name === "Intercessor Squad")!;
    const modded = withCrusadeMods(intercessors, seed.units.find((u) => u.id === "u6")!);
    const rifles = modded.weapons.filter((w) => w.name.startsWith("Bolt Rifle"));
    expect(new Set(rifles.map((w) => w.name))).toEqual(
      new Set(["Bolt Rifle - Focused Fire", "Bolt Rifle - Saturation"]),
    );
    expect(rifles.every((w) => w.crusadeHitMod === 1)).toBe(true);
    expect(modded.weapons.find((w) => w.name === "Bolt pistol")!.crusadeHitMod).toBeUndefined();
  });

  it("Damaged Gear and Grievous Wound take 1 off hits at range and in melee", () => {
    const unit = { ...gold, honours: [], scars: ["damagedGear" as const, "grievousWound" as const] };
    const modded = withCrusadeMods(goldRoster, unit);
    expect(row(modded, "Plasma Incinerator - Standard").hitTarget).toBe(4);
    const melee = row(modded, "Close combat weapon");
    expect(melee.crusadeMods.map((m) => [m.ref.name, m.tone])).toEqual([["Важке поранення", "negative"]]);
  });

  it("is applied to the allied side the battle screen gets", () => {
    const { allies } = sides(seed);
    const goldOnSide = allies.parsed.units.find((u) => u.name === "Хеллбластери «золоті наплічники»")!;
    expect(goldOnSide.weapons.find((w) => w.name === "Plasma Incinerator - Standard")!.crusadeHitMod).toBe(1);
  });
});
