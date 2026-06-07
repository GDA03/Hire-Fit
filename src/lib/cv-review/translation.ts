import { GoogleGenerativeAI } from "@google/generative-ai";
import { readEnv } from "@/lib/env";
import { extractJsonObject } from "./validation";
import type { CVReviewResult, ReviewLanguage } from "./types";

const fallbackModel = "gemini-2.5-flash-lite";

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

export async function translateReviewResult(result: CVReviewResult, targetLanguage: ReviewLanguage): Promise<CVReviewResult> {
  const apiKey = readEnv("GEMINI_API_KEY");
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY.");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: readEnv("GEMINI_TRANSLATION_MODEL") ?? readEnv("GEMINI_MODEL") ?? fallbackModel,
    generationConfig: { responseMimeType: "application/json" },
  });

  const response = await model.generateContent(buildReviewTranslationPrompt(result, targetLanguage));
  return extractJsonObject(response.response.text()) as CVReviewResult;
}
