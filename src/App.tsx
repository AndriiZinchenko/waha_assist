import { useState } from "react";
import { armies } from "./lib/armies";
import { assignArmy, type Slot } from "./lib/armySetup";
import { useHashRoute } from "./lib/useHashRoute";
import { visibleUnits } from "./lib/armyPoints";
import { applyLeaderWeaponBonuses } from "./lib/leaderEffects";
import { effectiveDetachment } from "./lib/detachment";
import { orderedUnits } from "./lib/leaders";
import { SPEECH_SUPPORTED } from "./lib/speech";
import type { VoiceCommand } from "./lib/voiceCommand";
import { loadState, pickSynced, saveState, type StoredState } from "./lib/persistence";
import { useSync } from "./lib/useSync";
import { useWakeLock } from "./lib/useWakeLock";
import { LangProvider, type Lang } from "./lib/i18n";
import { ArmyConfigScreen } from "./components/ArmyConfigScreen";
import { ArmyPanel, type Side } from "./components/ArmyPanel";
import { ArmySetupScreen } from "./components/ArmySetupScreen";
import { SyncConflictModal } from "./components/SyncConflictModal";
import { SyncStatus } from "./components/SyncStatus";
import { HeaderOverflow } from "./components/HeaderOverflow";
import { LangToggle } from "./components/LangToggle";
import { ResultDrawer } from "./components/ResultDrawer";
import { SideSwitcher } from "./components/SideSwitcher";
import { VoiceCommander, type VoiceFeedback } from "./components/VoiceCommander";
import { VoiceToggle } from "./components/VoiceToggle";
import { WeaponModeToggle } from "./components/WeaponModeToggle";
import type { WeaponMode } from "./lib/route";
import { WakeLockToggle } from "./components/WakeLockToggle";

// Storage holds the army-list-level state (model counts, leader
// assignments, hidden units, language). Where you are — screen, side
// picks, open units, calculator — lives in the URL hash (see lib/route.ts),
// so a reload or a reopened tab resumes exactly where you were. The stored
// `selectedArmyId` field is no longer read; it stays in the storage shape
// for compatibility with existing saved state.
function initialState(): StoredState {
  return loadState();
}

