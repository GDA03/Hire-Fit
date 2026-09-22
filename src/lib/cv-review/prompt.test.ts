import { describe, expect, test } from "vitest";
import { buildATSSignals } from "./ats-checks";
import { buildCVReviewPrompt } from "./prompt";
import type { AnalyzeRequest } from "./types";
import {
  enforceAnalysisInputBudget,
  MAX_ANALYSIS_CV_CHARS,
  MAX_ANALYSIS_JD_CHARS,
  normalizeTextWhitespace,
} from "./validation";

describe("buildCVReviewPrompt with ATS signals", () => {
  const baseRequest: AnalyzeRequest = {
    cvText: "Developer CV text with john@example.com, experience, and skills.",
    language: "en",
    purpose: "job_seeking",
    jobRole: "Senior Engineer",
    jobDescription: "Must know Go, Kubernetes, and Distributed Systems.",
  };

  test("includes deterministic signals in prompt and compact bounds", () => {
    const signals = buildATSSignals({ cvText: baseRequest.cvText, jobDescription: baseRequest.jobDescription });
    const prompt = buildCVReviewPrompt(baseRequest, signals);

    expect(prompt).toContain("Deterministic ATS Observations");
    expect(prompt).toContain("Email detected: Yes");
    expect(prompt).toContain("atsWarnings: 3 to 4");
    expect(prompt).toContain("priorityPlan: exactly 5");
    expect(prompt).toContain("sections: 1-2 whatWorks, 1-2 problemsFound, 2-3 actionPoints, 0-1 examples");
    expect(prompt).toContain("keywords: at most 8 items per array");
    expect(prompt).toContain("careerRecommendation: at most 4");
    expect(prompt).toContain("jobFit");
    expect(prompt).toContain("kubernetes");
  });

  test("avoids fabricated missing keyword signals when job description is omitted", () => {
    const noJdRequest: AnalyzeRequest = {
      ...baseRequest,
      jobRole: undefined,
      jobDescription: undefined,
    };
    const signals = buildATSSignals({ cvText: noJdRequest.cvText });
    const prompt = buildCVReviewPrompt(noJdRequest, signals);

    expect(prompt).toContain("Job description not provided: do not evaluate or invent missing job description keywords");
    expect(prompt).toContain('Do not include "jobFit"');
    expect(prompt).not.toContain('"jobFit": {');
  });
});

describe("model-input budget enforcement", () => {
  test("normalizes whitespace without deleting line breaks", () => {
    const raw = "Line 1  with   spaces\r\n\r\nLine 2\t\ttabs\rLine 3";
    const normalized = normalizeTextWhitespace(raw);

    expect(normalized).toBe("Line 1 with spaces\n\nLine 2 tabs\nLine 3");
  });

  test("accepts CV and job description within budget boundaries", () => {
    const request: AnalyzeRequest = {
      cvText: "A".repeat(MAX_ANALYSIS_CV_CHARS),
      language: "en",
      purpose: "job_seeking",
      jobDescription: "B".repeat(MAX_ANALYSIS_JD_CHARS),
    };

    expect(() => enforceAnalysisInputBudget(request)).not.toThrow();
  });

  test("rejects CV one character over budget", () => {
    const request: AnalyzeRequest = {
      cvText: "A".repeat(MAX_ANALYSIS_CV_CHARS + 1),
      language: "en",
      purpose: "job_seeking",
    };

    expect(() => enforceAnalysisInputBudget(request)).toThrow(/CV text is too long for analysis/i);
  });

  test("rejects job description one character over budget", () => {
    const request: AnalyzeRequest = {
      cvText: "A".repeat(500),
      language: "en",
      purpose: "job_seeking",
      jobDescription: "B".repeat(MAX_ANALYSIS_JD_CHARS + 1),
    };

    expect(() => enforceAnalysisInputBudget(request)).toThrow(/Job description is too long for analysis/i);
  });
});
