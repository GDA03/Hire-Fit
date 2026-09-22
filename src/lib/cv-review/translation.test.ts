import { describe, expect, test } from "vitest";
import { validateTranslatedResult } from "./translation";
import { makeValidReviewResult } from "./validation.test";

describe("validateTranslatedResult", () => {
  test("accepts translated result preserving score and section keys", () => {
    const original = makeValidReviewResult(true);
    const translated = JSON.parse(JSON.stringify(original));
    translated.summary = "Ringkasan profesional yang kuat.";
    translated.sections.workExperience.analysis = "Analisis pengalaman kerja.";

    const result = validateTranslatedResult(translated, original, true);
    expect(result.summary).toBe("Ringkasan profesional yang kuat.");
    expect(result.overallScore).toBe(original.overallScore);
  });

  test("rejects translation that changes overallScore", () => {
    const original = makeValidReviewResult(true);
    const translated = JSON.parse(JSON.stringify(original));
    translated.overallScore = original.overallScore + 5;

    expect(() => validateTranslatedResult(translated, original, true)).toThrow(/overallScore/i);
  });

  test("rejects translation that alters a section score", () => {
    const original = makeValidReviewResult(true);
    const translated = JSON.parse(JSON.stringify(original));
    translated.sections.workExperience.score = 99;

    expect(() => validateTranslatedResult(translated, original, true)).toThrow(/workExperience/i);
  });

  test("rejects translation that alters a section priority", () => {
    const original = makeValidReviewResult(true);
    const translated = JSON.parse(JSON.stringify(original));
    translated.sections.workExperience.priority = "high";

    expect(() => validateTranslatedResult(translated, original, true)).toThrow(/priority/i);
  });
});
