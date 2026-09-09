import { parseInlineMarkup } from "../lib/inlineMarkup";

interface InlineMarkupProps {
  text: string | null | undefined;
}

/**
 * Rules text with its `**bold**` and `^^keyword^^` markers rendered: bold
 * in the main ink, keywords in small caps the way a datasheet prints them.
 * Line breaks pass through, so wrap in a `whitespace-pre-line` container
 * when the text has paragraphs.
 */
export function InlineMarkup({ text }: InlineMarkupProps) {
  if (!text) return null;
  return (
    <>
      {parseInlineMarkup(text).map((segment, i) => {
        if (!segment.bold && !segment.keyword) return segment.text;
        return (
          <span
            key={i}
            className={[
              segment.bold ? "font-semibold" : "",
              segment.keyword ? "tracking-[0.03em]" : "",
            ].join(" ")}
            style={{
              color: segment.bold ? "var(--ink)" : undefined,
              fontVariant: segment.keyword ? "small-caps" : undefined,
            }}
          >
            {segment.text}
          </span>
        );
      })}
    </>
  );
}
