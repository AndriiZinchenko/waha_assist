import { parseInlineMarkup } from "../lib/inlineMarkup";

interface InlineMarkupProps {
  text: string | null | undefined;
}

/**
 * Rules text with its `**bold**` and `^^keyword^^` markers rendered: bold
 * at 700, keywords in all-small-caps the way a datasheet prints them. The
 * font comes from the surrounding `.prose` container. Line breaks pass
 * through, so wrap in a `whitespace-pre-line` container when the text has
 * paragraphs.
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
            style={{
              fontWeight: segment.bold ? 700 : 600,
              color: segment.bold ? "var(--ink)" : undefined,
              fontVariantCaps: segment.keyword ? "all-small-caps" : undefined,
              letterSpacing: segment.keyword ? "0.04em" : undefined,
            }}
          >
            {segment.text}
          </span>
        );
      })}
    </>
  );
}
