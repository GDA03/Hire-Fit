import { describe, expect, test } from "vitest";
import { SECTION_DEFINITIONS, type CVReviewResult, type SectionResult } from "./types";
import { extractJsonObject, parseCVReviewResult, validateCVReviewResult } from "./validation";

function section(): SectionResult {
  return {
    score: 80,
    analysis: "Clear evidence.",
    whatWorks: ["Relevant evidence."],
    problemsFound: ["Needs detail."],
    actionPoints: ["Add measurable detail.", "Lead with impact."],
    whyImportant: "Recruiters scan this quickly.",
    examples: ["Improved process by 20%."],
    priority: "medium",
  };
}

export function makeValidReviewResult(hasJobTarget = true): CVReviewResult {
  const result: CVReviewResult = {
    overallScore: 80,
    summary: "Strong foundation with clear opportunities.",
    atsWarnings: ["Email detected.", "Phone detected.", "Skills heading detected."],
    priorityPlan: ["Clarify impact.", "Add keywords.", "Improve summary.", "Tighten formatting.", "Review links."],
    sections: Object.fromEntries(SECTION_DEFINITIONS.map(({ key }) => [key, section()])) as CVReviewResult["sections"],
    keywords: {
      jobTitles: ["Product Designer"],
      skills: ["Figma"],
      careerPaths: ["Product design"],
      professionalSummaryKeywords: ["user research"],
      additionalKeywords: ["prototyping"],
      missingKeywords: ["accessibility"],
    },
    careerRecommendation: {
      summary: "Build stronger product evidence.",
      recommendedRoles: ["Product Designer"],
      recommendedIndustries: ["Technology"],
      nextSteps: ["Publish one case study."],
    },
  };

  if (hasJobTarget) {
    result.jobFit = section();
    result.tailoredContent = section();
    result.experienceMatch = section();
  }

  return result;
}
describe("CV review result validation", () => {
  test("accepts a valid current result contract with job target", () => {
    const valid = makeValidReviewResult(true);
    expect(validateCVReviewResult(valid, { hasJobTarget: true })).toEqual(valid);
  });

  test("accepts a valid current result contract without job target", () => {
    const valid = makeValidReviewResult(false);
    expect(validateCVReviewResult(valid, { hasJobTarget: false })).toEqual(valid);
  });

  test("rejects non-object root", () => {
    expect(() => validateCVReviewResult(null)).toThrow(/root object/i);
    expect(() => validateCVReviewResult("not an object")).toThrow(/root object/i);
  });

  test("rejects non-integer or out-of-range overallScore", () => {
    const result = makeValidReviewResult();
    expect(() => validateCVReviewResult({ ...result, overallScore: -1 })).toThrow(/overallScore/i);
    expect(() => validateCVReviewResult({ ...result, overallScore: 101 })).toThrow(/overallScore/i);
    expect(() => validateCVReviewResult({ ...result, overallScore: 82.5 })).toThrow(/overallScore/i);
    expect(() => validateCVReviewResult({ ...result, overallScore: "80" })).toThrow(/overallScore/i);
  });

  test("rejects empty or non-string summary", () => {
    const result = makeValidReviewResult();
    expect(() => validateCVReviewResult({ ...result, summary: "" })).toThrow(/summary/i);
    expect(() => validateCVReviewResult({ ...result, summary: "   " })).toThrow(/summary/i);
    expect(() => validateCVReviewResult({ ...result, summary: 123 })).toThrow(/summary/i);
  });

  test("rejects invalid atsWarnings bounds", () => {
    const result = makeValidReviewResult();
    expect(() => validateCVReviewResult({ ...result, atsWarnings: ["One", "Two"] })).toThrow(/atsWarnings/i);
    expect(() =>
      validateCVReviewResult({
        ...result,
        atsWarnings: ["1", "2", "3", "4", "5", "6", "7"],
      }),
    ).toThrow(/atsWarnings/i);
    expect(() =>
      validateCVReviewResult({
        ...result,
        atsWarnings: ["1", "2", 3 as unknown as string],
      }),
    ).toThrow(/atsWarnings/i);
  });

  test("rejects priorityPlan with count !== 5 or empty items", () => {
    const result = makeValidReviewResult();
    expect(() => validateCVReviewResult({ ...result, priorityPlan: ["1", "2", "3", "4"] })).toThrow(/priorityPlan/i);
    expect(() =>
      validateCVReviewResult({
        ...result,
        priorityPlan: ["1", "2", "3", "4", "5", "6"],
      }),
    ).toThrow(/priorityPlan/i);
    expect(() =>
      validateCVReviewResult({
        ...result,
        priorityPlan: ["1", "2", "   ", "4", "5"],
      }),
    ).toThrow(/priorityPlan/i);
  });

  test("rejects a missing required section", () => {
    const result = makeValidReviewResult();
    delete (result.sections as Record<string, unknown>).achievements;
    expect(() => validateCVReviewResult(result)).toThrow(/sections.*achievements/i);
  });

  test("rejects an out-of-range section score", () => {
    const result = makeValidReviewResult();
    result.sections.workExperience.score = 101;
    expect(() => validateCVReviewResult(result)).toThrow(/score/i);

    result.sections.workExperience.score = -5;
    expect(() => validateCVReviewResult(result)).toThrow(/score/i);
  });

  test("accepts null section score", () => {
    const result = makeValidReviewResult();
    result.sections.additionalSection.score = null;
    expect(validateCVReviewResult(result).sections.additionalSection.score).toBeNull();
  });

  test("rejects invalid section priority", () => {
    const result = makeValidReviewResult();
    (result.sections.workExperience as Record<string, unknown>).priority = "urgent";
    expect(() => validateCVReviewResult(result)).toThrow(/priority/i);
  });

  test("rejects section arrays with invalid elements or bounds", () => {
    const result = makeValidReviewResult();
    (result.sections.workExperience as Record<string, unknown>).actionPoints = [];
    expect(() => validateCVReviewResult(result)).toThrow(/actionPoints/i);
  });

  test("enforces targeted sections when hasJobTarget is true", () => {
    const result = makeValidReviewResult(false);
    expect(() => validateCVReviewResult(result, { hasJobTarget: true })).toThrow(/jobFit/i);
  });

  test("allows omission of targeted sections when hasJobTarget is false", () => {
    const result = makeValidReviewResult(false);
    const validated = validateCVReviewResult(result, { hasJobTarget: false });
    expect(validated.jobFit).toBeUndefined();
    expect(validated.tailoredContent).toBeUndefined();
    expect(validated.experienceMatch).toBeUndefined();
  });

  test("parses and validates balanced JSON output", () => {
    const result = makeValidReviewResult(true);
    expect(parseCVReviewResult(JSON.stringify(result), true)).toEqual(result);
  });

  test("keeps generic JSON extraction independent from review validation", () => {
    expect(extractJsonObject('{"ok":true}')).toEqual({ ok: true });
  });
});
