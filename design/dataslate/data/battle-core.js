// Real-data core for the battle prototype. Ported from waha_assist/src/lib
// (combat.ts, loadouts.ts, leaders.ts, weapons.ts, rules.ts) + data files.
import { parseRoster } from './parseRoster.mjs';

export const GLOSSARY = {
  infantry: 'Foot troops. Infantry models can move through the walls of Ruins and are among the few unit types that can occupy their upper floors. Most Transport capacities, and many stratagems and abilities, apply only to Infantry units.',
  character: 'A hero that can lead other units. A Character with the Leader ability can be attached to a Bodyguard unit; while attached it cannot be picked out by attacks unless the attacker has Precision or every Bodyguard model has been destroyed. Characters are normally the only models that can be given Enhancements or be your Warlord.',
  'epic hero': 'A named, unique character. Only one of each Epic Hero can be included in your army, and Epic Heroes cannot be given Enhancements.',
  vehicle: 'A tank, walker or other war machine. Vehicles can shoot while within Engagement Range of enemy units (Big Guns Never Tire), at -1 to hit with weapons other than Pistols, and they cannot end a move on the upper floors of Ruins. Many stratagems and abilities either single out or exclude Vehicles.',
  walker: 'A Vehicle that moves on legs. Walkers can move through the walls of Ruins like Infantry, and they are the only Vehicles that can use the Heroic Intervention stratagem.',
  monster: 'A large creature. Like Vehicles, Monsters can shoot while within Engagement Range of enemy units (Big Guns Never Tire) and cannot end a move on the upper floors of Ruins. Many stratagems and abilities either single out or exclude Monsters.',
  mounted: 'Cavalry and bikers. Mounted units cannot end a move on the upper floors of Ruins, and Transport capacities normally exclude them.',
  battleline: 'A core troop choice. Battleline units can be taken up to six times in a Strike Force-size army instead of three, and many missions, detachment rules and stratagems single them out, typically when holding objectives.',
  transport: 'A unit that can carry other units. Its transport capacity lists which models can embark. Embarked units cannot be targeted, and cannot move or shoot unless the Transport\'s rules allow it (for example Firing Deck). If the Transport is destroyed, its passengers disembark and each model must roll a D6: on a 1 it is destroyed.',
  'dedicated transport': 'A Transport that is taken alongside the units it carries: for every Infantry unit in your army you can include one Dedicated Transport, over and above the normal datasheet limits.',
  psyker: 'A model that can manifest psychic powers. Psykers can use Psychic weapons and abilities, and suffer Perils of the Warp if a Hazardous psychic weapon misfires. Anti-Psyker weapons and abilities single them out.',
  grenades: 'The unit can use the Grenade stratagem: in your Shooting phase, one Grenades unit that is not within Engagement Range of enemy units can throw grenades at a visible enemy unit within 8", rolling six D6 and inflicting 1 mortal wound for each 4+.',
  fly: 'The unit can fly. When it moves it can pass over other models and terrain, measuring the distance across the battlefield rather than up and over, though it cannot end its move on top of other models. Anti-Fly weapons single out units that can fly.',
  smoke: 'The unit can use the Smokescreen stratagem: in your opponent\'s Shooting phase, when it is selected as a target, it gains the Benefit of Cover and the Stealth ability until the end of the phase.',
  titanic: 'The largest war engines. Titanic units cannot be selected to fire Overwatch, and are excluded from many stratagems and abilities that affect ordinary Vehicles and Monsters.',
  towering: 'A model so tall that Ruins do not block line of sight to or from it: a Towering model can shoot over Ruins, and can be shot over them.',
  terminator: 'Wearing Tactical Dreadnought armour. Terminator units usually have Deep Strike, and Transport capacities as well as several stratagems and abilities treat them separately from other Infantry.',
  'jump pack': 'Equipped with a jump pack. Jump Pack units usually have Fly and Deep Strike, and take up more space in Transports or are excluded from them.',
  'mega armour': 'Ork mega armour. A Mega Armour model takes up the space of 2 models in a Transport.',
  daemon: 'A daemonic unit. Several stratagems and abilities exclude or single out Daemon units.',
  chaos: 'Faction keyword shared by every Chaos army (Heretic Astartes, Chaos Daemons, Chaos Knights and others). Rules that refer to a Chaos unit apply to all of them, and it governs which allied units may be included.',
  imperium: 'Faction keyword shared by every army of the Imperium of Man (Space Marines, Adeptus Custodes, Grey Knights and others). Rules that refer to an Imperium unit apply to all of them, and it governs which allied units may be included.'
};
export const keywordDefinition = k => GLOSSARY[k.trim().toLowerCase()] ?? null;

