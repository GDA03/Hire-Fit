import {
  LANGUAGES,
  PURPOSES,
  SECTION_DEFINITIONS,
  type AnalyzeRequest,
  type CVReviewResult,
  type CareerRecommendationResult,
  type KeywordResult,
  type SectionKey,
  type SectionResult,
} from "./types";

const languageValues: Set<string> = new Set(LANGUAGES.map((language) => language.value));
const purposeValues: Set<string> = new Set(PURPOSES.map((purpose) => purpose.value));

export function validateAnalyzeRequest(input: unknown): AnalyzeRequest {
  if (!input || typeof input !== "object") {
    throw new Error("Request body must be a JSON object.");
  }

  const body = input as Record<string, unknown>;
  const cvText = readString(body.cvText).trim();
  const language = readString(body.language);
  const purpose = readString(body.purpose);
  const jobRole = readOptionalString(body.jobRole);
  const jobDescription = readOptionalString(body.jobDescription);
  const scholarshipTitle = readOptionalString(body.scholarshipTitle);

  if (cvText.length < 50) {
    throw new Error("CV text must be at least 50 characters.");
  }

  if (cvText.length > 60_000) {
    throw new Error("CV text is too long. Please keep it under 60,000 characters.");
  }

  if (!languageValues.has(language)) {
    throw new Error("Language must be English or Bahasa Indonesia.");
  }

  if (!purposeValues.has(purpose)) {
    throw new Error("Review purpose is not supported.");
  }

  if (jobDescription && jobDescription.length > 30_000) {
    throw new Error("Job description is too long. Please keep it under 30,000 characters.");
  }

  return {
    cvText,
    language: language as AnalyzeRequest["language"],
    purpose: purpose as AnalyzeRequest["purpose"],
    jobRole,
    jobDescription,
    scholarshipTitle,
  };
}

export const MAX_ANALYSIS_CV_CHARS = 24_000;
export const MAX_ANALYSIS_JD_CHARS = 12_000;

