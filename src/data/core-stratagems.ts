import type { Stratagem } from "./detachments/types";

export const coreStratagems: Stratagem[] = [
  {
    name: "Insane Bravery",
    cost: 1,
    type: "Epic Deed",
    phase:
      "Battle-shock step of your Command phase, just before you take a Battle-shock test for a unit from your army",
    text: `TARGET: That unit from your army.

EFFECT: Your unit automatically passes that Battle-shock test.

RESTRICTIONS: You cannot use this Stratagem more than once per battle.`,
  },
  {
    name: "Heroic Intervention",
    cost: 1,
    type: "Strategic Ploy",
    phase: "Your opponent's Charge phase, just after an enemy unit ends a Charge move",
    text: `TARGET: One unit from your army that is within 6" of that enemy unit and would be eligible to declare a charge against that enemy unit if it were your Charge phase.

EFFECT: Your unit now declares a charge that targets only that enemy unit, and you resolve that charge as if it were your Charge phase.

RESTRICTIONS: You can only select a VEHICLE unit from your army if it is a WALKER. Note that even if this charge is successful, your unit does not receive any Charge bonus this turn.`,
  },
  {
    name: "Fire Overwatch",
    cost: 1,
    type: "Strategic Ploy",
    phase:
      "Your opponent's Movement or Charge phase, just after an enemy unit is set up or when an enemy unit starts or ends a Normal, Advance or Fall Back move, or declares a charge",
    text: `TARGET: One unit from your army that is within 24" of that enemy unit and that would be eligible to shoot if it were your Shooting phase.

EFFECT: If that enemy unit is visible to your unit, your unit can shoot that enemy unit as if it were your Shooting phase.

RESTRICTIONS: You cannot target a TITANIC unit with this Stratagem. Until the end of the phase, each time a model in your unit makes a ranged attack, an unmodified Hit roll of 6 is required to score a hit, irrespective of the attacking weapon's Ballistic Skill or any modifiers. You can only use this Stratagem once per turn.`,
  },
  {
    name: "Rapid Ingress",
    cost: 1,
    type: "Strategic Ploy",
    phase: "End of your opponent's Movement phase",
    text: `TARGET: One unit from your army that is in Reserves.

EFFECT: Your unit can arrive on the battlefield as if it were the Reinforcements step of your Movement phase, and if every model in that unit has the Deep Strike ability, you can set that unit up as described in the Deep Strike ability (even though it is not your Movement phase).

RESTRICTIONS: You cannot use this Stratagem to enable a unit to arrive on the battlefield during a battle round it would not normally be able to do so in.`,
  },
  {
    name: "Go to Ground",
    cost: 1,
    type: "Battle Tactic",
    phase: "Your opponent's Shooting phase, just after an enemy unit has selected its targets",
    text: `TARGET: One INFANTRY unit from your army that was selected as the target of one or more of the attacking unit's attacks.

EFFECT: Until the end of the phase, all models in your unit have a 6+ invulnerable save and have the Benefit of Cover.`,
  },
  {
    name: "Command Re-roll",
    cost: 1,
    type: "Battle Tactic",
    phase:
      "Any phase, just after you make an Advance roll, a Charge roll, a Desperate Escape test or a Hazardous test for a unit from your army, or a Hit roll, a Wound roll, a Damage roll or a saving throw for a model in that unit, or a roll to determine the number of attacks made with a weapon equipped by a model in that unit",
    text: `TARGET: That unit or model from your army.

EFFECT: You re-roll that roll, test or saving throw. If you are using fast dice rolling, select one of those rolls or saving throws to re-roll.`,
  },
  {
    name: "Counter-offensive",
    cost: 2,
    type: "Strategic Ploy",
    phase: "Fight phase, just after an enemy unit has fought",
    text: `TARGET: One unit from your army that is within Engagement Range of one or more enemy units and that has not already been selected to fight this phase.

EFFECT: Your unit fights next.`,
  },
];
