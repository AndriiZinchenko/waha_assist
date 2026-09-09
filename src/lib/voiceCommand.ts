/**
 * Parse a spoken utterance into a voice command.
 *
 * "X against Y" selects unit X on side A and unit Y on side B. Speech
 * engines are unreliable on isolated letters but solid on numbers, so the
 * command is numbers-only — the side is implied by position. The mic is
 * always on while voice mode is enabled, so the phrase is strict: two
 * numbers with a separator word between them ("against", "versus", "vs",
 * "on", Ukrainian "проти" / "на"). Two bare numbers in table talk never
 * trigger anything.
 *
 * Any letters the engine glues to a digit ("A1", "b-7") are dropped,
 * spoken number words are accepted in English and Ukrainian, and the most
 * common digit mishearings ("won", "to", "for", "ate") are repaired.
 *
 * "undo" / "назад" / "скасувати" reverts the last selection.
 */
export type VoiceCommand =
  | { type: "select"; attacker: number; target: number }
  | { type: "undo" };

const WORD_NUMBERS: Record<string, number> = {
  // English
  one: 1, won: 1,
  two: 2, to: 2, too: 2,
  three: 3, free: 3, tree: 3,
  four: 4, for: 4, fore: 4,
  five: 5,
  six: 6, sex: 6, sicks: 6,
  seven: 7,
  eight: 8, ate: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  // Ukrainian (nominative + the genitive forms "проти семи" produces)
  один: 1, одного: 1, одна: 1, одну: 1,
  два: 2, двох: 2, дві: 2,
  три: 3, трьох: 3,
  чотири: 4, чотирьох: 4,
  "п'ять": 5, "п'яти": 5, пять: 5, пяти: 5,
  шість: 6, шести: 6,
  сім: 7, семи: 7,
  вісім: 8, восьми: 8,
  "дев'ять": 9, "дев'яти": 9, девять: 9, девяти: 9,
  десять: 10, десяти: 10,
  одинадцять: 11, одинадцяти: 11,
  дванадцять: 12, дванадцяти: 12,
  тринадцять: 13, тринадцяти: 13,
  чотирнадцять: 14, чотирнадцяти: 14,
  "п'ятнадцять": 15, "п'ятнадцяти": 15, пятнадцять: 15, пятнадцяти: 15,
  шістнадцять: 16, шістнадцяти: 16,
  сімнадцять: 17, сімнадцяти: 17,
  вісімнадцять: 18, вісімнадцяти: 18,
  "дев'ятнадцять": 19, "дев'ятнадцяти": 19, девятнадцять: 19, девятнадцяти: 19,
  двадцять: 20, двадцяти: 20,
};

const SEPARATORS = new Set([
  "against",
  "versus",
  "vs",
  "on",
  "into",
  "проти",
  "на",
  "в",
  "у",
]);

const UNDO_WORDS = new Set(["undo", "назад", "скасувати", "відміна", "відмінити"]);

function tokenize(transcript: string): string[] {
  return (
    transcript
      .toLowerCase()
      // Curly apostrophes from the engine → plain, so "п’ять" hits the table.
      .replace(/[’`]/g, "'")
      // Drop a single letter glued to a digit ("a1", "b-7") — the side
      // is implied by position, the letter is noise.
      .replace(/(^|[^\p{L}])[a-zа-яіїє]-?(\d)/gu, "$1$2")
      .split(/[^\p{L}\p{N}']+/u)
      .filter(Boolean)
  );
}

function toNumber(token: string): number | undefined {
  const value = /^\d+$/.test(token) ? Number(token) : WORD_NUMBERS[token];
  return value !== undefined && value > 0 ? value : undefined;
}

export function parseVoiceCommand(transcript: string): VoiceCommand | null {
  const tokens = tokenize(transcript);

  if (tokens.some((t) => UNDO_WORDS.has(t))) return { type: "undo" };

  // Look for NUMBER SEP NUMBER anywhere in the utterance.
  for (let i = 0; i + 2 < tokens.length; i++) {
    if (!SEPARATORS.has(tokens[i + 1])) continue;
    const attacker = toNumber(tokens[i]);
    const target = toNumber(tokens[i + 2]);
    if (attacker !== undefined && target !== undefined) {
      return { type: "select", attacker, target };
    }
  }
  return null;
}
