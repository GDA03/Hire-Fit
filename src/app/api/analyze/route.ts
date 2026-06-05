import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { buildCVReviewPrompt } from "@/lib/cv-review/prompt";
import { extractJsonObject, validateAnalyzeRequest } from "@/lib/cv-review/validation";
import type { AnalyzeRequest, CVReviewResult } from "@/lib/cv-review/types";

const fallbackModel = "gemini-2.5-flash-lite";

export async function runGeminiAnalysis(analyzeRequest: AnalyzeRequest): Promise<CVReviewResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? fallbackModel,
    generationConfig: { responseMimeType: "application/json" },
  });
  const result = await model.generateContent(buildCVReviewPrompt(analyzeRequest));
  const rawText = result.response.text();
  return extractJsonObject(rawText) as CVReviewResult;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const analyzeRequest = validateAnalyzeRequest(body);
    const parsed = await runGeminiAnalysis(analyzeRequest);
    return NextResponse.json(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to analyze CV.";
    const status = message.includes("must") || message.includes("too long") || message.includes("not supported") ? 400 : 500;
    console.error("CV analysis error", error);
    return NextResponse.json({ error: message }, { status });
  }
}
