import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { buildCVReviewPrompt } from "@/lib/cv-review/prompt";
import { extractJsonObject, validateAnalyzeRequest } from "@/lib/cv-review/validation";

const fallbackModel = "gemini-2.5-flash-lite";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const analyzeRequest = validateAnalyzeRequest(body);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY. Copy .env.example to .env.local and add a Google AI Studio key." },
        { status: 500 },
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL ?? fallbackModel,
      generationConfig: { responseMimeType: "application/json" },
    });
    const result = await model.generateContent(buildCVReviewPrompt(analyzeRequest));
    const rawText = result.response.text();
    const parsed = extractJsonObject(rawText);

    return NextResponse.json(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to analyze CV.";
    const status = message.includes("must") || message.includes("too long") || message.includes("not supported") ? 400 : 500;

    console.error("CV analysis error", error);
    return NextResponse.json({ error: message }, { status });
  }
}