export const DETACHMENTS = {
  'Pactbound Zealots': {
    name: 'Pactbound Zealots', faction: 'Chaos - Chaos Space Marines',
    rules: [{ name: 'Marks of Chaos', text: 'When mustering your army, when you select a ^^Heretic Astartes^^ unit to include in your army, if that unit is not an ^^Epic Hero^^ and does not already have one of the following keywords, you must select one for that unit to gain and note it on your Army Roster: ^^Khorne, Tzeentch, Nurgle, Slaanesh, Chaos Undivided^^.\n\nEach time a unit with one of these keywords gains a weapon ability as the result of a Dark Pact and does not fail the resulting Leadership test, until the end of the phase, that unit gains the associated ability below.\n\nRESTRICTIONS\n- You cannot select the ^^Khorne^^ keyword for a ^^Psyker^^ unit.\n- A ^^Character^^ unit can only be attached to a unit if both units share the same keyword from the list below.\n- A unit can only embark within (or start the battle embarked within) a ^^Transport^^ if both of those units share the same keyword from the list above.' }],
    stratagems: [
      { name: 'Profane Zeal', cost: 1, type: 'Battle Tactic', phase: 'Your Shooting phase or the Fight phase', text: 'TARGET: One Heretic Astartes Chaos Undivided unit from your army that has not been selected to shoot or fight this phase.\n\nEFFECT: Until the end of the phase, each time a model in your unit makes an attack, you can re-roll the Wound roll.' },
      { name: 'Eye Of The Gods', cost: 1, type: 'Epic Deed', phase: 'Fight phase, just after a HERETIC ASTARTES CHARACTER unit from your army (excluding DAMNED, DAEMON and EPIC HERO units) destroys an enemy unit', text: 'TARGET: One HERETIC ASTARTES CHARACTER model in that unit.\n\nEFFECT: Until the end of the battle, add 1 to the Move, Toughness and Wounds characteristics of that CHARACTER model, and add 1 to the Attacks, Strength and Damage characteristics of that CHARACTER model\'s melee weapons.' },
      { name: 'Skinshift', cost: 1, type: 'Epic Deed', phase: 'Your Command phase', text: 'TARGET: One HERETIC ASTARTES unit from your army.\n\nEFFECT: One model in your unit regains up to 3 lost wounds. In addition, if your unit is a Tzeentch unit below its Starting Strength, one destroyed model (excluding Character models) is returned to your unit with its full wounds remaining.' },
      { name: 'Eternal Hate', cost: 1, type: 'Strategic Ploy', phase: 'Fight phase, just after an enemy unit has selected its targets', text: 'TARGET: One HERETIC ASTARTES unit from your army that was selected as the target of one or more of the attacking unit\'s attacks.\n\nEFFECT: Until the end of the phase, each time a model in your unit is destroyed, if that model has not fought this phase, roll one D6, adding 1 to the result if it is a Khorne unit: on a 4+, do not remove it from play. That destroyed model can fight after the attacking model\'s unit has finished making its attacks, and is then removed from play.' },
      { name: 'Festering Miasma', cost: 1, type: 'Strategic Ploy', phase: 'Your opponent\'s Shooting phase, just after an enemy unit has selected its targets', text: 'TARGET: One HERETIC ASTARTES unit from your army that was selected as the target of one or more of the attacking unit\'s attacks.\n\nEFFECT: Until the end of the phase, your unit has the Stealth ability. In addition, if your unit is a Nurgle unit, it can only be selected as the target of a ranged attack if the attacking model is within 18".' },
      { name: 'Torpefying Refrain', cost: 1, type: 'Strategic Ploy', phase: 'Your Movement phase', text: 'TARGET: One HERETIC ASTARTES unit from your army.\n\nEFFECT: Until the end of the turn, your unit is eligible to declare a charge in a turn in which it Fell Back. If your unit is a Slaanesh unit, until the end of the turn, your unit is eligible to shoot and declare a charge in a turn in which it Advanced or Fell Back.' }
    ]
  },
  'Blitz Brigade': {
    name: 'Blitz Brigade', faction: 'Xenos - Orks',
    rules: [
      { name: 'Eager For The Fight', text: 'Each time an **^^Orks^^** unit from your army disembarks from a **^^Transport^^**, until the end of the turn, you can re‑roll Advance and Charge rolls made for that **^^Orks^^** unit.' },
      { name: 'Assault', text: 'Weapons with **[ASSAULT]** in their profile are known as Assault weapons. If a unit that Advanced this turn contains any models equipped with Assault weapons, it is still eligible to shoot in this turn’s Shooting phase. When such a unit is selected to shoot, you can only resolve attacks using Assault weapons its models are equipped with.' }
    ],
    stratagems: [
      { name: 'Armoured Duellists', cost: 1, type: 'Battle Tactic', phase: 'Your Shooting phase', text: 'TARGET: One Orks Vehicle unit from your army that has not been selected to shoot this phase.\n\nEFFECT: Until the end of the phase, each time your unit makes an attack that targets a MONSTER or VEHICLE unit, add 1 to the Hit roll and add 1 to the Wound roll.' },
      { name: 'Mount Up, Ladz', cost: 1, type: 'Strategic Ploy', phase: 'End of the Fight phase', text: 'TARGET: One Orks Infantry unit from your army that is not within Engagement Range of one or more enemy units, and one friendly Transport it is able to embark within.\n\nEFFECT: If your ORKS INFANTRY unit is wholly within 6" of that TRANSPORT, it can embark within it.' },
      { name: 'Yooz In Trouble Now', cost: 1, type: 'Strategic Ploy', phase: 'Your opponent\'s Shooting phase, just after an enemy unit has shot', text: 'TARGET: One Battlewagon, Hunta Rig or Kill Rig model from your army that was hit by one or more of the attacking unit\'s attacks.\n\nEFFECT: One Orks Infantry unit embarked within your model can disembark and make a Surge move. To do so, roll one D6: models in that unit move a number of inches up to this result, but that unit must end that move as close as possible to the closest enemy unit (excluding AIRCRAFT). When doing so, those models can be moved within Engagement Range of that enemy unit.' },
      { name: 'Run \'em Down', cost: 1, type: 'Strategic Ploy', phase: 'Your Movement phase', text: 'TARGET: One Battlewagon, Kill Rig or Hunta Rig unit from your army that has not been selected to move this phase.\n\nEFFECT: Select up to two other friendly Orks Vehicle or Orks Monster units within 6" of your unit. Until the end of the turn, your unit and each unit you selected are eligible to declare a charge in a turn in which they Advanced.' },
      { name: 'Mekanised Brutality', cost: 1, type: 'Strategic Ploy', phase: 'Your Movement phase', text: 'TARGET: One Battlewagon, Kill Rig or Hunta Rig unit from your army that has not been selected to move this phase.\n\nEFFECT: Until the end of the turn, each time a unit disembarks from your unit after your unit makes a Normal move, that disembarked unit is still eligible to declare a charge this turn.' },
      { name: 'Impervious', cost: 1, type: 'Strategic Ploy', phase: 'Your opponent\'s Shooting phase, just after an enemy unit has selected its targets', text: 'TARGET: One Battlewagon, Kill Rig or Hunta Rig unit from your army that was selected as the target of one or more of the attacking unit\'s attacks.\n\nEFFECT: Until the end of the phase, each time an attack targets your unit, if the Strength characteristic of that attack is greater than the Toughness characteristic of your unit, subtract 1 from the Wound roll.' }
    ]
  }
};

