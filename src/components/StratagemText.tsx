interface StratagemMetaProps {
  type?: string;
  phase?: string | null;
}

/** The "Strategic Ploy · Your Movement phase" line — the type is
 * highlighted, the phase stays muted. */
export function StratagemMeta({ type, phase }: StratagemMetaProps) {
  if (!type && !phase) return null;
  return (
    <div className="text-[10px] uppercase tracking-[0.04em]">
      {type && (
        <span className="font-semibold" style={{ color: "var(--accent)" }}>
          {type}
        </span>
      )}
      {type && phase && (
        <span className="text-[var(--ink-soft)]"> · </span>
      )}
      {phase && <span className="text-[var(--ink-soft)]">{phase}</span>}
    </div>
  );
}

interface StratagemTextProps {
  text: string;
}

/**
 * Stratagem body text is a series of blank-line-separated paragraphs, each
 * usually starting with a short label (TARGET:, EFFECT:, RESTRICTIONS: in
 * English — ЦІЛЬ:, ЕФЕКТ:, ОБМЕЖЕННЯ: once translated). Split generically
 * on "label: rest" rather than matching the English words literally, so
 * this works the same regardless of language.
 */
export function StratagemText({ text }: StratagemTextProps) {
  const paragraphs = text
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="flex flex-col gap-1.5">
      {paragraphs.map((paragraph, i) => {
        const match = paragraph.match(/^([^:\n]{2,24}):\s*([\s\S]*)$/);
        if (!match) return <div key={i}>{paragraph}</div>;
        const [, label, body] = match;
        return (
          <div key={i}>
            <span
              className="font-semibold"
              style={{ color: "var(--accent-heading)" }}
            >
              {label}:
            </span>{" "}
            {body}
          </div>
        );
      })}
    </div>
  );
}
