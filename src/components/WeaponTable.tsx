import type { WeaponEntry } from "../../parseRoster.mjs";
import { mergeByProfileId } from "../lib/weapons";
import { WEAPON_GRID, WeaponRow } from "./WeaponRow";

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

/**
 * RANGED / MELEE group: the label, one shared column header, then the
 * weapons. Phone: each weapon is a name line over a six-value line on the
 * header's grid. Tablet (≥900px): one row per weapon, name first.
 */
function Section({
  label,
  skillLabel,
  weapons,
}: {
  label: string;
  skillLabel: string;
  weapons: MergedWeapon[];
}) {
  if (weapons.length === 0) return null;
  const groups = groupSubProfiles(weapons);
  const columns = ["RNG", "A", skillLabel, "S", "AP", "D"];

  return (
    <div className="pt-[12px]">
      <div className="section-label px-[14px]">{label}</div>
      <div className={`${WEAPON_GRID} px-[14px] pt-[6px] pb-[4px]`} aria-hidden="true">
        <span className="hidden min-[900px]:block" />
        {columns.map((c) => (
          <span key={c} className="caption caption-sm">
            {c}
          </span>
        ))}
      </div>
      {groups.map((group) => {
        if (group.kind === "single") {
          return <WeaponRow key={group.weapon.profileId} weapon={group.weapon} />;
        }
        return (
          <div key={group.name} style={{ borderTop: "1px solid var(--rule-soft)" }}>
            <div className="px-[14px] pt-[10px] text-[17px] font-semibold">{group.name}</div>
            {group.variants.map((variant) => (
              <WeaponRow key={variant.profileId} weapon={variant} indent />
            ))}
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
    <div className="pb-[4px]">
      <Section label="Ranged" skillLabel="BS" weapons={ranged} />
      <Section label="Melee" skillLabel="WS" weapons={melee} />
    </div>
  );
}