export const CORE_STRATAGEMS = [
  { name: 'Command Re-roll', cost: 1, type: 'Battle Tactic', phase: 'Any phase, just after you make an Advance roll, a Charge roll, a Desperate Escape test or a Hazardous test for a unit from your army, or a Hit roll, a Wound roll, a Damage roll or a saving throw for a model in that unit, or a roll to determine the number of attacks made with a weapon equipped by a model in that unit', text: 'TARGET: That unit or model from your army.\n\nEFFECT: You re-roll that roll, test or saving throw. If you are using fast dice rolling, select one of those rolls or saving throws to re-roll.' },
  { name: 'Counter-offensive', cost: 2, type: 'Strategic Ploy', phase: 'Fight phase, just after an enemy unit has fought', text: 'TARGET: One unit from your army that is within Engagement Range of one or more enemy units and that has not already been selected to fight this phase.\n\nEFFECT: Your unit fights next.' },
  { name: 'Fire Overwatch', cost: 1, type: 'Strategic Ploy', phase: 'Your opponent\'s Movement or Charge phase, just after an enemy unit is set up or when an enemy unit starts or ends a Normal, Advance or Fall Back move, or declares a charge', text: 'TARGET: One unit from your army that is within 24" of that enemy unit and that would be eligible to shoot if it were your Shooting phase.\n\nEFFECT: If that enemy unit is visible to your unit, your unit can shoot that enemy unit as if it were your Shooting phase.\n\nRESTRICTIONS: You cannot target a TITANIC unit with this Stratagem. Until the end of the phase, each time a model in your unit makes a ranged attack, an unmodified Hit roll of 6 is required to score a hit, irrespective of the attacking weapon\'s Ballistic Skill or any modifiers. You can only use this Stratagem once per turn.' },
  { name: 'Go to Ground', cost: 1, type: 'Battle Tactic', phase: 'Your opponent\'s Shooting phase, just after an enemy unit has selected its targets', text: 'TARGET: One INFANTRY unit from your army that was selected as the target of one or more of the attacking unit\'s attacks.\n\nEFFECT: Until the end of the phase, all models in your unit have a 6+ invulnerable save and have the Benefit of Cover.', only: 'Infantry' },
  { name: 'Heroic Intervention', cost: 1, type: 'Strategic Ploy', phase: 'Your opponent\'s Charge phase, just after an enemy unit ends a Charge move', text: 'TARGET: One unit from your army that is within 6" of that enemy unit and would be eligible to declare a charge against that enemy unit if it were your Charge phase.\n\nEFFECT: Your unit now declares a charge that targets only that enemy unit, and you resolve that charge as if it were your Charge phase.\n\nRESTRICTIONS: You can only select a VEHICLE unit from your army if it is a WALKER. Note that even if this charge is successful, your unit does not receive any Charge bonus this turn.' },
  { name: 'Insane Bravery', cost: 1, type: 'Epic Deed', phase: 'Battle-shock step of your Command phase, just before you take a Battle-shock test for a unit from your army', text: 'TARGET: That unit from your army.\n\nEFFECT: Your unit automatically passes that Battle-shock test.\n\nRESTRICTIONS: You cannot use this Stratagem more than once per battle.' },
  { name: 'Rapid Ingress', cost: 1, type: 'Strategic Ploy', phase: 'End of your opponent\'s Movement phase', text: 'TARGET: One unit from your army that is in Reserves.\n\nEFFECT: Your unit can arrive on the battlefield as if it were the Reinforcements step of your Movement phase, and if every model in that unit has the Deep Strike ability, you can set that unit up as described in the Deep Strike ability (even though it is not your Movement phase).\n\nRESTRICTIONS: You cannot use this Stratagem to enable a unit to arrive on the battlefield during a battle round it would not normally be able to do so in.' }
];

