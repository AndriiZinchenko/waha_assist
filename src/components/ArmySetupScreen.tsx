import type { ArmyEntry } from "../lib/armies";
import { canStart, type ArmySelection, type Slot } from "../lib/armySetup";
import { effectiveDetachment } from "../lib/detachment";
import type { Edition } from "../lib/edition";
import { useUi } from "../lib/uiStrings";
import { MARK_GLYPH } from "../lib/sides";
import { EditionToggle } from "./EditionToggle";
import { SideMark } from "./SideMark";

interface ArmySetupScreenProps {
  /** The armies of the chosen edition. */
  armies: ArmyEntry[];
  edition: Edition;
  /** How many armies each edition has in all. */
  editionCounts: Record<Edition, number>;
  onChangeEdition: (next: Edition) => void;
  selection: ArmySelection;
  detachmentOverrides: Record<string, string>;
  /** Put `armyId` on `slot`, or clear the slot if it already holds it. */
  onAssign: (slot: Slot, armyId: string) => void;
  onStart: () => void;
  onConfigure: (armyId: string) => void;
}

const SLOTS: Slot[] = ["a", "b"];

const SIDE_COLOR: Record<Slot, string> = {
  a: "var(--side-a)",
  b: "var(--side-b)",
};

/** "Chaos - Chaos Space Marines" -> "Chaos Space Marines". */
function shortName(catalogue: string): string {
  const parts = catalogue.split(" - ");
  return parts[parts.length - 1];
}

