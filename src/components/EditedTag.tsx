import type { ParsedUnit } from "../../parseRoster.mjs";

/** Amber outlined tag for an edited unit or weapon. Same shape as the allied tag. */
export function EditedTag({ className = "" }: { className?: string }) {
  return (
    <span
      title="Weapons edited in app"
      className={`display text-[10px] font-bold uppercase tracking-[0.12em] px-[5px] py-[1px] rounded-[var(--r-tag)] shrink-0 ${className}`}
      style={{ border: "1px solid var(--negative)", color: "var(--negative)" }}
    >
      Edited
    </span>
  );
}

/** Datasheet line saying a unit's weapons were edited here, with anything
 * the user should double-check. */
export function EditedNotice({ unit }: { unit: ParsedUnit }) {
  const lines = ["Weapons edited in app — not validated."];
  if (unit.rosterChanged) {
    lines.push("The roster for this unit changed in New Recruit after this edit.");
  }
  if (unit.missingWeapons && unit.missingWeapons.length > 0) {
    lines.push(`Not in the catalogue: ${unit.missingWeapons.join(", ")}.`);
  }
  return (
    <div
      role="note"
      className="mx-[14px] mt-[12px] px-[12px] py-[10px] rounded-[var(--r-control)] text-[14px] font-medium flex flex-col gap-[4px]"
      style={{ background: "var(--negative-fill)", color: "var(--negative)" }}
    >
      {lines.map((line) => (
        <span key={line}>{line}</span>
      ))}
    </div>
  );
}
