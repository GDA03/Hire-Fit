import { NextResponse } from "next/server";
import { buildATSSignals } from "@/lib/cv-review/ats-checks";
import { buildCVReviewPrompt } from "@/lib/cv-review/prompt";
import { generateJsonText, isAnalyzeRequestError, publicModelErrorMessage } from "@/lib/cv-review/model";
import {
  enforceAnalysisInputBudget,
  parseCVReviewResult,
  validateAnalyzeRequest,
  validateCVReviewResult,
} from "@/lib/cv-review/validation";
import type { AnalyzeRequest, CVReviewResult } from "@/lib/cv-review/types";

export const maxDuration = 120;

export async function runGeminiAnalysis(analyzeRequest: AnalyzeRequest): Promise<CVReviewResult> {
  const budgetedRequest = enforceAnalysisInputBudget(analyzeRequest);
  const signals = buildATSSignals({
    cvText: budgetedRequest.cvText,
    jobDescription: budgetedRequest.jobDescription,
  });
  const hasJobTarget = Boolean(budgetedRequest.jobRole || budgetedRequest.jobDescription);
  const rawText = await generateJsonText({
    prompt: buildCVReviewPrompt(budgetedRequest, signals),
    action: "analyze",
    validateJson: (value) => validateCVReviewResult(value, { hasJobTarget }),
  });
  return parseCVReviewResult(rawText, hasJobTarget);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const analyzeRequest = enforceAnalysisInputBudget(validateAnalyzeRequest(body));
    const parsed = await runGeminiAnalysis(analyzeRequest);
    return NextResponse.json(parsed);
  } catch (error) {
    const status = isAnalyzeRequestError(error) ? 400 : 502;
    const message = status === 400 && error instanceof Error ? error.message : publicModelErrorMessage("analyze");
    console.error("CV analysis error", error);
    return NextResponse.json({ error: message }, { status });
  }
}
