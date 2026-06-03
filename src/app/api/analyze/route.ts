import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const fallbackModel = "gemini-1.5-flash";

export async function POST(request: Request) {
  try {
    const { cvText, jobDescription } = await request.json();

    if (typeof cvText !== "string" || cvText.trim().length < 50) {
      return NextResponse.json({ error: "CV text must be at least 50 characters." }, { status: 400 });
    }

    if (typeof jobDescription !== "string" || jobDescription.trim().length < 50) {
      return NextResponse.json({ error: "Job Description must be at least 50 characters." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing GEMINI_API_KEY. Copy .env.example to .env.local and add key from Google AI Studio." }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL ?? fallbackModel });

    const prompt = buildPrompt(cvText, jobDescription);
    const result = await model.generateContent(prompt);
    const rawText = result.response.text();
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to analyze CV/JD fit. Check Gemini response or server logs." }, { status: 500 });
  }
}

function buildPrompt(cvText: string, jobDescription: string) {
  return `You are an expert technical recruiter and ATS resume reviewer.
Analyze candidate fit between CV and Job Description.

Rules:
- Never fabricate experience, skills, metrics, employers, or credentials.
- Suggest honest rewrites only from CV content.
- Return valid JSON only. No markdown.
- matchScore must be number from 0 to 100.
- prepPlan7Days must contain exactly 7 items.

Return this exact JSON shape:
{
  "matchScore": 0,
  "summary": "string",
  "strengths": ["string"],
  "missingKeywords": ["string"],
  "weakBullets": [
    { "original": "string", "issue": "string", "rewrite": "string" }
  ],
  "interviewQuestions": [
    { "question": "string", "whyItMatters": "string" }
  ],
  "prepPlan7Days": [
    { "day": 1, "focus": "string", "tasks": ["string"] }
  ]
}

CV:
${cvText}

Job Description:
${jobDescription}`;
}