// ^^Keyword^^ -> small caps, **x** / [X] -> bold. Returns paragraphs of segments.
export function markup(text) {
  if (!text) return [];
  const s = text.replace(/\*\*\^\^(.+?)\^\^\*\*/g, '^^$1^^').replace(/\^\^\*\*(.+?)\*\*\^\^/g, '^^$1^^');
  return s.split(/\n+/).map(l => l.trim()).filter(Boolean).map(line =>
    line.split(/(\^\^.+?\^\^|\*\*.+?\*\*)/).filter(Boolean).map(p =>
      p.startsWith('^^') ? { t: p.slice(2, -2), caps: 'all-small-caps', fw: 600, ls: '0.04em' }
        : p.startsWith('**') ? { t: p.slice(2, -2), caps: 'normal', fw: 700, ls: 'normal' }
          : { t: p, caps: 'normal', fw: 400, ls: 'normal' }));
}
export function stratParts(st) {
  const parts = [{ k: 'WHEN', t: st.phase }];
  for (const para of st.text.split(/\n\n+/)) {
    const m = /^([A-Z]+):\s*([\s\S]*)$/.exec(para.trim());
    if (m) parts.push({ k: m[1], t: m[2] }); else if (parts.length) parts[parts.length - 1].t += ' ' + para.trim();
  }
  return parts;
}
export const matchRule = (kw, rules) => rules.find(r => kw.toLowerCase().startsWith(r.name.toLowerCase()));

