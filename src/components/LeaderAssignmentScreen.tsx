import type { ParsedUnit } from "../../parseRoster.mjs";
import { getEligibleTargets, getLeaderCandidates } from "../lib/leaders";

interface LeaderAssignmentPanelProps {
  units: ParsedUnit[];
  assignments: Record<string, string>;
  onAssign: (leaderId: string, targetId: string | null) => void;
}

export function LeaderAssignmentPanel({
  units,
  assignments,
  onAssign,
}: LeaderAssignmentPanelProps) {
  const leaders = getLeaderCandidates(units);

  if (leaders.length === 0) {
    return (
      <div className="px-4 text-[14.5px] text-[var(--ink-soft)]">
        No units in this army have a Leader ability.
      </div>
    );
  }

  return (
    <ul className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col gap-2 px-4 pb-4">
      {leaders.map((leader) => (
        <LeaderRow
          key={leader.id}
          leader={leader}
          units={units}
          currentTargetId={assignments[leader.id] ?? null}
          onAssign={onAssign}
        />
      ))}
    </ul>
  );
}

function LeaderRow({
  leader,
  units,
  currentTargetId,
  onAssign,
}: {
  leader: ParsedUnit;
  units: ParsedUnit[];
  currentTargetId: string | null;
  onAssign: (leaderId: string, targetId: string | null) => void;
}) {
  const eligible = getEligibleTargets(leader, units);

  // Disambiguate same-named eligible units (e.g. two "Legionaries" squads)
  // with a stable "#N" ordinal, since a leader must attach to one specific
  // instance, not just a datasheet name.
  const nameOccurrences = new Map<string, number>();
  const nameTotals = new Map<string, number>();
  for (const u of eligible) {
    nameTotals.set(u.name, (nameTotals.get(u.name) ?? 0) + 1);
  }

  return (
    <li
      className="rounded-[8px] p-3"
      style={{ background: "var(--panel)", border: "1px solid var(--rule)" }}
    >
      <div className="text-[15px] font-semibold">{leader.name}</div>
      {eligible.length === 0 ? (
        <div className="text-[12.5px] text-[var(--ink-soft)] mt-1.5">
          No eligible unit in this list.
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5 mt-2">
          <ToggleButton
            label="Unattached"
            active={currentTargetId === null}
            onClick={() => onAssign(leader.id, null)}
          />
          {eligible.map((target) => {
            const n = (nameOccurrences.get(target.name) ?? 0) + 1;
            nameOccurrences.set(target.name, n);
            const label =
              (nameTotals.get(target.name) ?? 0) > 1
                ? `${target.name} #${n}`
                : target.name;
            return (
              <ToggleButton
                key={target.id}
                label={label}
                active={currentTargetId === target.id}
                onClick={() => onAssign(leader.id, target.id)}
              />
            );
          })}
        </div>
      )}
    </li>
  );
}

export function ToggleButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-[36px] px-3 rounded-[7px] text-[13px] font-medium"
      style={{
        background: "var(--inset)",
        color: active ? "var(--positive)" : "var(--ink)",
        border: `1px solid ${active ? "var(--positive)" : "var(--rule)"}`,
      }}
    >
      {label}
    </button>
  );
}
