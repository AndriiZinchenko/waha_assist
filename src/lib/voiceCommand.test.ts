import { describe, expect, it } from "vitest";
import { parseVoiceCommand } from "./voiceCommand";

describe("parseVoiceCommand", () => {
  it("parses plain digits with 'against'", () => {
    expect(parseVoiceCommand("3 against 7")).toEqual({ type: "select", attacker: 3, target: 7 });
  });

  it("accepts versus / vs / on / into as separators", () => {
    expect(parseVoiceCommand("2 versus 5")).toEqual({ type: "select", attacker: 2, target: 5 });
    expect(parseVoiceCommand("2 vs 5")).toEqual({ type: "select", attacker: 2, target: 5 });
    expect(parseVoiceCommand("2 vs. 5")).toEqual({ type: "select", attacker: 2, target: 5 });
    expect(parseVoiceCommand("2 on 5")).toEqual({ type: "select", attacker: 2, target: 5 });
  });

  it("ignores two bare numbers with no separator (the mic is always on)", () => {
    expect(parseVoiceCommand("12 4")).toBeNull();
    expect(parseVoiceCommand("I rolled 3 and 7")).toBeNull();
  });

  it("finds the phrase inside a longer utterance", () => {
    expect(parseVoiceCommand("okay so 3 against 7 please")).toEqual({
      type: "select",
      attacker: 3,
      target: 7,
    });
  });

  it("recognises undo in both languages", () => {
    expect(parseVoiceCommand("undo")).toEqual({ type: "undo" });
    expect(parseVoiceCommand("Undo that")).toEqual({ type: "undo" });
    expect(parseVoiceCommand("назад")).toEqual({ type: "undo" });
    expect(parseVoiceCommand("скасувати")).toEqual({ type: "undo" });
  });

  it("understands English number words", () => {
    expect(parseVoiceCommand("one against seven")).toEqual({ type: "select", attacker: 1, target: 7 });
    expect(parseVoiceCommand("twelve versus twenty")).toEqual({ type: "select", attacker: 12, target: 20 });
  });

  it("repairs common mishearings of digits", () => {
    expect(parseVoiceCommand("won against to")).toEqual({ type: "select", attacker: 1, target: 2 });
    expect(parseVoiceCommand("for versus ate")).toEqual({ type: "select", attacker: 4, target: 8 });
    expect(parseVoiceCommand("free against sex")).toEqual({ type: "select", attacker: 3, target: 6 });
  });

  it("ignores letters glued to digits (A1 versus B7)", () => {
    expect(parseVoiceCommand("A1 versus B7")).toEqual({ type: "select", attacker: 1, target: 7 });
    expect(parseVoiceCommand("a-3 against b-12")).toEqual({ type: "select", attacker: 3, target: 12 });
  });

  it("understands Ukrainian digits words and separators", () => {
    expect(parseVoiceCommand("три проти семи")).toEqual({ type: "select", attacker: 3, target: 7 });
    expect(parseVoiceCommand("один на два")).toEqual({ type: "select", attacker: 1, target: 2 });
    expect(parseVoiceCommand("5 проти 11")).toEqual({ type: "select", attacker: 5, target: 11 });
  });

  it("is case-insensitive and tolerant of punctuation", () => {
    expect(parseVoiceCommand("Three, against Seven.")).toEqual({ type: "select", attacker: 3, target: 7 });
  });

  it("returns null when fewer than two numbers are heard", () => {
    expect(parseVoiceCommand("")).toBeNull();
    expect(parseVoiceCommand("against")).toBeNull();
    expect(parseVoiceCommand("seven")).toBeNull();
    expect(parseVoiceCommand("hello world")).toBeNull();
  });

  it("rejects zero", () => {
    expect(parseVoiceCommand("0 against 3")).toBeNull();
  });
});