// ---- loadouts / weapons
export const countKey = (uid, lk) => `${uid}:${lk}`;
export const loadoutLive = (counts, u, l) => counts[countKey(u.id, l.key)] ?? l.modelCount;
export const unitLive = (counts, u) => u.loadouts.reduce((s, l) => s + loadoutLive(counts, u, l), 0);
export const unitTotal = u => u.loadouts.reduce((s, l) => s + l.modelCount, 0);
export function liveWeaponCount(counts, u, pid) {
  let t = 0;
  for (const l of u.loadouts) { const live = loadoutLive(counts, u, l); for (const w of l.weapons) if (w.profileId === pid) t += w.perModel * live; }
  return t;
}
export function mergeByProfileId(ws) {
  const m = new Map();
  for (const w of ws) { const s = m.get(w.profileId); if (s) s.count += w.count; else m.set(w.profileId, { ...w }); }
  return [...m.values()];
}
export function loadoutWeapons(u, l, live) {
  const out = [];
  for (const lw of l.weapons) { const f = u.weapons.find(w => w.profileId === lw.profileId); if (f) out.push({ ...f, count: Math.round(lw.perModel * live) }); }
  return mergeByProfileId(out);
}
export function labelLoadout(l, all, unitName) {
  if (all.length <= 1) return unitName;
  const items = x => [...x.weapons.map(w => w.name), ...x.wargear];
  const sets = all.map(x => new Set(items(x)));
  const common = new Set([...sets[0]].filter(n => sets.every(s => s.has(n))));
  const d = items(l).filter(n => !common.has(n));
  return [...new Set(d.length ? d : items(l))].join(' + ') || 'Models';
}

