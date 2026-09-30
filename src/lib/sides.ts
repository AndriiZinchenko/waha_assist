import type { Side } from "../components/ArmyPanel";

/** The side marks as glyphs, for places where the mark sits inline in a
 * sentence. The shape form is `<SideMark>`. */
export const MARK_GLYPH: Record<Side, string> = { a: "■", b: "◆" };
