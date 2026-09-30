import { useEffect, useRef, useState } from "react";
import { startListening } from "../lib/speech";
import { useUi } from "../lib/uiStrings";
import { parseVoiceCommand, type VoiceCommand } from "../lib/voiceCommand";

export type VoiceFeedback =
  | { kind: "ok"; text: string; onUndo: () => void }
  | { kind: "error"; text: string };

/** What the banner shows: a result plus how to colour it. */
type BannerMessage =
  | { tone: "positive"; text: string; onUndo?: () => void }
  | { tone: "neutral"; text: string }
  | { tone: "negative"; text: string };

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

const FEEDBACK_MS = 2500;

/** Heard something shaped like a command that didn't parse. */
const LOOKS_LIKE_COMMAND = /against|versus|\bvs\b|проти/i;

const TONE_STYLE = {
  positive: { background: "var(--positive-fill)", color: "var(--positive)" },
  neutral: { background: "var(--paper-sunk)", color: "var(--ink-2)" },
  negative: { background: "var(--negative-fill)", color: "var(--negative)" },
} as const;

/**
 * Hands-free listener. Mounted while voice mode is on: keeps the mic open,
 * parses every finished utterance as "X against Y" (or "undo"), and shows
 * a banner under the header so the player can see from across the table
 * what was heard — a mishear is one "undo", spoken or tapped, not a wrong
 * calculation nobody noticed.
 */
export function VoiceCommander({ lang, onSelect, onFatal }: VoiceCommanderProps) {
  const [message, setMessage] = useState<BannerMessage | null>(null);
  const ui = useUi();
  // The undo for the most recent selection stays available (by voice)
  // even after its message has faded.
  const lastUndoRef = useRef<(() => void) | null>(null);
  // Latest props, so the long-lived listener never calls a stale closure.
  const onSelectRef = useRef(onSelect);
  const onFatalRef = useRef(onFatal);
  const uiRef = useRef(ui);
  onSelectRef.current = onSelect;
  onFatalRef.current = onFatal;
  uiRef.current = ui;

  useEffect(() => {
    function undo() {
      const fn = lastUndoRef.current;
      lastUndoRef.current = null;
      if (!fn) {
        setMessage({ tone: "neutral", text: "Nothing to undo" });
        return;
      }
      fn();
      setMessage({ tone: "positive", text: "Undone" });
    }

    const stop = startListening(lang, {
      onTranscripts(alternatives) {
        let command: VoiceCommand | null = null;
        for (const text of alternatives) {
          command = parseVoiceCommand(text);
          if (command) break;
        }
        if (!command) {
          // Ordinary table talk stays quiet; only a near-miss is reported.
          if (alternatives.some((text) => LOOKS_LIKE_COMMAND.test(text))) {
            setMessage({ tone: "neutral", text: uiRef.current("voice.notUnderstood") });
          }
          return;
        }
        if (command.type === "undo") {
          undo();
          return;
        }
        const result = onSelectRef.current(command);
        // A rejected command (number out of range) leaves the previous
        // selection — and its undo — untouched.
        if (result.kind === "ok") {
          lastUndoRef.current = result.onUndo;
          setMessage({ tone: "positive", text: result.text, onUndo: result.onUndo });
        } else {
          setMessage({ tone: "negative", text: result.text });
        }
      },
      onFatal(reason) {
        onFatalRef.current(reason);
      },
    });
    return stop;
  }, [lang]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), FEEDBACK_MS);
    return () => window.clearTimeout(timer);
  }, [message]);

  const style = message ? TONE_STYLE[message.tone] : TONE_STYLE.neutral;

  return (
    <div
      role="status"
      className="shrink-0 min-h-[48px] px-[16px] flex items-center gap-[12px]"
      style={{ ...style, borderBottom: "1px solid var(--rule)" }}
    >
      {!message && (
        <span
          aria-hidden="true"
          className="voice-dot shrink-0 w-[10px] h-[10px] rounded-full"
          style={{ background: "var(--ink)", boxShadow: "0 0 0 4px var(--ring)" }}
        />
      )}
      <span className="flex-1 min-w-0 truncate text-[15px] font-semibold" style={{ color: message ? undefined : "var(--ink)" }}>
        {message ? message.text : "Listening — say “3 against 7”"}
      </span>
      {message?.tone === "positive" && message.onUndo && (
        <button
          type="button"
          onClick={() => {
            lastUndoRef.current = null;
            message.onUndo?.();
            setMessage({ tone: "positive", text: "Undone" });
          }}
          className="display shrink-0 min-h-[40px] px-[12px] rounded-[var(--r-control)] text-[14px] font-bold uppercase tracking-[0.1em]"
          style={{ border: "1px solid currentColor" }}
        >
          Undo
        </button>
      )}
    </div>
  );
}
