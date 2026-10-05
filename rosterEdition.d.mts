export type Edition = 10 | 11;
export function editionFromSystemName(name: string | null | undefined): Edition | null;
export function rosterEdition(json: unknown): Edition | null;