// ---- leaders
export function groupByLeader(units, asg) {
  const ids = new Set(units.map(u => u.id)), by = new Map(), attached = new Set();
  for (const u of units) { const t = asg[u.id]; if (t && t !== u.id && ids.has(t)) { (by.get(t) ?? by.set(t, []).get(t)).push(u); attached.add(u.id); } }
  return units.filter(u => !attached.has(u.id)).map(u => ({ leaders: by.get(u.id) ?? [], unit: u }));
}

// ---- combat (combat.ts)
const baseWound = (s, t) => s >= 2 * t ? 2 : s > t ? 3 : s === t ? 4 : 2 * s <= t ? 6 : 5;
const clamp = v => Math.min(6, Math.max(2, v));
function findAnti(wk, tk) {
  for (const kw of wk) { const m = /Anti-([\w ]+?) (\d)\+/.exec(kw); if (m && tk.some(k => k.toLowerCase() === m[1].toLowerCase())) return { keyword: m[1], threshold: +m[2] }; }
  return null;
}
function findHalf(wk) {
  for (const kw of wk) { let m = /^Melta (\d+)$/.exec(kw); if (m) return { kind: 'melta', value: +m[1], kw }; m = /^Rapid Fire (\d+)$/.exec(kw); if (m) return { kind: 'rapidFire', value: +m[1], kw }; }
  return null;
}
const bonus = (b, n) => ({ ...b, flat: b.flat + n, raw: /[Dd]/.test(b.raw) ? `${b.raw}+${n}` : String(b.flat + n) });
export function computeAttacks(att, counts, tgt, mods, type) {
  return mergeByProfileId(att.weapons).filter(w => w.type === type).map(w => {
    const count = liveWeaponCount(counts, att, w.profileId);
    const ap = mods.apWorsened ? Math.min(w.ap + 1, 0) : w.ap;
    const sv = tgt.profile.SV, armor = sv != null ? sv - ap : null;
    const ti = tgt.invuln, autoInv = ti && !ti.conditional ? ti.value : null;
    const inv = mods.invuln ?? autoInv;
    const condInv = mods.invuln == null && ti?.conditional ? ti.value : null;
    let save = null, invUsed = false;
    if (armor != null && armor <= 6) { if (inv != null && inv < armor) { save = inv; invUsed = true; } else save = armor; }
    else if (inv != null) { save = inv; invUsed = true; }
    const anti = tgt.profile.T != null ? findAnti(w.keywords, tgt.keywords) : null;
    const bw = tgt.profile.T != null ? Math.min(baseWound(w.strength, tgt.profile.T), anti?.threshold ?? 6) : 6;
    const wound = clamp(bw - mods.wound);
    const hit = w.skill === null ? null : clamp(w.skill - mods.hit);
    const half = findHalf(w.keywords), halfOn = !!half && mods.halfRange;
    const dmg = w.damage ?? { raw: '—', flat: 0 }, atk = w.attacks ?? { raw: '—', flat: 0 };
    return {
      name: w.name, count, range: w.range, strength: w.strength, T: tgt.profile.T,
      attacks: halfOn && half.kind === 'rapidFire' ? bonus(atk, half.value).raw : atk.raw,
      hit, wound, anti, armor, save, invUsed, ap,
      damage: halfOn && half.kind === 'melta' ? bonus(dmg, half.value).raw : dmg.raw,
      half, halfOn, condInv, keywords: w.keywords
    };
  }).filter(r => r.count > 0);
}

// ---- load
export async function loadArmies() {
  const get = p => fetch(p).then(r => r.json());
  const [c, o, st] = await Promise.all([get('./data/Chaos.json'), get('./data/Orks.json'), get('./data/state.json')]);
  const prep = raw => {
    const a = parseRoster(raw);
    const tally = {}; a.units.forEach(u => tally[u.faction] = (tally[u.faction] || 0) + 1);
    a.primaryFaction = Object.entries(tally).sort((x, y) => y[1] - x[1])[0][0];
    return a;
  };
  return { A: prep(c), B: prep(o), assignments: st.data.leaderAssignments || {} };
}
