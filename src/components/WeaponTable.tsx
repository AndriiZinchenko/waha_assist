import type { WeaponEntry } from "../../parseRoster.mjs";
import { mergeByProfileId } from "../lib/weapons";
import { WeaponRow } from "./WeaponRow";

interface WeaponTableProps {
  weapons: WeaponEntry[];
}

type MergedWeapon = WeaponEntry;

function parentName(name: string): string {
  return name.replace(/ - [^-]+$/, "");
}

type Group =
  | { kind: "single"; weapon: MergedWeapon }
  | { kind: "group"; name: string; variants: MergedWeapon[] };

function groupSubProfiles(weapons: MergedWeapon[]): Group[] {
  const groups: Group[] = [];
  const byParent = new Map<string, MergedWeapon[]>();

  for (const w of weapons) {
    if (!w.subProfile) {
      groups.push({ kind: "single", weapon: w });
      continue;
    }
    const name = parentName(w.name);
    const list = byParent.get(name) ?? [];
    list.push(w);
    byParent.set(name, list);
  }

  for (const [name, variants] of byParent) {
    groups.push({ kind: "group", name, variants });
  }

  return groups;
}

function Section({
  label,
  weapons,
  divider = false,
}: {
  label: string;
  weapons: MergedWeapon[];
  /** Draw a full-width rule above this group, separating it from the one
   * before it. */
  divider?: boolean;
}) {
  if (weapons.length === 0) return null;
  const groups = groupSubProfiles(weapons);
  // Zebra striping restarts per group so rows never read as one list
  // continuing across the divider.
  let rowIndex = 0;

  return (
    <div
      className={divider ? "mt-2 pt-1" : undefined}
      style={divider ? { borderTop: "1px solid var(--rule)" } : undefined}
    >
      <div
        className="mx-3 mt-1.5 mb-1 pl-2 text-[12.5px] font-semibold uppercase tracking-[0.06em]"
        style={{
          color: "var(--accent-heading)",
          borderLeft: "3px solid var(--accent)",
        }}
      >
        {label}
      </div>
      {groups.map((group) => {
        if (group.kind === "single") {
          const zebra = rowIndex % 2 === 1;
          rowIndex += 1;
          return (
            <WeaponRow
              key={group.weapon.profileId}
              weapon={group.weapon}
              zebra={zebra}
            />
          );
        }
        return (
          <div key={group.name}>
            <div className="px-3 pt-1 text-[15.5px] font-semibold">
              {group.name}
            </div>
            {group.variants.map((variant) => {
              const zebra = rowIndex % 2 === 1;
              rowIndex += 1;
              return (
                <WeaponRow
                  key={variant.profileId}
                  weapon={variant}
                  indent
                  zebra={zebra}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export function WeaponTable({ weapons }: WeaponTableProps) {
  const merged = mergeByProfileId(weapons);
  const ranged = merged.filter((w) => w.type === "ranged");
  const melee = merged.filter((w) => w.type === "melee");

  return (
    <div>
      <div className="px-3 pt-2 grid grid-cols-[2.5rem_1fr_3rem_2.5rem_2.5rem_2rem_2rem_2.5rem] gap-x-1 text-[11.5px] text-[var(--ink-soft)] uppercase tracking-[0.04em]">
        <span>Ct</span>
        <span>Weapon</span>
        <span>Range</span>
        <span>A</span>
        <span>Skill</span>
        <span>S</span>
        <span>AP</span>
        <span>D</span>
      </div>
      <Section label="Ranged" weapons={ranged} />
      <Section label="Melee" weapons={melee} divider={ranged.length > 0} />
    </div>
  );
}
