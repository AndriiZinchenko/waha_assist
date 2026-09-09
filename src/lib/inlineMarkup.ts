/**
 * New Recruit's rules text carries two inline markers: `**bold**` and
 * `^^keyword^^` (how a datasheet prints a keyword). They nest in either
 * order, as in `**^^Boyz^^**`. This turns a string into flat segments so a
 * component can style them; line breaks stay inside the text.
 *
 * A marker with no partner later in the string is ordinary text, so a typo
 * in the export (`**^Anathema Psykana^^**`) does not swallow the rest of
 * the sentence.
 */
export interface MarkupSegment {
  text: string;
  bold: boolean;
  keyword: boolean;
}

const MARKER = /\*\*|\^\^/g;

export function parseInlineMarkup(text: string): MarkupSegment[] {
  const tokens = text.split(MARKER);
  const markers: string[] = text.match(MARKER) ?? [];
  const segments: MarkupSegment[] = [];
  let bold = false;
  let keyword = false;

  const push = (piece: string) => {
    if (!piece) return;
    const last = segments[segments.length - 1];
    if (last && last.bold === bold && last.keyword === keyword) {
      last.text += piece;
    } else {
      segments.push({ text: piece, bold, keyword });
    }
  };

  push(tokens[0]);
  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i];
    const closes = marker === "**" ? bold : keyword;
    const hasPartner = closes || markers.indexOf(marker, i + 1) !== -1;
    if (!hasPartner) {
      push(marker);
    } else if (marker === "**") {
      bold = !bold;
    } else {
      keyword = !keyword;
    }
    push(tokens[i + 1]);
  }
  return segments;
}