export function normalizeTextWhitespace(text: string): string {
  const normalizedEndings = text.replace(/\r\n|\r/g, "\n");
  return normalizedEndings
    .split("\n")
    .map((line) => line.replace(/[^\S\n]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function enforceAnalysisInputBudget(request: AnalyzeRequest): AnalyzeRequest {
  const normalizedCv = normalizeTextWhitespace(request.cvText);
  if (normalizedCv.length > MAX_ANALYSIS_CV_CHARS) {
    throw new Error(
      `CV text is too long for analysis (${normalizedCv.length.toLocaleString()} characters). Please shorten your CV to under ${MAX_ANALYSIS_CV_CHARS.toLocaleString()} characters.`,
    );
  }

  let normalizedJd = request.jobDescription;
  if (request.jobDescription) {
    normalizedJd = normalizeTextWhitespace(request.jobDescription);
    if (normalizedJd.length > MAX_ANALYSIS_JD_CHARS) {
      throw new Error(
        `Job description is too long for analysis (${normalizedJd.length.toLocaleString()} characters). Please shorten it to under ${MAX_ANALYSIS_JD_CHARS.toLocaleString()} characters.`,
      );
    }
  }

  return {
    ...request,
    cvText: normalizedCv,
    jobDescription: normalizedJd,
  };
}

export function extractJsonObject(text: string) {
  const first = text.indexOf("{");

  if (first === -1) {
    throw new Error("Model response did not contain a JSON object.");
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = first; index < text.length; index += 1) {
    const char = text[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\" && inString) {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;

    if (depth === 0) {
      return JSON.parse(text.slice(first, index + 1));
    }
  }

  throw new Error("Model response did not contain a complete JSON object.");
}

export function scoreTone(score: number | null) {
  if (score === null) return "neutral";
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "warning";
  return "danger";
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readOptionalString(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function validateCVReviewResult(
  input: unknown,
  options?: { hasJobTarget?: boolean },
): CVReviewResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Invalid CV review result: root object must be a JSON object.");
  }

  const raw = input as Record<string, unknown>;
  const overallScore = validateScore(raw.overallScore, "overallScore");
  const summary = validateString(raw.summary, "summary", 1);
  const atsWarnings = validateStringArray(raw.atsWarnings, "atsWarnings", 3, 6);
  const priorityPlan = validateStringArray(raw.priorityPlan, "priorityPlan", 5, 5);

  if (!raw.sections || typeof raw.sections !== "object" || Array.isArray(raw.sections)) {
    throw new Error("Invalid CV review result: sections must be a JSON object.");
  }

  const sectionsRecord = raw.sections as Record<string, unknown>;
  const sections = {} as Record<SectionKey, SectionResult>;

  for (const { key } of SECTION_DEFINITIONS) {
    if (!(key in sectionsRecord) || sectionsRecord[key] === undefined) {
      throw new Error(`Invalid CV review result: missing required sections.${key}.`);
    }
    sections[key] = validateSectionResult(sectionsRecord[key], `sections.${key}`);
  }

  const keywords = validateKeywordResult(raw.keywords, "keywords");
  const careerRecommendation = validateCareerRecommendationResult(
    raw.careerRecommendation,
    "careerRecommendation",
  );

  const result: CVReviewResult = {
    overallScore,
    summary,
    atsWarnings,
    priorityPlan,
    sections,
    keywords,
    careerRecommendation,
  };

  const hasJobTarget = Boolean(options?.hasJobTarget);
  if (hasJobTarget) {
    if (!("jobFit" in raw) || raw.jobFit === undefined) {
      throw new Error("Invalid CV review result: missing required jobFit for targeted review.");
    }
    if (!("tailoredContent" in raw) || raw.tailoredContent === undefined) {
      throw new Error("Invalid CV review result: missing required tailoredContent for targeted review.");
    }
    if (!("experienceMatch" in raw) || raw.experienceMatch === undefined) {
      throw new Error("Invalid CV review result: missing required experienceMatch for targeted review.");
    }
    result.jobFit = validateSectionResult(raw.jobFit, "jobFit");
    result.tailoredContent = validateSectionResult(raw.tailoredContent, "tailoredContent");
    result.experienceMatch = validateSectionResult(raw.experienceMatch, "experienceMatch");
  } else {
    if ("jobFit" in raw && raw.jobFit !== undefined) {
      result.jobFit = validateSectionResult(raw.jobFit, "jobFit");
    }
    if ("tailoredContent" in raw && raw.tailoredContent !== undefined) {
      result.tailoredContent = validateSectionResult(raw.tailoredContent, "tailoredContent");
    }
    if ("experienceMatch" in raw && raw.experienceMatch !== undefined) {
      result.experienceMatch = validateSectionResult(raw.experienceMatch, "experienceMatch");
    }
  }

  return result;
}

export function parseCVReviewResult(text: string, hasJobTarget = false): CVReviewResult {
  const json = extractJsonObject(text);
  return validateCVReviewResult(json, { hasJobTarget });
}

function validateScore(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 100) {
    throw new Error(`Invalid CV review result: ${path} must be an integer between 0 and 100.`);
  }
  return value;
}

function validateString(value: unknown, path: string, minLength = 1): string {
  if (typeof value !== "string" || value.trim().length < minLength) {
    throw new Error(`Invalid CV review result: ${path} must be a non-empty string.`);
  }
  return value.trim();
}

function validateStringArray(
  value: unknown,
  path: string,
  minItems: number,
  maxItems: number,
): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid CV review result: ${path} must be an array of strings.`);
  }
  if (value.length < minItems || value.length > maxItems) {
    throw new Error(
      `Invalid CV review result: ${path} must contain between ${minItems} and ${maxItems} items. Got ${value.length}.`,
    );
  }
  return value.map((item, index) => {
    if (typeof item !== "string" || item.trim().length === 0) {
      throw new Error(`Invalid CV review result: ${path}[${index}] must be a non-empty string.`);
    }
    return item.trim();
  });
}

function validateSectionResult(value: unknown, path: string): SectionResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid CV review result: ${path} must be an object.`);
  }

  const raw = value as Record<string, unknown>;
  const priority = raw.priority;
  if (priority !== "high" && priority !== "medium" && priority !== "low") {
    throw new Error(`Invalid CV review result: ${path}.priority must be "high", "medium", or "low".`);
  }

  return {
    score: raw.score === null ? null : validateScore(raw.score, `${path}.score`),
    analysis: validateString(raw.analysis, `${path}.analysis`),
    whatWorks: validateStringArray(raw.whatWorks, `${path}.whatWorks`, 1, 6),
    problemsFound: validateStringArray(raw.problemsFound, `${path}.problemsFound`, 1, 6),
    actionPoints: validateStringArray(raw.actionPoints, `${path}.actionPoints`, 1, 8),
    whyImportant: validateString(raw.whyImportant, `${path}.whyImportant`),
    examples: Array.isArray(raw.examples)
      ? raw.examples.map((item, i) => validateString(item, `${path}.examples[${i}]`))
      : [],
    priority,
  };
}

function validateKeywordResult(value: unknown, path: string): KeywordResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid CV review result: ${path} must be an object.`);
  }

  const raw = value as Record<string, unknown>;
  return {
    jobTitles: validateStringArray(raw.jobTitles, `${path}.jobTitles`, 0, 15),
    skills: validateStringArray(raw.skills, `${path}.skills`, 0, 15),
    careerPaths: validateStringArray(raw.careerPaths, `${path}.careerPaths`, 0, 15),
    professionalSummaryKeywords: validateStringArray(
      raw.professionalSummaryKeywords,
      `${path}.professionalSummaryKeywords`,
      0,
      15,
    ),
    additionalKeywords: validateStringArray(
      raw.additionalKeywords,
      `${path}.additionalKeywords`,
      0,
      15,
    ),
    missingKeywords: validateStringArray(raw.missingKeywords, `${path}.missingKeywords`, 0, 15),
  };
}

function validateCareerRecommendationResult(
  value: unknown,
  path: string,
): CareerRecommendationResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid CV review result: ${path} must be an object.`);
  }

  const raw = value as Record<string, unknown>;
  return {
    summary: validateString(raw.summary, `${path}.summary`),
    recommendedRoles: validateStringArray(raw.recommendedRoles, `${path}.recommendedRoles`, 1, 8),
    recommendedIndustries: validateStringArray(
      raw.recommendedIndustries,
      `${path}.recommendedIndustries`,
      1,
      8,
    ),
    nextSteps: validateStringArray(raw.nextSteps, `${path}.nextSteps`, 1, 8),
  };
}
