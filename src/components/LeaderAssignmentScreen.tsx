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
      <div className="px-[16px]">
        <div
          className="p-[20px] rounded-[var(--r-control)] text-[16px] font-medium"
          style={{ background: "var(--panel)", border: "1px dashed var(--rule)", color: "var(--ink-2)" }}
        >
          No units in this army have a Leader ability.
        </div>
      </div>
    );
  }

  return (
    <ul className="flex-1 min-h-0 overflow-y-auto overscroll-contain m-0 list-none flex flex-col gap-[10px] px-[16px] pt-[2px] pb-[calc(16px+env(safe-area-inset-bottom))]">
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
  const nameTotals = new Map<string, number>();
  for (const u of eligible) {
    nameTotals.set(u.name, (nameTotals.get(u.name) ?? 0) + 1);
  }
  const nameOccurrences = new Map<string, number>();
  const options = eligible.map((target) => {
    const n = (nameOccurrences.get(target.name) ?? 0) + 1;
    nameOccurrences.set(target.name, n);
    const label = (nameTotals.get(target.name) ?? 0) > 1 ? `${target.name} #${n}` : target.name;
    return { id: target.id, label };
  });
  const current = options.find((o) => o.id === currentTargetId) ?? null;

  return (
    <li
      className="rounded-[var(--r-control)] p-[14px]"
      style={{ background: "var(--panel)", border: "1px solid var(--rule-soft)" }}
    >
      <div className="flex items-baseline justify-between gap-[12px]">
        <span className="display font-bold text-[18px] leading-[1.15]">{leader.name}</span>
        <span
          className="text-[14px] font-medium shrink-0 text-right"
          style={{ color: current ? "var(--ink)" : "var(--ink-soft)" }}
        >
          {current ? `→ ${current.label}` : "Unattached"}
        </span>
      </div>
      {eligible.length === 0 ? (
        <div className="text-[14px] font-medium mt-[8px]" style={{ color: "var(--ink-2)" }}>
          No eligible unit in this list.
        </div>
      ) : (
        <div className="flex flex-wrap gap-[6px] mt-[10px]">
          <ChoiceChip
            label="Unattached"
            active={currentTargetId === null}
            onClick={() => onAssign(leader.id, null)}
          />
          {options.map((option) => (
            <ChoiceChip
              key={option.id}
              label={option.label}
              active={currentTargetId === option.id}
              onClick={() => onAssign(leader.id, option.id)}
            />
          ))}
        </div>
      )}
    </li>
  );
}

/** 44px choice chip; the selected one is inverted with a ✓. */
export function ChoiceChip({
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
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-[44px] px-[12px] rounded-[var(--r-control)] text-[15px] font-semibold ${active ? "selected" : ""}`}
      style={{
        border: `1px solid ${active ? "var(--ink)" : "var(--rule)"}`,
        color: active ? undefined : "var(--ink-2)",
      }}
    >
      {active ? `✓ ${label}` : label}
    </button>
  );
}
