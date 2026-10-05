// Which edition of 40k a roster is for, read from the game system name New
// Recruit writes into every export ("Warhammer 40,000 10th Edition").
// Shared by the app and the sync scripts, so plain JS like parseRoster.mjs.

/** 10 or 11 for a 40k system name of that edition; null for anything else. */
export function editionFromSystemName(name) {
  const match = /^Warhammer 40,000 (\d+)(?:st|nd|rd|th) Edition$/i.exec(String(name ?? "").trim());
  if (!match) return null;
  const edition = Number(match[1]);
  return edition === 10 || edition === 11 ? edition : null;
}

/** The edition of an exported roster. An export that names no system at all
 * is an older 10th edition file. Null when it names one the app cannot read. */
export function rosterEdition(json) {
  const name = json?.roster?.gameSystemName;
  return name === undefined || name === null ? 10 : editionFromSystemName(name);
}