function App() {
  const [state, setState] = useState<StoredState>(initialState);
  const [route, navigate] = useHashRoute();
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const sync = useSync(state, setState);
  const wakeLock = useWakeLock();

  const armyA = armies.find((a) => a.id === route.a) ?? null;
  const armyB = armies.find((a) => a.id === route.b) ?? null;
  const selectedUnitId: Record<Side, string | null> = { a: route.ua, b: route.ub };
  const activeSide = route.side;

  // The units actually in play — hidden ones excluded, leader-attachment
  // weapon bonuses (e.g. Castellan Crowe's +1 Attacks to Purifying Flame)
  // baked in — so both the army list and the combat calculator read from
  // the same effective stats.
  const unitsA = armyA
    ? applyLeaderWeaponBonuses(
        visibleUnits(armyA.parsed.units, state.hiddenUnitIds),
        state.leaderAssignments,
      )
    : [];
  const unitsB = armyB
    ? applyLeaderWeaponBonuses(
        visibleUnits(armyB.parsed.units, state.hiddenUnitIds),
        state.leaderAssignments,
      )
    : [];
  const unitA = unitsA.find((u) => u.id === selectedUnitId.a) ?? null;
  const unitB = unitsB.find((u) => u.id === selectedUnitId.b) ?? null;

  function handleAssignArmy(slot: Slot, armyId: string) {
    const selection = assignArmy({ a: route.a, b: route.b }, slot, armyId);
    // The side's army changed (or was cleared), so its open unit no longer
    // applies.
    navigate(
      { ...route, a: selection.a, b: selection.b, [slot === "a" ? "ua" : "ub"]: null },
      { replace: true },
    );
  }

  // Collapses both units so a different pair can be picked. Unmounting the
  // results drops the modifiers with them: they were never saved anyway.
  function handleCloseUnits() {
    navigate({ ...route, ua: null, ub: null }, { replace: true });
  }

  function handleStart() {
    navigate({ ...route, screen: "battle" });
  }

  function handleOpenSetup() {
    navigate({ ...route, screen: "list", configArmyId: null });
  }

  function handleSelectUnit(side: Side, unitId: string | null) {
    navigate({ ...route, [side === "a" ? "ua" : "ub"]: unitId }, { replace: true });
  }

  function handleSetActiveSide(side: Side) {
    navigate({ ...route, side }, { replace: true });
  }

  function handleSetWeapons(weapons: WeaponMode) {
    navigate({ ...route, weapons }, { replace: true });
  }

  /**
   * "X against Y" heard: X counts down side A's list, Y side B's, both in
   * the on-screen order (numbers shown while voice mode is on). Selects
   * both units; the returned undo puts the previous selection back.
   */
  function handleVoiceSelect(
    command: Extract<VoiceCommand, { type: "select" }>,
  ): VoiceFeedback {
    const listA = orderedUnits(unitsA, state.leaderAssignments);
    const listB = orderedUnits(unitsB, state.leaderAssignments);
    const attacker = listA[command.attacker - 1];
    const target = listB[command.target - 1];
    if (!attacker || !target) {
      const missing = !attacker
        ? `No unit ${command.attacker} on the left (1–${listA.length})`
        : `No unit ${command.target} on the right (1–${listB.length})`;
      return { kind: "error", text: missing };
    }
    const before = route;
    navigate({ ...route, ua: attacker.id, ub: target.id }, { replace: true });
    return {
      kind: "ok",
      text: `${command.attacker} → ${command.target}: ${attacker.name} vs ${target.name}`,
      onUndo: () => navigate(before, { replace: true }),
    };
  }

  function handleCountChange(key: string, next: number) {
    setState((prev) => {
      const nextState: StoredState = {
        ...prev,
        modelCounts: { ...prev.modelCounts, [key]: next },
      };
      saveState(nextState);
      return nextState;
    });
  }

  function handleOpenConfig(armyId: string) {
    navigate({ ...route, screen: "config", configArmyId: armyId });
  }

  function handleCloseConfig() {
    navigate({ ...route, screen: "list", configArmyId: null });
  }

  function handleAssignLeader(leaderId: string, targetId: string | null) {
    setState((prev) => {
      const leaderAssignments = { ...prev.leaderAssignments };
      if (targetId === null) {
        delete leaderAssignments[leaderId];
      } else {
        leaderAssignments[leaderId] = targetId;
      }
      const nextState: StoredState = { ...prev, leaderAssignments, syncDirty: true };
      saveState(nextState);
      return nextState;
    });
    sync.noteLocalEdit();
  }

  function handleToggleHidden(unitId: string) {
    setState((prev) => {
      const hiddenUnitIds = { ...prev.hiddenUnitIds };
      if (hiddenUnitIds[unitId]) {
        delete hiddenUnitIds[unitId];
      } else {
        hiddenUnitIds[unitId] = true;
      }
      const nextState: StoredState = { ...prev, hiddenUnitIds, syncDirty: true };
      saveState(nextState);
      return nextState;
    });
    sync.noteLocalEdit();
  }

  function handleChooseDetachment(armyId: string, detachment: string | null) {
    setState((prev) => {
      const detachmentOverrides = { ...prev.detachmentOverrides };
      if (detachment === null) {
        delete detachmentOverrides[armyId];
      } else {
        detachmentOverrides[armyId] = detachment;
      }
      const nextState: StoredState = { ...prev, detachmentOverrides, syncDirty: true };
      saveState(nextState);
      return nextState;
    });
    sync.noteLocalEdit();
  }

  function handleChangeLang(lang: Lang) {
    setState((prev) => {
      const nextState: StoredState = { ...prev, lang };
      saveState(nextState);
      return nextState;
    });
  }

  const showPanels = route.screen === "battle" && armyA !== null && armyB !== null;
  const configArmy =
    route.screen === "config"
      ? (armies.find((a) => a.id === route.configArmyId) ?? null)
      : null;
  const configSide: Side | null = configArmy
    ? route.a === configArmy.id
      ? "a"
      : route.b === configArmy.id
        ? "b"
        : null
    : null;

  return (
    <LangProvider lang={state.lang}>
      <div className="h-dvh flex flex-col" style={{ background: "var(--paper)" }}>
        <header
          className="shrink-0 pt-[env(safe-area-inset-top)]"
          style={{ background: "var(--header-bg)", borderBottom: "1px solid var(--rule)" }}
        >
          <div className="h-[52px] px-[6px] flex items-center gap-[4px]">
            {route.screen === "list" ? (
              <span className="px-[8px] flex items-baseline gap-[6px] whitespace-nowrap">
                <span className="display font-extrabold text-[17px] tracking-[0.06em]">
                  COMBAT ASSISTANT
                </span>
                <span className="mono font-bold text-[12px]" style={{ color: "var(--ink-soft)" }}>
                  40K
                </span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleOpenSetup}
                className="display min-h-[44px] px-[8px] flex items-center gap-[6px] rounded-[var(--r-control)] text-[18px] font-bold"
              >
                <span aria-hidden="true" className="text-[22px] leading-none">
                  ‹
                </span>
                Armies
              </button>
            )}
            <SyncStatus status={sync.status} />
            <span className="flex-1" />
            <span className="hidden min-[900px]:flex items-center gap-[8px] mr-[4px]">
              <LangToggle lang={state.lang} onChange={handleChangeLang} />
              <WakeLockToggle enabled={wakeLock.enabled} onToggle={wakeLock.toggle} />
            </span>
            {SPEECH_SUPPORTED && (
              <VoiceToggle
                enabled={voiceEnabled}
                onToggle={() => setVoiceEnabled((v) => !v)}
              />
            )}
            {showPanels && (
              <WeaponModeToggle mode={route.weapons} onChange={handleSetWeapons} />
            )}
            <span className="min-[900px]:hidden">
              <HeaderOverflow
                lang={state.lang}
                onChangeLang={handleChangeLang}
                wakeEnabled={wakeLock.enabled}
                onToggleWake={wakeLock.toggle}
              />
            </span>
          </div>
        </header>
        {showPanels && armyA && armyB ? (
          <div className="flex-1 min-h-0 flex flex-col">
            {voiceEnabled && (
              <VoiceCommander
                lang={state.lang === "uk" ? "uk-UA" : "en-US"}
                onSelect={handleVoiceSelect}
                onFatal={() => setVoiceEnabled(false)}
              />
            )}
            <SideSwitcher
              active={activeSide}
              onSelect={handleSetActiveSide}
              labelA={armyA.parsed.catalogue}
              labelB={armyB.parsed.catalogue}
              openA={unitA !== null}
              openB={unitB !== null}
            />
            {/* A always left, B always right; the 6px gutter shows --inset. */}
            <div
              className="flex flex-1 min-h-0 min-[900px]:gap-[6px]"
              style={{ background: "var(--inset)" }}
            >
              <ArmyPanel
                side="a"
                army={armyA}
                selectedUnitId={selectedUnitId.a}
                onSelectUnit={(id) => handleSelectUnit("a", id)}
                counts={state.modelCounts}
                onCountChange={handleCountChange}
                hidden={activeSide !== "a"}
                leaderAssignments={state.leaderAssignments}
                hiddenUnitIds={state.hiddenUnitIds}
                detachment={effectiveDetachment(armyA, state.detachmentOverrides)}
                showNumbers={voiceEnabled}
              />
              <ArmyPanel
                side="b"
                army={armyB}
                selectedUnitId={selectedUnitId.b}
                onSelectUnit={(id) => handleSelectUnit("b", id)}
                counts={state.modelCounts}
                onCountChange={handleCountChange}
                hidden={activeSide !== "b"}
                leaderAssignments={state.leaderAssignments}
                hiddenUnitIds={state.hiddenUnitIds}
                detachment={effectiveDetachment(armyB, state.detachmentOverrides)}
                showNumbers={voiceEnabled}
              />
            </div>
            <ResultDrawer
              unitA={unitA}
              unitB={unitB}
              unitsA={unitsA}
              unitsB={unitsB}
              leaderAssignments={state.leaderAssignments}
              counts={state.modelCounts}
              weapons={route.weapons}
              onClose={handleCloseUnits}
            />
          </div>
        ) : configArmy ? (
          <ArmyConfigScreen
            army={configArmy}
            side={configSide}
            leaderAssignments={state.leaderAssignments}
            onAssignLeader={handleAssignLeader}
            hiddenUnitIds={state.hiddenUnitIds}
            onToggleHidden={handleToggleHidden}
            counts={state.modelCounts}
            onCountChange={handleCountChange}
            detachmentOverrides={state.detachmentOverrides}
            onChooseDetachment={handleChooseDetachment}
            onBack={handleCloseConfig}
          />
        ) : (
          <ArmySetupScreen
            armies={armies}
            selection={{ a: route.a, b: route.b }}
            detachmentOverrides={state.detachmentOverrides}
            onAssign={handleAssignArmy}
            onStart={handleStart}
            onConfigure={handleOpenConfig}
          />
        )}
        {sync.prompt && (
          <SyncConflictModal
            reason={sync.prompt.reason}
            local={pickSynced(state)}
            server={sync.prompt.serverData}
            onKeepLocal={sync.keepLocal}
            onUseServer={sync.useServer}
          />
        )}
      </div>
    </LangProvider>
  );
}

export default App;
