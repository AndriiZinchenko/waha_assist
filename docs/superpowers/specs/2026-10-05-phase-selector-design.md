# Phase selector

The battle screen's Ranged | Melee switch is replaced by a selector for the
five phases of a turn. The phase also filters each unit's stratagems,
abilities and rules to what is relevant now. Approved in conversation on
2026-10-05; the written-spec review step was skipped at the user's request
("go ahead and implement it").

## Phase as state

- `Phase`: `command | movement | shooting | charge | fight`. The URL carries
  it as `p=`, omitted for Shooting, the default. `w=melee` from older links
  opens Fight; `w=ranged` or nothing opens Shooting. `RouteState.weapons` is
  replaced by `RouteState.phase`.
- Shooting resolves ranged weapons and Fight resolves melee weapons, as the
  toggle did. The other three phases have no weapon mode, so the calculator
  drawer is not shown.
- Phase names stay in English in both languages (rules terms).

## Header

- `PhaseSelector`: five icon buttons, no text. Command is a rank chevron,
  Movement an arrow with a trail, Shooting the crosshair, Charge a double
  chevron, Fight the sword. Each has the phase name as accessible label and
  tooltip; the active one uses the `selected` style.
- Centered in the header at 900px and wider (absolutely positioned); in flow
  between the left and right groups below that. The back button shows only
  its arrow below 900px. Buttons are 44px and shrink only as far as 36px.
- Shown on the battle screen only. The configuration screen has no phase.

## Filtering (battle screen only)

A context carries `{ phase, showAll }`. It is empty on the configuration
screen, where nothing is filtered or tagged.

- **Stratagems**: only those whose timing names the phase (yours or an
  opponent's reaction) or says "Any phase". A stratagem without timing is
  never hidden. The section opens by itself in Command, Movement and Charge.
- **Abilities and rules** (Info and Rules): those whose text names the phase
  ("In your Command phase…") carry a phase tag and come first; the rest sit
  in a collapsed "Other (N)" group. Nothing is removed.
- **Show all**: a button above Info on each expanded unit, reading
  "Filtered to <Phase> phase · Show all". One global setting shared by every
  unit and both sides, kept in this browser's storage (not the URL, not
  synced). On, nothing is filtered, grouped or tagged.

## Out of scope

Big Guns Never Tire "Engaged" toggles; they get a home in Shooting later.

## Tests

Route parsing (incl. legacy `w=melee`); phase matching against every
stratagem timing in the data (each must match at least one phase); selector
markup; Info, Rules and Stratagems filtering with the context; browser checks
at 390px and 1180px.
