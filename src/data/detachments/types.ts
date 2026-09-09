export interface DetachmentRule {
  name: string;
  text: string;
}

export interface Stratagem {
  name: string;
  cost: number;
  type?: string;
  phase?: string;
  text: string;
}

export interface DetachmentData {
  name: string;
  faction: string;
  rules: DetachmentRule[];
  stratagems: Stratagem[];
}
