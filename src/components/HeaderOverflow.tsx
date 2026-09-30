import { useEffect, useRef, useState } from "react";
import type { Lang } from "../lib/i18n";
import { useUi } from "../lib/uiStrings";
import { WAKE_LOCK_SUPPORTED } from "../lib/useWakeLock";
import { LangToggle } from "./LangToggle";
import { HeaderIconButton } from "./VoiceToggle";
import { WakeLockToggle } from "./WakeLockToggle";

interface HeaderOverflowProps {
  lang: Lang;
  onChangeLang: (next: Lang) => void;
  wakeEnabled: boolean;
  onToggleWake: () => void;
}

/** Phone-only ⋯ menu holding the language switch and keep-awake. */
export function HeaderOverflow({ lang, onChangeLang, wakeEnabled, onToggleWake }: HeaderOverflowProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const ui = useUi();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <HeaderIconButton pressed={open} onClick={() => setOpen((v) => !v)} label="More settings">
        <span aria-hidden="true" className="text-[22px] font-bold leading-none tracking-[0.05em]">
          ⋯
        </span>
      </HeaderIconButton>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-40 w-[260px] rounded-[var(--r-control)] overflow-hidden"
          style={{
            background: "var(--paper-sunk)",
            border: "1px solid var(--rule)",
            boxShadow: "var(--shadow-up)",
          }}
        >
          <div className="min-h-[52px] px-[14px] flex items-center justify-between gap-[12px]">
            <span className="text-[16px] font-semibold">{ui("overflow.language")}</span>
            <LangToggle lang={lang} onChange={onChangeLang} />
          </div>
          {WAKE_LOCK_SUPPORTED && (
            <div style={{ borderTop: "1px solid var(--rule-soft)" }}>
              <WakeLockToggle variant="row" enabled={wakeEnabled} onToggle={onToggleWake} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
