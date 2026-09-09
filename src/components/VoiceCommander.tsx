import { useEffect, useRef, useState } from "react";
import { startListening } from "../lib/speech";
import { parseVoiceCommand, type VoiceCommand } from "../lib/voiceCommand";

export type VoiceFeedback =
  | { kind: "ok"; text: string; onUndo: () => void }
  | { kind: "error"; text: string };

interface VoiceCommanderProps {
  /** BCP-47 tag for the recognizer, e.g. "en-US" / "uk-UA". */
  lang: string;
  /** Called with a parsed select command; returns the feedback to show.
   * The caller decides whether the numbers point at real units. */
  onSelect: (command: Extract<VoiceCommand, { type: "select" }>) => VoiceFeedback;
  /** Listening died for good (mic denied, unsupported) — switch voice
   * mode off so the header toggle tells the truth. */
  onFatal: (reason: string) => void;
}

const FEEDBACK_MS = 6000;

/**
 * Hands-free listener. Mounted while voice mode is on: keeps the mic open,
 * parses every finished utterance as "X against Y" (or "undo"), and shows a
 * status pill at the bottom of the unit lists so the player can see from
 * across the table what was heard — a mishear is one "undo", spoken or
 * tapped, not a wrong calculation nobody noticed.
 */
export function VoiceCommander({ lang, onSelect, onFatal }: VoiceCommanderProps) {
  const [feedback, setFeedback] = useState<VoiceFeedback | null>(null);
  // The undo for the most recent selection stays available (by voice)
  // even after its chip has faded.
  const lastUndoRef = useRef<(() => void) | null>(null);
  // Latest props, so the long-lived listener never calls a stale closure.
  const onSelectRef = useRef(onSelect);
  const onFatalRef = useRef(onFatal);
  onSelectRef.current = onSelect;
  onFatalRef.current = onFatal;

  useEffect(() => {
    function undo() {
      const fn = lastUndoRef.current;
      lastUndoRef.current = null;
      if (!fn) {
        setFeedback({ kind: "error", text: "Nothing to undo" });
        return;
      }
      fn();
      setFeedback({ kind: "error", text: "Undone" });
    }

    const stop = startListening(lang, {
      onTranscripts(alternatives) {
        let command: VoiceCommand | null = null;
        for (const text of alternatives) {
          command = parseVoiceCommand(text);
          if (command) break;
        }
        if (!command) return; // ordinary table talk — stay quiet
        if (command.type === "undo") {
          undo();
          return;
        }
        const result = onSelectRef.current(command);
        // A rejected command (number out of range) leaves the previous
        // selection — and its undo — untouched.
        if (result.kind === "ok") lastUndoRef.current = result.onUndo;
        setFeedback(result);
      },
      onFatal(reason) {
        onFatalRef.current(reason);
      },
    });
    return stop;
  }, [lang]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), FEEDBACK_MS);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const isError = feedback?.kind === "error";

  return (
    <div
      role="status"
      className="absolute inset-x-0 bottom-3 z-20 flex justify-center pointer-events-none"
    >
      <div
        className="pointer-events-auto flex items-center gap-2.5 max-w-[92%] px-3.5 py-2 rounded-full text-[14px] shadow-lg"
        style={{
          background: "var(--panel)",
          border: `1px solid ${isError ? "var(--warn)" : "var(--rule)"}`,
          color: isError ? "var(--warn)" : "var(--ink)",
        }}
      >
        {!feedback && (
          <span
            className="voice-dot shrink-0 w-[9px] h-[9px] rounded-full"
            style={{ background: "var(--negative)" }}
            aria-hidden="true"
          />
        )}
        <span className="truncate">
          {feedback ? feedback.text : "Listening — say “3 against 7”"}
        </span>
        {feedback?.kind === "ok" && (
          <button
            type="button"
            onClick={() => {
              lastUndoRef.current = null;
              feedback.onUndo();
              setFeedback({ kind: "error", text: "Undone" });
            }}
            className="shrink-0 font-semibold underline underline-offset-2"
            style={{ color: "var(--ink-soft)" }}
          >
            Undo
          </button>
        )}
      </div>
    </div>
  );
}
