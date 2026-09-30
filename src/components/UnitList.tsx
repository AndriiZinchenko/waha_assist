import { Fragment, useEffect, useRef } from "react";
import type { ParsedUnit } from "../../parseRoster.mjs";
import type { DetachmentData } from "../data/detachments";
import { groupUnitsByLeader, orderedUnits } from "../lib/leaders";
import { UnitRow } from "./UnitRow";

interface UnitListProps {
  units: ParsedUnit[];
  /** leaderUnitId -> the unit id it's attached to — a leader renders once,
   * directly above the unit it leads, instead of as its own list entry. */
  leaderAssignments: Record<string, string>;
  selectedUnitId: string | null;
  onSelectUnit: (unitId: string | null) => void;
  counts: Record<string, number>;
  onCountChange: (key: string, next: number) => void;
  detachmentData: DetachmentData | null;
  /** Show each row's list number (voice mode). */
  showNumbers?: boolean;
}

export function UnitList({
  units,
  leaderAssignments,
  selectedUnitId,
  onSelectUnit,
  counts,
  onCountChange,
  detachmentData,
  showNumbers = false,
}: UnitListProps) {
  const rowRefs = useRef(new Map<string, HTMLLIElement>());

  useEffect(() => {
    if (!selectedUnitId) return;

    // The expanding row's own card is what creates room to scroll it to
    // the top — for the last unit in the list especially, there's nothing
    // below it to scroll into until its card has grown. That growth runs
    // on the `.expand-body` CSS transition (150ms, see index.css), so
    // scrolling immediately can under-scroll: the browser clamps to
    // whatever's scrollable *right now*, before the card has expanded.
    // Wait for the transition to finish first.
    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const delay = reduceMotion ? 0 : 170;

    const timer = window.setTimeout(() => {
      rowRefs.current
        .get(selectedUnitId)
        ?.scrollIntoView({ block: "start", behavior: "smooth" });
    }, delay);

    return () => window.clearTimeout(timer);
  }, [selectedUnitId]);

  const blocks = groupUnitsByLeader(units, leaderAssignments);
  // Numbers follow render order (leaders above their unit), the same
  // order App resolves a spoken "3 against 7" against.
  const numbers = new Map(
    orderedUnits(units, leaderAssignments).map((u, i) => [u.id, i + 1]),
  );

  function registerRef(id: string) {
    return (el: HTMLLIElement | null) => {
      if (el) rowRefs.current.set(id, el);
      else rowRefs.current.delete(id);
    };
  }

  return (
    <ul className="m-0 p-0 list-none">
      {blocks.map((block) => (
        <Fragment key={block.unit.id}>
          {block.leaders.map((leader) => (
            <UnitRow
              key={leader.id}
              ref={registerRef(leader.id)}
              unit={leader}
              expanded={leader.id === selectedUnitId}
              onToggle={() =>
                onSelectUnit(leader.id === selectedUnitId ? null : leader.id)
              }
              counts={counts}
              onCountChange={onCountChange}
              detachmentData={detachmentData}
              number={showNumbers ? numbers.get(leader.id) : undefined}
            />
          ))}
          <UnitRow
            ref={registerRef(block.unit.id)}
            unit={block.unit}
            expanded={block.unit.id === selectedUnitId}
            onToggle={() =>
              onSelectUnit(
                block.unit.id === selectedUnitId ? null : block.unit.id,
              )
            }
            counts={counts}
            onCountChange={onCountChange}
            detachmentData={detachmentData}
            indent={block.leaders.length > 0}
            number={showNumbers ? numbers.get(block.unit.id) : undefined}
          />
        </Fragment>
      ))}
    </ul>
  );
}
