import type { ParsedUnit } from "../../parseRoster.mjs";

const MARKUP = /\*\*|\^\^/g;

/**
 * Extract the eligible unit names from a "Leader" ability's rule text. New
 * Recruit renders the list in one of two shapes: as lines starting with
 * "■ " or "- " (most datasheets), or as one inline comma-separated run
 * after "following units:" (e.g. Marneus Calgar, the Warpsmith). Either
 * way names may be wrapped in markdown-ish "**^^Name^^**"; strip the
 * bullets and the markup to get bare datasheet names. Any paragraph after
 * the list (attachment caveats) is ignored.
 */
export function parseLeaderEligibleNames(text: string | null): string[] {
  if (!text) return [];
  const bulleted = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^(■|-)\s+/.test(line))
    .map((line) => line.replace(/^(■|-)\s+/, "").replace(MARKUP, "").trim())
    .filter(Boolean);
  if (bulleted.length > 0) return bulleted;

  const inline = /following units?:\s*([^\n]+)/i.exec(text);
  if (!inline) return [];
  return inline[1]
    .replace(MARKUP, "")
    .split(",")
    .map((name) => name.trim().replace(/\.$/, ""))
    .filter(Boolean);
}

/** Units on this datasheet that can lead another unit — they carry a
 * "Leader" ability naming who they're allowed to attach to. */
export function getLeaderCandidates(units: ParsedUnit[]): ParsedUnit[] {
  return units.filter((u) => u.abilities.some((a) => a.name === "Leader"));
}

/** The specific unit instances in this army list that `leader` is allowed
 * to attach to, matched by datasheet name against its Leader ability text. */
export function getEligibleTargets(
  leader: ParsedUnit,
  units: ParsedUnit[],
): ParsedUnit[] {
  const ability = leader.abilities.find((a) => a.name === "Leader");
  const names = new Set(
    parseLeaderEligibleNames(ability?.text ?? null).map((n) => n.toUpperCase()),
  );
  if (names.size === 0) return [];
  return units.filter(
    (u) => u.id !== leader.id && names.has(u.name.toUpperCase()),
  );
}

export interface UnitBlock {
  leaders: ParsedUnit[];
  unit: ParsedUnit;
}

/**
 * Group a unit list into display blocks: a unit with leaders attached to it
 * (per `assignments`, leaderUnitId -> targetUnitId) carries them in
 * `leaders`, and each attached leader is pulled out of its own top-level
 * slot so it renders once, directly above the unit it leads. A leader whose
 * assigned target isn't in this list (a stale assignment, or one leader
 * attached to another) surfaces as its own standalone block rather than
 * silently vanishing.
 */
export function groupUnitsByLeader(
  units: ParsedUnit[],
  assignments: Record<string, string>,
): UnitBlock[] {
  const unitIds = new Set(units.map((u) => u.id));
  const leadersByTarget = new Map<string, ParsedUnit[]>();
  const attachedLeaderIds = new Set<string>();

  for (const unit of units) {
    const targetId = assignments[unit.id];
    if (targetId && targetId !== unit.id && unitIds.has(targetId)) {
      const list = leadersByTarget.get(targetId) ?? [];
      list.push(unit);
      leadersByTarget.set(targetId, list);
      attachedLeaderIds.add(unit.id);
    }
  }

  return units
    .filter((unit) => !attachedLeaderIds.has(unit.id))
    .map((unit) => ({ leaders: leadersByTarget.get(unit.id) ?? [], unit }));
}

/**
 * The units in the order the list actually renders them (see UnitList):
 * each attached leader directly above the unit it leads. This is the order
 * the on-screen unit numbers follow, so "3 against 7" from the voice
 * command resolves to the same rows the player is looking at.
 */
export function orderedUnits(
  units: ParsedUnit[],
  assignments: Record<string, string>,
): ParsedUnit[] {
  return groupUnitsByLeader(units, assignments).flatMap((block) => [
    ...block.leaders,
    block.unit,
  ]);
}