export function ArmySetupScreen({
  armies,
  edition,
  editionCounts,
  onChangeEdition,
  selection,
  detachmentOverrides,
  onAssign,
  onStart,
  onConfigure,
}: ArmySetupScreenProps) {
  const ui = useUi();

  if (editionCounts[10] + editionCounts[11] === 0) {
    return (
      <div className="p-[16px]">
        <div
          className="p-[20px] rounded-[var(--r-control)]"
          style={{ background: "var(--panel)", border: "1px dashed var(--rule)" }}
        >
          <div className="display font-bold text-[20px]">No rosters found yet</div>
          <p className="prose m-0 mt-[6px]">
            Add a New Recruit JSON export to the <code>armies/</code> folder, or run{" "}
            <code>npm run sync:armies</code>.
          </p>
        </div>
      </div>
    );
  }

  const ready = canStart(selection);
  const armyA = armies.find((a) => a.id === selection.a) ?? null;
  const armyB = armies.find((a) => a.id === selection.b) ?? null;
  const missing: Slot | null = !armyA ? "a" : !armyB ? "b" : null;

  return (
    <div className="flex flex-col flex-1 min-h-0 max-w-[920px] w-full mx-auto">
      <div className="shrink-0 px-[16px] pt-[12px]">
        <EditionToggle edition={edition} counts={editionCounts} onChange={onChangeEdition} />
      </div>
      <p className="hint shrink-0 m-0 px-[16px] py-[12px]">
        Tap an army to configure it. Use A | B to assign it to a side.
      </p>
      {armies.length === 0 && (
        <p className="prose flex-1 min-h-0 m-0 px-[16px]">
          {ui("setup.noEdition", { edition: `${edition}th` })} <code>npm run sync:armies</code>.
        </p>
      )}
      <ul className="flex-1 min-h-0 overflow-y-auto overscroll-contain m-0 p-0 list-none">
        {armies.map((army) => {
          const onA = selection.a === army.id;
          const onB = selection.b === army.id;
          // A's identity wins when the army sits on both sides (a mirror match).
          const assigned: Slot | null = onA ? "a" : onB ? "b" : null;

          return (
            <li
              key={army.id}
              className="min-h-[76px] flex items-center gap-[10px] pl-[16px] pr-[10px] py-[8px]"
              style={{
                borderTop: "1px solid var(--rule-soft)",
                background: assigned ? `var(--side-${assigned}-fill)` : undefined,
                boxShadow:
                  assigned === "a"
                    ? "inset 4px 0 0 var(--side-a)"
                    : assigned === "b"
                      ? "inset -4px 0 0 var(--side-b)"
                      : undefined,
              }}
            >
              <button
                type="button"
                onClick={() => onConfigure(army.id)}
                aria-label={`Configure ${army.parsed.catalogue}`}
                className="flex-1 min-w-0 min-h-[56px] flex items-center justify-between gap-[12px] text-left"
              >
                <span className="min-w-0">
                  <span className="display block font-bold text-[18px] leading-[1.15]">
                    {army.parsed.catalogue}
                  </span>
                  <span
                    className="block text-[14px] font-medium mt-[3px]"
                    style={{ color: "var(--ink-2)" }}
                  >
                    {[effectiveDetachment(army, detachmentOverrides), army.parsed.name]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <span
                  className="mono text-[14px] font-semibold shrink-0"
                  style={{ color: "var(--ink-soft)" }}
                >
                  {army.parsed.pointsTotal ?? "—"}pts
                </span>
              </button>
              <div
                role="group"
                aria-label={`Side for ${army.parsed.catalogue}`}
                className="flex shrink-0 rounded-[var(--r-control)] overflow-hidden"
                style={{ outline: "1px solid var(--rule)", outlineOffset: -1 }}
              >
                {SLOTS.map((slot) => (
                  <SidePickCell
                    key={slot}
                    slot={slot}
                    active={selection[slot] === army.id}
                    onClick={() => onAssign(slot, army.id)}
                  />
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      <div
        className="shrink-0 px-[16px] pt-[12px] pb-[calc(12px+env(safe-area-inset-bottom))] flex flex-col gap-[8px]"
        style={{ background: "var(--panel)", borderTop: "1px solid var(--rule)" }}
      >
        {ready && armyA && armyB ? (
          <div className="min-w-0 flex items-center gap-[8px] text-[16px] font-semibold">
            <MatchName slot="a" name={shortName(armyA.parsed.catalogue)} />
            <span className="mono text-[13px] font-medium shrink-0" style={{ color: "var(--ink-soft)" }}>
              vs
            </span>
            <MatchName slot="b" name={shortName(armyB.parsed.catalogue)} />
          </div>
        ) : (
          missing && (
            <p className="m-0 text-[14px] font-medium" style={{ color: "var(--ink-2)" }}>
              {ui("setup.needSide", { side: "\u0000" })
                .split("\u0000")
                .flatMap((part, i) =>
                  i === 0
                    ? [part]
                    : [
                        <span key="side" style={{ color: SIDE_COLOR[missing] }}>
                          {MARK_GLYPH[missing]} {missing.toUpperCase()}
                        </span>,
                        part,
                      ],
                )}
            </p>
          )
        )}
        <button
          type="button"
          disabled={!ready}
          onClick={onStart}
          className="chamfer display h-[52px] w-full text-[19px] font-extrabold tracking-[0.16em]"
          style={{
            background: ready ? "var(--selected-bg)" : "var(--paper-sunk)",
            color: ready ? "var(--selected-fg)" : "var(--ink-off)",
          }}
        >
          START BATTLE
        </button>
      </div>
    </div>
  );
}

function MatchName({ slot, name }: { slot: Slot; name: string }) {
  return (
    <span className="min-w-0 flex items-center gap-[6px]" style={{ color: SIDE_COLOR[slot] }}>
      <SideMark side={slot} size={slot === "a" ? 11 : 13} />
      <span className="truncate">{name}</span>
    </span>
  );
}

/** One 44×44 cell of the A|B picker: outlined square / diamond when free,
 * filled with the side colour when this army holds the side. */
function SidePickCell({
  slot,
  active,
  onClick,
}: {
  slot: Slot;
  active: boolean;
  onClick: () => void;
}) {
  const letter = slot.toUpperCase();
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={`Side ${letter}`}
      onClick={onClick}
      className="w-[44px] h-[44px] flex items-center justify-center"
      style={{
        background: active ? SIDE_COLOR[slot] : "var(--paper)",
        borderLeft: slot === "b" ? "1px solid var(--rule)" : undefined,
      }}
    >
      {active ? (
        <span
          className="display font-extrabold text-[17px]"
          style={{ color: `var(--side-${slot}-on)` }}
        >
          {letter}
        </span>
      ) : slot === "a" ? (
        <span
          className="display w-[24px] h-[24px] flex items-center justify-center font-bold text-[14px]"
          style={{ border: "1.5px solid var(--ink-2)", color: "var(--ink-2)" }}
        >
          {letter}
        </span>
      ) : (
        <span
          className="w-[22px] h-[22px] flex items-center justify-center rotate-45"
          style={{ border: "1.5px solid var(--ink-2)" }}
        >
          <span className="display -rotate-45 font-bold text-[13px]" style={{ color: "var(--ink-2)" }}>
            {letter}
          </span>
        </span>
      )}
    </button>
  );
}
