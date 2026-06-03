import { LANGUAGES, PURPOSES, type AnalyzeRequest } from "./types";

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

export function extractJsonObject(text: string) {
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");

  if (first === -1 || last === -1 || last <= first) {
    throw new Error("Model response did not contain a JSON object.");
  }

  return JSON.parse(text.slice(first, last + 1));
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
