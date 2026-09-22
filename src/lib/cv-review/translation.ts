import { generateJsonText } from "@/lib/cv-review/model";
import { extractJsonObject, validateCVReviewResult } from "./validation";
import type { CVReviewResult, ReviewLanguage, SectionKey } from "./types";

function languageName(language: ReviewLanguage) {
  return language === "id" ? "Bahasa Indonesia" : "English";
}

export function buildReviewTranslationPrompt(result: CVReviewResult, targetLanguage: ReviewLanguage) {
  return `Translate this HireFit CV review result to ${languageName(targetLanguage)}.

Rules:
- Return valid JSON only. No markdown. No code fences.
- Keep the exact same JSON shape.
- Translate text fields only.
- Do not re-review the CV.
- Do not add new findings.
- Do not remove findings.
- Keep every score identical.
- Keep every priority value identical.
- Keep every section key identical.
- Keep array lengths and item order identical.

JSON to translate:
${JSON.stringify(result)}`;
}

export function validateTranslatedResult(
  translated: unknown,
  original: CVReviewResult,
  hasJobTarget: boolean,
): CVReviewResult {
  const parsed = validateCVReviewResult(translated, { hasJobTarget });

  if (parsed.overallScore !== original.overallScore) {
    throw new Error(
      `Translation altered overallScore: expected ${original.overallScore}, got ${parsed.overallScore}.`,
    );
  }

  for (const [key, originalSection] of Object.entries(original.sections)) {
    const translatedSection = parsed.sections[key as SectionKey];
    if (!translatedSection) {
      throw new Error(`Translation missing section ${key}.`);
    }
    if (translatedSection.score !== originalSection.score) {
      throw new Error(
        `Translation altered score for section ${key}: expected ${originalSection.score}, got ${translatedSection.score}.`,
      );
    }
    if (translatedSection.priority !== originalSection.priority) {
      throw new Error(
        `Translation altered priority for section ${key}: expected ${originalSection.priority}, got ${translatedSection.priority}.`,
      );
    }
  }

  if (hasJobTarget && original.jobFit && parsed.jobFit && parsed.jobFit.score !== original.jobFit.score) {
    throw new Error("Translation altered score for jobFit.");
  }

  return parsed;
}

export async function translateReviewResult(result: CVReviewResult, targetLanguage: ReviewLanguage): Promise<CVReviewResult> {
  const hasJobTarget = Boolean(result.jobFit && result.tailoredContent && result.experienceMatch);
  const rawText = await generateJsonText({
    prompt: buildReviewTranslationPrompt(result, targetLanguage),
    action: "translate",
    geminiModelEnv: "GEMINI_TRANSLATION_MODEL",
    openRouterModelsEnv: "OPENROUTER_TRANSLATION_MODELS",
    providerOrderEnv: "AI_TRANSLATION_PROVIDER_ORDER",
    validateJson: (value) => validateTranslatedResult(value, result, hasJobTarget),
  });

  const parsed = extractJsonObject(rawText);
  return validateTranslatedResult(parsed, result, hasJobTarget);
}
