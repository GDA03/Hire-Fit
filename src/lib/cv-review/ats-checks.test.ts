import { describe, expect, test } from "vitest";
import { buildATSSignals, runATSChecks } from "./ats-checks";

describe("buildATSSignals", () => {
  test("extracts deterministic contact, heading, and keyword signals", () => {
    const cvText = `
      John Doe
      john@example.com | +1 555 123 4567
      https://linkedin.com/in/johndoe

      Experience
      Software Engineer at Acme

      Education
      B.S. in Computer Science

      Skills
      TypeScript, React, Node.js
    `;
    const jobDescription = "Looking for a TypeScript and Kubernetes developer with experience and skills.";

    const signals = buildATSSignals({ cvText, jobDescription });

    expect(signals.hasEmail).toBe(true);
    expect(signals.hasPhone).toBe(true);
    expect(signals.hasProfessionalLink).toBe(true);
    expect(signals.detectedHeadings).toContain("experience");
    expect(signals.detectedHeadings).toContain("education");
    expect(signals.detectedHeadings).toContain("skills");
    expect(signals.missingHeadings).toContain("projects");
    expect(signals.missingHeadings).toContain("summary");
    expect(signals.missingKeywords).toContain("kubernetes");
    expect(signals.missingKeywords).not.toContain("typescript");
    expect(signals.characterCount).toBeGreaterThan(50);
  });

  test("does not produce missing keywords when job description is omitted", () => {
    const cvText = "Simple CV text with jane@work.com and +6281234567890. Experience and education listed.";
    const signals = buildATSSignals({ cvText });

    expect(signals.missingKeywords).toEqual([]);
  });

  test("runs presentation ATS checks adapter consistently with signals", () => {
    const cvText = "Short CV without contact info";
    const checks = runATSChecks({ cvText });

    expect(checks.some((c) => c.id === "missing-email")).toBe(true);
    expect(checks.some((c) => c.id === "missing-phone")).toBe(true);
  });
});
