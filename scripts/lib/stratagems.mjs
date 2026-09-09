// Pure helpers for scripts/sync-stratagems.mjs: turning New Recruit's
// stratagem export and roster detachment entries into the shapes in
// src/data/detachments/types.ts. No I/O, so every rule is unit-testable.

// Exports carry stray non-breaking spaces. They are invisible in an
// editor, rejected by lint, and fatal to the exact-string lookups in
// src/i18n, so they are flattened here at the source.
const NON_BREAKING_SPACE = String.fromCharCode(160);

function normalizeSpaces(text) {
  return String(text ?? "").split(NON_BREAKING_SPACE).join(" ");
}

/**
 * New Recruit's text ships with a handful of recurring slips (a missing
 * article, a full stop where a comma belongs, doubled spaces, a lost space
 * before a parenthesis, an unhyphenated "re roll", a stray closing quote
 * after the last sentence). Left alone they would be frozen into the
 * generated data files and become exact-match keys in src/i18n, so they
 * are corrected once, here, for every stratagem body, timing line and
 * detachment rule.
 */
export function cleanExportText(text) {
  return String(text ?? "")
    .replace(/\ba enemy\b/g, "an enemy")
    .replace(/\bAttacks\. Strength\b/g, "Attacks, Strength")
    .replace(/\bre roll\b/g, "re-roll")
    .replace(/(\w)\(/g, "$1 (")
    .replace(/ {2,}/g, " ")
    .replace(/\.’\s*$/, ".");
}

const ENTITIES = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

/**
 * New Recruit stores stratagem bodies as HTML. The app renders plain text
 * and bolds a paragraph's own "LABEL:" prefix, so every tag comes out and
 * a keyword's capitals are what marks it, exactly as in the hand-written
 * files this replaces.
 */
export function htmlToText(html) {
  let out = normalizeSpaces(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  for (const [entity, char] of Object.entries(ENTITIES)) {
    out = out.split(entity).join(char);
  }
  return cleanExportText(
    out
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+\n/g, "\n")
      .trim(),
  );
}

/**
 * The timing line has its own place in the UI, above the body, so lift a
 * leading "WHEN:" paragraph out rather than printing it twice.
 */
export function splitWhen(text) {
  const paragraphs = String(text ?? "").split("\n\n");
  const first = paragraphs[0] ?? "";
  const match = /^WHEN:\s*([\s\S]*)$/.exec(first.trim());
  if (!match) return { phase: null, body: text };
  // One export runs WHEN, TARGET and EFFECT together with single line
  // breaks; the timing line still ends where the next label starts.
  const [timing, ...rest] = match[1].split(/\n(?=[A-Z][A-Z ]+:)/);
  return {
    phase: timing.trim().replace(/\.$/, ""),
    body: [...rest.map((p) => p.trim()), ...paragraphs.slice(1)].join("\n\n").trim(),
  };
}

export function titleCaseName(name) {
  return String(name ?? "")
    .toLowerCase()
    .replace(/(^|[\s(\-/])([a-z])/g, (_, lead, letter) => lead + letter.toUpperCase());
}

/** "Shield Host  – Wargear Stratagem" -> "Wargear" */
export function stratagemType(raw) {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const parts = text.split("–");
  const tail = parts[parts.length - 1].trim();
  const stripped = tail.replace(/\s*Stratagem$/i, "").trim();
  return stripped || null;
}

export function slugify(name) {
  return String(name ?? "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function camelCase(name) {
  const parts = slugify(name).split("-").filter(Boolean);
  const joined = parts
    .map((part, i) => (i === 0 ? part : part[0].toUpperCase() + part.slice(1)))
    .join("");
  // "1st Company Task Force" must still be an identifier.
  return /^\d/.test(joined) ? `_${joined}` : joined;
}

/** One entry of the export -> one `Stratagem` for the app. */
export function toStratagem(entry) {
  const { phase, body } = splitWhen(htmlToText(entry.description));
  const turn = String(entry.turn ?? "").replace(/\s*turn$/i, "").trim();
  const fallback = turn && entry.phase ? `${turn} ${entry.phase}` : (entry.phase ?? null);
  return {
    name: titleCaseName(entry.name),
    cost: Number(entry.cp_cost ?? 0),
    type: stratagemType(entry.type),
    phase: phase ?? fallback,
    text: body,
  };
}

/**
 * The detachment a roster was built with, plus its rules. Both already sit
 * in the export that `sync:armies` downloads, so nothing extra is fetched
 * for this half.
 */
export function detachmentFromRoster(json) {
  const forces = json?.roster?.forces ?? [];
  for (const force of forces) {
    let found = null;
    (function walk(node) {
      if (found || !node || typeof node !== "object") return;
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      if (node.group === "Detachment" || node.group === "Detachments") {
        found = node;
        return;
      }
      if (node.selections) walk(node.selections);
    })(force.selections);
    if (!found) continue;
    return {
      name: found.name,
      faction: force.catalogueName ?? "",
      rules: (found.rules ?? []).map((rule) => ({
        name: rule.name,
        text: cleanExportText(normalizeSpaces(rule.description).trim()),
      })),
    };
  }
  return null;
}
